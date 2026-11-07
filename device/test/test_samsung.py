"""Tests of the Samsung package that the plugin serves in player/ (device/samsung/): that it was built from the app as it
is, with the version and size that sssp_config.xml says, and that its two signatures cover every file and verify:
python3 -B -m unittest discover -s device/test"""
import os
import shutil
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'samsung'))
import comprueba  # noqa: E402  pylint: disable=wrong-import-position


class SamsungPackage(unittest.TestCase):

    def test_the_package_is_the_app_signed(self):
        problems, report = comprueba.check()
        self.assertEqual(problems, [], '\n'.join(report))
        if shutil.which('openssl'):
            self.assertIn('author-signature.xml (AuthorSignature): signature verifies', '\n'.join(report))
            self.assertIn('signature1.xml (DistributorSignature): signature verifies', '\n'.join(report))

    def test_the_author_is_oksigenia_and_the_distributor_the_public_one(self):
        with zipfile.ZipFile(comprueba.WGT) as z:
            author = z.read('author-signature.xml')
            distributor = z.read('signature1.xml')
        self.assertIn(b'Id="AuthorSignature"', author)
        self.assertIn(b'Id="DistributorSignature"', distributor)
        if shutil.which('openssl'):
            _problems, report = comprueba.check()
            text = '\n'.join(report)
            self.assertIn('O=Oksigenia SL', text)
            self.assertIn('CN=Tizen Developers CA', text)
            self.assertIn('CN=Tizen Public Distributor Signer', text)

    def test_a_changed_file_is_caught(self):
        with tempfile.TemporaryDirectory() as work:
            bad = os.path.join(work, 'Hechauka.wgt')
            with zipfile.ZipFile(comprueba.WGT) as src, zipfile.ZipFile(bad, 'w') as dst:
                for name in src.namelist():
                    data = src.read(name)
                    if name == 'lanzador.js':
                        data += b'\n'
                    dst.writestr(name, data)
            problems, _report = comprueba.check(bad, comprueba.SSSP, None)
        joined = '\n'.join(problems)
        self.assertIn('the digest of lanzador.js does not match', joined)
        self.assertIn('sssp_config.xml: size', joined)

    def test_the_app_asks_nothing_from_outside(self):
        for name in comprueba.app_files(comprueba.APP):
            if not name.endswith(('.html', '.css', '.js')):
                continue
            with open(os.path.join(comprueba.APP, name), encoding='utf-8') as f:
                text = f.read()
            for outside in ('src="http', 'href="http', "url(http", '@import'):
                self.assertNotIn(outside, text, name)


if __name__ == '__main__':
    unittest.main()
