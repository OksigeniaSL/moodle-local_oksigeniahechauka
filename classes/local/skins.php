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
 * The skins of the screens, which each centre chooses: colours and a letter (player/pieles.json, player/pieles.css). The centre's
 * own colours go over its skin. With no skin chosen, the first one, with the brand colour of the Moodle site as its main colour.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class skins {
    /** @var array Each choice of corners => a multiple of the corners each piece has. */
    const CORNERS = ['square' => '0', 'soft' => '.5', 'round' => '1'];

    /** @var string The corners a skin comes with. */
    const ROUND = 'round';

    /** @var string The background made from the main colour. */
    const TINT = 'tint';

    /** @var array On each theme, what it is tinted over: its base, how much at most, the surface and what its line goes towards. */
    const TINTS = ['light' => ['#fbfaf7', .08, '#ffffff', '#000000'], 'dark' => ['#0c0e11', .12, '#20252b', '#ffffff']];

    /** @var array|null What the file says. */
    protected static $all = null;

    /** @var array|null The list of letters. */
    protected static $letters = null;

    /** @var array|null The list of backgrounds. */
    protected static $grounds = null;

    /**
     * What there is, as its file says.
     *
     * @return array {default, skins}
     */
    public static function all(): array {
        global $CFG;
        if (self::$all === null) {
            $raw = file_get_contents($CFG->dirroot . '/local/oksigeniahechauka/player/pieles.json');
            self::$all = json_decode((string) $raw, true) ?: ['default' => '', 'skins' => []];
        }
        return self::$all;
    }

    /**
     * A list that goes with the player.
     *
     * @param string $file
     * @return array
     */
    protected static function read(string $file): array {
        global $CFG;
        $raw = file_get_contents($CFG->dirroot . '/local/oksigeniahechauka/player/' . $file);
        return json_decode((string) $raw, true) ?: [];
    }

    /**
     * The letters a centre can choose: a closed list, each tried on the screens.
     *
     * @return array {default, categories, letters}
     */
    public static function letters(): array {
        if (self::$letters === null) {
            self::$letters = self::read('letras.json') + ['categories' => [], 'letters' => []];
        }
        return self::$letters;
    }

    /**
     * One of the letters.
     *
     * @param string $id
     * @return array|null
     */
    public static function letter(string $id): ?array {
        foreach (self::letters()['letters'] as $letter) {
            if ($letter['id'] === $id) {
                return $letter;
            }
        }
        return null;
    }

    /**
     * The backgrounds a centre can choose: a closed list, each with its partner for the dark theme.
     *
     * @return array
     */
    public static function grounds(): array {
        if (self::$grounds === null) {
            self::$grounds = self::read('fondos.json')['backgrounds'] ?? [];
        }
        return self::$grounds;
    }

    /**
     * The background made from the main colour, with what goes with it: a tint that still reads with the text of every skin
     * (the art direction's rule, «tinted» in fondos.py). The same rule as panel/centre.js.
     *
     * @param string $primary the main colour
     * @return array {light: {fondo, superficie, linea}, dark: {fondo, superficie, linea}}
     */
    public static function tinted(string $primary): array {
        $out = [];
        $texts = self::texts();
        foreach (self::TINTS as $mode => [$base, $start, $surface, $line]) {
            $part = 0;
            $fondo = $base;
            foreach ([1, .75, .5, .25, 0] as $step) {
                $part = $start * $step;
                $fondo = colours::mix($base, $primary, $part);
                $reads = array_filter($texts[$mode], function ($text) use ($fondo) {
                    return colours::contrast($text, $fondo) >= 4.5;
                });
                if (count($reads) === count($texts[$mode])) {
                    break;
                }
            }
            $out[$mode] = ['fondo' => $fondo, 'superficie' => colours::mix($surface, $primary, $part * .4),
                'linea' => colours::mix($fondo, $line, .12)];
        }
        return $out;
    }

    /**
     * Every text of every skin, on each theme: what a background made on the spot has to bear.
     *
     * @return array {light: colours, dark: colours}
     */
    public static function texts(): array {
        $out = ['light' => [], 'dark' => []];
        foreach (self::all()['skins'] as $skin) {
            foreach (array_keys($out) as $mode) {
                foreach (['texto', 'texto-suave', 'acento-texto'] as $text) {
                    $out[$mode][] = $skin[$mode][$text];
                }
            }
        }
        return $out;
    }

    /**
     * What a background has on each theme.
     *
     * @param string $id one of the list, or the one made from the main colour
     * @param string $primary the main colour
     * @return array|null {light: {fondo, superficie, linea}, dark: {fondo, superficie, linea}}
     */
    public static function ground(string $id, string $primary): ?array {
        if ($id === self::TINT && colours::valid($primary)) {
            return self::tinted($primary);
        }
        foreach (self::grounds() as $ground) {
            if ($ground['id'] === $id) {
                return ['light' => $ground['claro'], 'dark' => $ground['oscuro']];
            }
        }
        return null;
    }

    /**
     * The background of the list the centre has chosen, which goes on the page as an attribute (fondos.css).
     *
     * @param \stdClass $config the plugin's
     * @return string
     */
    public static function listed_ground(\stdClass $config): string {
        $id = (string) ($config->skinground ?? '');
        return $id !== self::TINT && self::ground($id, '#000000') ? $id : '';
    }

    /**
     * The corners the centre has chosen.
     *
     * @param \stdClass $config the plugin's
     * @return string
     */
    public static function corners(\stdClass $config): string {
        $id = (string) ($config->skincorners ?? '');
        return isset(self::CORNERS[$id]) ? $id : self::ROUND;
    }

    /**
     * What the centre has changed over its skin that holds on every theme: the letter and the corners.
     *
     * @param \stdClass $config the plugin's
     * @return array variable => value
     */
    public static function own_vars(\stdClass $config): array {
        $vars = [];
        $letter = self::letter((string) ($config->skinletter ?? ''));
        if ($letter) {
            $vars['--hk-letra-titulos'] = $letter['stack'];
            $vars['--hk-letra-texto'] = $letter['stack'];
        }
        $corners = self::corners($config);
        if ($corners !== self::ROUND) {
            $vars['--hk-esquina'] = self::CORNERS[$corners];
        }
        return $vars;
    }

    /**
     * What changes with the theme and is worked out here: the background made from the main colour, and the second colour written
     * as text, which is not the same on light as on dark. Empty if neither is in use. The same rule as panel/centre.js.
     *
     * @param \stdClass $config the plugin's
     * @param array $set the colours that go in the manifest (theme_colours)
     * @return array {light: {variable: value}, dark: {variable: value}}
     */
    public static function modes(\stdClass $config, array $set): array {
        $skin = self::get(self::chosen($config) ?: self::first());
        if (!$skin) {
            return [];
        }
        $id = (string) ($config->skinground ?? '');
        $ground = self::ground($id, ($set['colourprimary'] ?? '') ?: $skin['light']['primario']);
        $accent = $set['colouraccent'] ?? '';
        if ($id !== self::TINT && !$accent) {
            return [];
        }
        $out = [];
        foreach (['light', 'dark'] as $mode) {
            $tones = $ground[$mode] ?? $skin[$mode];
            $vars = [];
            if ($id === self::TINT) {
                foreach (['fondo', 'superficie', 'linea'] as $tone) {
                    $vars['--hk-' . $tone] = $tones[$tone];
                }
            }
            if ($accent) {
                $vars['--hk-acento-texto'] = colours::readable(colours::readable($accent, $tones['fondo']), $tones['superficie']);
            }
            $out[$mode] = $vars;
        }
        return $out;
    }

    /**
     * What the editor of «Tu centro» offers, with what is chosen.
     *
     * @param \stdClass $config the plugin's
     * @return array
     */
    public static function editor(\stdClass $config): array {
        $c = 'local_oksigeniahechauka';
        $lang = substr(current_language(), 0, 2);
        $word = function (array $names, string $fallback) use ($lang): string {
            return $names[$lang] ?? $names['en'] ?? $fallback;
        };
        $letterid = self::letter((string) ($config->skinletter ?? '')) ? (string) $config->skinletter : '';
        $categories = [];
        foreach (self::letters()['categories'] as $id => $names) {
            $items = [];
            foreach (self::letters()['letters'] as $letter) {
                if ($letter['category'] === $id) {
                    $items[] = ['id' => $letter['id'], 'name' => $letter['name'], 'stack' => $letter['stack'],
                        'checked' => $letter['id'] === $letterid];
                }
            }
            if ($items) {
                $categories[] = ['name' => $word($names, $id), 'letters' => $items];
            }
        }
        $groundid = (string) ($config->skinground ?? '');
        $grounds = [];
        foreach (self::grounds() as $ground) {
            $grounds[] = [
                'id' => $ground['id'],
                'name' => $word($ground['name'], $ground['id']),
                'swatch' => $ground['claro']['fondo'],
                'surface' => $ground['claro']['superficie'],
                'tones' => json_encode(['light' => $ground['claro'], 'dark' => $ground['oscuro']]),
                'checked' => $ground['id'] === $groundid,
            ];
        }
        $known = $groundid === self::TINT || array_filter($grounds, function ($ground) {
            return $ground['checked'];
        });
        $corners = [];
        foreach (self::CORNERS as $id => $value) {
            $corners[] = ['id' => $id, 'value' => $value, 'name' => get_string('centre_custom_corners_' . $id, $c),
                'checked' => $id === self::corners($config)];
        }
        return [
            'tints' => json_encode(self::TINTS),
            'texts' => json_encode(self::texts()),
            'letterskin' => !$letterid,
            'lettercategories' => $categories,
            'groundskin' => !$known,
            'groundtint' => $groundid === self::TINT,
            'grounds' => $grounds,
            'corners' => $corners,
            // It comes open when there is something of the centre's in it.
            'open' => $letterid || $known || self::corners($config) !== self::ROUND || self::own($config, 'colourprimary') ||
                self::own($config, 'colouraccent'),
        ];
    }

    /**
     * The one that goes when none has been chosen.
     *
     * @return string
     */
    public static function first(): string {
        return (string) self::all()['default'];
    }

    /**
     * One of them.
     *
     * @param string $id
     * @return array|null
     */
    public static function get(string $id): ?array {
        foreach (self::all()['skins'] as $skin) {
            if ($skin['id'] === $id) {
                return $skin;
            }
        }
        return null;
    }

    /**
     * The one the centre has chosen, if any.
     *
     * @param \stdClass $config the plugin's
     * @return string
     */
    public static function chosen(\stdClass $config): string {
        $id = (string) ($config->skin ?? '');
        return self::get($id) ? $id : '';
    }

    /**
     * A colour of the centre's own. What the first versions saved without anyone choosing it does not count.
     *
     * @param \stdClass $config the plugin's
     * @param string $setting colourprimary or colouraccent
     * @return string|null
     */
    public static function own(\stdClass $config, string $setting): ?string {
        $hex = strtolower((string) ($config->$setting ?? ''));
        return colours::valid($hex) && $hex !== centre::DEFAULTS[$setting] ? $hex : null;
    }

    /**
     * The two colours a screen has when the centre has not set its own: its skin's or, with none chosen, its Moodle's.
     *
     * @param \stdClass $config the plugin's
     * @return array setting => colour
     */
    public static function colours(\stdClass $config): array {
        $chosen = self::chosen($config);
        $skin = self::get($chosen ?: self::first());
        $brand = $chosen ? null : colours::site_brand();
        return [
            'colourprimary' => $brand ?? ($skin['light']['primario'] ?? centre::DEFAULTS['colourprimary']),
            'colouraccent' => $brand ? colours::accent_for($brand) : ($skin['light']['acento'] ?? centre::DEFAULTS['colouraccent']),
        ];
    }

    /**
     * The colours that go in the manifest: the skin's own are in its sheet, also for the dark theme.
     *
     * @param \stdClass $config the plugin's
     * @return array setting => colour
     */
    public static function theme_colours(\stdClass $config): array {
        $auto = self::chosen($config) || !colours::site_brand() ? [] : self::colours($config);
        $out = [];
        foreach (array_keys(centre::DEFAULTS) as $setting) {
            $out[$setting] = self::own($config, $setting) ?? ($auto[$setting] ?? '');
        }
        return $out;
    }

    /**
     * What a letter is called, from the family it goes by.
     *
     * @param string $family
     * @return string
     */
    protected static function letter_name(string $family): string {
        foreach (self::letters()['letters'] as $letter) {
            if ($letter['family'] === $family) {
                return $letter['name'];
            }
        }
        return $family;
    }

    /**
     * What the gallery of «Tu centro» shows.
     *
     * @param \stdClass $config the plugin's
     * @return array
     */
    public static function gallery(\stdClass $config): array {
        $c = 'local_oksigeniahechauka';
        $chosen = self::chosen($config);
        $first = self::get(self::first());
        $card = function (array $skin, string $id, string $name, string $primary, string $accent, bool $checked) {
            return ['id' => $id, 'skin' => $skin['id'], 'name' => $name, 'family' => $skin['family'], 'checked' => $checked,
                'fondo' => $skin['light']['fondo'], 'texto' => $skin['light']['texto'], 'primary' => $primary, 'accent' => $accent,
                'skinprimary' => $skin['light']['primario'], 'skinaccent' => $skin['light']['acento'],
                'stack' => '"' . $skin['family'] . '", sans-serif', 'tones' => json_encode([
                    'light' => array_intersect_key($skin['light'], array_flip(['fondo', 'superficie', 'texto'])),
                    'dark' => array_intersect_key($skin['dark'], array_flip(['fondo', 'superficie', 'texto'])),
                ]), 'lettername' => self::letter_name($skin['family'])];
        };
        $cards = [];
        $lang = substr(current_language(), 0, 2);
        $brand = colours::site_brand();
        if ($brand && $first) {
            $cards[] = $card($first, '', get_string('centre_skin_site', $c), $brand, colours::accent_for($brand), !$chosen);
        }
        foreach (self::all()['skins'] as $skin) {
            $name = $skin['name'][$lang] ?? $skin['name']['en'] ?? $skin['id'];
            $light = $skin['light'];
            $inuse = $chosen === $skin['id'] || (!$chosen && !$brand && $skin['id'] === self::first());
            $cards[] = $card($skin, $skin['id'], $name, $light['primario'], $light['acento'], $inuse);
        }
        return $cards;
    }

    /**
     * The letters the gallery shows its cards in: one weight of each.
     *
     * @return string CSS
     */
    public static function gallery_letters(): string {
        $css = '';
        $seen = [];
        foreach (array_merge(self::all()['skins'], self::letters()['letters']) as $letter) {
            if (isset($seen[$letter['family']])) {
                continue;
            }
            $seen[$letter['family']] = true;
            foreach ($letter['files'] as $file) {
                if ((int) $file['weight'] === 700) {
                    $url = new \moodle_url('/local/oksigeniahechauka/player/' . $file['file']);
                    $css .= '@font-face{font-family:"' . s($letter['family']) . '";font-weight:700;font-display:swap;src:url("' .
                        s($url->out(false)) . '") format("woff2")}';
                }
            }
        }
        return $css;
    }
}
