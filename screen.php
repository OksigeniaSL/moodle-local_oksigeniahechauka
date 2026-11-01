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
 * A screen's sheet («Ficha»), for who runs the screens (DESIGN.md).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\screens;
use local_oksigeniahechauka\local\sheet;

$id = required_param('id', PARAM_INT);
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
$c = 'local_oksigeniahechauka';
$screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id], '*', MUST_EXIST);
$url = new moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $id]);
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(format_string($screen->name));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');

if (optional_param('action', '', PARAM_ALPHA) === 'surprise' && confirm_sesskey()) {
    screens::ask($id, 'surprise');
    redirect($url, get_string('sheet_surprise_asked', $c), null, \core\output\notification::NOTIFY_SUCCESS);
}

$errors = [];
if (data_submitted() && confirm_sesskey()) {
    $errors = sheet::save($screen);
    if (!$errors) {
        redirect($url, get_string('sheet_saved', $c), null, \core\output\notification::NOTIFY_SUCCESS);
    }
}

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/sheet', sheet::context($screen, time(), $errors));
echo $OUTPUT->footer();
