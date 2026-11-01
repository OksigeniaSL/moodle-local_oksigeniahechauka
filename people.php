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
 * The people of the school, for «Quién publica aquí»: who runs the screens types a name and chooses. Moodle's own user
 * search asks for a capability of administrators; this one asks for running the screens, and says only the names.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;

require_login(null, false);
access::require_cap('managescreens');
require_sesskey();
$query = trim(optional_param('q', '', PARAM_TEXT));
$group = optional_param('group', 0, PARAM_INT);
$list = optional_param('list', 'group', PARAM_ALPHA);
if ($list === 'managers' && !access::may_choose_managers()) {
    throw new required_capability_exception(context_system::instance(), 'moodle/role:assign', 'nopermissions', '');
}
$out = [];
if (core_text::strlen($query) >= 2) {
    if ($list === 'group') {
        $already = array_map('intval', array_keys(access::editors($group)));
    } else {
        $already = array_map(function ($h) {
            return (int) $h['user']->id;
        }, $list === 'managers' ? access::holders('managescreens', access::MANAGER) :
            access::holders('publishall', access::EVERYWHERE));
    }
    $fields = \core_user\fields::for_name()->get_sql('u', false, '', '', false)->selects;
    $full = $DB->sql_concat('u.firstname', "' '", 'u.lastname');
    $sql = "SELECT u.id, u.department, $fields
              FROM {user} u
             WHERE u.deleted = 0 AND u.suspended = 0 AND u.confirmed = 1 AND u.id <> :guest
                   AND (" . $DB->sql_like($full, ':q1', false, false) . ' OR ' .
                        $DB->sql_like('u.lastname', ':q2', false, false) . ")
          ORDER BY u.lastname, u.firstname";
    $like = '%' . $DB->sql_like_escape($query) . '%';
    foreach ($DB->get_records_sql($sql, ['guest' => $CFG->siteguest, 'q1' => $like, 'q2' => $like], 0, 8) as $user) {
        $name = fullname($user);
        $words = preg_split('/\s+/', trim($user->firstname . ' ' . $user->lastname));
        $out[] = [
            'id' => (int) $user->id,
            'name' => $name,
            'initials' => core_text::strtoupper(core_text::substr($words[0] ?? '', 0, 1) .
                core_text::substr(end($words) ?: '', 0, 1)),
            'detail' => (string) $user->department,
            'already' => in_array((int) $user->id, $already),
        ];
    }
}
header('Content-Type: application/json; charset=utf-8');
echo json_encode($out, JSON_UNESCAPED_UNICODE);
