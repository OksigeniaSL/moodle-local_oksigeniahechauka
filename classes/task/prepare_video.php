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
 * Ad hoc task: makes an uploaded video ready for the screens.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\task;

use local_oksigeniahechauka\local\video;

/**
 * One video at a time: converting takes the processor, and the site has to keep serving its pages.
 */
class prepare_video extends \core\task\adhoc_task {
    /**
     * The name of the task in the admin pages.
     *
     * @return string
     */
    public function get_name(): string {
        return get_string('task_prepare_video', 'local_oksigeniahechauka');
    }

    /**
     * One at a time, unless the site says otherwise ($CFG->task_concurrency_limit).
     *
     * @return int
     */
    protected function get_default_concurrency_limit(): int {
        return 1;
    }

    /**
     * Converts the video of the item.
     *
     * @return void
     */
    public function execute(): void {
        $data = $this->get_custom_data();
        $result = video::prepare((int) ($data->itemid ?? 0), (string) ($data->source ?? ''));
        mtrace('Video of item ' . (int) ($data->itemid ?? 0) . ': ' . $result);
    }
}
