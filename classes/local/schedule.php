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
     * How the dates of an item read in the form: always, one day, between two dates, from a date or until a date.
     *
     * @param string $from «YYYY-MM-DD» or empty
     * @param string $until «YYYY-MM-DD» or empty
     * @return string always, day, range, from or until
     */
    public static function dates_mode(string $from, string $until): string {
        if ($from !== '' && $until !== '') {
            return $from === $until ? 'day' : 'range';
        }
        return $from !== '' ? 'from' : ($until !== '' ? 'until' : 'always');
    }

    /**
     * The first and last day of an item from what was chosen in the form.
     *
     * @param string $mode always, day, range, from or until
     * @param string $day the day, for «day»
     * @param string $from the first day, for «range» and «from»
     * @param string $until the last day, for «range» and «until»
     * @return array [first day or null, last day or null]
     */
    public static function dates_for(string $mode, string $day, string $from, string $until): array {
        switch ($mode) {
            case 'day':
                return [$day, $day];
            case 'range':
                return [$from, $until];
            case 'from':
                return [$from, null];
            case 'until':
                return [null, $until];
        }
        return [null, null];
    }

    /**
     * The power hours of a screen from their JSON, only the valid windows.
     *
     * @param string|null $json
     * @return array [['days' => int[], 'on' => 'HH:MM', 'off' => 'HH:MM'], …]
     */
    public static function power(?string $json): array {
        $list = json_decode((string) $json, true);
        $out = [];
        foreach (is_array($list) ? $list : [] as $window) {
            if (!is_array($window) || !self::is_hour($window['on'] ?? '') || !self::is_hour($window['off'] ?? '')) {
                continue;
            }
            $days = self::days(implode(',', (array) ($window['days'] ?? [])));
            $out[] = ['days' => $days, 'on' => $window['on'], 'off' => $window['off']];
        }
        return $out;
    }

    /**
     * Whether a screen should be on at a moment, by its power hours and the site clock. The same rule as the
     * player (isPowerOn in player/src/rules.js): no hours means always on, and a window whose end comes before its
     * start crosses midnight.
     *
     * @param array $power windows from power()
     * @param int $time
     * @return bool
     */
    public static function power_on(array $power, int $time): bool {
        if (!$power) {
            return true;
        }
        $date = new \DateTime('@' . $time);
        $date->setTimezone(\core_date::get_server_timezone_object());
        $dow = (int) $date->format('N');
        $min = (int) $date->format('G') * 60 + (int) $date->format('i');
        foreach ($power as $window) {
            if ($window['days'] && !in_array($dow, $window['days'])) {
                continue;
            }
            [$h, $m] = explode(':', $window['on']);
            $on = (int) $h * 60 + (int) $m;
            [$h, $m] = explode(':', $window['off']);
            $off = (int) $h * 60 + (int) $m;
            if ($on === $off || ($on < $off ? $min >= $on && $min < $off : $min >= $on || $min < $off)) {
                return true;
            }
        }
        return false;
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
