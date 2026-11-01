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
 * The panel of the screens: «Lo que sale», the screens first and then what is on them, for each person what is theirs.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\home;
use local_oksigeniahechauka\local\items;
use local_oksigeniahechauka\local\screens;

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/index.php');
$context = context_system::instance();
require_login(null, false);
access::require_cap('view');
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('panel_title', $c));
// The panel says its own title, beside its main action.
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');
$action = optional_param('action', '', PARAM_ALPHA);
$now = time();

// The actions of the panel, each with its sesskey and with who may do it.
if ($action !== '' && confirm_sesskey()) {
    $id = optional_param('id', 0, PARAM_INT);
    if (in_array($action, ['reload', 'reloadall'])) {
        access::require_cap('managescreens');
    } else if (in_array($action, ['up', 'down'])) {
        access::require_cap('publishall');
    }
    if (in_array($action, ['show', 'hide', 'delete', 'up', 'down', 'duplicate'])) {
        $item = $DB->get_record('local_oksigeniahechauka_item', ['id' => $id], '*', MUST_EXIST);
        if (!access::may_edit($item)) {
            throw new required_capability_exception($context, 'local/oksigeniahechauka:publishall', 'nopermissions', '');
        }
    }
    switch ($action) {
        case 'duplicate':
            // A copy to change and publish, open at once.
            if (items::copyable($item)) {
                $copy = items::duplicate($item, (int) $USER->id, $now);
                redirect(
                    new moodle_url('/local/oksigeniahechauka/edit.php', ['id' => $copy]),
                    get_string('duplicate_done', $c),
                    null,
                    \core\output\notification::NOTIFY_SUCCESS
                );
            }
            break;
        case 'show':
        case 'hide':
            $DB->set_field('local_oksigeniahechauka_item', 'visible', $action === 'show' ? 1 : 0, ['id' => $id]);
            break;
        case 'up':
        case 'down':
            $list = array_values($DB->get_records('local_oksigeniahechauka_item', null, 'sortorder, id', 'id'));
            foreach ($list as $i => $row) {
                if ((int) $row->id === $id) {
                    $j = $action === 'up' ? $i - 1 : $i + 1;
                    if (isset($list[$j])) {
                        [$list[$i], $list[$j]] = [$list[$j], $list[$i]];
                    }
                    break;
                }
            }
            foreach ($list as $i => $row) {
                $DB->set_field('local_oksigeniahechauka_item', 'sortorder', $i + 1, ['id' => $row->id]);
            }
            break;
        case 'delete':
            if (optional_param('confirm', 0, PARAM_BOOL)) {
                items::delete($id);
            } else {
                echo $OUTPUT->header();
                echo $OUTPUT->confirm(
                    get_string('confirmdelete', $c, format_string($item->title)),
                    new moodle_url($url, ['action' => 'delete', 'id' => $id, 'confirm' => 1, 'sesskey' => sesskey()]),
                    $url
                );
                echo $OUTPUT->footer();
                die();
            }
            break;
        case 'reload':
        case 'reloadall':
            screens::ask($action === 'reload' ? $id : 0, 'reload');
            redirect($url, get_string($action . '_done', $c), null, \core\output\notification::NOTIFY_SUCCESS);
            break;
    }
    redirect($url);
}

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/home', home::context($now));
echo $OUTPUT->footer();
