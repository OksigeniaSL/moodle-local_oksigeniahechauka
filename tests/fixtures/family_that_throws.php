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

namespace local_oksigeniafamily;

/**
 * A stand-in for the API of Oksigenia Family that throws when asked for a pupil, as any plugin may (a table being
 * upgraded, a fault), for the tests of a site without it.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class api {
    /** @var bool Whether it is there: only while the test that wants it runs, never for the tests after it. */
    public static $on = false;

    /**
     * Whether it is there.
     *
     * @return bool
     */
    public static function is_available(): bool {
        return self::$on;
    }

    /**
     * With its photos on.
     *
     * @return bool
     */
    public static function photos_enabled(): bool {
        return true;
    }

    /**
     * It fails.
     *
     * @param string $number
     * @param string $kind
     * @return string|null
     */
    public static function student_key(string $number, string $kind): ?string {
        throw new \RuntimeException('Oksigenia Family is being upgraded');
    }

    /**
     * It fails.
     *
     * @param int $userid
     * @return bool
     */
    public static function photo_allowed_for_user(int $userid): bool {
        throw new \RuntimeException('Oksigenia Family is being upgraded');
    }
}
