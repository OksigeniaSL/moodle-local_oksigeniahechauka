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
 * A notice that also goes to the news forum of the site, and from there to whoever follows it, by mail or on their phone: written
 * once. What comes back from that forum is not shown twice.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class news {
    /**
     * The news forum of the site, if the person can write in it.
     *
     * @param int $userid
     * @return \stdClass|null
     */
    protected static function forum_for(int $userid): ?\stdClass {
        global $CFG;
        require_once($CFG->dirroot . '/mod/forum/lib.php');
        $forum = forum_get_course_forum(SITEID, 'news');
        if (!$forum) {
            return null;
        }
        $cm = get_coursemodule_from_instance('forum', $forum->id, SITEID);
        if (!$cm) {
            return null;
        }
        return has_capability('mod/forum:addnews', \context_module::instance($cm->id), $userid) ? $forum : null;
    }

    /**
     * Whether the person can send a notice to the forum too.
     *
     * @param int $userid
     * @return bool
     */
    public static function can_publish(int $userid): bool {
        return (bool) self::forum_for($userid);
    }

    /**
     * A notice in the forum, under the name of whoever writes it.
     *
     * @param string $title
     * @param string $body
     * @param int $userid
     * @return int|null the discussion, or null if the person cannot
     */
    public static function publish(string $title, string $body, int $userid): ?int {
        $forum = self::forum_for($userid);
        if (!$forum) {
            return null;
        }
        $text = trim($body) !== '' ? $body : $title;
        $discussion = (object) [
            'course' => SITEID,
            'forum' => $forum->id,
            'name' => $title,
            'message' => s($text),
            'messageformat' => FORMAT_HTML,
            'messagetrust' => 0,
            'attachments' => null,
            'mailnow' => 0,
            'groupid' => -1,
            'timestart' => 0,
            'timeend' => 0,
            'timelocked' => 0,
            'pinned' => FORUM_DISCUSSION_UNPINNED,
        ];
        return (int) forum_add_discussion($discussion, null, null, $userid) ?: null;
    }

    /**
     * The address of a discussion.
     *
     * @param int $discussion
     * @return string
     */
    public static function url(int $discussion): string {
        return (new \moodle_url('/mod/forum/discuss.php', ['d' => $discussion]))->out(false);
    }

    /**
     * Takes out of a list of items the news that are notices of the panel: written here, they already have their place.
     *
     * @param array $items items of the contract
     * @return array
     */
    public static function without_own(array $items): array {
        global $DB;
        $like = $DB->sql_like('data', ':mark');
        $records = $DB->get_records_select('local_oksigeniahechauka_item', $like, ['mark' => '%forumdiscussion%'], '', 'id, data');
        $own = [];
        foreach ($records as $record) {
            $data = json_decode((string) $record->data, true) ?: [];
            if (!empty($data['forumdiscussion'])) {
                $own['news-' . (int) $data['forumdiscussion']] = true;
            }
        }
        return array_values(array_filter($items, function ($item) use ($own) {
            return empty($own[$item['id'] ?? '']);
        }));
    }
}
