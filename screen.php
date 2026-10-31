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
 * One screen: how it is doing, and its settings.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\form\item_form;
use local_oksigeniahechauka\form\screen_form;
use local_oksigeniahechauka\local\schedule;
use local_oksigeniahechauka\local\screens;

$id = required_param('id', PARAM_INT);
$context = context_system::instance();
require_login(null, false);
require_capability('local/oksigeniahechauka:manage', $context);

$c = 'local_oksigeniahechauka';
$screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id], '*', MUST_EXIST);
$panel = new moodle_url('/local/oksigeniahechauka/index.php');
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $id]));
$PAGE->set_pagelayout('admin');
$PAGE->set_title(format_string($screen->name));
$PAGE->set_heading(get_string('manage', $c));
navigation_node::override_active_url($panel);

$form = new screen_form();
$power = schedule::power($screen->power);
$values = (object) [
    'id' => $screen->id,
    'name' => $screen->name,
    'template' => $screen->template,
    'theme' => $screen->theme,
    'groups' => array_fill_keys(screens::groups_of((int) $screen->id), 1),
    'powermode' => $power ? 'hours' : 'always',
    'powerdays' => array_fill_keys($power ? $power[0]['days'] : [1, 2, 3, 4, 5], 1),
    'powerrange' => $power ? ['from' => $power[0]['on'], 'to' => $power[0]['off']] : [],
    'alerts' => $screen->alerts,
];
$form->set_data($values);

if ($form->is_cancelled()) {
    redirect($panel);
}
if ($data = $form->get_data()) {
    $power = null;
    if ($data->powermode === 'hours') {
        $days = [];
        foreach ((array) ($data->powerdays ?? []) as $d => $on) {
            if ($on) {
                $days[] = (int) $d;
            }
        }
        $power = json_encode([['days' => count($days) < 7 ? $days : [],
            'on' => item_form::hour($data->powerrange['from']), 'off' => item_form::hour($data->powerrange['to'])]]);
    }
    $DB->update_record('local_oksigeniahechauka_screen', (object) [
        'id' => $screen->id,
        'name' => trim($data->name),
        'template' => $data->template === 'full' ? 'full' : 'zones',
        'theme' => in_array($data->theme, ['site', 'light', 'dark', 'auto']) ? $data->theme : 'site',
        'power' => $power,
        'alerts' => empty($data->alerts) ? 0 : 1,
        'timemodified' => time(),
    ]);
    $groups = [];
    foreach ((array) ($data->groups ?? []) as $g => $on) {
        if ($on) {
            $groups[] = (int) $g;
        }
    }
    screens::set_groups((int) $screen->id, $groups);
    redirect($panel, get_string('changessaved'), null, \core\output\notification::NOTIFY_SUCCESS);
}

/**
 * A time zone offset in minutes as people read it: «UTC+1», «UTC−3:30».
 *
 * @param int $minutes
 * @return string
 */
function local_oksigeniahechauka_offset(int $minutes): string {
    $sign = $minutes < 0 ? '−' : '+';
    $minutes = abs($minutes);
    return 'UTC' . $sign . intdiv($minutes, 60) . ($minutes % 60 ? sprintf(':%02d', $minutes % 60) : '');
}

// How it is doing: whether it answers, and whether its clock agrees with the site's (it runs its schedule by it).
$now = time();
$info = json_decode((string) $screen->lastinfo, true) ?: [];
if (!$screen->lastseen) {
    $state = get_string('never', $c);
} else if (screens::online($screen, $now)) {
    $state = get_string('online', $c);
} else if (!schedule::power_on(schedule::power($screen->power), $now)) {
    $state = get_string('off_hours', $c);
} else {
    $state = get_string('offline_since', $c, format_time($now - $screen->lastseen));
}
$facts = [$state];
if (!empty($info['version'])) {
    $facts[] = get_string('player_version', $c, s($info['version']));
}
if (!empty($info['display']['width'])) {
    $facts[] = (int) $info['display']['width'] . ' × ' . (int) $info['display']['height'];
}
$warnings = [];
if (isset($info['time']) && $screen->lastseen) {
    $skew = abs((int) $info['time'] - (int) $screen->lastseen);
    if ($skew > 120) {
        $warnings[] = get_string('clock_wrong', $c, format_time($skew));
    }
}
if (isset($info['tz_offset'])) {
    $site = (new DateTime('@' . $now))->setTimezone(core_date::get_server_timezone_object())->getOffset() / 60;
    if ((int) $info['tz_offset'] !== (int) $site) {
        $warnings[] = get_string('timezone_wrong', $c, (object) [
            'device' => local_oksigeniahechauka_offset((int) $info['tz_offset']),
            'site' => local_oksigeniahechauka_offset((int) $site),
        ]);
    }
}

echo $OUTPUT->header();
echo $OUTPUT->heading(format_string($screen->name));
echo html_writer::tag('p', implode(' · ', $facts), ['class' => 'text-muted']);
foreach ($warnings as $warning) {
    echo $OUTPUT->notification($warning, 'warning', false);
}
echo html_writer::tag('p', html_writer::link(
    new moodle_url('/local/oksigeniahechauka/preview.php', ['screen' => $screen->id]),
    get_string('preview', $c),
    ['class' => 'btn btn-outline-primary']
));
$form->display();
echo $OUTPUT->footer();
