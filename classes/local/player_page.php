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
 * The page that holds the player, for a screen or for the preview of the panel.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * The player knows nothing of Moodle: this page tells it where everything is, in its boot block.
 */
class player_page {
    /**
     * The texts the player shows on its own.
     *
     * @return array
     */
    public static function strings(): array {
        $c = 'local_oksigeniahechauka';
        return [
            'pair_title' => get_string('pair_title', $c),
            'pair_steps' => get_string('pair_steps', $c),
            'offline' => get_string('offline', $c),
            'sample' => get_string('sample', $c),
            'menu' => get_string('label_menu', $c),
            'notices' => get_string('label_notices', $c),
            'events' => get_string('label_events', $c),
            'ticker' => get_string('label_ticker', $c),
            'closed' => get_string('closed', $c),
            'days' => explode(',', get_string('days', $c)),
            'months' => explode(',', get_string('months', $c)),
            'date_format' => get_string('date_format', $c),
        ];
    }

    /**
     * The boot block of a real screen.
     *
     * @return array
     */
    public static function screen_boot(): array {
        $api = function (string $name): string {
            return (new \moodle_url('/local/oksigeniahechauka/api/' . $name . '.php'))->out(false);
        };
        return [
            'contract' => manifest::CONTRACT,
            'mode' => 'screen',
            'lang' => current_language(),
            'endpoints' => [
                'pair' => $api('pair'),
                'poll' => $api('poll'),
                'manifest' => $api('manifest'),
                'heartbeat' => $api('heartbeat'),
                'screenshot' => $api('screenshot'),
            ],
            'sw' => (new \moodle_url('/local/oksigeniahechauka/player/sw.js'))->out(false),
            'build' => self::build(),
            'strings' => self::strings(),
        ];
    }

    /**
     * The build of the player on the server: the version of the plugin. A screen that runs another one reloads.
     *
     * @return int
     */
    public static function build(): int {
        $plugin = \core_plugin_manager::instance()->get_plugin_info('local_oksigeniahechauka');
        return $plugin ? (int) $plugin->versiondisk : 0;
    }

    /**
     * The boot block of the preview, with the session of the person in the panel.
     *
     * @param int $screenid 0 for a screen that shows what goes to every screen
     * @param string $at «YYYY-MM-DDTHH:MM», or empty for now
     * @return array
     */
    public static function preview_boot(int $screenid, string $at): array {
        $boot = [
            'contract' => manifest::CONTRACT,
            'mode' => 'preview',
            'lang' => current_language(),
            'endpoints' => [
                'manifest' => (new \moodle_url(
                    '/local/oksigeniahechauka/preview_manifest.php',
                    ['screen' => $screenid]
                ))->out(false),
            ],
            'strings' => self::strings(),
        ];
        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $at)) {
            $boot['at'] = $at;
        }
        return $boot;
    }

    /**
     * The whole page.
     *
     * @param array $boot
     * @return string
     */
    public static function html(array $boot): string {
        global $SITE;
        $v = self::build();
        $css = (new \moodle_url('/local/oksigeniahechauka/player/hechauka.css', ['v' => $v]))->out(false);
        $js = (new \moodle_url('/local/oksigeniahechauka/player/build/hechauka.js', ['v' => $v]))->out(false);
        $json = json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
        return '<!doctype html>' . "\n" .
            '<html lang="' . s($boot['lang']) . '" data-tema="claro">' .
            '<head><meta charset="utf-8">' .
            '<meta name="viewport" content="width=device-width, initial-scale=1">' .
            '<meta name="robots" content="noindex, nofollow">' .
            '<title>' . s(format_string($SITE->shortname, true, ['context' => \context_system::instance()])) .
            '</title>' .
            '<link rel="stylesheet" href="' . s($css) . '">' .
            '</head><body>' .
            '<div id="hechauka"></div>' .
            '<script id="hechauka-boot" type="application/json">' . $json . '</script>' .
            '<script src="' . s($js) . '"></script>' .
            '</body></html>';
    }

    /**
     * Sends the page with headers that keep it out of frames of other sites and out of caches in the way.
     *
     * @param array $boot
     * @param bool $framed whether the panel shows it inside its own page
     * @return void
     */
    public static function send(array $boot, bool $framed = false): void {
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-cache');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: ' . ($framed ? 'SAMEORIGIN' : 'DENY'));
        echo self::html($boot);
        die();
    }
}
