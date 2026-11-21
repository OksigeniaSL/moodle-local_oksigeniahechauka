#!/usr/bin/env python3
"""The manifest of the device's software: every file of raiz/ with its hash and its mode, a version that changes when
any of them does, and a number that only grows («serie»: the plugin's version when the files last changed), so that a
screen never takes an older signed manifest. The guardian of each screen compares it with what it has and installs what changed, once the signature
of Oksigenia (manifest.sig, made apart with the private key) checks out against /etc/hechauka/firma.pub.

Usage: python3 -B device/manifest.py      (writes device/manifest.json)
"""
import hashlib
import json
import os
import re

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
    out = os.path.join(HERE, 'manifest.json')
    try:
        with open(out, encoding='utf-8') as f:
            before = json.load(f)
    except (OSError, ValueError):
        before = {}
    # The same files keep their number. New ones take the plugin's version, and always more than the last number: files
    # changed before version.php goes up would otherwise repeat the number of the version out, and every screen would
    # turn the new one down as not newer.
    if before.get('version') == version and before.get('serie'):
        serie = before['serie']
    else:
        with open(os.path.join(HERE, '..', 'version.php'), encoding='utf-8') as f:
            plugin = int(re.search(r'\$plugin->version\s*=\s*(\d+)', f.read()).group(1))
        serie = max(plugin, int(before.get('serie') or 0) + 1)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'version': version, 'serie': serie, 'files': files}, f, indent=1, sort_keys=True)
        f.write('\n')
    print('device', version, 'serie', serie, len(files), 'files')


if __name__ == '__main__':
    main()
