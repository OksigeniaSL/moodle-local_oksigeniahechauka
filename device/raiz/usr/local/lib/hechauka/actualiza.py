"""The software of a Hechauka screen kept up to date from its own Moodle, by the guardian (as root).

Twice a day it asks the plugin for the manifest of the device's software (api/device.php) and its signature. Only a manifest
signed by Oksigenia (/etc/hechauka/firma.pub) is believed: whoever got into a Moodle cannot send code to its screens. What
changed is downloaded, each file checked against its hash, and kept aside until the screen is off by its hours or, for one
that is never off, until the small hours of the night (a day at most, for one unplugged at night). What is kept aside
survives a reboot: the reboot of each night comes before those 24 hours. Then it goes in, with a copy of what it replaces. If
the agent gives no sign of life in the next ten minutes, the copy goes back and that version is not tried again.
"""
import hashlib
import json
import os
import shutil
import subprocess
import time
import urllib.parse
import urllib.request

CONF = '/etc/hechauka/pantalla.conf'
PUB = '/etc/hechauka/firma.pub'
KEEP = '/var/lib/hechauka'
INSTALLED = KEEP + '/instalado.json'
STAGE = KEEP + '/nuevo'
STAGED = KEEP + '/preparado.json'
BACKUP = KEEP + '/anterior'
PENDING = KEEP + '/pendiente.json'
LOG = '/var/log/hechauka-actualiza.log'
# «sudo touch /run/hechauka/actualiza-ya» by SSH: look now, and put in what is ready without waiting for the screen to be off.
NOW = '/run/hechauka/actualiza-ya'
FIRST = 10 * 60                 # after the boot, before the first look
EVERY = 12 * 3600
RETRY = 30 * 60                 # after a look that failed
CONFIRM_WITHIN = 10 * 60
WAIT_FOR_OFF = 24 * 3600
# Hours of the night when a screen that is never off takes what is ready: before the reboot of 04:20, with nobody looking.
NIGHT = (3,)
LARGEST = 4 * 1024 * 1024
# What each part of the system needs to take a new file.
SESSION = ('/usr/local/lib/hechauka/agente.py', '/usr/local/bin/hechauka-pantalla', '/usr/local/bin/hechauka-sesion',
           '/etc/hechauka/labwc/', '/etc/chromium/', '/usr/share/wayland-sessions/')
SELF = ('/usr/local/lib/hechauka/guardian.py', '/usr/local/lib/hechauka/actualiza.py')


def log(text):
    try:
        if os.path.exists(LOG) and os.path.getsize(LOG) > 500000:
            os.replace(LOG, LOG + '.1')
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(time.strftime('%F %T ') + text + '\n')
    except OSError:
        pass


def read_json(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path, value):
    with open(path + '.new', 'w', encoding='utf-8') as f:
        json.dump(value, f)
    os.chmod(path + '.new', 0o644)
    os.replace(path + '.new', path)


def sha256(path):
    try:
        with open(path, 'rb') as f:
            return hashlib.sha256(f.read()).hexdigest()
    except OSError:
        return None


def server():
    """Where the plugin is: the address of the player, without «player/»."""
    with open(CONF, encoding='utf-8') as f:
        for line in f:
            if line.startswith('URL='):
                url = line[4:].strip()
                return url[:url.rindex('/player')] + '/' if '/player' in url else url.rstrip('/') + '/'
    raise ValueError('no URL in ' + CONF)


def fetch(name):
    url = server() + 'api/device.php?f=' + urllib.parse.quote(name)
    request = urllib.request.Request(url, headers={'User-Agent': 'Hechauka device'})
    with urllib.request.urlopen(request, timeout=30) as answer:
        data = answer.read(LARGEST + 1)
    if len(data) > LARGEST:
        raise ValueError('too large: ' + name)
    return data


def signed(manifest, signature):
    """Whether Oksigenia signed this manifest, by openssl, which every screen has."""
    os.makedirs(KEEP, exist_ok=True)
    m, s = KEEP + '/comprueba.json', KEEP + '/comprueba.sig'
    with open(m, 'wb') as f:
        f.write(manifest)
    with open(s, 'wb') as f:
        f.write(signature)
    done = subprocess.run(['openssl', 'pkeyutl', '-verify', '-pubin', '-inkey', PUB, '-rawin', '-in', m, '-sigfile', s],
                          capture_output=True, timeout=30)
    return done.returncode == 0


def compiles(path):
    if not path.endswith('.py'):
        return True
    try:
        with open(path, encoding='utf-8') as f:
            compile(f.read(), path, 'exec')
        return True
    except (OSError, SyntaxError, ValueError):
        return False


def run(command):
    try:
        subprocess.run(command, capture_output=True, timeout=600)
    except (OSError, subprocess.TimeoutExpired) as e:
        log('%s: %s' % (' '.join(command), e))


class Updater:
    def __init__(self):
        self.next_look = time.time() + FIRST
        self.staged, self.staged_at = self.restore()

    @staticmethod
    def restore():
        """What a previous run left ready, if all of it is still there and is still wanted."""
        kept = read_json(STAGED, None)
        if kept is None:
            return None, 0
        have = read_json(INSTALLED, {})
        try:
            hashes = {e['path']: e['sha256'] for e in kept['files']}
            whole = all(sha256(STAGE + path) == hashes[path] for path in kept['changed'])
            if whole and kept['version'] != have.get('version') and kept['version'] not in have.get('bad', []):
                log('version %s still ready, since %s' % (kept['version'], time.strftime('%F %T', time.localtime(kept['at']))))
                return {'version': kept['version'], 'files': kept['files'], 'changed': kept['changed']}, kept['at']
        except (KeyError, TypeError):
            pass
        Updater.forget()
        return None, 0

    @staticmethod
    def forget():
        try:
            os.remove(STAGED)
        except OSError:
            pass

    def tick(self, now, state, state_age):
        """Called by the guardian every 30 s. Returns True when the guardian itself has to start again."""
        pending = read_json(PENDING, None)
        if pending:
            return self.settle(pending, now, state, state_age)
        hurry = os.path.exists(NOW)
        if self.staged:
            off = state is not None and state.get('on') is False
            night = time.localtime(now).tm_hour in NIGHT
            if hurry or off or night or now - self.staged_at > WAIT_FOR_OFF or state_age > 1800:
                if hurry:
                    os.remove(NOW)
                return self.install(now)
            return False
        if hurry and not self.staged:
            self.next_look = min(self.next_look, now)
        if now >= self.next_look:
            try:
                self.look(now)
                self.next_look = now + EVERY
            except Exception as e:  # pylint: disable=broad-except
                log('look: %s' % e)
                self.next_look = now + RETRY
            if hurry and not self.staged and os.path.exists(NOW):
                # Nothing new: the request is answered.
                os.remove(NOW)
        return False

    def look(self, now):
        manifest = fetch('manifest.json')
        signature = fetch('manifest.sig')
        if not signed(manifest, signature):
            log('a manifest without the signature of Oksigenia: left alone')
            return
        wanted = json.loads(manifest)
        have = read_json(INSTALLED, {})
        if wanted['version'] == have.get('version') or wanted['version'] in have.get('bad', []):
            return
        shutil.rmtree(STAGE, ignore_errors=True)
        changed = []
        for entry in wanted['files']:
            path = entry['path']
            if sha256(path) == entry['sha256']:
                continue
            data = fetch('raiz' + path)
            if hashlib.sha256(data).hexdigest() != entry['sha256']:
                raise ValueError('wrong file: ' + path)
            target = STAGE + path
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, 'wb') as f:
                f.write(data)
            if not compiles(target):
                raise ValueError('does not compile: ' + path)
            changed.append(path)
        with open(STAGE + '/.manifest.json', 'wb') as f:
            f.write(manifest)
        self.staged = {'version': wanted['version'], 'files': wanted['files'], 'changed': changed}
        self.staged_at = now
        write_json(STAGED, dict(self.staged, at=int(now)))
        log('version %s ready, %d files: %s' % (wanted['version'], len(changed), ', '.join(changed)[:300]))

    def install(self, now):
        staged, self.staged = self.staged, None
        self.forget()
        modes = {e['path']: e['mode'] for e in staged['files']}
        shutil.rmtree(BACKUP, ignore_errors=True)
        created = []
        for path in staged['changed']:
            if os.path.exists(path):
                os.makedirs(os.path.dirname(BACKUP + path), exist_ok=True)
                shutil.copy2(path, BACKUP + path)
            else:
                created.append(path)
        for path in staged['changed']:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            shutil.copyfile(STAGE + path, path + '.hk-new')
            os.chmod(path + '.hk-new', int(modes.get(path, '644'), 8))
            os.chown(path + '.hk-new', 0, 0)
            os.replace(path + '.hk-new', path)
        write_json(PENDING, {'version': staged['version'], 'at': int(now), 'changed': staged['changed'], 'created': created})
        shutil.rmtree(STAGE, ignore_errors=True)
        log('version %s in; waiting for the agent' % staged['version'])
        return self.apply(staged['changed'])

    @staticmethod
    def apply(changed):
        """What each part of the system needs to take what changed. True when the guardian has to start again."""
        def touched(prefixes):
            return any(p.startswith(prefixes) for p in changed)
        if touched(('/etc/systemd/',)):
            run(['systemctl', 'daemon-reload'])
        if touched(('/etc/systemd/journald.conf.d/',)):
            run(['systemctl', 'restart', 'systemd-journald'])
        if touched(('/etc/sysctl.d/',)):
            run(['sysctl', '--system'])
        if touched(('/etc/tmpfiles.d/',)):
            run(['systemd-tmpfiles', '--create'])
        if touched(('/etc/ssh/',)):
            run(['systemctl', 'reload', 'ssh'])
        if touched(('/usr/share/plymouth/',)):
            run(['plymouth-set-default-theme', '-R', 'hechauka'])
        if touched(SESSION):
            run(['systemctl', 'restart', 'lightdm'])
        return touched(SELF)

    def settle(self, pending, now, state, state_age):
        """A version just in: kept once the agent speaks with a page, undone if it does not within ten minutes."""
        alive = state is not None and state.get('page') and state.get('at', 0) > pending['at'] + 30 and state_age < 120
        if alive:
            have = read_json(INSTALLED, {})
            write_json(INSTALLED, {'version': pending['version'], 'at': int(now), 'bad': have.get('bad', [])[-10:]})
            os.remove(PENDING)
            log('version %s kept' % pending['version'])
            return False
        if now - pending['at'] < CONFIRM_WITHIN:
            return False
        for path in pending['changed']:
            if os.path.exists(BACKUP + path):
                shutil.copyfile(BACKUP + path, path + '.hk-old')
                shutil.copymode(BACKUP + path, path + '.hk-old')
                os.replace(path + '.hk-old', path)
        for path in pending['created']:
            try:
                os.remove(path)
            except OSError:
                pass
        have = read_json(INSTALLED, {})
        write_json(INSTALLED, dict(have, bad=(have.get('bad', []) + [pending['version']])[-10:]))
        os.remove(PENDING)
        log('version %s undone: the agent gave no sign of life' % pending['version'])
        return self.apply(pending['changed'])
