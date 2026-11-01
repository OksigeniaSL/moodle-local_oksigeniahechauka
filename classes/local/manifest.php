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
 * The manifest of a screen (docs/contract.md, «Manifest»).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * Everything a screen needs for the coming days, so it keeps going without a network.
 */
class manifest {
    /** Days ahead the manifest has data for. */
    const HORIZON = 14;

    /** Days ahead for the menus: each one is a call to Meals. */
    const MENU_DAYS = 7;

    /** Contract version. */
    const CONTRACT = 1;

    /**
     * The manifest of a screen.
     *
     * @param \stdClass $screen
     * @param int $now
     * @return array
     */
    public static function build(\stdClass $screen, int $now): array {
        $config = get_config('local_oksigeniahechauka');
        $info = json_decode((string) $screen->lastinfo, true) ?: [];
        $display = $info['display'] ?? [];
        $m = [
            'contract' => self::CONTRACT,
            'etag' => '',
            'generated' => $now,
            'horizon' => schedule::day($now, self::HORIZON),
            'screen' => [
                'id' => (int) $screen->id,
                'name' => items::plain((string) $screen->name),
                'width' => (int) ($display['width'] ?? 1920),
                'height' => (int) ($display['height'] ?? 1080),
                'timezone' => \core_date::get_server_timezone(),
                'lang' => current_language(),
                'sound' => !empty($screen->sound),
            ],
            'template' => $screen->template === 'full' ? 'full' : 'zones',
            'theme' => self::theme($screen, $config),
            'labels' => [
                'menu' => get_string('label_menu', 'local_oksigeniahechauka'),
                'notices' => get_string('label_notices', 'local_oksigeniahechauka'),
                'events' => get_string('label_events', 'local_oksigeniahechauka'),
                'ticker' => get_string('label_ticker', 'local_oksigeniahechauka'),
                'upcoming' => get_string('label_upcoming', 'local_oksigeniahechauka'),
                'today' => get_string('label_today', 'local_oksigeniahechauka'),
                'tomorrow' => get_string('label_tomorrow', 'local_oksigeniahechauka'),
                'days' => get_string('label_days', 'local_oksigeniahechauka'),
            ],
            'items' => [],
        ];
        $power = schedule::power($screen->power);
        if ($power) {
            $m['power'] = $power;
        }
        if (!empty($config->sampledata)) {
            $m['sample'] = true;
        }
        if (!empty($config->sourceweather)) {
            $weather = weather::summary(weather::hours(), $now);
            if ($weather) {
                $m['weather'] = $weather;
            }
        }
        $m['items'] = self::unique(array_merge(self::own_items($screen, $now), self::source_items($config, $now)));
        $m['etag'] = self::etag($m);
        return $m;
    }

    /**
     * The same event only once, whichever way it came (an agenda and the site calendar subscribed to the same
     * calendar): the first one stays, the panel's and the agendas' before the site's.
     *
     * @param array $items
     * @return array
     */
    protected static function unique(array $items): array {
        $seen = [];
        $out = [];
        foreach ($items as $it) {
            if (($it['type'] ?? '') === 'event') {
                $key = \core_text::strtolower(trim((string) ($it['title'] ?? ''))) . '@' . ($it['start'] ?? '');
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
            }
            $out[] = $it;
        }
        return $out;
    }

    /**
     * The etag of a manifest: everything but the etag and the moment it was made.
     *
     * @param array $m
     * @return string
     */
    public static function etag(array $m): string {
        unset($m['etag'], $m['generated']);
        return sha1(json_encode($m));
    }

    /**
     * The colours, the logos and the light or dark theme.
     *
     * @param \stdClass $screen
     * @param \stdClass $config
     * @return array
     */
    protected static function theme(\stdClass $screen, \stdClass $config): array {
        $mode = $screen->theme !== 'site' ? $screen->theme : ($config->thememode ?? 'light');
        $theme = ['mode' => in_array($mode, ['light', 'dark', 'auto']) ? $mode : 'light', 'vars' => []];
        if ($theme['mode'] === 'auto') {
            $theme['dark_from'] = schedule::is_hour($config->darkfrom ?? '') ? $config->darkfrom : '19:00';
            $theme['dark_until'] = schedule::is_hour($config->darkuntil ?? '') ? $config->darkuntil : '07:30';
        }
        // The school's colours, each with the text that reads on it (colours::vars).
        $set = [];
        foreach (array_keys(colours::SETTINGS) as $setting) {
            $set[$setting] = $config->$setting ?? '';
        }
        $theme['vars'] = colours::vars($set);
        if (!$theme['vars']) {
            unset($theme['vars']);
        }
        $logo = files::first(files::LOGO, 0);
        if ($logo) {
            $theme['logo'] = files::media($logo);
        }
        $dark = files::first(files::LOGODARK, 0);
        if ($dark) {
            $theme['logo_dark'] = files::media($dark);
        }
        return $theme;
    }

    /**
     * The items made in the panel that reach this screen and are not over yet.
     *
     * @param \stdClass $screen
     * @param int $now
     * @return array items of the contract
     */
    protected static function own_items(\stdClass $screen, int $now): array {
        global $DB;
        $today = schedule::day($now);
        $horizon = schedule::day($now, self::HORIZON);
        $sql = "SELECT i.*
                  FROM {local_oksigeniahechauka_item} i
                 WHERE i.visible = 1
                       AND (i.dateuntil IS NULL OR i.dateuntil = '' OR i.dateuntil >= :today)
                       AND (i.datefrom IS NULL OR i.datefrom = '' OR i.datefrom <= :horizon)
                       AND (i.targetall = 1
                            OR EXISTS (SELECT 1 FROM {local_oksigeniahechauka_target} t
                                        WHERE t.itemid = i.id AND t.screenid = :screen1)
                            OR EXISTS (SELECT 1 FROM {local_oksigeniahechauka_target} t
                                         JOIN {local_oksigeniahechauka_member} m ON m.groupid = t.groupid
                                        WHERE t.itemid = i.id AND m.screenid = :screen2))
              ORDER BY i.sortorder, i.id";
        $records = $DB->get_records_sql($sql, ['today' => $today, 'horizon' => $horizon,
            'screen1' => $screen->id, 'screen2' => $screen->id]);
        $items = [];
        foreach ($records as $record) {
            if ($record->type === 'agenda') {
                $items = array_merge($items, agendas::contract($record, $now));
                continue;
            }
            if ($record->type === 'urgent' && !items::urgent_on($record, $now)) {
                continue;
            }
            $item = items::to_contract($record);
            if ($item) {
                $items[] = $item;
            }
        }
        return $items;
    }

    /**
     * The items that come from Moodle by themselves.
     *
     * @param \stdClass $config
     * @param int $now
     * @return array items of the contract
     */
    protected static function source_items(\stdClass $config, int $now): array {
        $items = [];
        if (!empty($config->sourcemenu)) {
            $centre = (int) ($config->menucentre ?? 0);
            $items = array_merge($items, sources::menus($now, self::MENU_DAYS, $centre ?: null));
        }
        if (!empty($config->sourcecalendar)) {
            $items = array_merge($items, sources::events($now, self::HORIZON));
        }
        if (!empty($config->sourcenews)) {
            $items = array_merge($items, sources::news($now, (int) ($config->newsdays ?? 7) ?: 7));
        }
        return $items;
    }
}
