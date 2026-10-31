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
 * «Pantallas y grupos», for who runs the screens: the screens, adding one, and the groups with who publishes in each.
 * Until its own design arrives, the pieces of the first panel.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\files;
use local_oksigeniahechauka\local\home;
use local_oksigeniahechauka\local\schedule;
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
$managescreens = true;

if ($action !== '' && confirm_sesskey()) {
    $id = optional_param('id', 0, PARAM_INT);
    switch ($action) {
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
            access::forget_group($id);
            $DB->delete_records('local_oksigeniahechauka_member', ['groupid' => $id]);
            $DB->delete_records('local_oksigeniahechauka_target', ['groupid' => $id]);
            $DB->delete_records('local_oksigeniahechauka_group', ['id' => $id]);
            break;
    }
    redirect($url);
}

$screens = $DB->get_records('local_oksigeniahechauka_screen', null, 'sortorder, name');
$groups = $DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name');

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/panel_head', [
    'title' => get_string('panel_title', $c),
    'style' => home::stages(),
    'tabs' => home::tabs('screens', true),
    'hastabs' => true,
]);
if (has_capability('moodle/site:config', $context)) {
    echo html_writer::tag('p', html_writer::link(new moodle_url(
        '/admin/settings.php',
        ['section' => 'local_oksigeniahechauka_settings']
    ), get_string('settings', $c)));
}

// The screens: whether each is on, and what it shows.
echo $OUTPUT->heading(get_string('screens', $c), 3, 'mt-4');
if ($managescreens && count($screens) > 1) {
    echo html_writer::tag('p', html_writer::link(
        new moodle_url('/local/oksigeniahechauka/index.php', ['action' => 'reloadall', 'sesskey' => sesskey()]),
        get_string('reloadall', $c),
        ['class' => 'btn btn-outline-secondary btn-sm']
    ));
}
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
    echo html_writer::tag(
        'h4',
        $managescreens ? html_writer::link($screenurl, format_string($s->name)) : format_string($s->name),
        ['class' => 'h5 card-title mb-1']
    );
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
    if ($managescreens) {
        echo html_writer::link(
            new moodle_url('/local/oksigeniahechauka/index.php', ['action' => 'reload', 'id' => $s->id, 'sesskey' => sesskey()]),
            get_string('reload', $c),
            ['class' => 'btn btn-outline-secondary btn-sm me-2']
        );
        echo html_writer::link($screenurl, get_string('edit'), ['class' => 'btn btn-outline-secondary btn-sm me-2']);
        echo html_writer::link(
            new moodle_url($url, ['action' => 'removescreen', 'id' => $s->id, 'sesskey' => sesskey()]),
            get_string('remove', $c),
            ['class' => 'btn btn-outline-secondary btn-sm']
        );
    }
    echo html_writer::end_div();
    echo html_writer::end_div();
}

// Adding a screen: the address it opens, and its code.
$player = (new moodle_url('/local/oksigeniahechauka/player/'))->out(false);
if ($managescreens) {
    echo html_writer::start_div('card mb-3', ['style' => 'width: 24rem;', 'id' => 'add']);
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
}
echo html_writer::end_div();

// The groups, and who publishes in each: for who runs the screens.
echo $OUTPUT->heading(get_string('groups', $c), 3, 'mt-4');
if (!$groups) {
    echo html_writer::tag('p', get_string('groups_none', $c), ['class' => 'text-muted']);
} else {
    echo html_writer::start_tag('ul', ['class' => 'list-unstyled']);
    foreach ($groups as $id => $name) {
        $editors = array_map('fullname', access::editors((int) $id));
        echo html_writer::tag('li', format_string($name) . ' ' . html_writer::tag(
            'span',
            $editors ? s(get_string('group_editors', $c, implode(', ', $editors))) : get_string('group_noeditors', $c),
            ['class' => 'text-muted small ms-2']
        ) . ' ' . html_writer::link(
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
