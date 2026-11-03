"""Tests of where a screen finds its Moodle (device/raiz/usr/local/lib/hechauka/ajuste.py), with a pretend Moodle
on this machine: python3 -B -m unittest discover -s device/test"""
import http.server
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'raiz', 'usr', 'local', 'lib', 'hechauka'))
import ajuste  # noqa: E402  pylint: disable=wrong-import-position

PAGES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'raiz', 'usr', 'share', 'hechauka', 'ajuste')


class FakeMoodle(http.server.BaseHTTPRequestHandler):
    """A Moodle with Hechauka in /campus, and a plain website everywhere else."""

    def log_message(self, *args):
        pass

    def do_GET(self):  # pylint: disable=invalid-name
        if self.path == '/campus' + ajuste.HELLO:
            body = json.dumps({'hechauka': 1, 'sitio': 'Centro de ejemplo', 'zona': 'Atlantic/Canary'}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
        elif self.path == '/viejo' + ajuste.HELLO:
            self.send_response(302)
            self.send_header('Location', '/campus' + ajuste.HELLO)
            body = b''
        else:
            body = b'<html>a website</html>'
            self.send_response(404)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class Base(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        d = self.dir.name
        self.saved = {k: getattr(ajuste, k) for k in ('CONF', 'PENDING', 'RUN', 'TARGET', 'KEYCOPY', 'LOG', 'PAGES')}
        ajuste.CONF = os.path.join(d, 'pantalla.conf')
        ajuste.PENDING = os.path.join(d, 'por-comprobar')
        ajuste.RUN = os.path.join(d, 'run')
        ajuste.TARGET = os.path.join(d, 'run', 'destino')
        ajuste.KEYCOPY = os.path.join(d, 'clave')
        ajuste.LOG = os.path.join(d, 'ajuste.log')
        ajuste.PAGES = PAGES
        self.zones = []
        self.saved_zone, ajuste.set_zone = ajuste.set_zone, self.zones.append

    def tearDown(self):
        for k, v in self.saved.items():
            setattr(ajuste, k, v)
        ajuste.set_zone = self.saved_zone
        self.dir.cleanup()


class Reading(Base):
    def test_candidates(self):
        self.assertEqual(ajuste.candidates('aula.example.org'), ['https://aula.example.org'])
        self.assertEqual(ajuste.candidates(' Aula.Example.org/ '), ['https://aula.example.org'])
        self.assertEqual(ajuste.candidates('https://example.org/moodle/course/view.php?id=3'),
                         ['https://example.org/moodle/course', 'https://example.org/moodle', 'https://example.org'])
        self.assertEqual(ajuste.candidates('http://example.org:8080/local/oksigeniahechauka/player/'),
                         ['http://example.org:8080'])
        self.assertEqual(ajuste.candidates('ftp://example.org'), [])
        self.assertEqual(ajuste.candidates('aula example;rm -rf /'), [])
        self.assertEqual(ajuste.candidates(''), [])

    def test_conf_from_any_computer(self):
        with open(ajuste.CONF, 'w', encoding='utf-8-sig', newline='') as f:
            f.write('# a comment\r\nURL="https://aula.example.org/"\r\nzona=Europe/Madrid\r\nLLAVE=ssh-ed25519 AAAA one\r\n'
                    'LLAVE=ssh-ed25519 BBBB two\r\n')
        conf = ajuste.read_conf()
        self.assertEqual(conf['URL'], 'https://aula.example.org/')
        self.assertEqual(conf['ZONA'], 'Europe/Madrid')
        self.assertEqual(conf['LLAVE'], ['ssh-ed25519 AAAA one', 'ssh-ed25519 BBBB two'])

    def test_write_keeps_the_rest(self):
        with open(ajuste.CONF, 'w', encoding='utf-8') as f:
            f.write('URL=https://old.example.org/\nZONA=Europe/Madrid\n')
        ajuste.write_conf('https://new.example.org/local/oksigeniahechauka/player/')
        conf = ajuste.read_conf()
        self.assertEqual(conf['URL'], 'https://new.example.org/local/oksigeniahechauka/player/')
        self.assertEqual(conf['ZONA'], 'Europe/Madrid')


class WithMoodle(Base):
    def setUp(self):
        super().setUp()
        self.moodle = http.server.ThreadingHTTPServer(('127.0.0.1', 0), FakeMoodle)
        threading.Thread(target=self.moodle.serve_forever, daemon=True).start()
        self.host = 'http://127.0.0.1:%d' % self.moodle.server_address[1]
        self.saved_address, ajuste.address = ajuste.address, lambda: '192.0.2.10'

    def tearDown(self):
        self.moodle.shutdown()
        ajuste.address = self.saved_address
        super().tearDown()

    def test_finds_the_moodle_in_its_folder(self):
        info, base = ajuste.check(self.host + '/campus/my/')
        self.assertEqual(base, self.host + '/campus')
        self.assertEqual(info['sitio'], 'Centro de ejemplo')

    def test_follows_a_redirection(self):
        _, base = ajuste.check(self.host + '/viejo')
        self.assertEqual(base, self.host + '/campus')

    def test_a_website_without_hechauka(self):
        with self.assertRaises(ajuste.Unreachable) as caught:
            ajuste.check(self.host + '/blog')
        self.assertEqual(caught.exception.code, 'sin-hechauka')

    def test_nothing_there(self):
        with self.assertRaises(ajuste.Unreachable) as caught:
            ajuste.check('http://127.0.0.1:9')
        self.assertEqual(caught.exception.code, 'no-contesta')

    def test_no_network(self):
        ajuste.address = lambda: ''
        with self.assertRaises(ajuste.Unreachable) as caught:
            ajuste.check(self.host + '/campus')
        self.assertEqual(caught.exception.code, 'sin-red')

    def test_keep_moves_to_the_new_moodle(self):
        with open(ajuste.CONF, 'w', encoding='utf-8') as f:
            f.write('URL=https://other.example.org/local/oksigeniahechauka/player/\n')
        for path in (ajuste.PENDING, ajuste.KEYCOPY):
            with open(path, 'w', encoding='utf-8') as f:
                f.write('x')
        info, base = ajuste.check(self.host + '/campus')
        url = ajuste.keep(base, info)
        self.assertEqual(url, self.host + '/campus/local/oksigeniahechauka/player/')
        with open(ajuste.TARGET, encoding='utf-8') as f:
            self.assertEqual(f.read().strip(), url)
        self.assertFalse(os.path.exists(ajuste.PENDING))
        self.assertFalse(os.path.exists(ajuste.KEYCOPY), 'the key of the other Moodle is gone')
        self.assertEqual(self.zones, ['Atlantic/Canary'])

    def test_a_zone_from_the_panel_stays(self):
        with open(ajuste.CONF, 'w', encoding='utf-8') as f:
            f.write('URL=\nZONA=Europe/Madrid\n')
        info, base = ajuste.check(self.host + '/campus')
        ajuste.keep(base, info)
        self.assertEqual(self.zones, ['Europe/Madrid'])

    def test_the_page_and_its_pin(self):
        setup = ajuste.Setup('', None)
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), ajuste.handler(setup))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        page = 'http://127.0.0.1:%d/' % server.server_address[1]
        try:
            with urllib.request.urlopen(page) as answer:
                self.assertIn(b'ajuste.js', answer.read())
            with urllib.request.urlopen(page + 'estado') as answer:
                status = json.loads(answer.read())
            self.assertEqual(status['state'], 'pide')
            self.assertEqual(status['pin'], setup.pin, 'the television sees the PIN')
            request = urllib.request.Request(page + 'direccion', json.dumps({'direccion': self.host + '/campus'}).encode(),
                                             {'Content-Type': 'application/json'})
            with urllib.request.urlopen(request) as answer:
                status = json.loads(answer.read())
            self.assertEqual(status['state'], 'hecho')
            self.assertEqual(status['site'], 'Centro de ejemplo')
            self.assertTrue(setup.done.is_set())
        finally:
            server.shutdown()

    def test_a_phone_needs_the_pin(self):
        setup = ajuste.Setup('', None)
        self.assertFalse(setup.pin_ok(''))
        self.assertFalse(setup.pin_ok('x'))
        self.assertTrue(setup.pin_ok(setup.pin))
        for _ in range(ajuste.WRONG_PINS):
            setup.pin_ok('no')
        self.assertFalse(setup.pin_ok(setup.pin), 'too many wrong PINs close the door until the next boot')


if __name__ == '__main__':
    unittest.main()
