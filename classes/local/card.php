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

namespace local_oksigeniahechauka\local;

/**
 * The card of a Raspberry Pi screen: the same image for every centre, published with the plugin's releases, and the small
 * file that tells it which Moodle it belongs to (hechauka.conf), which the device reads on its first boot
 * (device/instala.sh). Without that file the screen asks for the address itself (device/.../ajuste.py).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class card {
    /** @var string The image of the card, compressed: Raspberry Pi Imager writes it as it is. */
    const IMAGE = 'https://github.com/OksigeniaSL/moodle-local_oksigeniahechauka/releases/download/'
        . 'pantalla-2026-11-04/hechauka-pantalla-2026-11-04.img.xz';
    /** @var int Its size, to say it on the button. */
    const IMAGE_SIZE = 1480227928;
    /** @var string Where Raspberry Pi Imager is downloaded. */
    const IMAGER = 'https://www.raspberrypi.com/software/';
    /** @var string The public keys a screen accepts for its maintenance account. */
    const KEY = '/^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\.com|'
        . 'sk-ecdsa-sha2-nistp256@openssh\.com) [A-Za-z0-9+\/=]+( [[:print:]]*)?$/';

    /**
     * The name of a screen on the network, from what someone typed: «Recepción 2» is hechauka-recepcion-2.
     *
     * @param string $name
     * @return string empty if nothing usable is left
     */
    public static function hostname(string $name): string {
        $slug = \core_text::strtolower(\core_text::specialtoascii(trim($name)));
        $slug = trim(preg_replace('/-+/', '-', preg_replace('/[^a-z0-9-]+/', '-', $slug)), '-');
        if ($slug === '') {
            return '';
        }
        if (strpos($slug, 'hechauka-') !== 0 && $slug !== 'hechauka') {
            $slug = 'hechauka-' . $slug;
        }
        return rtrim(substr($slug, 0, 50), '-');
    }

    /**
     * The SSH public keys in what was pasted, one per line, and whether anything else came with them.
     *
     * @param string $text
     * @return array [list of keys, true if some line was not a key]
     */
    public static function keys(string $text): array {
        $keys = [];
        $bad = false;
        foreach (preg_split('/\R/', $text) as $line) {
            $line = trim(preg_replace('/\s+/', ' ', $line));
            if ($line === '') {
                continue;
            }
            if (preg_match(self::KEY, $line)) {
                $keys[] = $line;
            } else {
                $bad = true;
            }
        }
        return [array_values(array_unique($keys)), $bad];
    }

    /**
     * The hechauka.conf of a screen of this Moodle.
     *
     * @param string $name what someone typed as its name, or ''
     * @param string[] $keys SSH public keys for its maintenance
     * @return string
     */
    public static function conf(string $name, array $keys): string {
        global $CFG, $SITE;
        $site = format_string($SITE->fullname, true, ['context' => \context_system::instance(), 'escape' => false]);
        $lines = [
            '# ' . str_replace(["\r", "\n"], ' ', get_string('prepare_conf_comment', 'local_oksigeniahechauka', $site)),
            'URL=' . $CFG->wwwroot . '/local/oksigeniahechauka/player/',
        ];
        $host = self::hostname($name);
        if ($host !== '') {
            $lines[] = 'NOMBRE=' . $host;
        }
        $zone = \core_date::get_server_timezone();
        if (preg_match('/^[A-Za-z][A-Za-z0-9_+\/-]*$/', $zone)) {
            $lines[] = 'ZONA=' . $zone;
        }
        foreach ($keys as $key) {
            $lines[] = 'LLAVE=' . $key;
        }
        // CRLF, for whoever opens it with the notepad of Windows; the device takes both.
        return implode("\r\n", $lines) . "\r\n";
    }

    /**
     * The address of this Moodle as someone would type it on the screen: without https:// when it is the usual.
     *
     * @return string
     */
    public static function typed(): string {
        global $CFG;
        return preg_replace('#^https://#', '', $CFG->wwwroot);
    }
}
