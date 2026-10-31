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
 * Time said as people say it, for the panel: «Hasta el viernes 6», «Del 26/10 al 8/11», «quedan 3 días», «hace 1 min»,
 * «se enciende el jueves a las 16:00». One string per pattern, so each language orders it its way. Days are counted in
 * the site's calendar (the one the screens follow).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class phrases {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /**
     * A day «YYYY-MM-DD» as a moment at noon of the site's calendar (noon: never across a change of hour).
     *
     * @param string $day
     * @return int
     */
    public static function noon(string $day): int {
        return (new \DateTime($day . ' 12:00', \core_date::get_server_timezone_object()))->getTimestamp();
    }

    /**
     * Days from one day to another, both «YYYY-MM-DD».
     *
     * @param string $from
     * @param string $to
     * @return int
     */
    public static function days_between(string $from, string $to): int {
        return (int) round((self::noon($to) - self::noon($from)) / DAYSECS);
    }

    /**
     * «viernes 6», the day of the week and its number.
     *
     * @param string $day «YYYY-MM-DD»
     * @return string
     */
    public static function weekday(string $day): string {
        $t = self::noon($day);
        $tz = \core_date::get_server_timezone();
        return \core_text::strtolower(userdate($t, '%A', $tz, false)) . ' ' . (int) substr($day, 8, 2);
    }

    /**
     * «8/11», the short date.
     *
     * @param string $day «YYYY-MM-DD»
     * @return string
     */
    public static function short(string $day): string {
        return (int) substr($day, 8, 2) . '/' . (int) substr($day, 5, 2);
    }

    /**
     * A day near today in words («viernes 6» within a week, «8/11» further).
     *
     * @param string $day
     * @param string $today
     * @return string
     */
    public static function near(string $day, string $today): string {
        return abs(self::days_between($today, $day)) <= 6 ? self::weekday($day) : self::short($day);
    }

    /**
     * How long ago, short: «un momento», «4 min», «2 h», «3 días».
     *
     * @param int $seconds
     * @return string
     */
    public static function ago(int $seconds): string {
        $seconds = max(0, $seconds);
        if ($seconds < 45) {
            return get_string('ago_now', self::C);
        }
        if ($seconds < HOURSECS) {
            return get_string('ago_min', self::C, max(1, (int) round($seconds / MINSECS)));
        }
        if ($seconds < DAYSECS) {
            return get_string('ago_hours', self::C, (int) floor($seconds / HOURSECS));
        }
        return get_string('ago_days', self::C, (int) floor($seconds / DAYSECS));
    }

    /**
     * «10:12», the hour of a moment in the site's calendar.
     *
     * @param int $time
     * @return string
     */
    public static function hour(int $time): string {
        return userdate($time, '%H:%M', \core_date::get_server_timezone(), false);
    }

    /**
     * Since when, from the side of now: «desde las 10:12» today, «desde el viernes 30» this week, «desde el 12/10».
     *
     * @param int $time
     * @param int $now
     * @return string
     */
    public static function since(int $time, int $now): string {
        $day = schedule::day($time);
        $today = schedule::day($now);
        if ($day === $today) {
            return get_string('since_hour', self::C, self::hour($time));
        }
        return get_string('since_day', self::C, self::near($day, $today));
    }

    /**
     * The window of an item said in a list, with a small line under it: how long is left, or its days and hours.
     *
     * @param \stdClass $item
     * @param string $today «YYYY-MM-DD»
     * @return array when (the phrase), small (the line under it, maybe empty), soon (it ends within four days)
     */
    public static function when(\stdClass $item, string $today): array {
        $c = self::C;
        $when = schedule::when($item) ?? [];
        $from = $when['from'] ?? '';
        $until = $when['until'] ?? '';
        $out = ['when' => '', 'small' => '', 'soon' => false];
        if ($until !== '' && $until < $today) {
            $out['when'] = get_string('when_ended', $c, self::near($until, $today));
        } else if ($from !== '' && $from > $today) {
            if ($until === $from) {
                $out['when'] = get_string('when_one', $c, self::near($from, $today));
            } else if ($until !== '') {
                $out['when'] = get_string('when_range', $c, (object) ['from' => self::short($from),
                    'until' => self::short($until)]);
            } else {
                $out['when'] = get_string('when_from', $c, self::short($from));
            }
            $wait = self::days_between($today, $from);
            $out['small'] = $wait === 1 ? get_string('when_starts_tomorrow', $c) :
                get_string('when_starts_in', $c, $wait);
        } else if ($until === $today && ($from === '' || $from === $today)) {
            $out['when'] = get_string('when_today', $c);
            $out['small'] = get_string('when_ends_today', $c);
            $out['soon'] = true;
        } else if ($until !== '') {
            $left = self::days_between($today, $until);
            $out['when'] = $left <= 6 ? get_string('when_until', $c, self::weekday($until)) :
                ($from !== '' ? get_string('when_range', $c, (object) ['from' => self::short($from),
                    'until' => self::short($until)]) : get_string('when_until', $c, self::short($until)));
            $out['small'] = $left === 0 ? get_string('when_ends_today', $c) : ($left === 1 ?
                get_string('when_left_one', $c) : get_string('when_left', $c, $left));
            $out['soon'] = $left <= 4;
        } else if ($from !== '' && $from < $today) {
            $out['when'] = get_string('when_from', $c, self::short($from));
        } else {
            $out['when'] = get_string('when_always', $c);
        }
        // The days and hours, when it has them and nothing more pressing goes under.
        $parts = [];
        if (!empty($when['days'])) {
            $letters = explode(',', get_string('days_letters', $c));
            $parts[] = implode(' ', array_map(function ($d) use ($letters) {
                return $letters[$d - 1] ?? '';
            }, $when['days']));
        }
        foreach ($when['times'] ?? [] as $range) {
            $parts[] = $range[0] . '–' . $range[1];
        }
        if (!empty($when['every'])) {
            $parts[] = get_string('everyweeks_n', $c, $when['every']);
        }
        if ($parts && !$out['soon']) {
            $out['small'] = implode(' · ', $parts);
        }
        return $out;
    }

    /**
     * Whether an item is on the screens today, comes later or no longer shows.
     *
     * @param \stdClass $item
     * @param string $today
     * @return string now, later or done
     */
    public static function moment(\stdClass $item, string $today): string {
        if (empty($item->visible)) {
            return 'done';
        }
        $when = schedule::when($item) ?? [];
        if (($when['until'] ?? '') !== '' && $when['until'] < $today) {
            return 'done';
        }
        if (($when['from'] ?? '') !== '' && $when['from'] > $today) {
            return 'later';
        }
        return 'now';
    }

    /**
     * When a screen that is off by its hours comes on again: «se enciende hoy a las 16:00», «… mañana …», «… el
     * jueves …». Empty if it never does.
     *
     * @param array $power windows from schedule::power()
     * @param int $now
     * @return string
     */
    public static function next_on(array $power, int $now): string {
        $tz = \core_date::get_server_timezone_object();
        $best = 0;
        for ($add = 0; $add <= 7; $add++) {
            $date = (new \DateTime('@' . $now))->setTimezone($tz)->modify('+' . $add . ' days');
            $dow = (int) $date->format('N');
            foreach ($power as $window) {
                if ($window['days'] && !in_array($dow, $window['days'])) {
                    continue;
                }
                [$h, $m] = explode(':', $window['on']);
                $at = (clone $date)->setTime((int) $h, (int) $m)->getTimestamp();
                if ($at > $now && (!$best || $at < $best)) {
                    $best = $at;
                }
            }
            if ($best) {
                break;
            }
        }
        if (!$best) {
            return '';
        }
        $days = self::days_between(schedule::day($now), schedule::day($best));
        $hour = self::hour($best);
        if ($days === 0) {
            return get_string('on_today', self::C, $hour);
        }
        if ($days === 1) {
            return get_string('on_tomorrow', self::C, $hour);
        }
        return get_string('on_day', self::C, (object) ['day' => self::weekday(schedule::day($best)), 'hour' => $hour]);
    }

    /**
     * A list said as people say it: «Entrada», «Entrada y Secretaría», «Entrada, Biblioteca y Comedor».
     *
     * @param string[] $names
     * @return string
     */
    public static function join(array $names): string {
        $names = array_values(array_filter($names, 'strlen'));
        if (count($names) < 2) {
            return $names[0] ?? '';
        }
        $last = array_pop($names);
        return get_string('list_and', self::C, (object) ['list' => implode(', ', $names), 'last' => $last]);
    }
}
