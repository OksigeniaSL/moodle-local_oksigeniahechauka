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

namespace local_oksigeniahechauka\local;

/**
 * The people of the centre, for whoever chooses who publishes or runs the screens: by name, and by email for whoever may
 * see the emails of others in this Moodle (moodle/site:viewuseridentity, with the email among the identity fields), who
 * also sees it under each name. Nobody else learns an email from here.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class people {
    /** @var int How many people a search gives. */
    const LIMIT = 8;

    /**
     * Whether the current user may look people up by email and see it.
     *
     * @return bool
     */
    public static function by_email(): bool {
        return in_array('email', \core_user\fields::get_identity_fields(\context_system::instance(), false), true);
    }

    /**
     * Who matches what was typed: active people with an account, by name or surname, and by email when allowed.
     *
     * @param string $query At least two characters.
     * @param int[] $already Who is already chosen, marked as such.
     * @return array[] id, name, initials, detail (department, and the email when allowed), already
     */
    public static function find(string $query, array $already): array {
        global $DB, $CFG;
        $query = trim($query);
        if (\core_text::strlen($query) < 2) {
            return [];
        }
        $email = self::by_email();
        $fields = \core_user\fields::for_name()->get_sql('u', false, '', '', false)->selects;
        $full = $DB->sql_concat('u.firstname', "' '", 'u.lastname');
        $like = '%' . $DB->sql_like_escape($query) . '%';
        $params = ['guest' => $CFG->siteguest, 'q1' => $like, 'q2' => $like];
        $where = $DB->sql_like($full, ':q1', false, false) . ' OR ' . $DB->sql_like('u.lastname', ':q2', false, false);
        if ($email) {
            $where .= ' OR ' . $DB->sql_like('u.email', ':q3', false, false);
            $params['q3'] = $like;
        }
        $sql = "SELECT u.id, u.department, u.email, $fields
                  FROM {user} u
                 WHERE u.deleted = 0 AND u.suspended = 0 AND u.confirmed = 1 AND u.id <> :guest AND ($where)
              ORDER BY u.lastname, u.firstname";
        $out = [];
        foreach ($DB->get_records_sql($sql, $params, 0, self::LIMIT) as $user) {
            $words = preg_split('/\s+/', trim($user->firstname . ' ' . $user->lastname));
            $detail = array_filter([trim((string) $user->department), $email ? (string) $user->email : '']);
            $out[] = [
                'id' => (int) $user->id,
                'name' => fullname($user),
                'initials' => \core_text::strtoupper(\core_text::substr($words[0] ?? '', 0, 1) .
                    \core_text::substr(end($words) ?: '', 0, 1)),
                'detail' => implode(' · ', $detail),
                'already' => in_array((int) $user->id, $already, true),
            ];
        }
        return $out;
    }
}
