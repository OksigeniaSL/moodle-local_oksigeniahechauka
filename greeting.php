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
 * The birthday card of the dashboard: its picture, only for whoever it greets and on their day, and closing it until the
 * next birthday (from the page, without leaving it; or, without JavaScript, back to where it was).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\greeting;

require_login(null, false);
if (isguestuser()) {
    throw new \moodle_exception('noguest');
}

if (optional_param('photo', 0, PARAM_INT)) {
    $file = greeting::photo((int) $USER->id, time());
    if (!$file) {
        send_file_not_found();
    }
    // A day at most: the card is gone tomorrow.
    send_stored_file($file, HOURSECS, 0, false, ['cacheability' => 'private']);
}

require_sesskey();
if (optional_param('close', 0, PARAM_BOOL)) {
    greeting::close((int) $USER->id, time());
}
if (optional_param('ajax', 0, PARAM_BOOL)) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['closed' => true]);
    die;
}
$back = optional_param('back', '', PARAM_LOCALURL);
redirect(new moodle_url($back !== '' ? $back : '/my/'));
