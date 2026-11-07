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
 * Scheduled task: the birthdays of the pupils, from Cifra.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\task;

use local_oksigeniahechauka\local\birthdays;

/**
 * Every night, when the birthdays come from Cifra: who is new, who changed and who left.
 */
class fetch_birthdays extends \core\task\scheduled_task {
    /**
     * The name of the task in the admin pages.
     *
     * @return string
     */
    public function get_name(): string {
        return get_string('task_fetch_birthdays', 'local_oksigeniahechauka');
    }

    /**
     * Reads Cifra, when it is on.
     */
    public function execute(): void {
        \core_php_time_limit::raise(900);
        mtrace('Birthdays from Cifra: ' . birthdays::sync_cifra(time()));
    }
}
