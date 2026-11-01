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
 * «Pantallas y grupos», for who runs the screens (DESIGN.md): the screens, adding one, and the groups with their screens
 * and who publishes in each.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\groupspage;
use local_oksigeniahechauka\local\screens;

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/screens.php');
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('tab_screens', $c));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');
$action = optional_param('action', '', PARAM_ALPHA);
$now = time();

if ($action !== '' && confirm_sesskey()) {
    $id = optional_param('id', 0, PARAM_INT);
    if ($action === 'removescreen' || $action === 'deletegroup') {
        // What cannot be undone asks first.
        if (optional_param('confirm', 0, PARAM_BOOL)) {
            if ($action === 'removescreen') {
                screens::delete($id);
            } else {
                access::forget_group($id);
                $DB->delete_records('local_oksigeniahechauka_member', ['groupid' => $id]);
                $DB->delete_records('local_oksigeniahechauka_target', ['groupid' => $id]);
                $DB->delete_records('local_oksigeniahechauka_group', ['id' => $id]);
            }
            redirect($url);
        }
        $table = $action === 'removescreen' ? 'local_oksigeniahechauka_screen' : 'local_oksigeniahechauka_group';
        $record = $DB->get_record($table, ['id' => $id], '*', MUST_EXIST);
        echo $OUTPUT->header();
        echo $OUTPUT->confirm(
            get_string(
                $action === 'removescreen' ? 'confirmdeletescreen' : 'groups_confirmdelete',
                $c,
                format_string($record->name)
            ),
            new moodle_url($url, ['action' => $action, 'id' => $id, 'confirm' => 1, 'sesskey' => sesskey()]),
            $url
        );
        echo $OUTPUT->footer();
        die();
    }
    $message = groupspage::act($action, $now);
    redirect(
        new moodle_url($url, [], strpos($action, 'everywhere') !== false ? 'hkp-all' :
            (strpos($action, 'manager') !== false ? 'hkp-managers' : 'hkp-group-' . optional_param('group', 0, PARAM_INT))),
        $message,
        null,
        \core\output\notification::NOTIFY_SUCCESS
    );
}

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/groups', groupspage::context($now));
echo $OUTPUT->footer();
