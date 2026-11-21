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
            'days_short' => explode(',', get_string('days_abbr', $c)),
            'months_short' => explode(',', get_string('months_abbr', $c)),
            'upcoming' => get_string('label_upcoming', $c),
            'today' => get_string('label_today', $c),
            'tomorrow' => get_string('label_tomorrow', $c),
            'days_word' => get_string('label_days', $c),
            'days_mid' => explode(',', get_string('days_abbr_mid', $c)),
            'week_none' => get_string('week_none', $c),
            'urgent' => get_string('urgent_label', $c),
            'week_holiday' => get_string('week_holiday', $c),
            'week_more' => get_string('week_more', $c),
            'week_from' => get_string('week_from', $c),
            'week_until' => get_string('week_until', $c),
            'date_format' => get_string('date_format', $c),
            'birthdays_one' => get_string('label_birthdays_one', $c),
            'birthdays_many' => get_string('label_birthdays_many', $c),
            'birthdays_cheers' => get_string('label_birthdays_cheers', $c),
            'allergens' => get_string('label_allergens', $c),
            'also' => get_string('label_also', $c),
            'idle_qr' => get_string('label_idle_qr', $c),
            'important' => get_string('label_important', $c),
            'notice' => get_string('label_notice', $c),
            'countdown' => get_string('label_countdown', $c),
            'daysfor' => get_string('label_daysfor', $c),
            'scan' => get_string('label_scan', $c),
            'channel_members' => get_string('label_channel_members', $c),
            'channel_members_one' => get_string('label_channel_members_one', $c),
            'instagram_today' => get_string('label_instagram_today', $c),
            'instagram_yesterday' => get_string('label_instagram_yesterday', $c),
            'instagram_days' => get_string('label_instagram_days', $c),
            'open_today' => get_string('label_open_today', $c),
            // The touch screen (src/tactil.js).
            'touch_invite' => get_string('touch_invite', $c),
            'touch_more' => get_string('touch_more', $c),
            'touch_title' => get_string('touch_title', $c),
            'touch_help' => get_string('touch_help', $c),
            'touch_families' => get_string('touch_families', $c),
            'touch_visitors' => get_string('touch_visitors', $c),
            'touch_back' => get_string('touch_back', $c),
            'touch_home' => get_string('touch_home', $c),
            'touch_still' => get_string('touch_still', $c),
            'touch_back_in' => get_string('touch_back_in', $c),
            'touch_take' => get_string('touch_take', $c),
            'touch_short_menu' => get_string('touch_short_menu', $c),
            'touch_short_agenda' => get_string('touch_short_agenda', $c),
            'touch_short_photos' => get_string('touch_short_photos', $c),
            'touch_short_notices' => get_string('touch_short_notices', $c),
            'touch_short_library' => get_string('touch_short_library', $c),
            'touch_short_networks' => get_string('touch_short_networks', $c),
            'touch_short_about' => get_string('touch_short_about', $c),
            'touch_short_visit' => get_string('touch_short_visit', $c),
            'touch_short_openacts' => get_string('touch_short_openacts', $c),
            'touch_short_centre' => get_string('touch_short_centre', $c),
            'touch_today' => get_string('touch_today', $c),
            'touch_in_canteen' => get_string('touch_in_canteen', $c),
            'touch_tap_dish' => get_string('touch_tap_dish', $c),
            'touch_has' => get_string('touch_has', $c),
            'touch_has_none' => get_string('touch_has_none', $c),
            'touch_close' => get_string('touch_close', $c),
            'touch_no_canteen' => get_string('touch_no_canteen', $c),
            'touch_next' => get_string('touch_next', $c),
            'touch_all_day' => get_string('touch_all_day', $c),
            'touch_photos_one' => get_string('touch_photos_one', $c),
            'touch_photos_n' => get_string('touch_photos_n', $c),
            'touch_of' => get_string('touch_of', $c),
            'touch_day_here' => get_string('touch_day_here', $c),
            'touch_see_it' => get_string('touch_see_it', $c),
            'touch_ask_visit' => get_string('touch_ask_visit', $c),
            'touch_welcome' => get_string('touch_welcome', $c),
            'touch_welcome_in' => get_string('touch_welcome_in', $c),
            'touch_visit_how' => get_string('touch_visit_how', $c),
            'touch_from_to' => get_string('touch_from_to', $c),
            'touch_turns' => get_string('touch_turns', $c),
            'touch_signup' => get_string('touch_signup', $c),
            'touch_hours' => get_string('touch_hours', $c),
            'touch_take_me' => get_string('touch_take_me', $c),
            'touch_previous' => get_string('touch_previous', $c),
            'touch_following' => get_string('touch_following', $c),
            'touch_door_menu' => get_string('door_menu', $c),
            'touch_door_agenda' => get_string('door_agenda', $c),
            'touch_door_photos' => get_string('door_photos', $c),
            'touch_door_notices' => get_string('door_notices', $c),
            'touch_door_library' => get_string('door_library', $c),
            'touch_door_networks' => get_string('door_networks', $c),
            'touch_door_about' => get_string('door_about', $c),
            'touch_door_visit' => get_string('door_visit', $c),
            'touch_door_openacts' => get_string('door_openacts', $c),
            'touch_door_centre' => get_string('door_centre', $c),
            'open_tomorrow' => get_string('label_open_tomorrow', $c),
            'open_this' => get_string('label_open_this', $c),
            'open_in' => get_string('label_open_in', $c),
            'open_signup' => get_string('label_open_signup', $c),
            'open_walkin' => get_string('label_open_walkin', $c),
            'open_walkin_do' => get_string('label_open_walkin_do', $c),
            'open_full' => get_string('label_open_full', $c),
            'open_left' => get_string('label_open_left', $c),
            'open_left_one' => get_string('label_open_left_one', $c),
            'open_came' => get_string('label_open_came', $c),
            'open_came_one' => get_string('label_open_came_one', $c),
            'open_now' => get_string('label_open_now', $c),
            'open_welcome' => get_string('label_open_welcome', $c),
            'thisweek' => get_string('label_thisweek', $c),
            'letters' => explode(',', get_string('days_letters', $c)),
            'until_tomorrow' => get_string('agenda_until_tomorrow', $c),
            'agenda_in' => get_string('agenda_in', $c),
            'agenda_nomore' => get_string('agenda_nomore', $c),
            'agenda_quiet_title' => get_string('agenda_quiet_title', $c),
            'agenda_quiet' => get_string('agenda_quiet', $c),
            'zones_weather' => get_string('zones_weather', $c),
            'place_open' => get_string('place_open', $c),
            'place_closed' => get_string('place_closed', $c),
            'place_until' => get_string('place_until', $c),
            'place_opens_today' => get_string('place_opens_today', $c),
            'place_opens_tomorrow' => get_string('place_opens_tomorrow', $c),
            'place_opens_day' => get_string('place_opens_day', $c),
            'place_opens_date' => get_string('place_opens_date', $c),
            'place_hours' => get_string('place_hours', $c),
            'place_today' => get_string('place_today', $c),
            'place_days_range' => get_string('place_days_range', $c),
            'place_days_pair' => get_string('place_days_pair', $c),
            'place_time_range' => get_string('place_time_range', $c),
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
        $url = function (string $file) use ($v): string {
            return s((new \moodle_url('/local/oksigeniahechauka/player/' . $file, ['v' => $v]))->out(false));
        };
        // The templates, the compositions, the weather and the coming days, in this order, and how they move the last
        // of all; the weather icons before the player, which takes them from the page.
        $sheets = '';
        foreach (
            ['hechauka.css', 'composiciones.css', 'tiempo.css', 'semana.css', 'proximos-dias.css', 'urgente.css',
            'distancia.css', 'jerarquia.css', 'tercios.css', 'cinta.css', 'usos.css', 'agenda.css', 'fotos.css',
            'lideres.css', 'agenda-lista.css', 'cumple.css', 'reposo.css', 'plazos.css', 'tabla.css',
            'biblioteca.css', 'celebra.css', 'canal.css', 'instagram.css', 'jornadas.css', 'alergenos.css', 'menus.css',
            'fotodia.css',
            'identidad.css', 'zonas.css',
            'pieles.css', 'fondos.css', 'letras.css', 'actividad.css',
            'movimiento.css', 'tactil.css'] as $file
        ) {
            $sheets .= '<link rel="stylesheet" href="' . $url($file) . '">';
        }
        $config = get_config('local_oksigeniahechauka');
        $json = json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
        return '<!doctype html>' . "\n" .
            // With the skin from the start, so that a screen does not ask for the letters of another one.
            '<html lang="' . s($boot['lang']) . '" data-tema="claro" data-piel="' .
            s(skins::chosen($config) ?: skins::first()) . '"' .
            (skins::listed_ground($config) ? ' data-fondo="' . s(skins::listed_ground($config)) . '"' : '') . '>' .
            '<head><meta charset="utf-8">' .
            '<meta name="viewport" content="width=device-width, initial-scale=1">' .
            '<meta name="robots" content="noindex, nofollow">' .
            '<title>' . s(format_string($SITE->shortname, true, ['context' => \context_system::instance()])) .
            '</title>' .
            $sheets .
            '</head><body>' .
            '<div id="hechauka"></div>' .
            '<script id="hechauka-boot" type="application/json">' . $json . '</script>' .
            '<script src="' . $url('tiempo-iconos.js') . '"></script>' .
            '<script src="' . $url('actividad-iconos.js') . '"></script>' .
            '<script src="' . $url('build/hechauka.js') . '"></script>' .
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
        // What the worker of the screens looks for before keeping a page as theirs.
        header('X-Hechauka-Player: 1');
        // The page is the same for every screen and has nothing of anyone: the app of the Samsung displays may follow a short
        // address to it and keep where it really is, instead of depending on the shortener every morning.
        header('Access-Control-Allow-Origin: *');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: ' . ($framed ? 'SAMEORIGIN' : 'DENY'));
        echo self::html($boot);
        die();
    }
}
