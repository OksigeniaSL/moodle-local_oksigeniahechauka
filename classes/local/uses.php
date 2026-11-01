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
 * What each screen is for, which decides what its compositions show:
 *
 * - info: inside (corridors, a hall): «Today», the menu, the notices, the agenda, with pictures and videos.
 * - showcase: seen from afar and by people from outside (an entrance, a gate): big pictures and videos with a big
 *   headline and their web, nothing in detail.
 * - mixed: both, the weather in a third, pictures with a band of text.
 *
 * A screen can take another use at some hours: an entrance informative on weekdays and a showcase at the weekend.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class uses {
    /** @var string[] The uses, the default first. */
    const USES = ['info', 'showcase', 'mixed'];

    /** @var int[] From where a screen is read, in metres: the letters grow with it. The default first. */
    const DISTANCES = [3, 5, 8];

    /**
     * A distance as it came, or the default.
     *
     * @param mixed $distance
     * @return int
     */
    public static function distance($distance): int {
        return in_array((int) $distance, self::DISTANCES, true) ? (int) $distance : self::DISTANCES[0];
    }

    /**
     * A use as it came, or the default.
     *
     * @param string|null $use
     * @return string
     */
    public static function valid(?string $use): string {
        return in_array($use, self::USES, true) ? $use : self::USES[0];
    }

    /**
     * The other uses at some hours, as stored: [{days: int[] (1 Monday to 7 Sunday, as the power hours), from, until
     * («HH:MM», until before from crosses midnight), use}]. Wrong
     * windows are left out; no days means every day.
     *
     * @param string|null $json
     * @return array
     */
    public static function plan(?string $json): array {
        $list = json_decode((string) $json, true);
        $out = [];
        foreach (is_array($list) ? $list : [] as $w) {
            if (!is_array($w) || !in_array($w['use'] ?? '', self::USES, true)) {
                continue;
            }
            $from = (string) ($w['from'] ?? '');
            $until = (string) ($w['until'] ?? '');
            if (!self::hour($from) || !self::hour($until) || $from === $until) {
                continue;
            }
            $days = array_values(array_unique(array_filter(array_map('intval', (array) ($w['days'] ?? [])), function ($d) {
                return $d >= 1 && $d <= 7;
            })));
            sort($days);
            $out[] = ['days' => count($days) === 7 ? [] : $days, 'from' => $from, 'until' => $until, 'use' => $w['use']];
        }
        return $out;
    }

    /**
     * Whether a text is an hour «HH:MM» (24:00 too, the end of a day).
     *
     * @param string $hour
     * @return bool
     */
    public static function hour(string $hour): bool {
        return (bool) preg_match('/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/', $hour);
    }

    /**
     * What the screens need: their use, and the other uses at some hours if any.
     *
     * @param \stdClass $screen
     * @return array
     */
    public static function contract(\stdClass $screen): array {
        $out = ['use' => self::valid($screen->screenuse ?? null)];
        $plan = self::plan($screen->useplan ?? null);
        if ($plan) {
            $out['useplan'] = $plan;
        }
        return $out;
    }
}
