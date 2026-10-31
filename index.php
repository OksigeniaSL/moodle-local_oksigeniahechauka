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
 * The panel of the screens: the screens and how they are, the content and the groups.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

use local_oksigeniahechauka\local\files;
use local_oksigeniahechauka\local\items;
use local_oksigeniahechauka\local\schedule;
use local_oksigeniahechauka\local\screens;

admin_externalpage_setup('local_oksigeniahechauka_panel');
$context = context_system::instance();
require_capability('local/oksigeniahechauka:manage', $context);

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/index.php');
$action = optional_param('action', '', PARAM_ALPHA);
$now = time();

// The actions of the panel, each with its sesskey.
if ($action !== '' && confirm_sesskey()) {
    $id = optional_param('id', 0, PARAM_INT);
    switch ($action) {
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
                $item = $DB->get_record('local_oksigeniahechauka_item', ['id' => $id], '*', MUST_EXIST);
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
        case 'removescreen':
            if (optional_param('confirm', 0, PARAM_BOOL)) {
                screens::delete($id);
            } else {
                $screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id], '*', MUST_EXIST);
                echo $OUTPUT->header();
                echo $OUTPUT->confirm(
                    get_string('confirmdeletescreen', $c, format_string($screen->name)),
                    new moodle_url($url, ['action' => 'removescreen', 'id' => $id, 'confirm' => 1,
                    'sesskey' => sesskey()]),
                    $url
                );
                echo $OUTPUT->footer();
                die();
            }
            break;
        case 'addgroup':
            $name = trim(optional_param('name', '', PARAM_TEXT));
            if ($name !== '') {
                $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => $name, 'sortorder' => 0,
                    'timecreated' => $now, 'timemodified' => $now]);
            }
            break;
        case 'deletegroup':
            $DB->delete_records('local_oksigeniahechauka_member', ['groupid' => $id]);
            $DB->delete_records('local_oksigeniahechauka_target', ['groupid' => $id]);
            $DB->delete_records('local_oksigeniahechauka_group', ['id' => $id]);
            break;
    }
    redirect($url);
}

/**
 * When an item shows, in a few words.
 *
 * @param stdClass $item
 * @return string
 */
function local_oksigeniahechauka_when_text(stdClass $item): string {
    $c = 'local_oksigeniahechauka';
    $parts = [];
    $data = items::data($item);
    if ($item->type === 'event' && !empty($data['start'])) {
        $parts[] = userdate((int) $data['start'], get_string('strftimedaydatetime', 'langconfig'));
    }
    $when = schedule::when($item) ?? [];
    if (!empty($when['from']) || !empty($when['until'])) {
        $from = !empty($when['from']) ? userdate(strtotime($when['from'] . ' 12:00'), '%d/%m') : '…';
        $until = !empty($when['until']) ? userdate(strtotime($when['until'] . ' 12:00'), '%d/%m') : '…';
        $parts[] = $from . ' – ' . $until;
    }
    if (!empty($when['days'])) {
        $short = explode(',', get_string('days_short', $c));
        $parts[] = implode(' ', array_map(function ($d) use ($short) {
            return $short[$d - 1];
        }, $when['days']));
    }
    if (!empty($when['times'])) {
        $parts[] = implode(', ', array_map(function ($r) {
            return $r[0] . '–' . $r[1];
        }, $when['times']));
    }
    if (!empty($when['every'])) {
        $parts[] = get_string('everyweeks_n', $c, $when['every']);
    }
    return $parts ? implode(' · ', $parts) : get_string('schedule_always', $c);
}

$screens = $DB->get_records('local_oksigeniahechauka_screen', null, 'sortorder, name');
$groups = $DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name');
$items = $DB->get_records('local_oksigeniahechauka_item', null, 'sortorder, id');

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('manage', $c));
if (has_capability('moodle/site:config', $context)) {
    echo html_writer::tag('p', html_writer::link(new moodle_url(
        '/admin/settings.php',
        ['section' => 'local_oksigeniahechauka_settings']
    ), get_string('settings', $c)));
}

// The screens: whether each is on, and what it shows.
echo $OUTPUT->heading(get_string('screens', $c), 3, 'mt-4');
echo html_writer::start_div('d-flex flex-wrap');
foreach ($screens as $s) {
    $info = json_decode((string) $s->lastinfo, true) ?: [];
    $on = screens::online($s, $now);
    $resting = !$on && !schedule::power_on(schedule::power($s->power), $now);
    if (!$s->lastseen) {
        $state = get_string('never', $c);
    } else if ($on) {
        $state = get_string('online', $c);
    } else if ($resting) {
        $state = get_string('off_hours', $c);
    } else {
        $state = get_string('offline_since', $c, format_time($now - $s->lastseen));
    }
    $mygroups = array_map(function ($g) use ($groups) {
        return format_string($groups[$g] ?? '');
    }, screens::groups_of((int) $s->id));
    echo html_writer::start_div('card me-3 mb-3', ['style' => 'width: 20rem;']);
    $shot = files::first(files::SHOT, (int) $s->id);
    if ($shot) {
        $src = moodle_url::make_pluginfile_url(
            $shot->get_contextid(),
            $c,
            files::SHOT,
            $s->id,
            '/',
            $shot->get_filename()
        );
        echo html_writer::img($src, '', ['class' => 'card-img-top']);
    }
    echo html_writer::start_div('card-body');
    $screenurl = new moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $s->id]);
    echo html_writer::tag('h4', html_writer::link($screenurl, format_string($s->name)), ['class' => 'h5 card-title mb-1']);
    echo html_writer::tag(
        'p',
        html_writer::tag('span', '●', ['class' => $on ? 'text-success' : ($resting ? 'text-muted' : 'text-danger'),
        'aria-hidden' => 'true']) . ' ' . s($state) . (!empty($info['version']) ? ' · ' . s($info['version']) : ''),
        ['class' => 'mb-1']
    );
    if ($mygroups) {
        echo html_writer::tag('p', s(implode(', ', $mygroups)), ['class' => 'text-muted mb-2']);
    }
    echo html_writer::link(
        new moodle_url('/local/oksigeniahechauka/preview.php', ['screen' => $s->id]),
        get_string('preview', $c),
        ['class' => 'btn btn-primary btn-sm me-2']
    );
    echo html_writer::link($screenurl, get_string('edit'), ['class' => 'btn btn-outline-secondary btn-sm me-2']);
    echo html_writer::link(
        new moodle_url($url, ['action' => 'removescreen', 'id' => $s->id, 'sesskey' => sesskey()]),
        get_string('remove', $c),
        ['class' => 'btn btn-outline-secondary btn-sm']
    );
    echo html_writer::end_div();
    echo html_writer::end_div();
}

// Adding a screen: the address it opens, and its code.
$player = (new moodle_url('/local/oksigeniahechauka/player/'))->out(false);
echo html_writer::start_div('card mb-3', ['style' => 'width: 24rem;']);
echo html_writer::start_div('card-body');
echo html_writer::tag('h4', get_string('addscreen', $c), ['class' => 'h5 card-title']);
echo html_writer::tag('p', get_string('addscreen_help', $c));
echo html_writer::tag('p', html_writer::tag('code', s($player), ['class' => 'user-select-all']));
echo html_writer::start_tag('form', ['method' => 'get', 'action' => (new moodle_url('/local/oksigeniahechauka/claim.php'))
    ->out(false), 'class' => 'd-flex align-items-end']);
echo html_writer::start_div('me-2');
echo html_writer::label(get_string('addscreen_code', $c), 'hk-code', true, ['class' => 'd-block']);
echo html_writer::empty_tag('input', ['type' => 'text', 'name' => 'code', 'id' => 'hk-code', 'size' => 8,
    'autocomplete' => 'off', 'class' => 'form-control text-uppercase', 'placeholder' => 'KM7 Q4X']);
echo html_writer::end_div();
echo html_writer::tag('button', get_string('addscreen_go', $c), ['type' => 'submit', 'class' => 'btn btn-primary']);
echo html_writer::end_tag('form');
echo html_writer::end_div();
echo html_writer::end_div();
echo html_writer::end_div();

// The content.
echo $OUTPUT->heading(get_string('content', $c), 3, 'mt-4');
echo html_writer::start_div('mb-3');
foreach (items::TYPES as $type) {
    echo html_writer::link(
        new moodle_url('/local/oksigeniahechauka/edit.php', ['type' => $type]),
        '+ ' . get_string('add_' . $type, $c),
        ['class' => 'btn btn-secondary me-2 mb-2']
    );
}
echo html_writer::link(
    new moodle_url('/local/oksigeniahechauka/preview.php'),
    get_string('preview', $c),
    ['class' => 'btn btn-outline-primary mb-2']
);
echo html_writer::end_div();
$asis = array_filter($items, function ($item) {
    return (items::data($item)['videostate'] ?? '') === 'asis';
});
if ($asis) {
    echo $OUTPUT->notification(get_string('video_asis', $c), 'info', false);
}
if (!$items) {
    echo html_writer::tag('p', get_string('content_none', $c), ['class' => 'text-muted']);
} else {
    $table = new html_table();
    $table->attributes['class'] = 'generaltable';
    $table->head = ['', get_string('name', $c), get_string('schedule', $c), get_string('where', $c), ''];
    foreach ($items as $item) {
        $thumb = '';
        if ($item->type === 'media') {
            $file = files::first(files::POSTER, (int) $item->id) ?: files::first(files::MEDIA, (int) $item->id);
            if ($file && $file->is_valid_image()) {
                $thumb = html_writer::img(
                    moodle_url::make_pluginfile_url(
                        $file->get_contextid(),
                        $c,
                        $file->get_filearea(),
                        $item->id,
                        '/',
                        $file->get_filename(),
                        false,
                        true
                    ),
                    '',
                    ['style' => 'width: 6rem; height: 3.4rem; object-fit: cover; border-radius: .25rem;']
                );
            } else if ($file) {
                $thumb = html_writer::tag('span', '▶', ['class' => 'h3', 'aria-hidden' => 'true']);
            }
        }
        $targets = items::targets($item);
        $where = $targets['all'] ? get_string('all', $c) : implode(', ', array_merge(
            array_map(function ($g) use ($groups) {
                return format_string($groups[$g] ?? '');
            }, $targets['groups']),
            array_map(function ($s) use ($screens) {
                return isset($screens[$s]) ? format_string($screens[$s]->name) : '';
            },
            $targets['screens'])
        ));
        $videostate = items::data($item)['videostate'] ?? '';
        $name = html_writer::tag('strong', format_string($item->title)) . html_writer::tag(
            'div',
            get_string('type_' . $item->type, $c) . ($item->visible ? '' : ' · ' . get_string('hidden', $c)) .
                (in_array($videostate, ['pending', 'failed']) ? ' · ' . get_string('video_' . $videostate, $c) : ''),
            ['class' => 'text-muted small']
        );
        $act = function (string $action, string $label) use ($url, $item) {
            return html_writer::link(new moodle_url($url, ['action' => $action, 'id' => $item->id,
                'sesskey' => sesskey()]), $label, ['class' => 'me-2']);
        };
        $actions = html_writer::link(
            new moodle_url('/local/oksigeniahechauka/edit.php', ['id' => $item->id]),
            get_string('edit'),
            ['class' => 'me-2']
        ) .
            $act($item->visible ? 'hide' : 'show', get_string($item->visible ? 'hide' : 'show')) .
            $act('up', '↑') . $act('down', '↓') .
            $act('delete', get_string('delete'));
        $row = new html_table_row([$thumb, $name, s(local_oksigeniahechauka_when_text($item)), s($where), $actions]);
        if (!$item->visible) {
            $row->attributes['class'] = 'dimmed_text';
        }
        $table->data[] = $row;
    }
    echo html_writer::table($table);
}

// The groups.
echo $OUTPUT->heading(get_string('groups', $c), 3, 'mt-4');
if (!$groups) {
    echo html_writer::tag('p', get_string('groups_none', $c), ['class' => 'text-muted']);
} else {
    echo html_writer::start_tag('ul', ['class' => 'list-unstyled']);
    foreach ($groups as $id => $name) {
        echo html_writer::tag('li', format_string($name) . ' ' . html_writer::link(
            new moodle_url(
                $url,
                ['action' => 'deletegroup', 'id' => $id, 'sesskey' => sesskey()]
            ),
            get_string('delete'),
            ['class' => 'small ms-2']
        ), ['class' => 'mb-1']);
    }
    echo html_writer::end_tag('ul');
}
echo html_writer::start_tag('form', ['method' => 'post', 'action' => $url->out(false), 'class' => 'd-flex mb-4']);
echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()]);
echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'action', 'value' => 'addgroup']);
echo html_writer::empty_tag('input', ['type' => 'text', 'name' => 'name', 'class' => 'form-control me-2',
    'style' => 'width: 16rem;', 'aria-label' => get_string('groups_add', $c),
    'placeholder' => get_string('groups_add', $c)]);
echo html_writer::tag('button', get_string('add'), ['type' => 'submit', 'class' => 'btn btn-secondary']);
echo html_writer::end_tag('form');

echo $OUTPUT->footer();
