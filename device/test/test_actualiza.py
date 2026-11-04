"""Tests of how a screen keeps what it has downloaded until it can put it in (device/raiz/usr/local/lib/hechauka/actualiza.py):
python3 -B -m unittest discover -s device/test"""
import hashlib
import json
import os
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'raiz', 'usr', 'local', 'lib', 'hechauka'))
import actualiza  # noqa: E402  pylint: disable=wrong-import-position

CHANGED = '/usr/local/lib/hechauka/agente.py'
BODY = b'print("the new agent")\n'
ON = {'on': True}


def at(day, hour, minute=0):
    """A moment of November 2026 on the clock of the screen."""
    return time.mktime((2026, 11, day, hour, minute, 0, 0, 0, -1))


class Waiting(unittest.TestCase):
    """A screen with a version ready: when it goes in, and what a reboot does to it."""

    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        keep = self.folder.name
        for name, value in (('KEEP', keep), ('STAGE', keep + '/nuevo'), ('STAGED', keep + '/preparado.json'),
                            ('INSTALLED', keep + '/instalado.json'), ('PENDING', keep + '/pendiente.json'),
                            ('BACKUP', keep + '/anterior'), ('NOW', keep + '/actualiza-ya'), ('LOG', keep + '/registro')):
            original = getattr(actualiza, name)
            self.addCleanup(setattr, actualiza, name, original)
            setattr(actualiza, name, value)
        self.staged_at = at(5, 8, 16)

    def ready(self, version='nueva'):
        """What look() leaves on the card after downloading a version."""
        target = actualiza.STAGE + CHANGED
        os.makedirs(os.path.dirname(target))
        with open(target, 'wb') as f:
            f.write(BODY)
        files = [{'path': CHANGED, 'sha256': hashlib.sha256(BODY).hexdigest(), 'mode': '755'}]
        actualiza.write_json(actualiza.STAGED, {'version': version, 'files': files, 'changed': [CHANGED], 'at': int(self.staged_at)})

    @staticmethod
    def updater():
        """A guardian starting, as after a reboot; what it puts in is noted instead of put in."""
        updater = actualiza.Updater()
        updater.put_in = []
        updater.install = lambda now: updater.put_in.append(updater.staged['version']) or False
        return updater

    def test_a_reboot_keeps_what_is_ready_and_since_when(self):
        self.ready()
        updater = self.updater()
        self.assertEqual(updater.staged['version'], 'nueva')
        self.assertEqual(updater.staged_at, int(self.staged_at))

    def test_a_day_goes_by_across_the_nightly_reboot(self):
        self.ready()
        updater = self.updater()
        updater.tick(at(6, 8, 15), ON, 10)
        self.assertEqual(updater.put_in, [])
        updater.tick(at(6, 8, 17), ON, 10)
        self.assertEqual(updater.put_in, ['nueva'])

    def test_a_screen_never_off_takes_it_in_the_small_hours(self):
        self.ready()
        updater = self.updater()
        updater.tick(at(5, 22), ON, 10)
        updater.tick(at(6, 2, 59), ON, 10)
        self.assertEqual(updater.put_in, [])
        updater.tick(at(6, 3, 1), ON, 10)
        self.assertEqual(updater.put_in, ['nueva'])

    def test_a_screen_off_by_its_hours_takes_it_at_once(self):
        self.ready()
        updater = self.updater()
        updater.tick(at(5, 18), {'on': False}, 10)
        self.assertEqual(updater.put_in, ['nueva'])

    def test_a_missing_file_means_nothing_is_ready(self):
        self.ready()
        os.remove(actualiza.STAGE + CHANGED)
        self.assertIsNone(self.updater().staged)
        self.assertFalse(os.path.exists(actualiza.STAGED))

    def test_a_changed_file_means_nothing_is_ready(self):
        self.ready()
        with open(actualiza.STAGE + CHANGED, 'ab') as f:
            f.write(b'# not what was checked\n')
        self.assertIsNone(self.updater().staged)

    def test_a_version_already_in_is_not_put_in_again(self):
        self.ready()
        actualiza.write_json(actualiza.INSTALLED, {'version': 'nueva'})
        self.assertIsNone(self.updater().staged)

    def test_a_version_that_failed_is_not_tried_again(self):
        self.ready()
        actualiza.write_json(actualiza.INSTALLED, {'version': 'otra', 'bad': ['nueva']})
        self.assertIsNone(self.updater().staged)

    def test_what_is_downloaded_survives_a_reboot(self):
        manifest = json.dumps({'version': 'nueva', 'files': [
            {'path': self.folder.name + CHANGED, 'sha256': hashlib.sha256(BODY).hexdigest(), 'mode': '755'}]}).encode()
        answers = {'manifest.json': manifest, 'manifest.sig': b'firma', 'raiz' + self.folder.name + CHANGED: BODY}
        for name, value in (('fetch', answers.__getitem__), ('signed', lambda m, s: True)):
            self.addCleanup(setattr, actualiza, name, getattr(actualiza, name))
            setattr(actualiza, name, value)
        actualiza.Updater().look(self.staged_at)
        again = self.updater()
        self.assertEqual(again.staged['version'], 'nueva')
        self.assertEqual(again.staged_at, int(self.staged_at))

    def test_putting_it_in_leaves_no_note(self):
        self.ready()
        updater = actualiza.Updater()
        updater.staged['changed'] = []
        updater.staged['files'] = []
        updater.install(at(6, 3, 1))
        self.assertFalse(os.path.exists(actualiza.STAGED))
        self.assertFalse(os.path.exists(actualiza.STAGE))
        self.assertTrue(os.path.exists(actualiza.PENDING))

    def test_a_broken_note_is_not_a_failure(self):
        with open(actualiza.STAGED, 'w', encoding='utf-8') as f:
            json.dump({'version': 'nueva'}, f)
        self.assertIsNone(self.updater().staged)
        self.assertFalse(os.path.exists(actualiza.STAGED))


if __name__ == '__main__':
    unittest.main()
