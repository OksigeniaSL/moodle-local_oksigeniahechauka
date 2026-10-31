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
 * Scheduled task: warns about the screens that went down or came back.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\task;

use local_oksigeniahechauka\local\alerts;

/**
 * Every few minutes, the screens that should be on and say nothing.
 */
class check_screens extends \core\task\scheduled_task {
    /**
     * The name of the task in the admin pages.
     *
     * @return string
     */
    public function get_name(): string {
        return get_string('task_check_screens', 'local_oksigeniahechauka');
    }

    /**
     * Runs the check.
     *
     * @return void
     */
    public function execute(): void {
        $done = alerts::check(time());
        mtrace('Screens down: ' . $done['down'] . '; back: ' . $done['back']);
    }
}
