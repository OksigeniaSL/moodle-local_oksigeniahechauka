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
    /** @var string The table of the content. */
    const ITEM = 'local_oksigeniahechauka_item';

    /** Days ahead the manifest has data for. */
    const HORIZON = 14;

    /** @var int How far ahead the changes of hour come, so a screen without network goes through them. */
    const ZONE_AHEAD = 400 * DAYSECS;

    /** @var int How many days ahead the events come, for the agenda that scrolls (a month, into the next one). */
    const AGENDA_DAYS = 31;

    /** Days ahead for the menus: each one is a call to Meals. */
    const MENU_DAYS = 7;

    /** Contract version. */
    const CONTRACT = 1;

    /** @var string[] The sources that failed while building this manifest, by name: for the panel. */
    protected static $failed = [];

    /** @var bool[] The sources that answered while building this manifest, by name. */
    protected static $worked = [];

    /** @var string The day of the manifest being built: what a source gave is kept only for that day. */
    protected static $day = '';

    /**
     * What a source gives. When it fails, what it gave last today (one source that breaks for a moment does not empty the
     * screens, nor make them take its pictures again), or else nothing: never every screen without its manifest. What
     * failed is noted for the panel.
     *
     * @param string $source its name
     * @param callable $get
     * @param mixed $nothing what is given instead
     * @param string|null $variant what makes it differ from one screen to another (a site, a scope); null keeps nothing
     * @return mixed
     */
    protected static function guarded(string $source, callable $get, $nothing = [], ?string $variant = '') {
        $cache = $variant === null ? null : \cache::make('local_oksigeniahechauka', 'lastgood');
        $key = sha1($source . '|' . $variant . '|' . self::$day);
        try {
            $got = $get();
            self::$worked[$source] = true;
            if ($cache) {
                $sum = sha1(serialize($got));
                $kept = $cache->get($key);
                if (!$kept || $kept['sum'] !== $sum) {
                    $cache->set($key, ['sum' => $sum, 'got' => $got]);
                }
            }
            return $got;
        } catch (\Throwable $e) {
            debugging('Hechauka, source ' . $source . ': ' . $e->getMessage(), DEBUG_DEVELOPER);
            self::$failed[$source] = \core_text::substr($e->getMessage(), 0, 200);
            $kept = $cache ? $cache->get($key) : false;
            return $kept ? $kept['got'] : $nothing;
        }
    }

    /**
     * The sources that are failing, kept in the settings only when that changes: the panel says which and since when. A
     * source this manifest did not ask (one screen's site, another's scope, only the touch screens) stays as it was.
     *
     * @param \stdClass $config the plugin's
     * @param int $now
     * @return void
     */
    protected static function note_failures(\stdClass $config, int $now): void {
        $before = json_decode((string) ($config->sourcefailures ?? ''), true) ?: [];
        $after = array_diff_key($before, self::$worked);
        foreach (self::$failed as $source => $error) {
            $after[$source] = $before[$source] ?? ['time' => $now, 'error' => $error];
        }
        if (!array_diff_key($after, $before) && !array_diff_key($before, $after)) {
            return;
        }
        set_config('sourcefailures', $after ? json_encode($after) : '', 'local_oksigeniahechauka');
    }

    /**
     * The sources that are failing now, with when they began and what they say. One the centre has switched off since is
     * no longer failing.
     *
     * @return array source => {time, error}
     */
    public static function failures(): array {
        $config = get_config('local_oksigeniahechauka');
        $failing = json_decode((string) ($config->sourcefailures ?? ''), true) ?: [];
        foreach (array_keys($failing) as $source) {
            if (property_exists($config, 'source' . $source) && empty($config->{'source' . $source})) {
                unset($failing[$source]);
            }
        }
        return $failing;
    }

    /**
     * A screen whose manifest cannot be built goes on beating with what it has, so it would look well in the panel: it is
     * noted, and the note goes when it can be built again. Kept in the settings only when that changes.
     *
     * @param int $screenid
     * @param int $now
     * @param string|null $error what failed, or null when it was built
     * @return void
     */
    public static function note_broken(int $screenid, int $now, ?string $error): void {
        $broken = self::broken();
        if ($error === null) {
            if (!isset($broken[$screenid])) {
                return;
            }
            unset($broken[$screenid]);
        } else {
            if (isset($broken[$screenid])) {
                return;
            }
            $broken[$screenid] = ['time' => $now, 'error' => \core_text::substr($error, 0, 200)];
        }
        set_config('manifestbroken', $broken ? json_encode($broken) : '', 'local_oksigeniahechauka');
    }

    /**
     * The screens whose manifest cannot be built, since when and why.
     *
     * @return array screen id => {time, error}
     */
    public static function broken(): array {
        return json_decode((string) get_config('local_oksigeniahechauka', 'manifestbroken'), true) ?: [];
    }

    /**
     * Since when a screen has gone without a manifest that can be built, or 0.
     *
     * @param int $screenid
     * @return int
     */
    public static function broken_since(int $screenid): int {
        return (int) (self::broken()[$screenid]['time'] ?? 0);
    }

    /**
     * The manifest of a screen.
     *
     * @param \stdClass $screen
     * @param int $now
     * @return array
     */
    public static function build(\stdClass $screen, int $now): array {
        global $DB;
        $config = get_config('local_oksigeniahechauka');
        $info = json_decode((string) $screen->lastinfo, true) ?: [];
        $display = $info['display'] ?? [];
        // A screen of a site of the centre (a camp, another campus) takes its name, its place and its logos.
        $site = sites::of_screen((int) $screen->id);
        $m = [
            'contract' => self::CONTRACT,
            'etag' => '',
            'generated' => $now,
            'horizon' => schedule::day($now, self::HORIZON),
            'dayend' => sources::day_end(),
            'mealhours' => sources::meal_hours(),
            'videosperday' => sources::videos_per_day(),
            'screen' => [
                'id' => (int) $screen->id,
                'name' => items::plain((string) $screen->name),
                'width' => (int) ($display['width'] ?? 1920),
                'height' => (int) ($display['height'] ?? 1080),
                'timezone' => \core_date::get_server_timezone(),
                'offsets' => self::offsets($now),
                'lang' => current_language(),
                'sound' => !empty($screen->sound),
                'distance' => uses::distance($screen->distance ?? 3),
                'glass' => !empty($screen->glass),
                'canteen' => !empty($screen->canteen),
            ],
            'template' => uses::valid($screen->screenuse ?? null) === 'showcase' ? 'full' : 'zones',
            'centre' => ['name' => $site ? sites::name($site, $config) : self::centre_name()],
            'theme' => self::theme($screen, $config, $site),
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
        $place = screenplace::contract($screen, $now);
        if ($place) {
            $m['screen']['place'] = $place;
        }
        $phrase = centre::phrase($config);
        if ($phrase !== '') {
            $m['centre']['phrase'] = $phrase;
        }
        // A screen people touch: its doors, and what the centre tells of itself behind two of them.
        $touch = touch::contract($screen);
        if ($touch) {
            $m['screen']['touch'] = $touch;
            $contact = touch::contact($config, $site && sites::has_place($site, $config) ? sites::suffix($site) : '');
            if ($contact) {
                $m['centre']['contact'] = $contact;
            }
            $about = touch::about($config);
            if ($about) {
                $m['centre']['about'] = $about;
            }
        }
        $power = schedule::power($screen->power);
        if ($power) {
            $m['power'] = $power;
        }
        // As long as there is something of the example left: taken out or rewritten from the panel, the notice goes with it.
        $like = $DB->sql_like('data', ':sample');
        if (!empty($config->sampledata) && $DB->record_exists_select(self::ITEM, $like, ['sample' => '%"sample":true%'])) {
            $m['sample'] = true;
        }
        self::$failed = [];
        self::$worked = [];
        self::$day = schedule::day($now);
        if (!empty($config->sourceweather)) {
            $where = $site && sites::has_place($site, $config) ? sites::suffix($site) : '';
            $weather = self::guarded('weather', function () use ($where, $now) {
                return weather::summary(weather::hours($where), $now);
            }, null, $where);
            if ($weather) {
                $m['weather'] = $weather;
            }
        }
        $m += uses::contract($screen);
        $m += surprises::contract($screen, $config);
        $m['categories'] = categories::contract();
        $scope = screens::scope((int) $screen->id);
        $m['items'] = self::unique(array_merge(
            self::own_items($screen, $now),
            self::source_items($config, $now, $scope, screens::groups_of((int) $screen->id))
        ));
        // Today's visits, only for a screen people touch: the welcome is at the door, where visitors wait.
        if ($touch && !empty($config->sourcevisits ?? 1)) {
            $m['items'] = array_merge($m['items'], self::guarded('visits', function () use ($now) {
                return touch::visits($now);
            }));
        }
        // A centre that has put nothing yet: the screen says where to start, and stops saying it with the first thing.
        if (!$DB->record_exists('local_oksigeniahechauka_item', [])) {
            $m['idle'] = ['qr' => (new \moodle_url('/local/oksigeniahechauka/edit.php', ['type' => 'notice']))->out(false)];
        }
        // Each web with its short link and the QR the shortener draws, when the site has one.
        $m = self::guarded('links', function () use ($m, $now) {
            return links::apply($m, $now);
        }, $m, null);
        self::note_failures($config, $now);
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
     * How far the centre is from UTC, now and after each change of hour of the coming year: the screen goes by the clocks
     * of the centre whatever time zone its device is in, also days without network.
     *
     * @param int $now
     * @return array[] each {from, minutes}; the first, the one of now, from 0, so nothing changes until the hour does
     */
    public static function offsets(int $now): array {
        $zone = \core_date::get_server_timezone_object();
        $out = [['from' => 0, 'minutes' => intdiv($zone->getOffset(new \DateTime('@' . $now)), MINSECS)]];
        foreach (array_slice($zone->getTransitions($now, $now + self::ZONE_AHEAD) ?: [], 1) as $change) {
            $out[] = ['from' => (int) $change['ts'], 'minutes' => intdiv((int) $change['offset'], MINSECS)];
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
     * The name that stands in for a logo while there is none: the site's, short enough for a header.
     *
     * @return string
     */
    public static function centre_name(): string {
        global $SITE;
        $system = ['context' => \context_system::instance()];
        $full = items::plain(format_string($SITE->fullname, true, $system));
        return \core_text::strlen($full) <= 28 ? $full : items::plain(format_string($SITE->shortname, true, $system));
    }

    /**
     * The colours, the logos and the light or dark theme.
     *
     * @param \stdClass $screen
     * @param \stdClass $config
     * @param int|null $site the group of its site, if it is in one
     * @return array
     */
    protected static function theme(\stdClass $screen, \stdClass $config, ?int $site = null): array {
        $mode = $screen->theme !== 'site' ? $screen->theme : ($config->thememode ?? 'light');
        $theme = ['mode' => in_array($mode, ['light', 'dark', 'auto']) ? $mode : 'light', 'vars' => []];
        if ($theme['mode'] === 'auto') {
            $theme['dark_from'] = schedule::is_hour($config->darkfrom ?? '') ? $config->darkfrom : '19:00';
            $theme['dark_until'] = schedule::is_hour($config->darkuntil ?? '') ? $config->darkuntil : '07:30';
        }
        // The skin the centre chose and, over it, its own colours (each with the text that reads on it, colours::vars). With none
        // chosen, the first skin with the main colour of its Moodle: never the same on every site.
        $theme['skin'] = skins::chosen($config) ?: skins::first();
        $set = skins::theme_colours($config);
        $theme['vars'] = colours::vars($set, categories::colours()) + skins::own_vars($config);
        $ground = skins::listed_ground($config);
        if ($ground) {
            $theme['ground'] = $ground;
        }
        // What is not the same on the light theme as on the dark goes apart; a variable on the page would hold on both.
        $modes = skins::modes($config, $set);
        if ($modes) {
            $theme['modes'] = $modes;
            unset($theme['vars']['--hk-acento-texto']);
        }
        if (!$theme['vars']) {
            unset($theme['vars']);
        }
        // A site with a logo of its own takes both of its own: the centre's dark one would not go with it.
        $own = $site ? sites::logo($site) : null;
        $logo = $own ?: files::first(files::LOGO, 0) ?: files::site_logo();
        if ($logo) {
            $theme['logo'] = files::media($logo);
        }
        $dark = $own ? sites::logo($site, true) : files::first(files::LOGODARK, 0);
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
        // The files of all of them in one reading, not one per item and area at every heartbeat.
        files::prime([files::MEDIA, files::VIDEO, files::POSTER, files::BACKDROP], array_keys($records));
        $items = [];
        foreach ($records as $record) {
            if ($record->type === 'agenda') {
                $items = array_merge($items, agendas::contract($record, $now));
                continue;
            }
            if ($record->type === 'album') {
                $items = array_merge($items, items::album_items($record));
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
        files::prime([], []);
        return $items;
    }

    /**
     * The items that come from Moodle by themselves.
     *
     * @param \stdClass $config
     * @param int $now
     * @param int[] $scope the course categories of the screen
     * @param int[] $groups the groups of the screen
     * @return array items of the contract
     */
    protected static function source_items(\stdClass $config, int $now, array $scope, array $groups = []): array {
        // Each one on its own: what one of them throws leaves the others, and the screen, as they were.
        $wanted = [
            'menus' => empty($config->sourcemenu) ? null : function () use ($config, $now) {
                $centre = (int) ($config->menucentre ?? 0);
                return sources::menus($now, self::MENU_DAYS, $centre ?: null);
            },
            'calendar' => empty($config->sourcecalendar) ? null : function () use ($now, $scope) {
                return sources::events($now, self::AGENDA_DAYS, $scope);
            },
            'news' => empty($config->sourcenews) ? null : function () use ($config, $now) {
                return news::without_own(sources::news($now, (int) ($config->newsdays ?? 7) ?: 7));
            },
            'books' => empty($config->sourcebooks) ? null : function () use ($config, $now, $scope) {
                return sources::books($now, (int) ($config->booksdays ?? 14) ?: 14, $scope);
            },
            'photoday' => empty($config->sourcephotoday) ? null : function () use ($now) {
                return photoday::items($now);
            },
            'moments' => empty($config->sourcemoments) ? null : function () use ($now, $scope) {
                return sources::moments($now, $scope);
            },
            'instagram' => empty($config->sourceinstagram) ? null : function () use ($groups, $now) {
                return instagram::items($groups, $now);
            },
            'openacts' => empty($config->sourceopenacts) ? null : function () use ($now) {
                return sources::open_acts($now);
            },
            // The «Follow us» slides: the channel of Oksigenia Marandu, and the centre's networks switched on, one each turn.
            'channel' => function () use ($config) {
                $channel = empty($config->sourcechannel) ? [] : sources::channel();
                return array_merge($channel, networks::items($channel));
            },
            'deadlines' => empty($config->sourcedeadlines) ? null : function () use ($config, $now, $scope) {
                return sources::deadlines($now, (int) ($config->deadlinesdays ?? 7) ?: 7, $scope);
            },
            'birthdays' => function () use ($config, $now) {
                return birthdays::items($config, $now);
            },
        ];
        $items = [];
        foreach ($wanted as $source => $get) {
            if ($get) {
                $variant = in_array($source, ['calendar', 'deadlines', 'books', 'moments']) ? implode(',', $scope) :
                    ($source === 'instagram' ? implode(',', $groups) : '');
                $items = array_merge($items, self::guarded($source, $get, [], $variant));
            }
        }
        return $items;
    }
}
