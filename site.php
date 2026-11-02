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
 * A site of the centre: a group of screens somewhere else, with its own name, place and weather, and logos.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use core\output\notification;
use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\home;
use local_oksigeniahechauka\local\icons;
use local_oksigeniahechauka\local\items;
use local_oksigeniahechauka\local\place;
use local_oksigeniahechauka\local\sites;

$c = 'local_oksigeniahechauka';
$groupid = required_param('group', PARAM_INT);
$url = new moodle_url('/local/oksigeniahechauka/site.php', ['group' => $groupid]);
$back = new moodle_url('/local/oksigeniahechauka/screens.php', [], 'hkp-group-' . $groupid);
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
$group = $DB->get_record('local_oksigeniahechauka_group', ['id' => $groupid], '*', MUST_EXIST);
$suffix = sites::suffix($groupid);
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('site_title', $c, format_string($group->name)));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');
$now = time();

if (data_submitted() && confirm_sesskey()) {
    if (optional_param('pick', -1, PARAM_INT) >= 0) {
        // A place of the list: it is a site from then on.
        if (!sites::is_site($groupid)) {
            sites::set($groupid, '');
        }
        place::pick($now, $suffix);
        redirect($url);
    }
    if (optional_param('forget', 0, PARAM_BOOL)) {
        if (!optional_param('confirm', 0, PARAM_BOOL)) {
            \local_oksigeniahechauka\local\confirm::ask(
                get_string('site_confirm', $c, format_string($group->name)),
                new moodle_url($url, ['forget' => 1]),
                get_string('site_forget', $c),
                $url,
                get_string('site_keep', $c)
            );
        }
        sites::forget($groupid);
        redirect($back, get_string('site_forgotten', $c, format_string($group->name)), null, notification::NOTIFY_SUCCESS);
    }
    sites::set($groupid, optional_param('sitename', '', PARAM_TEXT));
    sites::save_logo($groupid, false, $_FILES['logo'] ?? null);
    sites::save_logo($groupid, true, $_FILES['logodark'] ?? null);
    redirect($url, get_string('centre_saved', $c), null, notification::NOTIFY_SUCCESS);
}

$query = optional_param('q', '', PARAM_TEXT);
$logos = [];
foreach ([false, true] as $dark) {
    $file = sites::logo($groupid, $dark);
    $logos[] = [
        'area' => $dark ? 'logodark' : 'logo',
        'dark' => $dark,
        'label' => get_string($dark ? 'centre_logo_dark' : 'centre_logo_light', $c),
        'url' => $file ? moodle_url::make_pluginfile_url(
            $file->get_contextid(),
            $c,
            $file->get_filearea(),
            $groupid,
            '/',
            $file->get_filename()
        )->out(false) : '',
        'alt' => get_string($dark ? 'centre_logo_dark_alt' : 'centre_logo_light_alt', $c),
    ];
}
$config = get_config($c);
$template = place::view($query, $now, $suffix) + [
    'tabs' => home::tabs('screens', true, 'permisos'),
    'howto' => \local_oksigeniahechauka\local\howto::button('permisos'),
    'hastabs' => true,
    'back' => $back->out(false),
    'backicon' => icons::svg('back'),
    'title' => get_string('site_title', $c, format_string($group->name)),
    'action' => $url->out(false),
    'sesskey' => sesskey(),
    'groupid' => $groupid,
    'issite' => sites::is_site($groupid, $config),
    'sitename' => (string) ($config->{'sitename' . $suffix} ?? ''),
    'groupname' => items::plain((string) $group->name),
    'logos' => $logos,
    'icons' => ['search' => icons::svg('search'), 'pin' => icons::svg('pin'), 'out' => icons::svg('out'),
        'check' => icons::svg('check')],
];
$PAGE->requires->js(new moodle_url('/local/oksigeniahechauka/player/tiempo-iconos.js', ['v' => get_config($c, 'version')]));
$PAGE->requires->js(new moodle_url('/local/oksigeniahechauka/panel/sky.js', ['v' => get_config($c, 'version')]));
echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/site', $template);
echo $OUTPUT->footer();
