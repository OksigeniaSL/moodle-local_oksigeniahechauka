#!/usr/bin/env python3
"""Where a screen finds its Moodle, as root (hechauka-ajuste.service), at every boot.

The card is the same for every centre. The address of the Moodle comes in the hechauka.conf of the panel («Prepare a
screen»), copied to the card before the first boot, or the screen asks for it: on the television, with a keyboard, or from a
phone on the same network, through the QR it shows (with a PIN in it, so nobody else on the network can change it).

At boot it leaves in /run/hechauka/destino the page the session opens (hechauka-pantalla waits for it):
- an address that has already worked: the player, and nothing more;
- one not seen working yet (the first boot after installing): it is checked first, and if the Moodle answers, the player;
- none, or one that does not answer: this setup page, on port 8080, which says what went wrong and keeps trying the address
  by itself, in case it was the network. When a Moodle with Hechauka answers, the address is kept, the time zone is taken
  from it and the session starts again on the player.

By SSH, to move a screen to another Moodle: sudo hechauka-direccion aula.example.org
"""
import argparse
import json
import os
import re
import secrets
import socket
import ssl
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CONF = '/etc/hechauka/pantalla.conf'
PENDING = '/var/lib/hechauka/por-comprobar'
RUN = '/run/hechauka'
TARGET = RUN + '/destino'
PAGES = '/usr/share/hechauka/ajuste'
KEYCOPY = '/home/pantalla/.local/state/hechauka/clave'
LOG = '/var/log/hechauka-ajuste.log'
ZONES = '/usr/share/zoneinfo'
PORT = 8080
PLUGIN = '/local/oksigeniahechauka'
HELLO = PLUGIN + '/api/device.php?f=hola'
STATIC = {'ajuste.css': 'text/css; charset=utf-8', 'ajuste.js': 'text/javascript; charset=utf-8',
          'qrcode.js': 'text/javascript; charset=utf-8', 'logotipo.svg': 'image/svg+xml'}
WRONG_PINS = 10
RETRY = 30
# What can get better by itself, with the network or the clock: the address is tried again.
PASSING = ('sin-red', 'no-contesta', 'no-existe', 'hora')
ADDRESS = re.compile(r'^https?://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:[0-9]{1,5})?'
                     r'(/[A-Za-z0-9._~%-]+)*$')
ZONE = re.compile(r'^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+)*$')


def log(text):
    try:
        if os.path.exists(LOG) and os.path.getsize(LOG) > 200000:
            os.replace(LOG, LOG + '.1')
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(time.strftime('%F %T ') + text + '\n')
    except OSError:
        pass


class Unreachable(Exception):
    """Why an address is not a Moodle with Hechauka, as a code the page turns into words."""

    def __init__(self, code, host=''):
        super().__init__(code)
        self.code = code
        self.host = host


def read_conf(path=None):
    """The KEY=value lines of a conf file (the last of each key wins; LLAVE may come more than once). Written on any
    computer: a BOM, CRLF and quotes are fine."""
    path = path or CONF
    values = {'LLAVE': []}
    try:
        with open(path, encoding='utf-8-sig', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                key, value = key.strip().upper(), value.strip().strip('"\'').strip()
                if key == 'LLAVE':
                    values['LLAVE'].append(value)
                else:
                    values[key] = value
    except OSError:
        pass
    return values


def write_conf(url, path=None):
    """The address of the player in the conf, with the rest of its lines as they were."""
    path = path or CONF
    lines = []
    try:
        with open(path, encoding='utf-8') as f:
            lines = [line.rstrip('\n') for line in f if not line.startswith('URL=')]
    except OSError:
        pass
    lines.append('URL=' + url)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + '.new', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    os.chmod(path + '.new', 0o644)
    os.replace(path + '.new', path)


def candidates(text):
    """The places a Moodle may be, from whatever was typed: «aula.example.org», a full address of any of its pages or the
    address of the player. The path is shortened one step at a time, for a Moodle in a folder of its site."""
    text = re.sub(r'\s+', '', text or '')
    if not text:
        return []
    if '://' not in text:
        text = 'https://' + text
    try:
        parts = urllib.parse.urlsplit(text)
        host = (parts.hostname or '').encode('idna').decode('ascii').lower()
        port = ':%d' % parts.port if parts.port else ''
    except (ValueError, UnicodeError):
        return []
    scheme = parts.scheme.lower()
    if scheme not in ('http', 'https') or not host:
        return []
    path = parts.path
    if PLUGIN in path:
        path = path[:path.index(PLUGIN)]
    path = re.sub(r'/[^/]*\.php$', '', path)
    steps = [s for s in path.split('/') if s][:4]
    found = []
    while True:
        base = '%s://%s%s%s' % (scheme, host, port, ''.join('/' + s for s in steps))
        if ADDRESS.match(base) and base not in found:
            found.append(base)
        if not steps:
            return found
        steps.pop()


def address():
    """The address of the device on its network, or '' without one: where a phone finds this page."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('192.0.2.1', 9))   # nothing is sent: it only picks the route
        return s.getsockname()[0]
    except OSError:
        return ''
    finally:
        s.close()


def clock_set():
    try:
        done = subprocess.run(['timedatectl', 'show', '-p', 'NTPSynchronized', '--value'], capture_output=True,
                              text=True, timeout=10)
        return done.stdout.strip() == 'yes'
    except (OSError, subprocess.TimeoutExpired):
        return True


def wait_for_clock(limit):
    end = time.time() + limit
    while not clock_set() and time.time() < end:
        time.sleep(2)


def hello(base):
    """What the Moodle at base says about its Hechauka, and where it really is (after its redirections)."""
    host = urllib.parse.urlsplit(base).hostname or ''
    request = urllib.request.Request(base + HELLO, headers={'User-Agent': 'Hechauka device', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=15) as answer:
            final = answer.geturl()
            data = answer.read(65536)
    except urllib.error.HTTPError as e:
        raise Unreachable('sin-hechauka', host) from e
    except urllib.error.URLError as e:
        reason = e.reason
        if isinstance(reason, socket.gaierror):
            raise Unreachable('no-existe', host) from e
        if isinstance(reason, ssl.SSLCertVerificationError):
            raise Unreachable('certificado' if clock_set() else 'hora', host) from e
        raise Unreachable('no-contesta', host) from e
    except (OSError, ValueError) as e:
        raise Unreachable('no-contesta', host) from e
    try:
        info = json.loads(data.decode('utf-8'))
    except (UnicodeDecodeError, ValueError) as e:
        raise Unreachable('sin-hechauka', host) from e
    if not isinstance(info, dict) or not info.get('hechauka'):
        raise Unreachable('sin-hechauka', host)
    if final.endswith(HELLO):
        base = final[:-len(HELLO)]
    return info, base.rstrip('/')


def check(text):
    """The Moodle behind what was typed: (what it says, its address), or Unreachable with the clearest reason."""
    places = candidates(text)
    if not places:
        raise Unreachable('mal-escrita')
    if not address():
        raise Unreachable('sin-red', urllib.parse.urlsplit(places[0]).hostname or '')
    worst = None
    for base in places:
        try:
            return hello(base)
        except Unreachable as e:
            # A site that is there but has no Hechauka says more than one that is not there.
            if worst is None or (worst.code != 'sin-hechauka' and e.code == 'sin-hechauka'):
                worst = e
            if e.code in ('no-existe', 'no-contesta', 'hora'):
                break
    raise worst


def base_of(url):
    return url[:url.index(PLUGIN)] if PLUGIN in url else url.rstrip('/')


def set_zone(zone):
    if not zone or not ZONE.match(zone) or '..' in zone or not os.path.isfile(os.path.join(ZONES, zone)):
        return
    try:
        now = subprocess.run(['timedatectl', 'show', '-p', 'Timezone', '--value'], capture_output=True, text=True,
                             timeout=10).stdout.strip()
        if now != zone:
            subprocess.run(['timedatectl', 'set-timezone', zone], capture_output=True, timeout=30)
            log('time zone: ' + zone)
    except (OSError, subprocess.TimeoutExpired):
        pass


def keep(base, info):
    """This Moodle from now on: its player in the conf, its time zone (unless the panel's file fixed one) and the page
    of the session."""
    conf = read_conf()
    old = conf.get('URL', '')
    url = base + PLUGIN + '/player/'
    write_conf(url)
    set_zone(conf.get('ZONA') or info.get('zona'))
    if old and base_of(old) != base and os.path.exists(KEYCOPY):
        # The key the agent keeps belongs to the other Moodle: this one gives its own when the screen is added.
        os.remove(KEYCOPY)
    if os.path.exists(PENDING):
        os.remove(PENDING)
    target(url)
    log('address: %s (%s)' % (url, info.get('sitio', '')))
    return url


def target(url):
    os.makedirs(RUN, exist_ok=True)
    with open(TARGET + '.new', 'w', encoding='utf-8') as f:
        f.write(url + '\n')
    os.chmod(TARGET + '.new', 0o644)
    os.replace(TARGET + '.new', TARGET)


def restart_session():
    subprocess.run(['systemctl', 'restart', 'lightdm'], capture_output=True, timeout=60)


class Setup:
    """The state of the setup page, shared by the television, the phone and the retries."""

    def __init__(self, current, error):
        self.pin = '%04d' % secrets.randbelow(10000)
        self.current = current
        self.state = 'comprobando' if current and not error else 'pide'
        self.error = error.code if error else ''
        self.host = error.host if error else ''
        self.site = ''
        self.tried = ''
        self.wrong = 0
        self.busy = threading.Lock()
        self.done = threading.Event()

    def status(self, local):
        out = {'state': self.state, 'error': self.error, 'host': self.host, 'site': self.site, 'current': self.current,
               'tried': self.tried, 'name': socket.gethostname()}
        if local:
            out.update(pin=self.pin, ip=address(), port=PORT)
        return out

    def pin_ok(self, pin):
        if self.wrong >= WRONG_PINS:
            return False
        if secrets.compare_digest(str(pin or ''), self.pin):
            return True
        self.wrong += 1
        log('wrong PIN from the network (%d)' % self.wrong)
        return False

    def attempt(self, text, by, wait=True):
        # Someone typing waits for a retry in course; a retry does not wait for anybody.
        if not self.busy.acquire(blocking=wait):
            return
        try:
            if self.done.is_set():
                return
            self.tried = text.strip()
            self.state, self.error, self.host = 'comprobando', '', urllib.parse.urlsplit(
                (candidates(text) or [''])[0]).hostname or ''
            try:
                info, base = check(text)
            except Unreachable as e:
                self.state, self.error, self.host = 'pide', e.code, e.host
                log('%s: %s (%s)' % (by, e.code, e.host))
                return
            keep(base, info)
            self.current = base
            self.site = str(info.get('sitio', ''))[:200]
            self.state = 'hecho'
            self.done.set()
            log('%s: %s works' % (by, base))
        finally:
            self.busy.release()

    def retry(self):
        """The address it already has, again every little while: a cable plugged in late, a Moodle back up."""
        while not self.done.wait(RETRY):
            if self.current and self.error in PASSING:
                self.attempt(self.current, 'retry', wait=False)


def handler(setup):
    with open(os.path.join(PAGES, 'index.html'), 'rb') as f:
        page = f.read()

    class Handler(BaseHTTPRequestHandler):
        server_version = 'Hechauka'
        sys_version = ''

        def log_message(self, format, *args):  # pylint: disable=redefined-builtin
            pass

        def local(self):
            return self.client_address[0] in ('127.0.0.1', '::1')

        def send(self, code, body, kind):
            self.send_response(code)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(body)

        def json(self, code, value):
            self.send(code, json.dumps(value).encode('utf-8'), 'application/json')

        def do_GET(self):  # pylint: disable=invalid-name
            path = urllib.parse.urlsplit(self.path).path.lstrip('/')
            if path in ('', 'index.html'):
                self.send(200, page, 'text/html; charset=utf-8')
            elif path == 'favicon.ico':
                self.send(204, b'', 'image/x-icon')
            elif path in STATIC:
                with open(os.path.join(PAGES, path), 'rb') as f:
                    self.send(200, f.read(), STATIC[path])
            elif path == 'estado':
                pin = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('pin', [''])[0]
                if self.local() or setup.pin_ok(pin):
                    self.json(200, setup.status(self.local()))
                else:
                    self.json(403, {'state': 'sin-permiso'})
            else:
                self.send(404, b'', 'text/plain')

        def do_POST(self):  # pylint: disable=invalid-name
            if urllib.parse.urlsplit(self.path).path != '/direccion':
                self.send(404, b'', 'text/plain')
                return
            try:
                length = int(self.headers.get('Content-Length') or 0)
                asked = json.loads(self.rfile.read(min(length, 4096)).decode('utf-8')) if 0 < length <= 4096 else {}
            except (ValueError, UnicodeDecodeError):
                asked = {}
            if not isinstance(asked, dict) or not (self.local() or setup.pin_ok(asked.get('pin'))):
                self.json(403, {'state': 'sin-permiso'})
                return
            setup.attempt(str(asked.get('direccion', ''))[:300], 'television' if self.local() else 'phone')
            self.json(200, setup.status(self.local()))

    return Handler


def serve(setup):
    server = ThreadingHTTPServer(('', PORT), handler(setup))
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    threading.Thread(target=setup.retry, daemon=True).start()
    log('setup page on port %d' % PORT)
    setup.done.wait()
    time.sleep(6)                       # the television and the phone say «connected» before the session goes
    restart_session()
    server.shutdown()


def change(text):
    """sudo hechauka-direccion [ADDRESS]: where the screen goes, or move it to another Moodle."""
    if not text:
        print(read_conf().get('URL') or 'no address yet')
        return 0
    try:
        info, base = check(text)
    except Unreachable as e:
        print('Not a Moodle with Hechauka that answers (%s%s)' % (e.code, ': ' + e.host if e.host else ''))
        return 1
    url = keep(base, info)
    print('Now %s (%s). Restarting the session of the screen.' % (url, info.get('sitio', '')))
    restart_session()
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--direccion', nargs='?', const='', default=None, help='show or change the address of the Moodle')
    args = parser.parse_args()
    if args.direccion is not None:
        return change(args.direccion)
    url = read_conf().get('URL', '')
    if url and not os.path.exists(PENDING):
        target(url)
        return 0
    error = None
    if url:
        # The first boot after installing: the address the card brought is checked before the player opens on it.
        wait_for_clock(45)
        for attempt in range(3):
            try:
                info, base = check(url)
                keep(base, info)
                return 0
            except Unreachable as e:
                error = e
                log('first check: %s (%s)' % (e.code, e.host))
                if e.code not in PASSING:
                    break
                time.sleep(5 * (attempt + 1))
    target('http://127.0.0.1:%d/' % PORT)
    serve(Setup(base_of(url) if url else '', error))
    return 0


if __name__ == '__main__':
    sys.exit(main())
