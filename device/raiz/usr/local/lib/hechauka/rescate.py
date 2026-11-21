#!/usr/bin/env python3
"""When the guardian of a Hechauka screen does not start (systemd runs this by OnFailure= after five failures in five
minutes): if a version had just gone in, what it replaced goes back, that version is not tried again, and the guardian
starts once more. It is never replaced along with the guardian and imports nothing of it: a guardian that breaks cannot
take its own way back with it.
"""
import json
import os
import shutil
import subprocess
import time

KEEP = '/var/lib/hechauka'
INSTALLED = KEEP + '/instalado.json'
BACKUP = KEEP + '/anterior'
PENDING = KEEP + '/pendiente.json'
LOG = '/var/log/hechauka-actualiza.log'
# Only a Hechauka device changes the machine it runs on: its card always brings the key that checks the updates, and a
# computer that imports these files in a test never has it (on 21-11-2026 a test of the guardian restarted the
# desktop of a laptop).
DEVICE = '/etc/hechauka/firma.pub'


def log(text):
    try:
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(time.strftime('%F %T ') + 'rescue: ' + text + '\n')
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
        f.flush()
        os.fsync(f.fileno())
    os.chmod(path + '.new', 0o644)
    os.replace(path + '.new', path)


def run(command):
    if not os.path.exists(DEVICE):
        log('not a device, not run: %s' % ' '.join(command))
        return
    try:
        subprocess.run(command, capture_output=True, timeout=300, check=False)
    except (OSError, subprocess.TimeoutExpired) as e:
        log('%s: %s' % (' '.join(command), e))


def main():
    pending = read_json(PENDING, None)
    if not pending:
        # Nothing just in: putting anything back would be guessing. The reboot of each night tries it again.
        log('the guardian does not start, and no version had just gone in')
        return
    for path in pending.get('changed', []):
        if os.path.exists(BACKUP + path):
            shutil.copyfile(BACKUP + path, path + '.hk-old')
            shutil.copymode(BACKUP + path, path + '.hk-old')
            os.replace(path + '.hk-old', path)
    for path in pending.get('created', []):
        try:
            os.remove(path)
        except OSError:
            pass
    if not pending.get('installing'):
        have = read_json(INSTALLED, {})
        write_json(INSTALLED, dict(have, bad=(have.get('bad', []) + [pending.get('version')])[-10:]))
    os.remove(PENDING)
    os.sync()
    log('version %s undone: the guardian did not start with it' % pending.get('version'))
    run(['systemctl', 'daemon-reload'])
    run(['systemctl', 'restart', 'lightdm'])
    run(['systemctl', 'reset-failed', 'hechauka-guardian.service'])
    run(['systemctl', 'start', 'hechauka-guardian.service'])


if __name__ == '__main__':
    main()
