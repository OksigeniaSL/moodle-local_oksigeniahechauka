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
 * The schedule of an item, as the contract says it («when»).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * Dates, weekdays, time ranges and «every N weeks» of an item.
 */
class schedule {
    /**
     * The «when» of the contract for an item, or null when it is always on.
     *
     * @param \stdClass $item a record of local_oksigeniahechauka_item
     * @return array|null
     */
    public static function when(\stdClass $item): ?array {
        $when = [];
        if (self::is_date($item->datefrom ?? '')) {
            $when['from'] = $item->datefrom;
        }
        if (self::is_date($item->dateuntil ?? '')) {
            $when['until'] = $item->dateuntil;
        }
        $days = self::days($item->days ?? '');
        if ($days && count($days) < 7) {
            $when['days'] = $days;
        }
        $times = self::times($item->times ?? '');
        if ($times) {
            $when['times'] = $times;
        }
        if (($item->everyweeks ?? 0) > 1) {
            if (!isset($when['from'])) {
                // The weeks count from the week the item was made in.
                $when['from'] = userdate($item->timecreated, '%Y-%m-%d', \core_date::get_server_timezone(), false);
            }
            $when['every'] = (int) $item->everyweeks;
        }
        return $when ?: null;
    }

    /**
     * Whether a text is a date «YYYY-MM-DD».
     *
     * @param string|null $text
     * @return bool
     */
    public static function is_date(?string $text): bool {
        return is_string($text) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $text) === 1;
    }

    /**
     * Whether a text is an hour «HH:MM».
     *
     * @param string|null $text
     * @return bool
     */
    public static function is_hour(?string $text): bool {
        return is_string($text) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $text) === 1;
    }

    /**
     * ISO weekdays from «1,3,5».
     *
     * @param string|null $text
     * @return int[]
     */
    public static function days(?string $text): array {
        $days = [];
        foreach (explode(',', (string) $text) as $d) {
            $d = (int) $d;
            if ($d >= 1 && $d <= 7 && !in_array($d, $days)) {
                $days[] = $d;
            }
        }
        sort($days);
        return $days;
    }

    /**
     * Time ranges from their JSON, only the valid ones.
     *
     * @param string|null $json
     * @return array
     */
    public static function times(?string $json): array {
        $list = json_decode((string) $json, true);
        $out = [];
        foreach (is_array($list) ? $list : [] as $range) {
            if (is_array($range) && count($range) === 2 && self::is_hour($range[0]) && self::is_hour($range[1])) {
                $out[] = [$range[0], $range[1]];
            }
        }
        return $out;
    }

    /**
     * A day of the site calendar, «YYYY-MM-DD», for a moment.
     *
     * @param int $time
     * @param int $adddays days to add
     * @return string
     */
    public static function day(int $time, int $adddays = 0): string {
        $date = new \DateTime('@' . $time);
        $date->setTimezone(\core_date::get_server_timezone_object());
        if ($adddays) {
            $date->modify(($adddays > 0 ? '+' : '') . $adddays . ' days');
        }
        return $date->format('Y-m-d');
    }

    /**
     * A wall-clock moment of the site calendar, «YYYY-MM-DDTHH:MM».
     *
     * @param int $time
     * @return string
     */
    public static function stamp(int $time): string {
        $date = new \DateTime('@' . $time);
        $date->setTimezone(\core_date::get_server_timezone_object());
        return $date->format('Y-m-d\TH:i');
    }
}
