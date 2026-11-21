#!/usr/bin/env python3
"""The guardian of a Hechauka screen, as root and outside the session: what the agent cannot do by itself.

It reads what the agent leaves in /run/hechauka. With nothing fresh for 3 minutes, the session is dead: it restarts it. If the
agent asks for a reboot, it does it, within its limits, and says why after the boot. Beyond the limits it does nothing more: a
device in a loop of reboots is worse than one waiting for someone, and the reboot of each night is still to come.

It also keeps the software of the screen up to date from its Moodle (actualiza.py), with what only Oksigenia signs.
"""
import json
import os
import re
import stat
import subprocess
import tempfile
import time

import actualiza

RUN = '/run/hechauka'
KEEP = '/var/lib/hechauka'
COUNTS = KEEP + '/contadores.json'
LAST = KEEP + '/ultimo-reinicio'
STALE = 3 * 60
BOOT_GRACE = 5 * 60
SESSIONS_PER_HOUR = 3
REBOOTS = [(6 * 3600, 2), (24 * 3600, 4)]
# Turns in a row that fail with a version just in: it is that version, and the rescue puts the old one back.
TICK_FAILURES = 3


def system(command):
    """A reboot or a new session, only on a device (actualiza.on_device)."""
    if not actualiza.on_device():
        actualiza.log('guardian: not a device, not run: %s' % ' '.join(command))
        return
    subprocess.run(command, check=False)


def load():
    try:
        with open(COUNTS, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {'reboots': [], 'sessions': []}


def save(counts):
    with open(COUNTS + '.new', 'w', encoding='utf-8') as f:
        json.dump(counts, f)
    os.replace(COUNTS + '.new', COUNTS)


def uptime():
    with open('/proc/uptime', encoding='utf-8') as f:
        return float(f.read().split()[0])


def write_safely(path, text):
    """In the folder the agent (not root) also writes in: always a new file of our own, renamed into place. A name the agent
    left (a link to anywhere) is never opened, only replaced."""
    fd, temporary = tempfile.mkstemp(dir=os.path.dirname(path), prefix='.hk-')
    try:
        os.fchmod(fd, 0o644)
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
        os.replace(temporary, path)
    except OSError:
        try:
            os.remove(temporary)
        except OSError:
            pass
        raise


def read_small(path, most=65536):
    """What the agent left in a file, only if it is a plain file: never through a link, and never waiting on a pipe."""
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise OSError('not a plain file: ' + path)
        return os.read(fd, most).decode('utf-8', 'replace')
    finally:
        os.close(fd)


def tame(text):
    """Why, in words that cannot do anything wherever they are written."""
    return re.sub(r'[^a-z0-9 .,:-]', '', text.lower().strip())[:80]


def publish(counts, now):
    """For the agent, which is not root: how many reboots today, and why the last one."""
    out = {'restarts_24h': len([t for t in counts['reboots'] if now - t < 24 * 3600])}
    try:
        with open(LAST, encoding='utf-8') as f:
            out['last_reboot'] = tame(f.read())
    except OSError:
        pass
    try:
        write_safely(RUN + '/reinicios.json', json.dumps(out))
    except OSError as e:
        actualiza.log('guardian: %s' % e)


def agent_state(now):
    """What the agent said last, and how long ago."""
    path = RUN + '/estado.json'
    try:
        age = now - os.lstat(path).st_mtime
        return json.loads(read_small(path)), age
    except (OSError, ValueError):
        return None, uptime()


def main():
    os.makedirs(KEEP, exist_ok=True)
    updater = actualiza.Updater()
    failures = 0
    while True:
        time.sleep(30)
        now = time.time()
        counts = load()
        counts['reboots'] = [t for t in counts.get('reboots', []) if now - t < 24 * 3600]
        counts['sessions'] = [t for t in counts.get('sessions', []) if now - t < 3600]
        publish(counts, now)
        state, age = agent_state(now)
        try:
            if updater.tick(now, state, age):
                # A new guardian came in: systemd starts it again in ten seconds.
                os._exit(0)
            failures = 0
        except Exception as e:  # pylint: disable=broad-except
            actualiza.log('guardian: %s' % e)
            failures += 1
            if failures >= TICK_FAILURES and os.path.exists(actualiza.PENDING):
                # The version just in breaks the guardian's own turn, so it would never be kept nor undone (and OnFailure=
                # only comes when the guardian dies): the rescue puts the old one back and systemd starts this again.
                actualiza.log('guardian: %d turns failed with a version just in: the rescue puts it back' % failures)
                system(['systemctl', 'start', '--no-block', 'hechauka-rescate.service'])
                os._exit(1)
        asked = RUN + '/pide'
        if os.path.lexists(asked):
            try:
                why = tame(read_small(asked, 200))
            except OSError:
                why = 'asked'
            try:
                os.remove(asked)
            except OSError:
                pass
            if all(len([t for t in counts['reboots'] if now - t < span]) < limit for span, limit in REBOOTS):
                counts['reboots'].append(now)
                save(counts)
                with open(LAST, 'w', encoding='utf-8') as f:
                    f.write(time.strftime('%F %T ') + why)
                system(['systemctl', 'reboot'])
                continue
        try:
            age = now - os.lstat(RUN + '/estado.json').st_mtime
        except OSError:
            age = uptime()
        if age > STALE and uptime() > BOOT_GRACE and len(counts['sessions']) < SESSIONS_PER_HOUR:
            counts['sessions'].append(now)
            save(counts)
            system(['systemctl', 'restart', 'lightdm'])


if __name__ == '__main__':
    main()
