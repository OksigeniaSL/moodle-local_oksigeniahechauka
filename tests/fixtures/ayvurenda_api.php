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

namespace local_oksigeniaayvurenda;

/**
 * A stand-in for the API of Oksigenia Ayvurenda, for the tests of a site without it: only what Hechauka asks of it.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class api {
    /** @var array What moments() gives. */
    public static $moments = [];

    /**
     * What there is to celebrate at the libraries this week, as the test sets it.
     *
     * @param int|null $entityid
     * @param int|null $now
     * @return array[]
     */
    public static function moments(?int $entityid = null, ?int $now = null): array {
        return self::$moments;
    }
}
