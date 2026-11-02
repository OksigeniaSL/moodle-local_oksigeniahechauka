#!/usr/bin/env python3
"""The manifest of the device's software: every file of raiz/ with its hash and its mode, and a version that changes when
any of them does. The guardian of each screen compares it with what it has and installs what changed, once the signature
of Oksigenia (manifest.sig, made apart with the private key) checks out against /etc/hechauka/firma.pub.

Usage: python3 -B device/manifest.py      (writes device/manifest.json)
"""
import hashlib
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'raiz')
# What runs: the rest is read.
EXECUTABLE = ('/usr/local/bin/', '/usr/local/lib/hechauka/')


def main():
    files = []
    for folder, _, names in os.walk(ROOT):
        for name in names:
            full = os.path.join(folder, name)
            path = '/' + os.path.relpath(full, ROOT).replace(os.sep, '/')
            with open(full, 'rb') as f:
                digest = hashlib.sha256(f.read()).hexdigest()
            mode = '755' if path.startswith(EXECUTABLE) and not path.endswith('.json') else '644'
            files.append({'path': path, 'sha256': digest, 'mode': mode})
    files.sort(key=lambda f: f['path'])
    version = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()[:16]
    with open(os.path.join(HERE, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump({'version': version, 'files': files}, f, indent=1, sort_keys=True)
        f.write('\n')
    print('device', version, len(files), 'files')


if __name__ == '__main__':
    main()
