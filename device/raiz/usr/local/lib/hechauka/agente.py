#!/usr/bin/env python3
"""The agent of a Hechauka screen, as the user «pantalla»: it runs Chromium and looks after it.

The page cannot be the witness of itself: on 1 November 2026 a kernel failure froze the picture on a Pi 4 while the page went
on reporting that all was well. So, from outside the browser, every 30 s:
- a corner of what the compositor is showing, where the player changes a pixel every 20 s: nothing changes for 5 minutes, the
  picture is frozen. First the browser is restarted; if it happens again within 30 minutes, the guardian is asked to reboot;
- the page, through Chromium's debugging pipe (no port, nobody else can connect, and no dependency): if it does not answer or
  is not the player, it is navigated again and, in the end, the browser is restarted;
- the television, by CEC, following the page's power hours, only when those change: whoever switches it on by hand is not fought;
- what the device knows goes into the page, which sends it with its heartbeat, and a capture every 10 minutes, which the page
  uploads with its key.

Limits: 3 browser restarts an hour; after that it says «stuck» and waits. The reboots and their limits are the guardian's.
"""
import base64
import fcntl
import hashlib
import json
import os
import re
import select
import signal
import subprocess
import time

URL = os.environ['HK_URL']
HOME = os.path.expanduser('~')
PROFILE = HOME + '/.config/hechauka-chromium'
LOGS = HOME + '/.cache/hechauka'
KEEP = HOME + '/.local/state/hechauka'
KEYCOPY = KEEP + '/clave'
RUN = '/run/hechauka'
CYCLE = 30
FROZEN_AFTER = 10            # cycles with the corner unchanged: 5 minutes
GRACE = 120                  # seconds after launching, when nothing is judged
PAGE_NAVIGATE_AFTER = 3      # cycles with no page: 90 s
PAGE_KILL_AFTER = 10         # 5 minutes
AGAIN_WITHIN = 30 * 60       # a second freeze this soon: the browser was not the problem
KILLS_PER_HOUR = 3
SHOT_EVERY = 10 * 60
SHOT_LIMIT = 1900000
CEC_EVERY = 60
CHROMIUM = ['chromium', '--kiosk', '--class=hechauka', '--user-data-dir=' + PROFILE, '--ozone-platform=wayland',
            # No hardware video decoding: on a Pi 4 (bcm2835-codec, kernel 6.18) a video that stops can take the kernel down.
            '--disable-accelerated-video-decode', '--noerrdialogs', '--disable-infobars', '--no-first-run',
            '--hide-crash-restore-bubble', '--autoplay-policy=no-user-gesture-required',
            '--check-for-update-interval=31536000', '--password-store=basic', '--remote-debugging-pipe',
            # The HTTP cache in memory, which saves the card; what the screen keeps to work without a network is not there.
            '--disk-cache-dir=/dev/shm/hechauka-cache', '--disk-cache-size=52428800', URL]


def log(text):
    path = LOGS + '/agente.log'
    try:
        if os.path.exists(path) and os.path.getsize(path) > 1000000:
            os.replace(path, path + '.1')
        with open(path, 'a', encoding='utf-8') as f:
            f.write(time.strftime('%F %T ') + text + '\n')
    except OSError:
        pass


class Browser:
    """Chromium, with its debugging pipe: it reads on fd 3 and writes on fd 4, messages of JSON ended by a zero byte."""

    def __init__(self):
        self.process = None
        self.rx = self.tx = -1
        self.buffer = b''
        self.next_id = 0
        self.session = None
        self.started = 0

    def start(self):
        self.tidy_profile()
        to_child_r, to_child_w = os.pipe()
        from_child_r, from_child_w = os.pipe()
        # Above the fds the child has to find.
        high = [fcntl.fcntl(fd, fcntl.F_DUPFD, 10) for fd in (to_child_r, to_child_w, from_child_r, from_child_w)]
        for fd in (to_child_r, to_child_w, from_child_r, from_child_w):
            os.close(fd)
        to_child_r, to_child_w, from_child_r, from_child_w = high

        def wire():
            os.dup2(to_child_r, 3)
            os.dup2(from_child_w, 4)

        out = open(LOGS + '/chromium.log', 'ab')
        self.process = subprocess.Popen(CHROMIUM, preexec_fn=wire, pass_fds=(3, 4), stdout=out, stderr=out)
        out.close()
        os.close(to_child_r)
        os.close(from_child_w)
        self.tx, self.rx = to_child_w, from_child_r
        self.buffer = b''
        self.session = None
        self.started = time.time()
        log('browser started, pid %d' % self.process.pid)

    @staticmethod
    def tidy_profile():
        # After a power cut Chromium thinks it crashed and offers to restore the tabs: it did not.
        path = PROFILE + '/Default/Preferences'
        try:
            with open(path, encoding='utf-8') as f:
                text = f.read()
            text = text.replace('"exited_cleanly":false', '"exited_cleanly":true')
            text = re.sub(r'"exit_type":"[^"]*"', '"exit_type":"Normal"', text)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(text)
        except OSError:
            pass

    def alive(self):
        return self.process is not None and self.process.poll() is None

    def stop(self):
        if not self.process:
            return
        try:
            self.process.terminate()
            try:
                self.process.wait(10)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(10)
        except (OSError, subprocess.TimeoutExpired):
            pass
        for fd in (self.rx, self.tx):
            try:
                os.close(fd)
            except OSError:
                pass
        self.rx = self.tx = -1
        self.process = None
        self.session = None

    def call(self, method, params=None, session=None, limit=10):
        """One call, with a limit: a page that does not answer is a diagnosis, not a failure of the agent."""
        self.next_id += 1
        message = {'id': self.next_id, 'method': method, 'params': params or {}}
        if session:
            message['sessionId'] = session
        os.write(self.tx, json.dumps(message).encode() + b'\0')
        until = time.time() + limit
        while time.time() < until:
            ready, _, _ = select.select([self.rx], [], [], max(0, until - time.time()))
            if not ready:
                break
            chunk = os.read(self.rx, 1 << 20)
            if not chunk:
                raise OSError('the pipe closed')
            self.buffer += chunk
            while b'\0' in self.buffer:
                raw, self.buffer = self.buffer.split(b'\0', 1)
                answer = json.loads(raw)
                if answer.get('id') == self.next_id:
                    if 'error' in answer:
                        raise ValueError(str(answer['error'])[:200])
                    return answer.get('result', {})
        raise TimeoutError(method)

    def attach(self):
        targets = self.call('Target.getTargets')['targetInfos']
        pages = [t for t in targets if t.get('type') == 'page']
        if not pages:
            raise ValueError('no page')
        self.session = self.call('Target.attachToTarget', {'targetId': pages[0]['targetId'], 'flatten': True})['sessionId']
        return pages[0].get('url', '')

    def evaluate(self, expression, limit=10):
        if not self.session:
            self.attach()
        result = self.call('Runtime.evaluate', {'expression': expression, 'returnByValue': True}, self.session, limit)
        return result.get('result', {}).get('value')

    def navigate(self):
        if not self.session:
            self.attach()
        self.call('Page.navigate', {'url': URL}, self.session)


def run(command, limit=15):
    try:
        return subprocess.run(command, capture_output=True, timeout=limit)
    except (OSError, subprocess.TimeoutExpired):
        return None


def corner():
    """A fingerprint of what the compositor shows in the corner, or None if it cannot say."""
    done = run(['grim', '-g', '0,0 8x8', '-t', 'ppm', '-'], 10)
    return hashlib.sha1(done.stdout).hexdigest() if done and done.returncode == 0 and done.stdout else None


def capture():
    done = run(['grim', '-t', 'png', '-s', '0.5', '-l', '7', '-'], 20)
    return done.stdout if done and done.returncode == 0 and 0 < len(done.stdout) <= SHOT_LIMIT else None


class Television:
    """By CEC, if there is one that answers. The first day says what it can do; a screen with no CEC is said to have none."""

    def __init__(self):
        self.want = None
        self.state = 'unknown'
        self.retries = 0
        self.ready = False

    @staticmethod
    def cec(*args):
        return run(['cec-ctl', '-d', '/dev/cec0', '--skip-info'] + list(args), 15)

    def power(self):
        done = self.cec('--to', '0', '--give-device-power-status')
        if not done or done.returncode != 0:
            return 'unknown'
        text = done.stdout.decode('utf-8', 'replace')
        if 'Not Acknowledged' in text or 'pwr-state' not in text:
            return 'unknown'
        return 'standby' if re.search(r'pwr-state:\s*standby', text) else 'on'

    def follow(self, on):
        if not os.path.exists('/dev/cec0'):
            self.state = 'none'
            return
        if not self.ready:
            self.cec('--playback')
            self.ready = True
        self.state = self.power()
        if self.state == 'unknown':
            return
        # Only when the hours change, and until it has obeyed.
        if on != self.want:
            self.want = on
            self.retries = 3
        if self.retries > 0:
            wrong = (on and self.state == 'standby') or (not on and self.state == 'on')
            if not wrong:
                self.retries = 0
            else:
                self.retries -= 1
                log('television: ' + ('on' if on else 'standby'))
                self.cec('--to', '0', '--image-view-on' if on else '--standby')


def facts():
    """What the device knows, for the page to send with its heartbeat."""
    out = {}
    done = run(['vcgencmd', 'measure_temp'], 5)
    if done and done.returncode == 0:
        found = re.search(rb'temp=([\d.]+)', done.stdout)
        if found:
            out['temp'] = float(found.group(1))
    done = run(['vcgencmd', 'get_throttled'], 5)
    if done and done.returncode == 0:
        found = re.search(rb'throttled=(0x[0-9a-fA-F]+)', done.stdout)
        if found:
            out['throttled'] = found.group(1).decode()
    try:
        with open('/proc/mounts', encoding='utf-8') as f:
            root = [line.split() for line in f if line.split()[1:2] == ['/']]
        out['disk_ro'] = any('ro' in line[3].split(',') for line in root)
    except OSError:
        pass
    try:
        with open(RUN + '/reinicios.json', encoding='utf-8') as f:
            out.update(json.load(f))
    except (OSError, ValueError):
        pass
    try:
        # The version of the device's software, which the guardian keeps up to date.
        with open('/var/lib/hechauka/instalado.json', encoding='utf-8') as f:
            out['software'] = str(json.load(f).get('version', ''))[:16]
    except (OSError, ValueError):
        pass
    return out


def tell_guardian(state):
    try:
        path = RUN + '/estado.json'
        with open(path + '.new', 'w', encoding='utf-8') as f:
            json.dump(state, f)
        os.replace(path + '.new', path)
    except OSError as e:
        log('state: %s' % e)


def ask_reboot(why):
    log('asking for a reboot: ' + why)
    try:
        with open(RUN + '/pide', 'w', encoding='utf-8') as f:
            f.write(why)
    except OSError as e:
        log('ask: %s' % e)


def keep_key(value):
    """The only copy of the key out of the profile: a damaged profile must not leave a screen asking to be paired."""
    try:
        os.makedirs(KEEP, mode=0o700, exist_ok=True)
        descriptor = os.open(KEYCOPY, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, 'w') as f:
            f.write(value)
    except OSError as e:
        log('key: %s' % e)


def main():
    os.makedirs(LOGS, exist_ok=True)
    browser = Browser()
    tv = Television()
    signal.signal(signal.SIGTERM, lambda *a: (browser.stop(), os._exit(0)))
    last_corner = None
    same = 0
    no_page = 0
    killed = []
    frozen_at = 0
    next_shot = time.time() + 180
    next_cec = 0
    restored_at = 0
    on = True
    stuck = False
    frozen_now = False
    while True:
        now = time.time()
        if not browser.alive():
            if browser.process:
                log('the browser ended')
                browser.stop()
                time.sleep(5)
            browser.start()
            last_corner, same, no_page = None, 0, 0
            time.sleep(10)
            continue
        judged = now - browser.started > GRACE
        # 1. The picture.
        seen = corner()
        if seen is not None:
            same = same + 1 if seen == last_corner else 0
            last_corner = seen
        frozen_now = same >= FROZEN_AFTER and judged
        # 2. The page: what the device knows goes in, what it knows comes out.
        info = None
        try:
            answer = browser.evaluate('window.hechauka && window.hechauka.agent ? window.hechauka.agent(%s) : null'
                                      % json.dumps(dict(facts(), agent=1, frozen=frozen_now, tv=tv.state, stuck=stuck)))
            info = json.loads(answer) if answer else None
        except (OSError, ValueError, TimeoutError) as e:
            log('page: %s' % e)
            browser.session = None
        no_page = 0 if info else no_page + 1
        if info:
            on = bool(info.get('on', True))
            if info.get('key'):
                keep_key(info['key'])
            if info.get('revoked') and os.path.exists(KEYCOPY):
                # Taken out in the panel: it must not come back.
                os.remove(KEYCOPY)
            elif not info.get('key') and not info.get('revoked') and os.path.exists(KEYCOPY) and judged and \
                    now - restored_at > 3600:
                restored_at = now
                with open(KEYCOPY, encoding='utf-8') as f:
                    key = f.read().strip()
                log('the page lost its key: putting it back')
                browser.evaluate('localStorage.setItem("hechauka.key", %s); location.reload(); 1' % json.dumps(key))
        # 3. What to do about it.
        recent = [t for t in killed if now - t < 3600]
        stuck = len(recent) >= KILLS_PER_HOUR
        if judged and not stuck and (frozen_now or no_page >= PAGE_KILL_AFTER):
            why = 'frozen picture' if frozen_now else 'no page'
            if frozen_now and now - frozen_at < AGAIN_WITHIN:
                ask_reboot('frozen picture again')
            log('restarting the browser: ' + why)
            if frozen_now:
                frozen_at = now
            killed = recent + [now]
            browser.stop()
            same, no_page = 0, 0
            continue
        if judged and no_page in (PAGE_NAVIGATE_AFTER, PAGE_NAVIGATE_AFTER * 2):
            try:
                log('no page: navigating again')
                browser.navigate()
            except (OSError, ValueError, TimeoutError) as e:
                log('navigate: %s' % e)
                browser.session = None
        # 4. The television, and a capture now and then.
        if now >= next_cec:
            next_cec = now + CEC_EVERY
            tv.follow(on)
        if info and on and now >= next_shot:
            next_shot = now + SHOT_EVERY
            picture = capture()
            if picture:
                try:
                    browser.evaluate('window.hechauka.sendShot(%s); 1' % json.dumps(base64.b64encode(picture).decode()), 20)
                except (OSError, ValueError, TimeoutError) as e:
                    log('capture: %s' % e)
        tell_guardian({'at': int(now), 'frozen': frozen_now, 'page': bool(info), 'on': on, 'tv': tv.state, 'stuck': stuck})
        time.sleep(CYCLE)


if __name__ == '__main__':
    main()
