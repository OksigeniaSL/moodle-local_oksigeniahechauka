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
 * The colours of the school on the screens, and what goes on them: white or dark text, whichever reaches 4.5:1 (a
 * yellow wants dark text), each colour as text on the light surface and, for the stages, as text on the dark one. Any
 * colour can be chosen; the screens stay readable. The same rule as the panel's preview (panel/centre.js).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class colours {
    /** @var array Setting => the screens' variable. */
    const SETTINGS = [
        'colourprimary' => '--hk-primario',
        'colouraccent' => '--hk-acento',
        'colour1' => '--hk-marca-1',
        'colour2' => '--hk-marca-2',
        'colour3' => '--hk-marca-3',
        'colour4' => '--hk-marca-4',
    ];

    /** @var string The dark text the screens use. */
    const DARK = '#16191d';

    /** @var string The light surface of the screens. */
    const LIGHT_SURFACE = '#ffffff';

    /** @var string The dark surface of the screens. */
    const DARK_SURFACE = '#19212c';

    /**
     * Whether a text is a colour «#rrggbb».
     *
     * @param string|null $hex
     * @return bool
     */
    public static function valid(?string $hex): bool {
        return (bool) preg_match('/^#[0-9a-fA-F]{6}$/', (string) $hex);
    }

    /**
     * The relative luminance of a colour (WCAG).
     *
     * @param string $hex
     * @return float
     */
    public static function luminance(string $hex): float {
        $c = array_map(function ($v) {
            $v = hexdec($v) / 255;
            return $v <= 0.03928 ? $v / 12.92 : pow(($v + 0.055) / 1.055, 2.4);
        }, str_split(substr($hex, 1), 2));
        return 0.2126 * $c[0] + 0.7152 * $c[1] + 0.0722 * $c[2];
    }

    /**
     * The contrast of two colours, 1 to 21.
     *
     * @param string $a
     * @param string $b
     * @return float
     */
    public static function contrast(string $a, string $b): float {
        $x = self::luminance($a);
        $y = self::luminance($b);
        return (max($x, $y) + 0.05) / (min($x, $y) + 0.05);
    }

    /**
     * The text that goes on a colour: white if it reaches 4.5:1, else whichever of white and dark reads better (on a
     * middle tone neither may reach 4.5:1; the screens write large and bold on these colours, where 3:1 is enough).
     *
     * @param string $hex
     * @return string
     */
    public static function on(string $hex): string {
        $white = self::contrast($hex, '#ffffff');
        return $white >= 4.5 || $white >= self::contrast($hex, self::DARK) ? '#ffffff' : self::DARK;
    }

    /**
     * A colour moved towards black or white until it reads as text on a background.
     *
     * @param string $hex
     * @param string $bg
     * @param float $min
     * @return string
     */
    public static function readable(string $hex, string $bg, float $min = 4.5): string {
        $to = self::luminance($bg) > 0.5 ? [0, 0, 0] : [255, 255, 255];
        $from = array_map('hexdec', str_split(substr($hex, 1), 2));
        for ($t = 0; $t <= 20; $t++) {
            $mix = '#' . implode('', array_map(function ($i) use ($from, $to, $t) {
                return sprintf('%02x', (int) round($from[$i] + ($to[$i] - $from[$i]) * $t / 20));
            }, [0, 1, 2]));
            if (self::contrast($mix, $bg) >= $min) {
                return $mix;
            }
        }
        return $to[0] ? '#ffffff' : '#000000';
    }

    /**
     * The screens' variables for the school's colours: each colour, its text, and its readable forms.
     *
     * @param array $colours setting => «#rrggbb» (the ones not set are left to the screens' own)
     * @return array variable => value
     */
    public static function vars(array $colours): array {
        $vars = [];
        foreach (self::SETTINGS as $setting => $var) {
            $hex = $colours[$setting] ?? '';
            if (!self::valid($hex)) {
                continue;
            }
            $hex = strtolower($hex);
            $vars[$var] = $hex;
            $vars[str_replace('--hk-', '--hk-sobre-', $var)] = self::on($hex);
            if ($setting === 'colouraccent') {
                $vars['--hk-acento-texto'] = self::readable($hex, self::LIGHT_SURFACE);
            } else if ($setting !== 'colourprimary') {
                $vars[$var . '-oscuro'] = self::readable($hex, self::DARK_SURFACE);
            }
        }
        return $vars;
    }
}
