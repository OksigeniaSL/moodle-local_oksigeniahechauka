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
 * The urgent notice: put it on at once, over the whole screen, until someone takes it off (or its hour comes); or take
 * it off with one click from the red banner of the panel.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\items;

require_login(null, false);
access::require_cap('publishall');
require_sesskey();
$c = 'local_oksigeniahechauka';
$panel = new moodle_url('/local/oksigeniahechauka/index.php');
$now = time();

// Off: one click from the banner.
$off = optional_param('off', 0, PARAM_INT);
if ($off) {
    $item = $DB->get_record('local_oksigeniahechauka_item', ['id' => $off, 'type' => 'urgent'], '*', MUST_EXIST);
    $DB->update_record('local_oksigeniahechauka_item', (object) ['id' => $item->id, 'visible' => 0,
        'usermodified' => $USER->id, 'timemodified' => $now]);
    redirect($panel, get_string('urgent_taken_off', $c), null, \core\output\notification::NOTIFY_SUCCESS);
}

// On: what it says, where, and until when.
$title = trim(optional_param('title', '', PARAM_TEXT));
$body = trim(optional_param('body', '', PARAM_TEXT));
$all = optional_param('whereall', 0, PARAM_BOOL);
$groups = array_values(array_intersect(
    array_map('intval', optional_param_array('groups', [], PARAM_INT)),
    array_keys($DB->get_records_menu('local_oksigeniahechauka_group', null, '', 'id, name'))
));
$until = optional_param('until', 'off', PARAM_ALPHA);
if ($title === '' || (!$all && !$groups)) {
    redirect(
        $panel,
        get_string($title === '' ? 'urgent_need_title' : 'urgent_need_where', $c),
        null,
        \core\output\notification::NOTIFY_ERROR
    );
}
$ends = 0;
if ($until === 'hour') {
    $ends = $now + HOURSECS;
} else if ($until === 'day') {
    $ends = (new DateTime('@' . $now))->setTimezone(core_date::get_server_timezone_object())->setTime(23, 59)->getTimestamp();
}
$id = $DB->insert_record('local_oksigeniahechauka_item', (object) [
    'type' => 'urgent',
    'title' => $title,
    'body' => $body,
    'data' => json_encode($ends ? ['ends' => $ends] : []),
    'duration' => 0,
    'sortorder' => (int) $DB->get_field_sql('SELECT COALESCE(MAX(sortorder), 0) + 1 FROM {local_oksigeniahechauka_item}'),
    'visible' => 1,
    'targetall' => $all ? 1 : 0,
    'everyweeks' => 0,
    'createdby' => $USER->id,
    'usermodified' => $USER->id,
    'timecreated' => $now,
    'timemodified' => $now,
]);
items::set_targets((int) $id, $all ? [] : $groups, []);
redirect($panel, get_string('urgent_put_on', $c), null, \core\output\notification::NOTIFY_SUCCESS);
