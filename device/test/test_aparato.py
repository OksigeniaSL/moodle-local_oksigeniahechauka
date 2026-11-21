"""Tests that the device's code changes the machine only on a Hechauka device (DEVICE, the key its card always brings):
on 21-11-2026 a test of the guardian restarted the desktop of the laptop it ran on.
python3 -B -m unittest discover -s device/test"""
import importlib.util
import os
import subprocess
import sys
import tempfile
import types
import unittest

LIB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'raiz', 'usr', 'local', 'lib', 'hechauka')
sys.path.insert(0, LIB)
import actualiza  # noqa: E402  pylint: disable=wrong-import-position
import ajuste  # noqa: E402  pylint: disable=wrong-import-position
import guardian  # noqa: E402  pylint: disable=wrong-import-position


def load_rescue():
    spec = importlib.util.spec_from_file_location('rescate_aparato', os.path.join(LIB, 'rescate.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class OnlyOnADevice(unittest.TestCase):

    def setUp(self):
        # Nothing reaches the machine in these tests, whatever the code does: subprocess.run only takes notes.
        self.asked = []
        original = subprocess.run
        self.addCleanup(setattr, subprocess, 'run', original)
        subprocess.run = lambda command, **kw: self.asked.append(command) or types.SimpleNamespace(stdout='UTC\n')
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.folder = folder.name
        self.rescate = load_rescue()
        for module, name in ((actualiza, 'LOG'), (ajuste, 'LOG'), (self.rescate, 'LOG')):
            self.swap(module, name, os.path.join(self.folder, 'registro'))

    def swap(self, module, name, value):
        self.addCleanup(setattr, module, name, getattr(module, name))
        setattr(module, name, value)

    def mark(self, here):
        path = os.path.join(self.folder, 'firma.pub')
        if here:
            with open(path, 'w', encoding='utf-8') as f:
                f.write('key\n')
        for module in (actualiza, ajuste, self.rescate):
            self.swap(module, 'DEVICE', path)

    def everything(self):
        actualiza.run(['systemctl', 'restart', 'lightdm'])
        self.rescate.run(['systemctl', 'restart', 'lightdm'])
        guardian.system(['systemctl', 'reboot'])
        ajuste.restart_session()
        ajuste.set_zone('Europe/Madrid')

    def test_a_computer_that_is_not_a_device_is_left_alone(self):
        self.mark(False)
        self.everything()
        changes = [c for c in self.asked if c[:2] != ['timedatectl', 'show']]
        self.assertEqual(changes, [])
        with open(os.path.join(self.folder, 'registro'), encoding='utf-8') as f:
            self.assertIn('not a device', f.read())

    def test_a_device_does_what_it_is_asked(self):
        self.mark(True)
        self.everything()
        self.assertIn(['systemctl', 'reboot'], self.asked)
        self.assertEqual(self.asked.count(['systemctl', 'restart', 'lightdm']), 3)
        self.assertIn(['timedatectl', 'set-timezone', 'Europe/Madrid'], self.asked)


if __name__ == '__main__':
    unittest.main()
