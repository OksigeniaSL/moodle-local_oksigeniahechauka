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
 * The screens, as a door of «Your work» (block_oksigeniatembiapo), the dashboard of whoever runs something: for who runs
 * the screens, how many there are and the ones that should be on and give no sign of life; for who publishes, what is on
 * them and an urgent notice left on. Nothing for whoever has no permission. Without the block, nobody asks.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class work {
    /** @var int Seconds a door is kept: it is asked on every load of the dashboard. */
    const KEEP = 60;

    /** @var int Screens without a sign of life named one by one; more are one alert. */
    const ONE_BY_ONE = 2;

    /** @var int What someone published that stops showing soon, named one by one; more are one alert. */
    const ENDING_ONE_BY_ONE = 3;

    /**
     * The door of the screens for someone, as the block takes it; none without a permission.
     *
     * @param int $userid
     * @param int $now
     * @return array[] zero or one door
     */
    public static function cards(int $userid, int $now): array {
        if (!$userid || !access::can('view', $userid) || (!access::can('managescreens', $userid) && !access::publishes($userid))) {
            return [];
        }
        $cache = \cache::make('local_oksigeniahechauka', 'work');
        $kept = $cache->get('u' . $userid);
        if ($kept && $kept['until'] > $now && $kept['lang'] === current_language()) {
            return $kept['cards'];
        }
        $cards = [self::card($userid, $now)];
        $cache->set('u' . $userid, ['until' => $now + self::KEEP, 'lang' => current_language(), 'cards' => $cards]);
        return $cards;
    }

    /**
     * The door itself.
     *
     * @param int $userid
     * @param int $now
     * @return array
     */
    protected static function card(int $userid, int $now): array {
        global $DB, $OUTPUT;
        $c = 'local_oksigeniahechauka';
        $manages = access::can('managescreens', $userid);
        $alerts = [];
        $status = '';
        if ($manages) {
            $screens = $DB->get_records_select(
                'local_oksigeniahechauka_screen',
                'keyhash IS NOT NULL',
                [],
                'name',
                'id, name, lastseen, lastinfo, power, alerts'
            );
            $down = 0;
            $silent = [];
            foreach ($screens as $screen) {
                $info = json_decode((string) ($screen->lastinfo ?? ''), true) ?: [];
                // As the warning by notification: one that has never been seen is still being set up.
                $quiet = $now - $screen->lastseen > alerts::DOWN_AFTER || screens::frozen($info);
                if (!$screen->lastseen || !$quiet || !alerts::expected($screen, $now)) {
                    continue;
                }
                $down++;
                if ($screen->alerts) {
                    $silent[] = $screen;
                }
            }
            if (count($silent) > self::ONE_BY_ONE) {
                // Many at once is one thing to look at: the panel shows which.
                $alerts[] = ['text' => get_string('work_down_many', $c, count($silent)),
                    'url' => (new \moodle_url('/local/oksigeniahechauka/index.php'))->out(false), 'level' => 'urgent'];
            } else {
                foreach ($silent as $screen) {
                    $today = (int) $screen->lastseen >= usergetmidnight($now);
                    $format = get_string($today ? 'strftimetime' : 'strftimedatetimeshort', 'langconfig');
                    $alerts[] = [
                        'text' => get_string('work_down', $c, (object) [
                            'name' => items::plain((string) $screen->name),
                            'since' => userdate($screen->lastseen, $format),
                        ]),
                        'url' => (new \moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $screen->id]))->out(false),
                        'level' => 'urgent',
                    ];
                }
            }
            $count = count($screens);
            if (!$count) {
                $status = get_string('work_noscreens', $c);
            } else if ($count === 1) {
                $status = get_string($down ? 'work_screen_down_one' : 'work_screens_one', $c);
            } else {
                $status = $down ? get_string('work_screens_down', $c, (object) ['count' => $count, 'down' => $down]) :
                    get_string('work_screens', $c, $count);
            }
        }
        // An urgent notice left on is worth remembering to whoever can take it off.
        if (access::can('publishall', $userid)) {
            foreach ($DB->get_records('local_oksigeniahechauka_item', ['type' => 'urgent', 'visible' => 1]) as $urgent) {
                if (items::urgent_on($urgent, $now)) {
                    $alerts[] = [
                        'text' => get_string('work_urgent', $c, items::plain(format_string($urgent->title))),
                        'url' => (new \moodle_url('/local/oksigeniahechauka/index.php'))->out(false),
                        'level' => 'today',
                    ];
                }
            }
        }
        // What this person published that stops showing today or tomorrow: in time to make it last.
        $alerts = array_merge($alerts, self::ending($userid, $now));
        if (!$manages) {
            $limited = !access::can('publishall', $userid);
            $count = $DB->count_records_select(
                'local_oksigeniahechauka_item',
                "visible = 1 AND type <> 'urgent'" . ($limited ? ' AND createdby = :me' : ''),
                $limited ? ['me' => $userid] : []
            );
            $status = get_string($limited ? 'work_mine' : 'work_items', $c, $count);
        }
        $actions = [];
        if (access::publishes($userid)) {
            $actions[] = ['label' => get_string('work_publish', $c),
                'url' => (new \moodle_url('/local/oksigeniahechauka/edit.php', ['type' => 'notice']))->out(false)];
        }
        if ($manages) {
            $actions[] = ['label' => get_string('work_allscreens', $c),
                'url' => (new \moodle_url('/local/oksigeniahechauka/screens.php'))->out(false)];
        }
        return [
            'key' => 'local_oksigeniahechauka',
            'title' => get_string('work_title', $c),
            'url' => (new \moodle_url('/local/oksigeniahechauka/index.php'))->out(false),
            'status' => $status,
            'alerts' => $alerts,
            'actions' => $actions,
            'icon' => $OUTPUT->image_url('icon', $c)->out(false),
        ];
    }

    /**
     * What someone published that stops showing today or tomorrow, so that they make it last if they want: each with its
     * way to the editing, or, when there are many, one alert to the panel. An urgent notice is not here: it is taken off,
     * not let run out.
     *
     * @param int $userid
     * @param int $now
     * @return array[] alerts of the block
     */
    public static function ending(int $userid, int $now): array {
        global $DB;
        $c = 'local_oksigeniahechauka';
        $today = schedule::day($now);
        $tomorrow = schedule::day($now, 1);
        $items = $DB->get_records_select(
            'local_oksigeniahechauka_item',
            "createdby = :me AND visible = 1 AND type <> 'urgent' AND (dateuntil = :today OR dateuntil = :tomorrow)",
            ['me' => $userid, 'today' => $today, 'tomorrow' => $tomorrow],
            'dateuntil, title',
            'id, title, dateuntil'
        );
        if (!$items) {
            return [];
        }
        if (count($items) > self::ENDING_ONE_BY_ONE) {
            return [['text' => get_string('work_ending_many', $c, count($items)),
                'url' => (new \moodle_url('/local/oksigeniahechauka/index.php'))->out(false), 'level' => 'today']];
        }
        $alerts = [];
        foreach ($items as $item) {
            $key = $item->dateuntil === $today ? 'work_ending_today' : 'work_ending_tomorrow';
            $alerts[] = [
                'text' => get_string($key, $c, items::plain(format_string($item->title))),
                'url' => (new \moodle_url('/local/oksigeniahechauka/edit.php', ['id' => $item->id]))->out(false),
                'level' => 'today',
            ];
        }
        return $alerts;
    }
}
