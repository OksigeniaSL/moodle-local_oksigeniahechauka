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
    } else if ($action === 'add') {
        $id = birthdays::add(
            optional_param('name', '', PARAM_TEXT),
            optional_param('group', '', PARAM_TEXT),
            optional_param('day', 0, PARAM_INT),
            optional_param('month', 0, PARAM_INT)
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
        birthdays::delete(required_param('id', PARAM_INT));
    }
    redirect($url, $message, null, $kind);
}

echo $OUTPUT->header();
echo $OUTPUT->render_from_template(
    'local_oksigeniahechauka/birthdays',
    \local_oksigeniahechauka\local\birthdayspage::context(time())
);
echo $OUTPUT->footer();
