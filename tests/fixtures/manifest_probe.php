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
 * The guarded sources of the manifest, reached from a test.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class manifest_probe extends manifest {
    /**
     * One source, as the manifest asks for it, and the note of what fails.
     *
     * @param string $source
     * @param callable $get
     * @param int $now
     * @return mixed
     */
    public static function source(string $source, callable $get, int $now) {
        self::$failed = [];
        self::$worked = [];
        self::$day = schedule::day($now);
        $got = self::guarded($source, $get);
        self::note_failures(get_config('local_oksigeniahechauka'), $now);
        return $got;
    }
}
