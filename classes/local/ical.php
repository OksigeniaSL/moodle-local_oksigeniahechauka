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
 * Reading an iCal calendar.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * The events of an iCal calendar (RFC 5545) between two moments: the one-off ones, the all-day and many-day ones, and
 * the repeating ones (daily, weekly on some days, monthly, yearly, with their end, count and exceptions). What a school
 * calendar uses; anything stranger is left out rather than shown wrong.
 */
class ical {
    /** Occurrences of one repeating event, at most. */
    const MAX_OCCURRENCES = 2000;

    /**
     * The events of a calendar that touch [from, to].
     *
     * @param string $text the calendar
     * @param int $from
     * @param int $to
     * @param \DateTimeZone $zone for times without a zone, and for all-day events
     * @return array [['uid', 'title', 'detail', 'start', 'end', 'allday'], …] sorted by start
     */
    public static function events(string $text, int $from, int $to, \DateTimeZone $zone): array {
        $out = [];
        $overridden = [];
        $events = self::vevents($text);
        // An occurrence moved or changed on its own (RECURRENCE-ID) replaces the one of its series.
        foreach ($events as $ev) {
            if (isset($ev['RECURRENCE-ID'])) {
                $at = self::time($ev['RECURRENCE-ID'], $zone);
                if ($at) {
                    $overridden[($ev['UID'][0]['value'] ?? '') . '@' . $at['t']] = true;
                }
            }
        }
        foreach ($events as $ev) {
            if (strtoupper($ev['STATUS'][0]['value'] ?? '') === 'CANCELLED' || !isset($ev['DTSTART'])) {
                continue;
            }
            $start = self::time($ev['DTSTART'], $zone);
            if (!$start) {
                continue;
            }
            $length = self::length($ev, $start, $zone);
            $uid = $ev['UID'][0]['value'] ?? '';
            $base = [
                'uid' => \core_text::substr($uid, 0, 255),
                'title' => \core_text::substr(self::text($ev['SUMMARY'][0]['value'] ?? ''), 0, 255),
                'detail' => \core_text::substr(self::text($ev['LOCATION'][0]['value'] ?? ''), 0, 255),
                'allday' => $start['date'],
            ];
            $starts = isset($ev['RRULE']) && !isset($ev['RECURRENCE-ID'])
                ? self::repeat($ev, $start, $from - $length, $to, $zone) : [$start['t']];
            foreach ($starts as $s) {
                if (!isset($ev['RECURRENCE-ID']) && isset($overridden[$uid . '@' . $s])) {
                    continue;
                }
                $e = $s + $length;
                if ($e < $from || $s > $to || ($length > 0 && $e === $from)) {
                    continue;
                }
                // From midnight to midnight is a whole day, even written with hours («00:00 to 00:00»).
                $whole = $base['allday'] || ($length > 0 && self::midnight($s, $zone) && self::midnight($e, $zone));
                $out[] = ['allday' => $whole] + $base + ['start' => $s, 'end' => $length > 0 ? $e : 0];
            }
        }
        usort($out, function ($a, $b) {
            return $a['start'] <=> $b['start'];
        });
        return $out;
    }

    /**
     * Whether a moment is a midnight on the clock of a zone.
     *
     * @param int $t
     * @param \DateTimeZone $zone
     * @return bool
     */
    protected static function midnight(int $t, \DateTimeZone $zone): bool {
        return (new \DateTime('@' . $t))->setTimezone($zone)->format('H:i:s') === '00:00:00';
    }

    /**
     * The VEVENT blocks, each as its properties: name => [['value' => …, 'params' => […]], …].
     *
     * @param string $text
     * @return array
     */
    protected static function vevents(string $text): array {
        // Lines that start with a space or a tab continue the one before.
        $text = preg_replace("/\r\n[ \t]|\n[ \t]/", '', str_replace("\r\n", "\n", $text));
        $events = [];
        $current = null;
        $depth = 0;
        foreach (explode("\n", $text) as $line) {
            $line = rtrim($line, "\r");
            if ($line === 'BEGIN:VEVENT') {
                $current = [];
                $depth = 0;
                continue;
            }
            if ($current === null) {
                continue;
            }
            if (strpos($line, 'BEGIN:') === 0) {
                $depth++;
                continue;
            }
            if (strpos($line, 'END:') === 0) {
                if ($line === 'END:VEVENT' && $depth === 0) {
                    $events[] = $current;
                    $current = null;
                } else {
                    $depth = max(0, $depth - 1);
                }
                continue;
            }
            if ($depth > 0) {
                // Inside a VALARM: not ours.
                continue;
            }
            $colon = self::colon($line);
            if ($colon === false) {
                continue;
            }
            $head = explode(';', substr($line, 0, $colon));
            $name = strtoupper(array_shift($head));
            $params = [];
            foreach ($head as $p) {
                $eq = strpos($p, '=');
                if ($eq !== false) {
                    $params[strtoupper(substr($p, 0, $eq))] = trim(substr($p, $eq + 1), '"');
                }
            }
            $current[$name][] = ['value' => substr($line, $colon + 1), 'params' => $params];
        }
        return $events;
    }

    /**
     * The colon that ends the name and parameters of a line (a quoted parameter may have colons).
     *
     * @param string $line
     * @return int|false
     */
    protected static function colon(string $line) {
        $quoted = false;
        $n = strlen($line);
        for ($i = 0; $i < $n; $i++) {
            if ($line[$i] === '"') {
                $quoted = !$quoted;
            } else if ($line[$i] === ':' && !$quoted) {
                return $i;
            }
        }
        return false;
    }

    /**
     * A text value, unescaped, on one line.
     *
     * @param string $value
     * @return string
     */
    protected static function text(string $value): string {
        $value = str_replace(['\\n', '\\N'], ' ', $value);
        $value = str_replace(['\\,', '\\;', '\\\\'], [',', ';', '\\'], $value);
        return trim(preg_replace('/\s+/', ' ', $value));
    }

    /**
     * A moment: a date (all day, at midnight in the zone), a time in UTC, or a time in its zone or ours.
     *
     * @param array $prop the property, as vevents() gives it
     * @param \DateTimeZone $zone
     * @return array|null ['t' => unix, 'date' => bool]
     */
    protected static function time(array $prop, \DateTimeZone $zone): ?array {
        $value = trim($prop[0]['value'] ?? '');
        $params = $prop[0]['params'] ?? [];
        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $value, $m)) {
            $d = new \DateTime("$m[1]-$m[2]-$m[3] 00:00:00", $zone);
            return ['t' => $d->getTimestamp(), 'date' => true];
        }
        if (!preg_match('/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/', $value, $m)) {
            return null;
        }
        $tz = $zone;
        if ($m[7] === 'Z') {
            $tz = new \DateTimeZone('UTC');
        } else if (!empty($params['TZID'])) {
            try {
                $tz = new \DateTimeZone($params['TZID']);
            } catch (\Exception $e) {
                $tz = $zone;
            }
        }
        $d = new \DateTime("$m[1]-$m[2]-$m[3] $m[4]:$m[5]:$m[6]", $tz);
        return ['t' => $d->getTimestamp(), 'date' => false];
    }

    /**
     * How long an event lasts, in seconds: from DTEND, from DURATION, a day for an all-day one without either.
     *
     * @param array $ev
     * @param array $start
     * @param \DateTimeZone $zone
     * @return int
     */
    protected static function length(array $ev, array $start, \DateTimeZone $zone): int {
        if (isset($ev['DTEND'])) {
            $end = self::time($ev['DTEND'], $zone);
            if ($end && $end['t'] > $start['t']) {
                return $end['t'] - $start['t'];
            }
        }
        if (
            isset($ev['DURATION']) && preg_match(
                '/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/',
                trim($ev['DURATION'][0]['value']),
                $m
            )
        ) {
            return (int) ($m[1] ?? 0) * WEEKSECS + (int) ($m[2] ?? 0) * DAYSECS + (int) ($m[3] ?? 0) * HOURSECS +
                (int) ($m[4] ?? 0) * MINSECS + (int) ($m[5] ?? 0);
        }
        return $start['date'] ? DAYSECS : 0;
    }

    /**
     * The starts of a repeating event that may touch [from, to].
     *
     * @param array $ev
     * @param array $start
     * @param int $from
     * @param int $to
     * @param \DateTimeZone $zone
     * @return int[]
     */
    protected static function repeat(array $ev, array $start, int $from, int $to, \DateTimeZone $zone): array {
        $rule = [];
        foreach (explode(';', strtoupper($ev['RRULE'][0]['value'])) as $part) {
            $eq = strpos($part, '=');
            if ($eq !== false) {
                $rule[substr($part, 0, $eq)] = substr($part, $eq + 1);
            }
        }
        $freq = $rule['FREQ'] ?? '';
        $steps = ['DAILY' => 'day', 'WEEKLY' => 'week', 'MONTHLY' => 'month', 'YEARLY' => 'year'];
        if (!isset($steps[$freq])) {
            return [$start['t']];
        }
        $interval = max(1, (int) ($rule['INTERVAL'] ?? 1));
        $count = isset($rule['COUNT']) ? (int) $rule['COUNT'] : 0;
        $until = isset($rule['UNTIL']) ? self::time([['value' => $rule['UNTIL'], 'params' => []]], $zone) : null;
        $last = $until ? $until['t'] : PHP_INT_MAX;
        if ($until && $until['date']) {
            $last += DAYSECS - 1;
        }
        $excluded = [];
        foreach ($ev['EXDATE'] ?? [] as $prop) {
            foreach (explode(',', $prop['value']) as $one) {
                $t = self::time([['value' => $one, 'params' => $prop['params']]], $zone);
                if ($t) {
                    $excluded[$t['t']] = true;
                }
            }
        }
        // The wall clock of the first start, in its own zone, so a repeat keeps its hour across a change of time.
        $tzid = $ev['DTSTART'][0]['params']['TZID'] ?? '';
        try {
            $evzone = $start['date'] || $tzid === '' ? $zone : new \DateTimeZone($tzid);
        } catch (\Exception $e) {
            $evzone = $zone;
        }
        if (substr(trim($ev['DTSTART'][0]['value']), -1) === 'Z') {
            $evzone = new \DateTimeZone('UTC');
        }
        $first = (new \DateTime('@' . $start['t']))->setTimezone($evzone);
        $days = [];
        if ($freq === 'WEEKLY' && !empty($rule['BYDAY'])) {
            $names = ['MO' => 1, 'TU' => 2, 'WE' => 3, 'TH' => 4, 'FR' => 5, 'SA' => 6, 'SU' => 7];
            foreach (explode(',', $rule['BYDAY']) as $d) {
                $d = substr($d, -2);
                if (isset($names[$d])) {
                    $days[] = $names[$d];
                }
            }
            sort($days);
        }
        $out = [];
        $made = 0;
        for ($i = 0; $made < self::MAX_OCCURRENCES; $i++) {
            $period = clone $first;
            $period->modify('+' . ($i * $interval) . ' ' . $steps[$freq]);
            if ($freq === 'MONTHLY' && (int) $period->format('j') !== (int) $first->format('j')) {
                // The 31st of a month without one: no occurrence that month.
                continue;
            }
            $candidates = [$period];
            if ($days) {
                $candidates = [];
                $monday = clone $period;
                $monday->modify('-' . ((int) $period->format('N') - 1) . ' days');
                foreach ($days as $dow) {
                    $c = clone $monday;
                    $c->modify('+' . ($dow - 1) . ' days');
                    $candidates[] = $c;
                }
            }
            foreach ($candidates as $c) {
                $t = $c->getTimestamp();
                if ($t < $start['t']) {
                    continue;
                }
                if ($t > $last || $t > $to || ($count && $made >= $count)) {
                    return $out;
                }
                $made++;
                if (!isset($excluded[$t]) && $t >= $from) {
                    $out[] = $t;
                }
            }
        }
        return $out;
    }
}
