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
 * What Moodle already knows, for the screens: the menu of the canteen, the events of the site and its news.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * Each source gives items of the contract, ready for the manifest, with their own «when».
 */
class sources {
    /** After this hour the screens show tomorrow's menu, as the canteen's own board does. */
    const MENU_SWITCH = '16:00';

    /**
     * Whether Oksigenia Meals is on the site.
     *
     * @return bool
     */
    public static function has_meals(): bool {
        return class_exists('\local_oksigeniameals\api') && method_exists('\local_oksigeniameals\api', 'menu_for_day');
    }

    /**
     * The menus of the coming days, from Oksigenia Meals: each day's menu until the afternoon, then tomorrow's.
     *
     * @param int $now
     * @param int $days how many days ahead
     * @param int|null $centreid the canteen; null for the first of the site
     * @return array items of the contract
     */
    public static function menus(int $now, int $days, ?int $centreid): array {
        if (!self::has_meals()) {
            return [];
        }
        $items = [];
        $label = get_string('label_menu', 'local_oksigeniahechauka');
        $tomorrow = get_string('label_menu_tomorrow', 'local_oksigeniahechauka');
        for ($i = 0; $i <= $days; $i++) {
            $day = schedule::day($now, $i);
            $menu = self::menu($now + $i * DAYSECS, $centreid);
            if ($menu) {
                $items[] = $menu + [
                    'id' => 'menu-' . $day,
                    'label' => $label,
                    'when' => ['from' => $day, 'until' => $day, 'times' => [['00:00', self::MENU_SWITCH]]],
                ];
                if ($i > 0) {
                    $before = schedule::day($now, $i - 1);
                    $items[] = $menu + [
                        'id' => 'menu-' . $day . '-eve',
                        'label' => $tomorrow,
                        'when' => ['from' => $before, 'until' => $before, 'times' => [[self::MENU_SWITCH, '00:00']]],
                    ];
                }
            }
        }
        return $items;
    }

    /**
     * One day's menu as an item of the contract, or null when there is nothing to show.
     *
     * @param int $time any moment of the day
     * @param int|null $centreid
     * @return array|null
     */
    protected static function menu(int $time, ?int $centreid): ?array {
        try {
            $data = \local_oksigeniameals\api::menu_for_day($time, $centreid);
        } catch (\Throwable $e) {
            debugging('Hechauka: the menu of Meals failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return null;
        }
        if (!$data) {
            return null;
        }
        $item = ['type' => 'menu', 'zone' => 'side', 'date' => $data['day']];
        if (!empty($data['closed'])) {
            $item['closed'] = true;
            $item['title'] = (string) ($data['title'] ?? '');
            return $item;
        }
        if (empty($data['served'])) {
            return null;
        }
        $menus = [];
        foreach ($data['meals'] ?? [] as $meal) {
            foreach ($meal['menus'] ?? [] as $menu) {
                if (isset($menu['chosen']) && !$menu['chosen']) {
                    // A menu of a diet: it is for whoever needs it, not for the screens.
                    continue;
                }
                $courses = [];
                foreach ($menu['dishes'] ?? [] as $dish) {
                    $part = (string) ($dish['part'] ?? '');
                    if (!isset($courses[$part])) {
                        $courses[$part] = ['label' => $part, 'dishes' => []];
                    }
                    $courses[$part]['dishes'][] = (string) ($dish['name'] ?? '');
                }
                if ($courses) {
                    $menus[] = ['name' => (string) ($menu['name'] ?? ''), 'courses' => array_values($courses)];
                }
            }
        }
        if (!$menus) {
            return null;
        }
        $item['menus'] = $menus;
        return $item;
    }

    /**
     * The events of the site calendar in the coming days.
     *
     * @param int $now
     * @param int $days
     * @return array items of the contract
     */
    public static function events(int $now, int $days): array {
        global $DB;
        $from = usergetmidnight($now, \core_date::get_server_timezone());
        $until = $from + ($days + 1) * DAYSECS;
        $records = $DB->get_records_select(
            'event',
            "eventtype = 'site' AND visible = 1 AND timestart < :until AND timestart + timeduration >= :from",
            ['from' => $from, 'until' => $until],
            'timestart',
            'id, name, location, timestart, timeduration',
            0,
            200
        );
        $items = [];
        $zone = \core_date::get_server_timezone();
        foreach ($records as $ev) {
            $start = (int) $ev->timestart;
            $end = $start + (int) $ev->timeduration;
            // A whole day, the way a calendar subscription leaves it: from midnight, lasting nothing or up to another
            // midnight. It lasts until the end of its last day.
            $allday = usergetmidnight($start, $zone) === $start
                && ($ev->timeduration == 0 || usergetmidnight($end, $zone) === $end);
            $last = $allday && $ev->timeduration > 0 ? $end - 60 : $end;
            $item = [
                'id' => 'event-' . $ev->id,
                'type' => 'event',
                'zone' => 'side',
                'title' => self::line($ev->name, 80),
                'start' => schedule::stamp($start),
                'color' => 1,
                'when' => ['from' => schedule::day($start), 'until' => schedule::day($last)],
            ];
            if ($allday) {
                $item['allday'] = true;
            }
            if ($ev->timeduration > 0) {
                $item['end'] = schedule::stamp($last);
            }
            if (trim((string) $ev->location) !== '') {
                $item['detail'] = self::line($ev->location, 60);
            }
            $items[] = $item;
        }
        return $items;
    }

    /**
     * The recent news of the site, as notices.
     *
     * @param int $now
     * @param int $days how long a piece of news stays
     * @return array items of the contract
     */
    public static function news(int $now, int $days): array {
        global $DB;
        $forum = $DB->get_record('forum', ['course' => SITEID, 'type' => 'news'], 'id', IGNORE_MULTIPLE);
        if (!$forum) {
            return [];
        }
        $sql = "SELECT d.id, d.name, d.timemodified, p.message, p.messageformat
                  FROM {forum_discussions} d
                  JOIN {forum_posts} p ON p.id = d.firstpost
                 WHERE d.forum = :forum AND d.timemodified >= :since
                       AND (d.timestart = 0 OR d.timestart <= :now1) AND (d.timeend = 0 OR d.timeend > :now2)
              ORDER BY d.timemodified DESC";
        $records = $DB->get_records_sql($sql, ['forum' => $forum->id, 'since' => $now - $days * DAYSECS,
            'now1' => $now, 'now2' => $now], 0, 10);
        $items = [];
        $order = 1000;
        foreach ($records as $d) {
            $items[] = [
                'id' => 'news-' . $d->id,
                'type' => 'notice',
                'zone' => 'side',
                'order' => $order++,
                'title' => self::line($d->name, 70),
                'body' => self::line(html_to_text((string) $d->message, 0, false), 90),
                'when' => ['until' => schedule::day((int) $d->timemodified, $days)],
            ];
        }
        return $items;
    }

    /**
     * One clean line of a text, cut at a word if it is long.
     *
     * @param string $text
     * @param int $max characters
     * @return string
     */
    public static function line(string $text, int $max): string {
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($text)));
        if (\core_text::strlen($text) <= $max) {
            return $text;
        }
        $cut = \core_text::substr($text, 0, $max);
        $space = \core_text::strrpos($cut, ' ');
        return rtrim($space > $max * 0.6 ? \core_text::substr($cut, 0, $space) : $cut, ' ,.;:') . '…';
    }
}
