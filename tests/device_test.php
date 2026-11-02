<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

namespace local_oksigeniahechauka;

/**
 * The software of the device: its manifest says what device/raiz has, and Oksigenia signed exactly that manifest. Without
 * both, the screens would not take a new version, or would take one nobody vouched for.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @coversNothing
 */
#[\PHPUnit\Framework\Attributes\CoversNothing]
final class device_test extends \basic_testcase {
    /** @var string The folder. */
    private const DIR = __DIR__ . '/../device/';

    /**
     * Every file of raiz/ is in the manifest, with its hash, and nothing else is.
     */
    public function test_manifest_matches(): void {
        $manifest = json_decode(file_get_contents(self::DIR . 'manifest.json'), true);
        $listed = [];
        foreach ($manifest['files'] as $entry) {
            $listed[$entry['path']] = $entry['sha256'];
        }
        $found = [];
        $folder = new \RecursiveDirectoryIterator(self::DIR . 'raiz', \FilesystemIterator::SKIP_DOTS);
        $files = new \RecursiveIteratorIterator($folder);
        foreach ($files as $file) {
            $path = substr(str_replace('\\', '/', $file->getPathname()), strlen(self::DIR . 'raiz'));
            $found[$path] = hash_file('sha256', $file->getPathname());
        }
        ksort($listed);
        ksort($found);
        $this->assertSame($found, $listed, 'Run firma-aparato.sh: the manifest is not what device/raiz has.');
    }

    /**
     * Oksigenia signed this very manifest, with the key whose public half every screen carries.
     */
    public function test_signed(): void {
        $pem = file_get_contents(self::DIR . 'raiz/etc/hechauka/firma.pub');
        $der = base64_decode(preg_replace('/-----[^-]+-----|\s+/', '', $pem));
        // An Ed25519 public key: its last 32 bytes.
        $key = substr($der, -32);
        $signature = file_get_contents(self::DIR . 'manifest.sig');
        $this->assertSame(64, strlen($signature));
        $this->assertTrue(
            sodium_crypto_sign_verify_detached($signature, file_get_contents(self::DIR . 'manifest.json'), $key),
            'Run firma-aparato.sh: the signature is not of this manifest.'
        );
    }
}
