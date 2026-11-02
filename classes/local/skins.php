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
    /** @var array|null What the file says. */
    protected static $all = null;

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
                'skinprimary' => $skin['light']['primario'], 'skinaccent' => $skin['light']['acento']];
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
            $cards[] = $card($skin, $skin['id'], $name, $light['primario'], $light['acento'], $chosen === $skin['id']);
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
        foreach (self::all()['skins'] as $skin) {
            foreach ($skin['files'] as $file) {
                if ((int) $file['weight'] === 700) {
                    $url = new \moodle_url('/local/oksigeniahechauka/player/' . $file['file']);
                    $css .= '@font-face{font-family:"' . s($skin['family']) . '";font-weight:700;font-display:swap;src:url("' .
                        s($url->out(false)) . '") format("woff2")}';
                }
            }
        }
        return $css;
    }
}
