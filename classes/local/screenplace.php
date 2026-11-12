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
 * Where a screen is, when it is a place with opening hours (a library, a canteen, an office, a gym): its name, its hours
 * by days, the days it closes and how its state is said. The screen says whether it is open now and until when, or when it
 * opens; the player works it out with its own clock (contract: screen.place).
 *
 * Kept on the screen as JSON: {name, words: "f"|"m", hours: [{days, from, until}], closed: ["YYYY-MM-DD"]}.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class screenplace {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /** @var int The rows of hours a place can have («Monday to Thursday», «Friday», «Saturday»). */
    const ROWS = 3;

    /** @var int The days it closes that are kept, the nearest first. */
    const CLOSED = 60;

    /** @var int How long its name can be: it goes in the header of the screen, beside the clock. */
    const NAME = 40;

    /**
     * The place of a screen as it is kept, or null when it has none.
     *
     * @param \stdClass $screen
     * @return array|null {name, words, hours, closed}
     */
    public static function get(\stdClass $screen): ?array {
        $place = json_decode((string) ($screen->place ?? ''), true);
        if (!is_array($place) || trim((string) ($place['name'] ?? '')) === '') {
            return null;
        }
        return [
            'name' => trim((string) $place['name']),
            'words' => ($place['words'] ?? '') === 'f' ? 'f' : 'm',
            'hours' => self::hours($place['hours'] ?? []),
            'closed' => self::closed($place['closed'] ?? [], ''),
        ];
    }

    /**
     * The hours that make sense, each row with its days (ISO, 1 Monday … 7 Sunday) and «HH:MM» times; until may be «24:00».
     *
     * @param mixed $rows
     * @return array[]
     */
    public static function hours($rows): array {
        $out = [];
        foreach (is_array($rows) ? $rows : [] as $row) {
            $days = array_values(array_unique(array_filter(array_map('intval', (array) ($row['days'] ?? [])), function ($d) {
                return $d >= 1 && $d <= 7;
            })));
            sort($days);
            $from = (string) ($row['from'] ?? '');
            $until = (string) ($row['until'] ?? '');
            $until = $until === '23:59' ? '24:00' : $until;
            if (!$days || !self::time($from) || !(self::time($until) || $until === '24:00') || $from === $until) {
                continue;
            }
            $out[] = ['days' => $days, 'from' => $from, 'until' => $until];
            if (count($out) === self::ROWS) {
                break;
            }
        }
        return $out;
    }

    /**
     * The days it closes, as dates, once each and in order; from a day on, when one is given (the past is of no use).
     *
     * @param mixed $days
     * @param string $from «YYYY-MM-DD», or '' for all
     * @return string[]
     */
    public static function closed($days, string $from): array {
        $out = [];
        foreach (is_array($days) ? $days : [] as $day) {
            $day = (string) $day;
            if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $day, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                continue;
            }
            if ($from === '' || $day >= $from) {
                $out[$day] = $day;
            }
        }
        sort($out);
        return array_slice(array_values($out), 0, self::CLOSED);
    }

    /**
     * Whether a time is «HH:MM».
     *
     * @param string $time
     * @return bool
     */
    protected static function time(string $time): bool {
        return (bool) preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time);
    }

    /**
     * Whether the state of a place with this name is said in the feminine (Spanish: «Biblioteca» is «Abierta»), when the
     * centre has not said it: a first word that ends as most feminine nouns do. Only a first guess for the panel.
     *
     * @param string $name
     * @return bool
     */
    public static function feminine(string $name): bool {
        $first = \core_text::strtolower(\core_text::specialtoascii(strtok(trim($name), ' ') ?: ''));
        return (bool) preg_match('/(a|cion|sion|dad|tad)$/', $first);
    }

    /**
     * Whether the language of the site says open and closed differently for a feminine name: only then the panel asks.
     *
     * @return bool
     */
    public static function words_differ(): bool {
        return get_string('place_open', self::C) !== get_string('place_open_f', self::C);
    }

    /**
     * What goes to the screen: the place with its hours, the days it closes from today on and, if the centre said so, its
     * words in the feminine. Nothing when it has no name or no hours: it could not say whether it is open.
     *
     * @param \stdClass $screen
     * @param int $now
     * @return array|null
     */
    public static function contract(\stdClass $screen, int $now): ?array {
        $place = self::get($screen);
        if (!$place || !$place['hours']) {
            return null;
        }
        $out = ['name' => items::plain($place['name']), 'hours' => $place['hours']];
        $closed = self::closed($place['closed'], schedule::day($now));
        if ($closed) {
            $out['closed'] = $closed;
        }
        if ($place['words'] === 'f' && self::words_differ()) {
            $out['words'] = ['open' => get_string('place_open_f', self::C), 'closed' => get_string('place_closed_f', self::C)];
        }
        return $out;
    }

    /**
     * The section «Where it is» of a screen's sheet.
     *
     * @param \stdClass $screen
     * @param string[] $letters of the days, Monday first
     * @param string[] $names of the days, Monday first
     * @param int $now
     * @return array
     */
    public static function sheet_context(\stdClass $screen, array $letters, array $names, int $now): array {
        $place = self::get($screen) ?? ['name' => '', 'words' => '', 'hours' => [], 'closed' => []];
        $feminine = $place['name'] !== '' ? $place['words'] === 'f' : false;
        $rows = [];
        for ($i = 0; $i < self::ROWS; $i++) {
            $row = $place['hours'][$i] ?? null;
            $days = $row ? $row['days'] : ($i === 0 ? [1, 2, 3, 4, 5] : []);
            $buttons = [];
            for ($d = 1; $d <= 7; $d++) {
                $buttons[] = ['n' => $d, 'letter' => $letters[$d - 1], 'name' => $names[$d - 1], 'on' => in_array($d, $days)];
            }
            $rows[] = [
                'i' => $i,
                'n' => $i + 1,
                'days' => $buttons,
                'from' => $row ? $row['from'] : ($i === 0 ? '08:00' : ''),
                'until' => $row ? ($row['until'] === '24:00' ? '23:59' : $row['until']) : ($i === 0 ? '17:00' : ''),
                'hidden' => $i > 0 && !$row,
                'removable' => $i > 0,
                'remove' => get_string('sheet_place_row_remove', self::C, $i + 1),
            ];
        }
        return [
            'name' => $place['name'],
            'on' => $place['name'] !== '',
            'maxlength' => self::NAME,
            'asks' => self::words_differ(),
            'feminine' => $feminine,
            'masculine' => !$feminine,
            'rows' => $rows,
            'closed' => array_map(function ($day) {
                return ['day' => $day];
            }, self::closed($place['closed'], schedule::day($now))),
            'xicon' => icons::svg('x'),
        ];
    }

    /**
     * The place as the sheet sends it, to keep; or the reason it cannot be kept.
     *
     * @param int $now
     * @return array [JSON or null, error or '']
     */
    public static function from_form(int $now): array {
        $name = \core_text::substr(trim(optional_param('placename', '', PARAM_TEXT)), 0, self::NAME);
        if ($name === '') {
            return [null, ''];
        }
        $froms = optional_param_array('placefrom', [], PARAM_RAW_TRIMMED);
        $untils = optional_param_array('placeuntil', [], PARAM_RAW_TRIMMED);
        $rows = [];
        for ($i = 0; $i < self::ROWS; $i++) {
            $days = optional_param_array('placedays' . $i, [], PARAM_INT);
            $from = (string) ($froms[$i] ?? '');
            $until = (string) ($untils[$i] ?? '');
            if (!$days && $from === '' && $until === '') {
                continue;
            }
            $row = ['days' => $days, 'from' => $from, 'until' => $until];
            if (!self::hours([$row])) {
                return [null, get_string('sheet_place_bad', self::C, $i + 1)];
            }
            $rows[] = $row;
        }
        $hours = self::hours($rows);
        if (!$hours) {
            return [null, get_string('sheet_place_nohours', self::C)];
        }
        $words = optional_param('placewords', '', PARAM_ALPHA);
        $place = [
            'name' => $name,
            'words' => $words === 'f' || ($words === '' && self::feminine($name)) ? 'f' : 'm',
            'hours' => $hours,
            'closed' => self::closed(optional_param_array('placeclosed', [], PARAM_RAW_TRIMMED), schedule::day($now)),
        ];
        return [json_encode($place, JSON_UNESCAPED_UNICODE), ''];
    }
}
