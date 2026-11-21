"""Tests of the manifest of the device's software (device/manifest.py): its number only grows, and the one in the repository
is the one of these files, signed. python3 -B -m unittest discover -s device/test"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

DEVICE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, DEVICE)
import manifest  # noqa: E402  pylint: disable=wrong-import-position


class Numbers(unittest.TestCase):

    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.top = folder.name
        os.makedirs(os.path.join(self.top, 'device', 'raiz', 'usr'))
        for name, value in (('HERE', os.path.join(self.top, 'device')), ('ROOT', os.path.join(self.top, 'device', 'raiz'))):
            self.addCleanup(setattr, manifest, name, getattr(manifest, name))
            setattr(manifest, name, value)
        self.write('uno')
        self.plugin(2026112000)

    def write(self, body):
        with open(os.path.join(manifest.ROOT, 'usr', 'fichero'), 'w', encoding='utf-8') as f:
            f.write(body)

    def plugin(self, version):
        with open(os.path.join(self.top, 'version.php'), 'w', encoding='utf-8') as f:
            f.write('<?php\n$plugin->version = %d;\n' % version)

    def made(self):
        manifest.main()
        with open(os.path.join(manifest.HERE, 'manifest.json'), encoding='utf-8') as f:
            return json.load(f)

    def test_files_changed_before_the_plugin_goes_up_still_get_a_bigger_number(self):
        out = self.made()['serie']
        self.assertEqual(out, 2026112000)
        self.write('dos')
        before_version_php = self.made()['serie']
        self.assertGreater(before_version_php, out, 'the same number as the version out would be turned down')
        self.plugin(2026112100)
        self.assertEqual(self.made()['serie'], before_version_php, 'the same files keep their number')
        self.write('tres')
        self.assertEqual(self.made()['serie'], 2026112100)

    def test_the_same_files_keep_their_number(self):
        first = self.made()
        self.assertEqual(self.made(), first)


class TheOneInTheRepository(unittest.TestCase):
    """A file of raiz/ changed without making the manifest again would never reach a screen."""

    def test_it_is_the_manifest_of_these_files(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        copy = os.path.join(folder.name, 'device')
        shutil.copytree(os.path.join(DEVICE, 'raiz'), os.path.join(copy, 'raiz'))
        shutil.copy(os.path.join(DEVICE, 'manifest.json'), copy)
        shutil.copy(os.path.join(DEVICE, '..', 'version.php'), folder.name)
        for name, value in (('HERE', copy), ('ROOT', os.path.join(copy, 'raiz'))):
            self.addCleanup(setattr, manifest, name, getattr(manifest, name))
            setattr(manifest, name, value)
        with open(os.path.join(DEVICE, 'manifest.json'), encoding='utf-8') as f:
            committed = json.load(f)
        manifest.main()
        with open(os.path.join(copy, 'manifest.json'), encoding='utf-8') as f:
            again = json.load(f)
        self.assertEqual(again['version'], committed['version'], 'make it again: python3 -B device/manifest.py, and sign it')
        self.assertEqual(again['serie'], committed['serie'])

    @unittest.skipUnless(shutil.which('openssl'), 'openssl is not here')
    def test_it_is_signed(self):
        done = subprocess.run(['openssl', 'pkeyutl', '-verify', '-pubin', '-inkey',
                               os.path.join(DEVICE, 'raiz', 'etc', 'hechauka', 'firma.pub'), '-rawin',
                               '-in', os.path.join(DEVICE, 'manifest.json'),
                               '-sigfile', os.path.join(DEVICE, 'manifest.sig')], capture_output=True, check=False)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)


if __name__ == '__main__':
    unittest.main()
