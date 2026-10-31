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
 * Ad hoc task: the weather of the centre, from MET Norway, as soon as its location is saved.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\task;

use local_oksigeniahechauka\local\weather;

/**
 * Queued when the location changes, so the screens show its weather within a minute instead of at the next quarter.
 */
class fetch_weather_now extends \core\task\adhoc_task {
    /**
     * Asks now (the location just changed, so nothing kept is still valid).
     *
     * @return void
     */
    public function execute(): void {
        mtrace('Weather: ' . weather::fetch(time()));
    }
}
