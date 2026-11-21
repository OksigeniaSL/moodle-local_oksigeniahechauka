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
        manifest = json.dumps({'version': 'nueva', 'serie': 2026112200, 'files': [
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



class Safely(unittest.TestCase):
    """What goes in never leaves a screen half way, never goes back to an older version, and a guardian that does not start
    is undone without it."""

    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        keep = self.folder.name + '/keep'
        os.makedirs(keep)
        for name, value in (('KEEP', keep), ('STAGE', keep + '/nuevo'), ('STAGED', keep + '/preparado.json'),
                            ('INSTALLED', keep + '/instalado.json'), ('PENDING', keep + '/pendiente.json'),
                            ('BACKUP', keep + '/anterior'), ('NOW', keep + '/actualiza-ya'), ('LOG', keep + '/registro')):
            original = getattr(actualiza, name)
            self.addCleanup(setattr, actualiza, name, original)
            setattr(actualiza, name, value)
        original = actualiza.Updater.__dict__['apply']
        self.addCleanup(setattr, actualiza.Updater, 'apply', original)
        actualiza.Updater.apply = staticmethod(lambda changed: False)
        self.files = [self.folder.name + '/sistema/uno.py', self.folder.name + '/sistema/dos.py']
        os.makedirs(self.folder.name + '/sistema')
        for path in self.files:
            with open(path, 'w', encoding='utf-8') as f:
                f.write('old = 1\n')

    def stage(self, version='nueva', serie=2026112200):
        files = []
        for path in self.files:
            os.makedirs(os.path.dirname(actualiza.STAGE + path), exist_ok=True)
            with open(actualiza.STAGE + path, 'w', encoding='utf-8') as f:
                f.write('new = 1\n')
            files.append({'path': path, 'sha256': actualiza.sha256(actualiza.STAGE + path), 'mode': '644'})
        actualiza.write_json(actualiza.STAGED, {'version': version, 'serie': serie, 'files': files, 'changed': self.files,
                                                'at': int(at(5, 8))})
        return actualiza.Updater()

    @staticmethod
    def content(path):
        with open(path, encoding='utf-8') as f:
            return f.read()

    def test_a_power_cut_half_way_is_undone_at_the_boot(self):
        updater = self.stage()
        chown = os.chown
        self.addCleanup(setattr, os, 'chown', chown)
        os.chown = lambda *a: None
        replace = os.replace
        calls = []

        def cut(source, target):
            if source.endswith('.hk-new'):
                calls.append(target)
                if len(calls) == 2:
                    raise KeyboardInterrupt('the power goes')
            replace(source, target)
        self.addCleanup(setattr, os, 'replace', replace)
        os.replace = cut
        with self.assertRaises(KeyboardInterrupt):
            updater.install(at(6, 3))
        os.replace = replace
        self.assertEqual([self.content(p) for p in self.files], ['new = 1\n', 'old = 1\n'], 'a mix, as the power left it')
        pending = actualiza.read_json(actualiza.PENDING, None)
        self.assertTrue(pending and pending.get('installing'), 'the note was on the card before the first file')
        # The boot: the guardian finds the note and puts everything back, without blaming the version.
        actualiza.Updater().tick(at(6, 3, 5), None, 9999)
        self.assertEqual([self.content(p) for p in self.files], ['old = 1\n', 'old = 1\n'])
        self.assertFalse(os.path.exists(actualiza.PENDING))
        self.assertNotIn('nueva', actualiza.read_json(actualiza.INSTALLED, {}).get('bad', []))

    def test_a_version_in_keeps_its_number_and_an_older_one_is_left_alone(self):
        chown = os.chown
        self.addCleanup(setattr, os, 'chown', chown)
        os.chown = lambda *a: None
        updater = self.stage(serie=2026112200)
        updater.install(at(6, 3))
        updater.tick(at(6, 3, 2), {'page': True, 'at': at(6, 3, 2)}, 5)
        self.assertEqual(actualiza.read_json(actualiza.INSTALLED, {}).get('serie'), 2026112200)
        old = json.dumps({'version': 'vieja', 'serie': 2026111700, 'files': []}).encode()
        unnumbered = json.dumps({'version': 'sin-numero', 'files': []}).encode()
        for manifest in (old, unnumbered):
            answers = {'manifest.json': manifest, 'manifest.sig': b'firma'}
            for name, value in (('fetch', answers.__getitem__), ('signed', lambda m, s: True)):
                self.addCleanup(setattr, actualiza, name, getattr(actualiza, name))
                setattr(actualiza, name, value)
            looker = actualiza.Updater()
            looker.look(at(7, 9))
            self.assertIsNone(looker.staged, 'an older signed version is not taken')

    def test_the_rescue_puts_back_what_the_guardian_did_not_start_with(self):
        chown = os.chown
        self.addCleanup(setattr, os, 'chown', chown)
        os.chown = lambda *a: None
        self.stage().install(at(6, 3))
        rescate = load_rescue()
        for name in ('KEEP', 'INSTALLED', 'BACKUP', 'PENDING', 'LOG'):
            setattr(rescate, name, getattr(actualiza, name))
        rescate.run = lambda command: None
        rescate.main()
        self.assertEqual([self.content(p) for p in self.files], ['old = 1\n', 'old = 1\n'])
        self.assertIn('nueva', actualiza.read_json(actualiza.INSTALLED, {}).get('bad', []))
        self.assertFalse(os.path.exists(actualiza.PENDING))
        # Nothing just in: it guesses nothing.
        rescate.main()
        self.assertEqual([self.content(p) for p in self.files], ['old = 1\n', 'old = 1\n'])

    def test_the_ten_minutes_go_on_across_guardians_and_reboots(self):
        chown = os.chown
        self.addCleanup(setattr, os, 'chown', chown)
        os.chown = lambda *a: None
        clock = {'t': 1000.0, 'boot': 'una'}
        for name, value in (('boot_clock', lambda: clock['t']), ('boot_id', lambda: clock['boot'])):
            self.addCleanup(setattr, actualiza, name, getattr(actualiza, name))
            setattr(actualiza, name, value)
        self.stage().install(at(6, 3))
        # A guardian that starts again every four minutes, with the agent silent: each one is new, the count is not.
        for _ in range(3):
            actualiza.Updater().tick(at(6, 3, 5), None, 9999)
            clock['t'] += 240
        self.assertTrue(os.path.exists(actualiza.PENDING), 'eight minutes: still waiting')
        # The screen reboots: the clock of the boot starts again, and what was waited stays.
        clock.update(t=20.0, boot='otra')
        actualiza.Updater().tick(at(6, 3, 15), None, 9999)
        self.assertTrue(os.path.exists(actualiza.PENDING))
        clock['t'] = 150.0
        actualiza.Updater().tick(at(6, 3, 17), None, 9999)
        self.assertFalse(os.path.exists(actualiza.PENDING), 'past ten minutes in all: undone')
        self.assertEqual([self.content(p) for p in self.files], ['old = 1\n', 'old = 1\n'])
        self.assertIn('nueva', actualiza.read_json(actualiza.INSTALLED, {}).get('bad', []))

    def test_a_manifest_without_its_number_is_left_alone_even_by_a_screen_without_one(self):
        actualiza.write_json(actualiza.INSTALLED, {'version': 'de-antes'})
        unnumbered = json.dumps({'version': 'sin-numero', 'files': []}).encode()
        answers = {'manifest.json': unnumbered, 'manifest.sig': b'firma'}
        for name, value in (('fetch', answers.__getitem__), ('signed', lambda m, s: True)):
            self.addCleanup(setattr, actualiza, name, getattr(actualiza, name))
            setattr(actualiza, name, value)
        looker = actualiza.Updater()
        looker.look(at(7, 9))
        self.assertIsNone(looker.staged)


def load_rescue():
    """rescate.py, which imports nothing of the guardian."""
    import importlib.util  # pylint: disable=import-outside-toplevel
    spec = importlib.util.spec_from_file_location('rescate', os.path.join(os.path.dirname(actualiza.__file__), 'rescate.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Guardian(unittest.TestCase):
    """The guardian itself starts and goes round, as the version that systemd will start."""

    def test_it_goes_round_twice_and_writes_nothing_through_a_link(self):
        import guardian  # pylint: disable=import-outside-toplevel
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        run = folder.name + '/run'
        keep = folder.name + '/keep'
        os.makedirs(run)
        os.makedirs(keep)
        victim = folder.name + '/fuera'
        with open(victim, 'w', encoding='utf-8') as f:
            f.write('untouched')
        # What the agent, not root, could leave in its folder: a link to elsewhere, and a pipe to hang on.
        os.symlink(victim, run + '/reinicios.json')
        os.mkfifo(run + '/estado.json')
        for module, name, value in ((guardian, 'RUN', run), (guardian, 'KEEP', keep), (guardian, 'COUNTS', keep + '/c.json'),
                                    (guardian, 'LAST', keep + '/u'), (actualiza, 'KEEP', keep), (actualiza, 'LOG', keep + '/r'),
                                    (actualiza, 'STAGED', keep + '/p.json'), (actualiza, 'PENDING', keep + '/pe.json'),
                                    (actualiza, 'INSTALLED', keep + '/i.json')):
            self.addCleanup(setattr, module, name, getattr(module, name))
            setattr(module, name, value)
        laps = []

        def sleep(_):
            if len(laps) == 2:
                raise StopIteration
            laps.append(1)
        self.addCleanup(setattr, guardian.time, 'sleep', guardian.time.sleep)
        guardian.time.sleep = sleep
        self.addCleanup(setattr, guardian, 'uptime', guardian.uptime)
        guardian.uptime = lambda: 60.0
        with self.assertRaises(StopIteration):
            guardian.main()
        with open(victim, encoding='utf-8') as f:
            self.assertEqual(f.read(), 'untouched')
        self.assertFalse(os.path.islink(run + '/reinicios.json'))

    def test_a_version_that_breaks_its_turn_is_put_back_by_the_rescue(self):
        import guardian  # pylint: disable=import-outside-toplevel
        import subprocess  # pylint: disable=import-outside-toplevel
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        keep = folder.name
        for module, name, value in ((guardian, 'RUN', keep), (guardian, 'KEEP', keep), (guardian, 'COUNTS', keep + '/c.json'),
                                    (guardian, 'LAST', keep + '/u'), (actualiza, 'KEEP', keep), (actualiza, 'LOG', keep + '/r'),
                                    (actualiza, 'STAGED', keep + '/p.json'), (actualiza, 'PENDING', keep + '/pe.json'),
                                    (actualiza, 'INSTALLED', keep + '/i.json'), (subprocess, 'run', None)):
            self.addCleanup(setattr, module, name, getattr(module, name))
            setattr(module, name, value)
        actualiza.write_json(actualiza.PENDING, {'version': 'nueva', 'at': 1, 'changed': [], 'created': []})

        def broken(*args):
            raise NameError("name 'undo_' is not defined")
        laps, asked, exits = [], [], []

        def sleep(_):
            if len(laps) == 10:
                raise StopIteration
            laps.append(1)

        def leave(code):
            exits.append(code)
            raise StopIteration
        for module, name, value in ((actualiza.Updater, 'tick', broken), (guardian.time, 'sleep', sleep),
                                    (guardian, 'uptime', lambda: 60.0), (guardian, 'system', asked.append),
                                    (guardian.os, '_exit', leave)):
            self.addCleanup(setattr, module, name, getattr(module, name))
            setattr(module, name, value)
        with self.assertRaises(StopIteration):
            guardian.main()
        self.assertEqual(len(laps), guardian.TICK_FAILURES)
        self.assertEqual(asked, [['systemctl', 'start', '--no-block', 'hechauka-rescate.service']])
        self.assertEqual(exits, [1])


if __name__ == '__main__':
    unittest.main()
