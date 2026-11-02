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
 * Asking before something is deleted: the question says what goes, and each button says what it does, never «OK» or
 * «Cancel» (shared/interfaces-comprobacion.md).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class confirm {
    /**
     * Shows the page that asks, and stops.
     *
     * @param string $question what goes, and what follows
     * @param \moodle_url $yes where it is done; the sesskey is added
     * @param string $yeslabel what the button that does it says
     * @param \moodle_url $no where it goes back to
     * @param string $nolabel what the button that keeps it says
     * @return void
     */
    public static function ask(string $question, \moodle_url $yes, string $yeslabel, \moodle_url $no, string $nolabel): void {
        global $OUTPUT;
        $yes = new \moodle_url($yes, ['confirm' => 1, 'sesskey' => sesskey()]);
        echo $OUTPUT->header();
        echo $OUTPUT->confirm(
            $question,
            new \single_button($yes, $yeslabel, 'post', \single_button::BUTTON_DANGER),
            new \single_button($no, $nolabel, 'get')
        );
        echo $OUTPUT->footer();
        die();
    }
}
