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
 * A piece of content: add or change it.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\form\item_form;
use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\agendas;
use local_oksigeniahechauka\local\files;
use local_oksigeniahechauka\local\items;
use local_oksigeniahechauka\local\schedule;
use local_oksigeniahechauka\local\video;

$id = optional_param('id', 0, PARAM_INT);
$type = optional_param('type', 'media', PARAM_ALPHA);
$context = context_system::instance();
require_login(null, false);
if (!access::publishes()) {
    access::require_cap('publish');
}

$c = 'local_oksigeniahechauka';
$item = $id ? $DB->get_record('local_oksigeniahechauka_item', ['id' => $id], '*', MUST_EXIST) : null;
if ($item && !access::may_edit($item)) {
    throw new required_capability_exception($context, 'local/oksigeniahechauka:publishall', 'nopermissions', '');
}
$destinations = access::destinations();
if ($item) {
    $type = $item->type;
}
if (!in_array($type, items::TYPES)) {
    throw new moodle_exception('invalidparameter', 'debug');
}
$panel = new moodle_url('/local/oksigeniahechauka/index.php');
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/local/oksigeniahechauka/edit.php', ['id' => $id, 'type' => $type]));
$PAGE->set_pagelayout('admin');
$PAGE->set_title(get_string('type_' . $type, $c));
$PAGE->set_heading(get_string('manage', $c));
navigation_node::override_active_url($panel);

$form = new item_form(null, ['type' => $type, 'destinations' => $destinations]);
$fileoptions = ['subdirs' => 0, 'maxfiles' => 1, 'accepted_types' => ['image', 'video']];

// What the form shows when the item already exists.
if ($item) {
    $data = items::data($item);
    $values = (object) [
        'id' => $item->id,
        'type' => $type,
        'title' => $item->title,
        'body' => $item->body,
        'duration' => $item->duration ?: '',
        'caption' => !empty($data['caption']),
        'fit' => $data['fit'] ?? 'cover',
        'important' => !empty($data['important']),
        'start' => $data['start'] ?? time(),
        'end' => $data['end'] ?? 0,
        'colour' => $data['color'] ?? ($type === 'agenda' ? 0 : 1),
        'url' => $data['url'] ?? '',
        'everyweeks' => max(1, (int) $item->everyweeks),
        'targetall' => $item->targetall,
        'visible' => $item->visible,
    ];
    $from = schedule::is_date($item->datefrom) ? $item->datefrom : '';
    $until = schedule::is_date($item->dateuntil) ? $item->dateuntil : '';
    $values->dates = schedule::dates_mode($from, $until);
    foreach (['datefrom' => $from, 'dateuntil' => $until, 'day' => $from ?: $until] as $field => $date) {
        if ($date !== '') {
            [$y, $m, $d] = explode('-', $date);
            $values->$field = make_timestamp((int) $y, (int) $m, (int) $d);
        }
    }
    $days = schedule::days($item->days);
    $values->daysmode = $days && count($days) < 7 ? 'some' : 'all';
    $values->days = array_fill_keys($days, 1);
    $times = schedule::times($item->times);
    $values->hoursmode = $times ? 'some' : 'all';
    foreach ($times as $r => $range) {
        $values->{'range' . $r} = ['from' => $range[0], 'to' => $range[1]];
    }
    $targets = items::targets($item);
    $values->groups = array_fill_keys($targets['groups'], 1);
    $values->screens = array_fill_keys($targets['screens'], 1);
    if ($type === 'media') {
        $draft = file_get_submitted_draft_itemid('media');
        file_prepare_draft_area($draft, $context->id, $c, files::MEDIA, $item->id, $fileoptions);
        $values->media = $draft;
    }
    $form->set_data($values);
}

if ($form->is_cancelled()) {
    redirect($panel);
}
if ($data = $form->get_data()) {
    $groups = [];
    foreach ((array) ($data->groups ?? []) as $g => $on) {
        if ($on) {
            $groups[] = (int) $g;
        }
    }
    $screens = [];
    foreach ((array) ($data->screens ?? []) as $s => $on) {
        if ($on) {
            $screens[] = (int) $s;
        }
    }
    if (!access::may_target((bool) ($destinations['all'] && !empty($data->targetall)), $groups, $screens)) {
        throw new required_capability_exception($context, 'local/oksigeniahechauka:publishall', 'nopermissions', '');
    }
    $now = time();
    $record = $item ?: (object) ['type' => $type, 'timecreated' => $now, 'createdby' => $USER->id,
        'sortorder' => (int) $DB->get_field_sql('SELECT COALESCE(MAX(sortorder), 0) + 1
                                                   FROM {local_oksigeniahechauka_item}')];
    $extra = $item ? items::data($item) : [];
    $record->title = trim($data->title ?? '');
    $record->body = trim($data->body ?? '');
    $record->duration = max(0, (int) ($data->duration ?? 0));
    $record->visible = empty($data->visible) ? 0 : 1;
    $record->targetall = $destinations['all'] && !empty($data->targetall) ? 1 : 0;
    $ymd = function ($time): string {
        return userdate((int) $time, '%Y-%m-%d', 99, false);
    };
    [$record->datefrom, $record->dateuntil] = schedule::dates_for(
        $data->dates ?? 'always',
        $ymd($data->day ?? 0),
        $ymd($data->datefrom ?? 0),
        $ymd($data->dateuntil ?? 0)
    );
    $days = [];
    foreach ((array) ($data->days ?? []) as $d => $on) {
        if ($on) {
            $days[] = (int) $d;
        }
    }
    $single = ($data->dates ?? '') === 'day';
    $record->days = !$single && ($data->daysmode ?? 'all') === 'some' && $days && count($days) < 7 ? implode(',', $days) : null;
    $times = [];
    for ($r = 0; $r < 2; $r++) {
        $range = $data->{'range' . $r} ?? [];
        if (!empty($range['from']) && !empty($range['to'])) {
            $times[] = [item_form::hour($range['from']), item_form::hour($range['to'])];
        }
    }
    $record->times = ($data->hoursmode ?? 'all') === 'some' && $times ? json_encode($times) : null;
    $record->everyweeks = !$single && (int) ($data->everyweeks ?? 1) > 1 ? (int) $data->everyweeks : 0;
    if ($type === 'media') {
        $extra['caption'] = !empty($data->caption);
        $extra['fit'] = $data->fit ?? 'cover';
    } else if ($type === 'notice') {
        $extra['important'] = !empty($data->important);
    } else if ($type === 'agenda') {
        $extra['url'] = trim($data->url ?? '');
        $extra['color'] = (int) ($data->colour ?? 0);
    } else if ($type === 'event') {
        $extra['start'] = (int) $data->start;
        $extra['end'] = !empty($data->end) ? (int) $data->end : 0;
        $extra['color'] = (int) ($data->colour ?? 1);
    }
    $record->data = json_encode($extra);
    $record->usermodified = $USER->id;
    $record->timemodified = $now;
    if ($item) {
        $DB->update_record('local_oksigeniahechauka_item', $record);
    } else {
        $record->id = $DB->insert_record('local_oksigeniahechauka_item', $record);
    }
    if ($type === 'media') {
        file_save_draft_area_files($data->media, $context->id, $c, files::MEDIA, $record->id, $fileoptions);
        $file = files::first(files::MEDIA, (int) $record->id);
        if ($file && $record->title === '') {
            // A picture without a title keeps the name of its file in the panel, never on the screen.
            $DB->set_field('local_oksigeniahechauka_item', 'title', $file->get_filename(), ['id' => $record->id]);
            $extra['caption'] = false;
            $DB->set_field('local_oksigeniahechauka_item', 'data', json_encode($extra), ['id' => $record->id]);
        }
        // A new video is made ready for the screens; until then they do not get it.
        video::queue((int) $record->id);
    }
    items::set_targets((int) $record->id, $record->targetall ? [] : $groups, $record->targetall ? [] : $screens);
    if ($type === 'agenda') {
        // Read at once, so the panel says whether the address works.
        $result = agendas::fetch((int) $record->id, $now);
        $saved = items::data($DB->get_record('local_oksigeniahechauka_item', ['id' => $record->id]));
        $ok = $result === 'ok';
        redirect(
            $panel,
            $ok ? get_string('agenda_read', $c, (int) ($saved['count'] ?? 0)) :
            get_string('agenda_failed', $c, $result),
            null,
            $ok ? \core\output\notification::NOTIFY_SUCCESS : \core\output\notification::NOTIFY_WARNING
        );
    }
    redirect($panel);
}

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('type_' . $type, $c));
$form->display();
echo $OUTPUT->footer();
