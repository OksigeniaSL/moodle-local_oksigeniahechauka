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

/**
 * Keys of the screens and codes of pairing.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * A screen holds one key of its own; the server keeps only its SHA-256. A new screen shows a short code.
 */
class keys {
    /** Characters of a pairing code, without look-alikes (no 0, O, 1, I or L, and no 2, 5 or 8 either). */
    const ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';

    /** Length of a pairing code. */
    const CODE_LENGTH = 6;

    /**
     * A new key: 32 random bytes in base64url.
     *
     * @return string
     */
    public static function new_key(): string {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }

    /**
     * What the server keeps of a key or a token.
     *
     * @param string $secret
     * @return string
     */
    public static function hash(string $secret): string {
        return hash('sha256', $secret);
    }

    /**
     * A new pairing code.
     *
     * @return string
     */
    public static function new_code(): string {
        $code = '';
        $last = strlen(self::ALPHABET) - 1;
        for ($i = 0; $i < self::CODE_LENGTH; $i++) {
            $code .= self::ALPHABET[random_int(0, $last)];
        }
        return $code;
    }

    /**
     * A code as someone types it: any case, with spaces or dashes.
     *
     * @param string $code
     * @return string
     */
    public static function clean_code(string $code): string {
        return preg_replace('/[^A-Z0-9]/', '', strtoupper($code));
    }
}
