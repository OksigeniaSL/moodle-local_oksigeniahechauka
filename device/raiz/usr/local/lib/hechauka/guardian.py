#!/usr/bin/env python3
"""The guardian of a Hechauka screen, as root and outside the session: what the agent cannot do by itself.

It reads what the agent leaves in /run/hechauka. With nothing fresh for 3 minutes, the session is dead: it restarts it. If the
agent asks for a reboot, it does it, within its limits, and says why after the boot. Beyond the limits it does nothing more: a
device in a loop of reboots is worse than one waiting for someone, and the reboot of each night is still to come.

It also keeps the software of the screen up to date from its Moodle (actualiza.py), with what only Oksigenia signs.
"""
import json
import os
import subprocess
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


def publish(counts, now):
    """For the agent, which is not root: how many reboots today, and why the last one."""
    out = {'restarts_24h': len([t for t in counts['reboots'] if now - t < 24 * 3600])}
    try:
        with open(LAST, encoding='utf-8') as f:
            out['last_reboot'] = f.read().strip()[:80]
    except OSError:
        pass
    path = RUN + '/reinicios.json'
    with open(path + '.new', 'w', encoding='utf-8') as f:
        json.dump(out, f)
    os.chmod(path + '.new', 0o644)
    os.replace(path + '.new', path)


def agent_state(now):
    """What the agent said last, and how long ago."""
    path = RUN + '/estado.json'
    try:
        age = now - os.path.getmtime(path)
        with open(path, encoding='utf-8') as f:
            return json.load(f), age
    except (OSError, ValueError):
        return None, uptime()


def main():
    os.makedirs(KEEP, exist_ok=True)
    updater = actualiza.Updater()
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
        except Exception as e:  # pylint: disable=broad-except
            actualiza.log('guardian: %s' % e)
        asked = RUN + '/pide'
        if os.path.exists(asked):
            with open(asked, encoding='utf-8') as f:
                why = f.read().strip()[:80]
            os.remove(asked)
            if all(len([t for t in counts['reboots'] if now - t < span]) < limit for span, limit in REBOOTS):
                counts['reboots'].append(now)
                save(counts)
                with open(LAST, 'w', encoding='utf-8') as f:
                    f.write(time.strftime('%F %T ') + why)
                subprocess.run(['systemctl', 'reboot'], check=False)
                continue
        try:
            age = now - os.path.getmtime(RUN + '/estado.json')
        except OSError:
            age = uptime()
        if age > STALE and uptime() > BOOT_GRACE and len(counts['sessions']) < SESSIONS_PER_HOUR:
            counts['sessions'].append(now)
            save(counts)
            subprocess.run(['systemctl', 'restart', 'lightdm'], check=False)


if __name__ == '__main__':
    main()
