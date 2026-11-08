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
 * «Empezar»: what kind of centre it is, its look, where it is, what comes by itself with what there is now, and its first screen.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class startpage {
    /** @var array What a centre can be => when its day usually ends. It changes what is proposed, never what the product does. */
    const KINDS = ['school' => '16:00', 'university' => '21:00', 'academy' => '21:00', 'administration' => '15:00',
        'company' => '18:00', 'other' => '18:00'];

    /** @var string[] The sources that can be turned on or off here. */
    const SOURCES = ['sourcecalendar', 'sourcenews', 'sourcemenu', 'sourcebooks', 'sourcechannel', 'sourcedeadlines'];

    /**
     * Whether to send whoever runs the screens here instead of an empty panel: only the first time, with no screen yet.
     *
     * @return bool
     */
    public static function is_due(): bool {
        global $DB;
        return access::can('managescreens') && !get_config('local_oksigeniahechauka', 'startseen')
            && !$DB->record_exists_select('local_oksigeniahechauka_screen', 'keyhash IS NOT NULL');
    }

    /**
     * What is still missing for the screens to look like the centre's: it goes away by itself as it is done.
     *
     * @return array of {label, url}
     */
    public static function missing(): array {
        global $DB;
        $c = 'local_oksigeniahechauka';
        $start = (new \moodle_url('/local/oksigeniahechauka/start.php'))->out(false);
        $config = get_config($c);
        $out = [];
        if (empty($config->lat) || empty($config->lon)) {
            $out[] = ['label' => get_string('start_missing_place', $c), 'url' => $start . '#hkp-loc-h'];
        }
        if (!$DB->record_exists_select('local_oksigeniahechauka_screen', 'keyhash IS NOT NULL')) {
            $out[] = ['label' => get_string('start_missing_screen', $c), 'url' => $start . '#hkp-st-screen'];
        }
        return $out;
    }

    /**
     * How many there are of something, said as a sentence.
     *
     * @param string $what calendar, news, menu or books
     * @param int $count
     * @return string
     */
    protected static function figure(string $what, int $count): string {
        $end = $count === 0 ? 'none' : ($count === 1 ? 'one' : 'some');
        return get_string('start_source_' . $what . '_' . $end, 'local_oksigeniahechauka', $count);
    }

    /**
     * What comes by itself, with what there is right now: figures, not promises.
     *
     * @param \stdClass $config
     * @param int $now
     * @return array
     */
    protected static function sources(\stdClass $config, int $now): array {
        $c = 'local_oksigeniahechauka';
        $events = count(sources::events($now, 30));
        $news = count(sources::news($now, 7));
        $rows = [
            ['setting' => 'sourcecalendar', 'name' => get_string('start_source_calendar', $c), 'available' => true,
                'now' => self::figure('calendar', $events),
                'link' => $events ? '' : (new \moodle_url('/local/oksigeniahechauka/edit.php', ['type' => 'agenda']))->out(false),
                'linklabel' => $events ? '' : get_string('start_source_calendar_ical', $c)],
            ['setting' => 'sourcenews', 'name' => get_string('start_source_news', $c), 'available' => true,
                'now' => self::figure('news', $news)],
        ];
        $meals = sources::has_meals();
        $days = 0;
        if ($meals) {
            $menus = sources::menus($now, 7, ((int) ($config->menucentre ?? 0)) ?: null);
            foreach ($menus as $menu) {
                $days += substr($menu['id'], -4) === '-eve' ? 0 : 1;
            }
        }
        // Another Oksigenia plugin's source only where it is installed: nothing is said where it is not.
        if ($meals) {
            $rows[] = ['setting' => 'sourcemenu', 'name' => get_string('start_source_menu', $c), 'available' => true,
                'now' => self::figure('menu', $days)];
        }
        $hasbooks = sources::has_books();
        $books = 0;
        if ($hasbooks) {
            $list = sources::books($now, (int) ($config->booksdays ?? 14) ?: 14);
            $books = $list ? count($list[0]['books']) : 0;
        }
        if ($hasbooks) {
            $rows[] = ['setting' => 'sourcebooks', 'name' => get_string('start_source_books', $c), 'available' => true,
                'now' => self::figure('books', $books)];
        }
        $channel = sources::channel();
        if ($channel) {
            $rows[] = ['setting' => 'sourcechannel', 'name' => get_string('start_source_channel', $c), 'available' => true,
                'now' => $channel[0]['name'] !== '' ? get_string('start_source_channel_now', $c, $channel[0]['name']) :
                    get_string('start_source_channel_some', $c)];
        }
        $list = sources::deadlines($now, (int) ($config->deadlinesdays ?? 7) ?: 7);
        $deadlines = 0;
        foreach ($list ? $list[0]['days'] : [] as $day) {
            $deadlines += count($day['items']);
        }
        $rows[] = ['setting' => 'sourcedeadlines', 'name' => get_string('start_source_deadlines', $c), 'available' => true,
            'now' => self::figure('deadlines', $deadlines)];
        foreach ($rows as &$row) {
            $row['checked'] = $row['available'] && !empty($config->{$row['setting']});
            $row['id'] = 'hkp-st-' . $row['setting'];
        }
        return $rows;
    }

    /**
     * The context of the template.
     *
     * @param string $query what is being searched for the place
     * @param int $now
     * @return array
     */
    public static function context(string $query, int $now): array {
        global $DB;
        $c = 'local_oksigeniahechauka';
        $config = get_config($c);
        // The place, the screen beside it and its words are those of «Tu centro».
        $centre = centre::context($query, $now);
        $action = (new \moodle_url('/local/oksigeniahechauka/start.php'))->out(false);
        $kinds = [];
        $chosen = (string) ($config->centrekind ?? '');
        foreach (array_keys(self::KINDS) as $kind) {
            $kinds[] = ['id' => $kind, 'label' => get_string('start_kind_' . $kind, $c), 'checked' => $chosen === $kind];
        }
        $logo = files::first(files::LOGO, 0) ?: files::site_logo();
        $hascats = (bool) categories::all();
        $paired = $DB->record_exists_select('local_oksigeniahechauka_screen', 'keyhash IS NOT NULL');
        $skin = array_values(array_filter($centre['skins'], function ($card) {
            return $card['checked'];
        }))[0] ?? null;
        $rows = self::sources($config, $now);
        $on = array_filter($rows, function ($row) {
            return $row['checked'];
        });
        $state = function (bool $done) use ($c) {
            return ['done' => $done, 'label' => get_string($done ? 'start_state_done' : 'start_state_todo', $c)];
        };
        return [
            'tabs' => home::tabs('centre', true, 'pantalla'),
            'hastabs' => true,
            'action' => $action,
            'sesskey' => sesskey(),
            'frame' => $centre['frame'],
            'strings' => $centre['strings'],
            'style' => $centre['style'],
            'kinds' => $kinds,
            'askcategories' => !$hascats,
            'brand' => [
                'name' => manifest::centre_name(),
                'logourl' => (new \moodle_url('/local/oksigeniahechauka/centre.php'))->out(false) . '#hkp-logo-h',
                'logo' => $logo ? \moodle_url::make_pluginfile_url(
                    $logo->get_contextid(),
                    $logo->get_component(),
                    $logo->get_filearea(),
                    $logo->get_itemid(),
                    $logo->get_filepath(),
                    $logo->get_filename()
                )->out(false) : '',
                'skin' => $skin ? $skin['name'] : '',
                'primary' => $skin ? $skin['primary'] : '',
                'accent' => $skin ? $skin['accent'] : '',
                'change' => (new \moodle_url('/local/oksigeniahechauka/centre.php'))->out(false),
            ],
            'query' => $centre['query'],
            'searched' => $centre['searched'],
            'results' => $centre['results'],
            'hasresults' => $centre['hasresults'],
            'resultsjson' => $centre['resultsjson'],
            'place' => $centre['place'],
            'icons' => $centre['icons'],
            'sources' => $rows,
            'states' => [
                'kind' => $state($chosen !== ''),
                'brand' => $state(true),
                'sources' => $state((bool) $on),
                'place' => $state(!empty($config->lat) && !empty($config->lon)),
                'screen' => $state($paired),
            ],
            'savedword' => get_string('start_saved', $c),
            'playerurl' => playerlink::shown(),
            'playerlong' => playerlink::short() !== '' ? playerlink::long() : '',
            'prepareurl' => (new \moodle_url('/local/oksigeniahechauka/prepare.php'))->out(false),
            'paired' => $paired,
            'screensurl' => (new \moodle_url('/local/oksigeniahechauka/screens.php'))->out(false) . '#add',
            'home' => (new \moodle_url('/local/oksigeniahechauka/index.php'))->out(false),
        ];
    }

    /**
     * How the first and third steps stand after touching them.
     *
     * @return array
     */
    public static function states(): array {
        $c = 'local_oksigeniahechauka';
        $config = get_config($c);
        $on = false;
        foreach (self::SOURCES as $setting) {
            $on = $on || !empty($config->$setting);
        }
        return ['kind' => !empty($config->centrekind), 'sources' => $on, 'hascategories' => (bool) categories::all(),
            'done' => get_string('start_state_done', $c), 'todo' => get_string('start_state_todo', $c)];
    }

    /**
     * Saves what kind of centre it is and what comes by itself. A new kind proposes its categories and the end of its day, and only
     * where the centre has not put its own.
     *
     * @return void
     */
    public static function save(): void {
        $c = 'local_oksigeniahechauka';
        $kind = optional_param('kind', '', PARAM_ALPHA);
        if (isset(self::KINDS[$kind])) {
            if ((string) get_config($c, 'centrekind') !== $kind) {
                if (!get_config($c, 'dayend') || !get_config($c, 'centrekind')) {
                    set_config('dayend', self::KINDS[$kind], $c);
                }
                if (!categories::all() && optional_param('categories', 0, PARAM_BOOL)) {
                    self::propose_categories($kind);
                }
            }
            set_config('centrekind', $kind, $c);
        }
        foreach (self::SOURCES as $setting) {
            set_config($setting, optional_param($setting, 0, PARAM_BOOL) ? 1 : 0, $c);
        }
    }

    /**
     * The categories a kind of centre usually starts with: to be changed in «Tu centro».
     *
     * @param string $kind
     * @return void
     */
    protected static function propose_categories(string $kind): void {
        $words = trim(get_string('start_categories_' . $kind, 'local_oksigeniahechauka'));
        $list = [];
        foreach (explode(',', $words) as $name) {
            if (trim($name) !== '') {
                $list[] = ['name' => trim($name)];
            }
        }
        if ($list) {
            categories::save($list);
        }
    }
}
