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
 * The «How it works» pieces of the panel: short, with real frames of the panel, a pointer and a subtitle per step (and a
 * voice, where there is one), opened from a button beside what they explain (panel/ayuda.js). Their files are in help/.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class howto {
    /** The pieces, in the order the guide shows them. */
    const PIECES = ['publicar', 'pantalla', 'urgente', 'permisos', 'centro', 'cumpleanos'];

    /**
     * The language the pieces have that is closest to the user's.
     *
     * @return string
     */
    public static function lang(): string {
        return strpos(current_language(), 'es') === 0 ? 'es' : 'en';
    }

    /**
     * How long a piece lasts, as the player paces it without a voice: «≈ 40 s».
     *
     * @param string $piece
     * @return string
     */
    public static function length(string $piece): string {
        $file = __DIR__ . '/../../help/' . $piece . '/' . self::lang() . '/pasos.json';
        $data = is_readable($file) ? json_decode((string) file_get_contents($file), true) : null;
        $ms = 0;
        foreach ($data['steps'] ?? [] as $step) {
            $ms += max(3500, count(preg_split('/\s+/', trim($step['text']))) * 380 + 1200) + 700;
        }
        return get_string('howto_length', 'local_oksigeniahechauka', (int) round($ms / 5000) * 5);
    }

    /**
     * The button that opens a piece, for the howto_button template.
     *
     * @param string $piece
     * @return array
     */
    public static function button(string $piece): array {
        global $PAGE;
        $c = 'local_oksigeniahechauka';
        $PAGE->requires->js(new \moodle_url('/local/oksigeniahechauka/panel/ayuda.js', ['v' => get_config($c, 'version')]));
        $ui = [];
        foreach (['prev', 'next', 'play', 'pause', 'again', 'close'] as $key) {
            $ui[$key] = get_string('howto_' . $key, $c);
        }
        return [
            'piece' => $piece,
            'title' => get_string('howto_' . $piece, $c),
            'base' => (new \moodle_url('/local/oksigeniahechauka/help/'))->out(false),
            'lang' => self::lang(),
            'ui' => json_encode($ui, JSON_UNESCAPED_UNICODE),
            'length' => self::length($piece),
            'icon' => icons::svg('play'),
        ];
    }

    /**
     * Every piece, for the guide: its button, what it explains and its first frame.
     *
     * @return array
     */
    public static function all(): array {
        $c = 'local_oksigeniahechauka';
        $out = [];
        foreach (self::PIECES as $piece) {
            $out[] = self::button($piece) + [
                'desc' => get_string('howto_' . $piece . '_desc', $c),
                'thumb' => (new \moodle_url('/local/oksigeniahechauka/help/' . $piece . '/' . self::lang() . '/f01.webp'))->out(false),
            ];
        }
        return $out;
    }
}
