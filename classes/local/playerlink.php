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
 * The address a new screen opens: the player's, and a short one when the site has a link shortener, so that it can be
 * typed with the remote of a television. The short one is asked for by the scheduled task and kept; a page only reads
 * what is kept, so it never waits for the shortener.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class playerlink {
    /** @var string The word asked for when the site has not chosen one: the same in every language. */
    const KEYWORD = 'player';

    /** @var int Seconds before asking the shortener again after it gave nothing. */
    const RETRY = HOURSECS;

    /**
     * The address of the player.
     *
     * @return string
     */
    public static function long(): string {
        return (new \moodle_url('/local/oksigeniahechauka/player/'))->out(false);
    }

    /**
     * The word asked for at the end of the short address.
     *
     * @return string
     */
    public static function keyword(): string {
        $word = trim((string) get_config('local_oksigeniahechauka', 'shortkeyword'));
        return preg_match('/^[A-Za-z0-9_-]+$/', $word) ? $word : self::KEYWORD;
    }

    /**
     * What the short address is made for: the player's address and the word. When either changes, it is made again.
     *
     * @return string
     */
    protected static function made_for(): string {
        return self::long() . ' ' . self::keyword();
    }

    /**
     * The short address kept for the player, or '' when there is none yet.
     *
     * @return string
     */
    public static function short(): string {
        if ((string) get_config('local_oksigeniahechauka', 'playershortfor') !== self::made_for()) {
            return '';
        }
        return (string) get_config('local_oksigeniahechauka', 'playershort');
    }

    /**
     * The address to show to whoever adds a screen: the short one when there is one, without https://.
     *
     * @return string
     */
    public static function shown(): string {
        $short = self::short();
        return $short !== '' ? preg_replace('#^https?://#i', '', $short) : self::long();
    }

    /**
     * Ask the shortener for the short address when it is missing (from the scheduled task).
     *
     * @param int $now
     * @return string What happened, for the log of the task.
     */
    public static function refresh(int $now): string {
        $c = 'local_oksigeniahechauka';
        if (self::short() !== '') {
            return 'kept';
        }
        $shortener = shortener::of_site();
        if (!$shortener) {
            return 'no shortener';
        }
        $for = self::made_for();
        $tried = (string) get_config($c, 'playershorttriedfor') === $for ? (int) get_config($c, 'playershorttried') : 0;
        if ($tried && $tried > $now - self::RETRY) {
            return 'waiting to try again';
        }
        $short = $shortener->shorten(self::long(), get_string('playerlink_title', $c), false, self::keyword());
        if ($short === null) {
            // A refusal for good (the site's address outside the key's domains) is not asked again for a month.
            $final = $shortener->is_final();
            set_config('playershorttried', $final ? $now + links::FINAL_WAIT : $now, $c);
            set_config('playershorttriedfor', $for, $c);
            return 'the shortener gave none' . ($final ? ' (' . $shortener->last_code() . ', for good)' : '');
        }
        set_config('playershort', $short, $c);
        set_config('playershortfor', $for, $c);
        unset_config('playershorttried', $c);
        unset_config('playershorttriedfor', $c);
        return 'made ' . $short;
    }

    /**
     * After the word is changed in the settings: forget the short address, so the task makes it again.
     */
    public static function forget(): void {
        foreach (['playershort', 'playershortfor', 'playershorttried', 'playershorttriedfor'] as $name) {
            unset_config($name, 'local_oksigeniahechauka');
        }
    }
}
