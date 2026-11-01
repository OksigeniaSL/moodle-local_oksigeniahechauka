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
 * «Sorpresas»: now and then a character crosses the screens. The centre turns them on and chooses how often and who; each
 * screen can leave them out. The player does the rest (player/src/surprises.js).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class surprises {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /** @var int[] How often one comes out, in minutes. */
    const EVERY = [20, 60, 180];

    /** @var string[] Who there is: each has its folder in player/sorpresas. */
    const CHARACTERS = ['gusanito', 'abeja', 'mosca'];

    /**
     * How often, as the centre has it.
     *
     * @param \stdClass $config the plugin's
     * @return int minutes
     */
    protected static function every(\stdClass $config): int {
        $every = (int) ($config->surpriseevery ?? 0);
        return in_array($every, self::EVERY) ? $every : self::EVERY[0];
    }

    /**
     * Who the centre has chosen. All of them until it chooses.
     *
     * @param \stdClass $config the plugin's
     * @return string[]
     */
    protected static function chosen(\stdClass $config): array {
        if (!isset($config->surprisewho)) {
            return self::CHARACTERS;
        }
        return array_values(array_intersect(self::CHARACTERS, explode(',', (string) $config->surprisewho)));
    }

    /**
     * Where a character's file is.
     *
     * @param string $id
     * @param string $file
     * @return string
     */
    protected static function url(string $id, string $file): string {
        return (new \moodle_url('/local/oksigeniahechauka/player/sorpresas/' . $id . '/' . $file))->out(false);
    }

    /**
     * What goes in a screen's manifest: nothing if it has none.
     *
     * @param \stdClass $screen
     * @param \stdClass $config the plugin's
     * @return array
     */
    public static function contract(\stdClass $screen, \stdClass $config): array {
        $chosen = self::chosen($config);
        if (empty($config->surprises) || !$chosen || (isset($screen->surprises) && empty($screen->surprises))) {
            return [];
        }
        return ['surprises' => [
            'every' => self::every($config),
            'characters' => array_map(function ($id) {
                return ['id' => $id, 'atlas' => self::url($id, 'spr.' . $id . '.atlas.json')];
            }, $chosen),
        ]];
    }

    /**
     * What «Tu centro» shows.
     *
     * @param \stdClass $config the plugin's
     * @return array
     */
    public static function centre_context(\stdClass $config): array {
        $c = self::C;
        $every = self::every($config);
        $chosen = self::chosen($config);
        return [
            'on' => !empty($config->surprises),
            'every' => array_map(function ($m) use ($every, $c) {
                return ['value' => $m, 'label' => get_string('surprises_every_' . $m, $c), 'checked' => $m === $every];
            }, self::EVERY),
            'who' => array_map(function ($id) use ($chosen, $c) {
                return ['id' => $id, 'name' => get_string('surprise_' . $id, $c),
                    'help' => get_string('surprise_' . $id . '_help', $c), 'picture' => self::url($id, 'retrato.webp'),
                    'atlas' => self::url($id, 'spr.' . $id . '.atlas.json'),
                    'checked' => in_array($id, $chosen), 'see' => get_string('surprise_see', $c)];
            }, self::CHARACTERS),
        ];
    }

    /**
     * Saves what «Tu centro» sent.
     *
     * @return void
     */
    public static function save_centre(): void {
        $c = self::C;
        set_config('surprises', optional_param('surprises', 0, PARAM_BOOL) ? 1 : 0, $c);
        $every = optional_param('surpriseevery', 0, PARAM_INT);
        if (in_array($every, self::EVERY)) {
            set_config('surpriseevery', $every, $c);
        }
        // With the block closed, its boxes are still sent; a character without its box is one left out.
        $who = optional_param_array('surprisewho', [], PARAM_ALPHANUM);
        set_config('surprisewho', implode(',', array_intersect(self::CHARACTERS, $who)), $c);
    }

    /**
     * What a screen's sheet shows.
     *
     * @param \stdClass $screen
     * @return array
     */
    public static function sheet_context(\stdClass $screen): array {
        $centreon = !empty(get_config(self::C, 'surprises'));
        $on = !isset($screen->surprises) || !empty($screen->surprises);
        return [
            'centreon' => $centreon,
            'on' => $on,
            'centre' => (new \moodle_url('/local/oksigeniahechauka/centre.php'))->out(false),
            // Only a screen that is paired can be asked.
            'now' => $centreon && $on && !empty($screen->keyhash) ? (new \moodle_url('/local/oksigeniahechauka/screen.php', [
                'id' => $screen->id, 'action' => 'surprise', 'sesskey' => sesskey()]))->out(false) : '',
        ];
    }
}
