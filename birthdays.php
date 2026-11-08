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
 * The birthdays: whether the screens show them, from which field of the profile, and the list kept here.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use core\output\notification;
use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\birthdays;

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/birthdays.php');
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('birthdays_title', $c));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');

/**
 * A picture sent with the form, if it arrived.
 *
 * @param array|null $upload one file of $_FILES
 * @return bool
 */
function local_oksigeniahechauka_arrived(?array $upload): bool {
    return $upload && !empty($upload['name']) && empty($upload['error']) && is_uploaded_file($upload['tmp_name']);
}

$action = optional_param('action', '', PARAM_ALPHA);
if ($action !== '' && confirm_sesskey()) {
    $message = get_string('birthdays_saved', $c);
    $kind = notification::NOTIFY_SUCCESS;
    if ($action === 'settings') {
        $field = optional_param('field', '', PARAM_ALPHANUMEXT);
        set_config('sourcebirthdays', optional_param('on', 0, PARAM_BOOL), $c);
        set_config('birthdayfield', isset(birthdays::fields()[$field]) ? $field : '', $c);
        \cache::make($c, 'birthdays')->purge();
        if (birthdays::family_available()) {
            set_config('birthdaysfamily', optional_param('family', 0, PARAM_BOOL) ? 1 : 0, $c);
        }
        // The pupils from Cifra, where the site has a connection: read at once when it is turned on, then every night.
        if (\local_oksigeniahechauka\local\cifra::of_site()) {
            $cifra = optional_param('cifra', 0, PARAM_BOOL);
            $was = !empty(get_config($c, 'birthdayscifra'));
            set_config('birthdayscifra', $cifra ? 1 : 0, $c);
            if ($cifra && !$was) {
                \core_php_time_limit::raise(900);
                birthdays::sync_cifra(time());
                $status = json_decode((string) get_config($c, 'birthdayscifrastatus'), true) ?: [];
                if (!empty($status['error'])) {
                    $message = get_string('birthdays_cifra_error', $c, $status['error']);
                    $kind = notification::NOTIFY_ERROR;
                } else {
                    $message = get_string('birthdays_cifra_done', $c, (object) $status);
                }
            }
        }
    } else if ($action === 'link') {
        $userid = optional_param('user', 0, PARAM_INT);
        if (!birthdays::link(required_param('id', PARAM_INT), $userid)) {
            $message = get_string('birthdays_link_wrong', $c);
            $kind = notification::NOTIFY_ERROR;
        } else {
            $message = $userid ? get_string('birthdays_linked', $c, fullname(core_user::get_user($userid))) :
                get_string('birthdays_unlinked', $c);
        }
    } else if ($action === 'relink') {
        \core_php_time_limit::raise(300);
        $message = get_string('birthdays_relinked', $c, birthdays::relink());
    } else if ($action === 'greeting') {
        set_config('greetcard', optional_param('card', 0, PARAM_BOOL) ? 1 : 0, $c);
        set_config('greetnotify', optional_param('notify', 0, PARAM_BOOL) ? 1 : 0, $c);
    } else if ($action === 'add') {
        $id = birthdays::add(
            optional_param('name', '', PARAM_TEXT),
            optional_param('group', '', PARAM_TEXT),
            optional_param('day', 0, PARAM_INT),
            optional_param('month', 0, PARAM_INT),
            optional_param('idnumber', '', PARAM_TEXT)
        );
        if (!$id) {
            $message = get_string('birthdays_add_wrong', $c);
            $kind = notification::NOTIFY_ERROR;
        } else if (
            local_oksigeniahechauka_arrived($_FILES['photo'] ?? null)
            && !birthdays::set_picture($id, $_FILES['photo']['tmp_name'], $_FILES['photo']['name'])
        ) {
            $message = get_string('birthdays_photo_wrong', $c);
            $kind = notification::NOTIFY_WARNING;
        }
    } else if ($action === 'import') {
        $done = birthdays::import(optional_param('list', '', PARAM_TEXT));
        $sheet = $_FILES['sheet'] ?? null;
        if (local_oksigeniahechauka_arrived($sheet)) {
            $text = filesize($sheet['tmp_name']) <= 1024 * 1024 ? (string) file_get_contents($sheet['tmp_name']) : '';
            $fromfile = birthdays::import($text, true);
            $done = ['added' => $done['added'] + $fromfile['added'], 'wrong' => array_merge($done['wrong'], $fromfile['wrong'])];
        }
        $message = get_string('birthdays_imported', $c, $done['added']);
        if ($done['wrong']) {
            $message .= ' ' . get_string('birthdays_import_wrong', $c, s(implode(' · ', array_slice($done['wrong'], 0, 5))));
            $kind = notification::NOTIFY_WARNING;
        }
    } else if ($action === 'photos') {
        $ok = 0;
        $nobody = 0;
        $sent = $_FILES['photos'] ?? ['name' => []];
        foreach ((array) $sent['name'] as $i => $name) {
            $one = ['name' => $name, 'error' => $sent['error'][$i] ?? 1, 'tmp_name' => $sent['tmp_name'][$i] ?? ''];
            if (!local_oksigeniahechauka_arrived($one)) {
                continue;
            }
            $id = birthdays::who_is($name);
            if ($id && birthdays::set_picture($id, $one['tmp_name'], $name)) {
                $ok++;
            } else {
                $nobody++;
            }
        }
        $message = get_string('birthdays_photos_done', $c, (object) ['ok' => $ok, 'nobody' => $nobody]);
        $kind = $nobody ? notification::NOTIFY_WARNING : notification::NOTIFY_SUCCESS;
    } else if ($action === 'delete') {
        $id = required_param('id', PARAM_INT);
        if (!optional_param('confirm', 0, PARAM_BOOL)) {
            $who = $DB->get_field(birthdays::TABLE, 'name', ['id' => $id], MUST_EXIST);
            \local_oksigeniahechauka\local\confirm::ask(
                get_string('birthdays_confirm', $c, s($who)),
                new moodle_url($url, ['action' => 'delete', 'id' => $id]),
                get_string('birthdays_confirm_yes', $c),
                $url,
                get_string('birthdays_confirm_no', $c)
            );
        }
        birthdays::delete($id);
        $message = get_string('birthdays_deleted', $c);
    }
    redirect($url, $message, null, $kind);
}

echo $OUTPUT->header();
echo $OUTPUT->render_from_template(
    'local_oksigeniahechauka/birthdays',
    \local_oksigeniahechauka\local\birthdayspage::context(time())
);
echo $OUTPUT->footer();
