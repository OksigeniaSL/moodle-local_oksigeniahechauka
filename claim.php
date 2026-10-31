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
 * Gives a new screen its name: the page the QR of the screen opens.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\form\claim_form;
use local_oksigeniahechauka\local\keys;
use local_oksigeniahechauka\local\screens;

$code = keys::clean_code(optional_param('code', '', PARAM_RAW_TRIMMED));
$context = context_system::instance();
require_login(null, false);
require_capability('local/oksigeniahechauka:managescreens', $context);

$c = 'local_oksigeniahechauka';
$panel = new moodle_url('/local/oksigeniahechauka/index.php');
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/local/oksigeniahechauka/claim.php', ['code' => $code]));
$PAGE->set_pagelayout('admin');
$PAGE->set_title(get_string('claim', $c));
$PAGE->set_heading(get_string('manage', $c));
navigation_node::override_active_url($panel);

$now = time();
$pair = screens::pairing($code, $now);
if (!$pair) {
    echo $OUTPUT->header();
    echo $OUTPUT->heading(get_string('claim', $c));
    echo $OUTPUT->notification(get_string('claim_bad', $c), 'warning', false);
    echo $OUTPUT->continue_button($panel);
    echo $OUTPUT->footer();
    die();
}

$form = new claim_form();
$form->set_data(['code' => $code]);
if ($form->is_cancelled()) {
    redirect($panel);
}
if ($data = $form->get_data()) {
    require_sesskey();
    $groups = [];
    foreach ((array) ($data->groups ?? []) as $id => $on) {
        if ($on) {
            $groups[] = (int) $id;
        }
    }
    $newgroup = trim($data->newgroup ?? '');
    if (empty($data->screenid) && $newgroup !== '') {
        $groups[] = (int) $DB->insert_record('local_oksigeniahechauka_group', (object) [
            'name' => $newgroup, 'sortorder' => 0, 'timecreated' => $now, 'timemodified' => $now]);
    }
    $data->groups = $groups;
    $data->name = trim($data->name ?? '');
    $id = screens::claim($pair, $data, $now);
    $name = $DB->get_field('local_oksigeniahechauka_screen', 'name', ['id' => $id]);
    redirect($panel, get_string('claim_done', $c, format_string($name)), null, \core\output\notification::NOTIFY_SUCCESS);
}

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('claim', $c));
echo html_writer::tag('p', s(implode(' ', str_split($code, 3))), ['class' => 'display-6 fw-bold mb-4',
    'style' => 'letter-spacing: .08em; font-variant-numeric: tabular-nums;']);
$form->display();
echo $OUTPUT->footer();
