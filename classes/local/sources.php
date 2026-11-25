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
 * What Moodle already knows, for the screens: the menu of the canteen, the events of the site and its news.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * Each source gives items of the contract, ready for the manifest, with their own «when».
 */
class sources {
    /** @var string[] The marks of Meals that say which meat a dish has, besides «meat». */
    const MEATS = ['pork', 'beef', 'chicken', 'turkey'];

    /** @var string The library's plugin. */
    const BOOKS = 'local_oksigeniaayvurenda';

    /** @var int The most books a screen gets. */
    const BOOKS_MOST = 12;

    /** @var int The most of the library's moments a screen gets: what is worth telling this week, not a report. */
    const MOMENTS_MOST = 4;

    /** @var string The admissions plugin, whose open acts the screens tell. */
    const ADMISSIONS = 'local_oksigeniaeguahe';

    /** @var int The most open acts a screen gets, the nearest first: an open day is told, not a calendar. */
    const ACTS_MOST = 6;

    /** @var int The most deadlines a screen gets: a screen is not the place for all of a big site's. */
    const DEADLINES_MOST = 60;

    /** @var int Videos a screen shows a day, in turn, if the centre has not said. */
    const VIDEOS_PER_DAY = 2;

    /** @var int The most a centre can ask for a day, short of all of them (0). */
    const VIDEOS_MOST = 20;

    /** @var string[] When the canteen serves, if the centre has not said: the menus come often then. */
    const MEAL_HOURS = ['from' => '11:00', 'to' => '14:00'];

    /** After this hour the screens show tomorrow's menu, as the canteen's own board does. */
    /** @var string When the day ends for the screens if the centre has not said (then «Today» shows tomorrow). */
    const DAY_END = '16:00';

    /**
     * When the day ends for the screens: from then «Today» shows tomorrow (its menu and its events). Each centre sets it
     * in «Tu centro»: a school at four, a university with evening classes at nine.
     *
     * @return string «HH:MM»
     */
    public static function day_end(): string {
        $value = (string) get_config('local_oksigeniahechauka', 'dayend');
        return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value) ? $value : self::DAY_END;
    }

    /**
     * When the canteen serves: the screens show every menu of the day often then, and «Today» does not take one of them
     * for its headline. Each centre sets it in «Tu centro»; a centre that serves later or longer moves it.
     *
     * @return string[] ['from' => «HH:MM», 'to' => «HH:MM»]
     */
    public static function meal_hours(): array {
        $c = 'local_oksigeniahechauka';
        $time = '/^([01]\d|2[0-3]):[0-5]\d$/';
        $from = (string) get_config($c, 'mealfrom');
        $to = (string) get_config($c, 'mealto');
        if (!preg_match($time, $from) || !preg_match($time, $to) || strcmp($from, $to) >= 0) {
            return self::MEAL_HOURS;
        }
        return ['from' => $from, 'to' => $to];
    }

    /**
     * How many videos each screen shows a day, in turn: the more there are, the more they share the days out; those with
     * days of their own come on their days besides. 0, all of them every day. Each centre sets it in «Tu centro».
     *
     * @return int
     */
    public static function videos_per_day(): int {
        $value = get_config('local_oksigeniahechauka', 'videosperday');
        if ($value === false || $value === '' || !is_numeric($value)) {
            return self::VIDEOS_PER_DAY;
        }
        return max(0, min(self::VIDEOS_MOST, (int) $value));
    }

    /**
     * Whether Oksigenia Meals is on the site.
     *
     * @return bool
     */
    public static function has_meals(): bool {
        return class_exists('\local_oksigeniameals\api') && method_exists('\local_oksigeniameals\api', 'menu_for_day');
    }

    /**
     * The menus of the coming days, from Oksigenia Meals: each day's menu until the day ends, then tomorrow's.
     *
     * @param int $now
     * @param int $days how many days ahead
     * @param int|null $centreid the canteen; null for the first of the site
     * @return array items of the contract
     */
    public static function menus(int $now, int $days, ?int $centreid): array {
        if (!self::has_meals()) {
            return [];
        }
        $items = [];
        $switch = self::day_end();
        $label = get_string('label_menu', 'local_oksigeniahechauka');
        $tomorrow = get_string('label_menu_tomorrow', 'local_oksigeniahechauka');
        for ($i = 0; $i <= $days; $i++) {
            $day = schedule::day($now, $i);
            $noon = (new \DateTime($day . ' 12:00', \core_date::get_server_timezone_object()))->getTimestamp();
            $menu = self::menu($noon, $centreid);
            if ($menu) {
                $items[] = $menu + [
                    'id' => 'menu-' . $day,
                    'label' => $label,
                    'when' => ['from' => $day, 'until' => $day, 'times' => [['00:00', $switch]]],
                ];
                if ($i > 0) {
                    $before = schedule::day($now, $i - 1);
                    $items[] = $menu + [
                        'id' => 'menu-' . $day . '-eve',
                        'label' => $tomorrow,
                        'when' => ['from' => $before, 'until' => $before, 'times' => [[$switch, '00:00']]],
                    ];
                }
            }
        }
        return $items;
    }

    /**
     * One day's menu as an item of the contract, or null when there is nothing to show.
     *
     * @param int $time any moment of the day
     * @param int|null $centreid
     * @return array|null
     */
    protected static function menu(int $time, ?int $centreid): ?array {
        try {
            $data = \local_oksigeniameals\api::menu_for_day($time, $centreid);
        } catch (\Throwable $e) {
            debugging('Hechauka: the menu of Meals failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return null;
        }
        if (!$data) {
            return null;
        }
        $item = ['type' => 'menu', 'zone' => 'side', 'date' => $data['day']];
        if (!empty($data['closed'])) {
            $item['closed'] = true;
            $item['title'] = items::plain((string) ($data['title'] ?? ''));
            return $item;
        }
        if (empty($data['served'])) {
            return null;
        }
        // The drawing of each dish, with the dictionary of Meals itself (its pix/food), for the canteen's door: by its API
        // where it has it, else by the class it had before.
        $drawing = null;
        foreach ([['\local_oksigeniameals\api', 'dish_drawing'], ['\local_oksigeniameals\local\food', 'of']] as $call) {
            if (method_exists($call[0], $call[1])) {
                $drawing = function (string $dish) use ($call): string {
                    try {
                        return (string) call_user_func($call, $dish);
                    } catch (\Throwable $e) {
                        return '';
                    }
                };
                break;
            }
        }
        return self::menu_of($item, $data, (bool) get_config('local_oksigeniahechauka', 'menuallergens'), $drawing);
    }

    /**
     * The menus of a day as the screens show them, from what Meals gives: every menu but those of a diet, which are for
     * whoever needs them (Meals says so with «diet»; before it did, a menu not chosen was taken for one, which also left out
     * those given without choosing, as a nursery's). Its words as plain text. Pure, but for the drawing.
     *
     * @param array $item the item so far: type, zone, date
     * @param array $data what Meals gives for the day
     * @param bool $allergens whether the allergens go
     * @param callable|null $drawing the drawing of a dish, or null
     * @return array|null the item, or null when there is no menu to show
     */
    public static function menu_of(array $item, array $data, bool $allergens, ?callable $drawing): ?array {
        $menus = [];
        $names = [];
        foreach ($data['meals'] ?? [] as $meal) {
            foreach ($meal['menus'] ?? [] as $menu) {
                $diet = array_key_exists('diet', $menu) ? !empty($menu['diet']) : (isset($menu['chosen']) && !$menu['chosen']);
                if ($diet) {
                    continue;
                }
                $courses = [];
                foreach ($menu['dishes'] ?? [] as $dish) {
                    $part = items::plain((string) ($dish['part'] ?? ''));
                    $name = items::plain((string) ($dish['name'] ?? ''));
                    if (!isset($courses[$part])) {
                        $courses[$part] = ['label' => $part, 'dishes' => []];
                    }
                    $courses[$part]['dishes'][] = $name;
                    if ($drawing) {
                        // One per dish, in its order; '' when the dish has none.
                        $courses[$part]['icons'][] = (string) $drawing($name);
                    }
                    if ($allergens) {
                        // One list per dish, in its order. An empty one says nothing about the dish, never that it has none.
                        $codes = [];
                        foreach ($dish['allergens'] ?? [] as $allergen) {
                            $codes[] = (string) $allergen['code'];
                            $names[$allergen['code']] = items::plain((string) $allergen['name']);
                        }
                        $courses[$part]['allergens'][] = self::allergens_shown($codes);
                    }
                }
                if ($courses) {
                    $menus[] = ['name' => items::plain((string) ($menu['name'] ?? '')), 'courses' => array_values($courses)];
                }
            }
        }
        if (!$menus) {
            return null;
        }
        $item['menus'] = $menus;
        if ($names) {
            $item['allergennames'] = $names;
        }
        return $item;
    }

    /**
     * A dish's allergens as a screen says them: the marks some diets leave out (meat, and which meat) after the allergens, and
     * meat only when which one it is does not say it already, as Meals does in its own pages.
     *
     * @param string[] $codes
     * @return string[]
     */
    public static function allergens_shown(array $codes): array {
        $marks = array_values(array_intersect(self::MEATS, $codes)) ?: array_values(array_intersect(['meat'], $codes));
        return array_merge(array_values(array_diff($codes, self::MEATS, ['meat'])), $marks);
    }

    /**
     * What falls due in the courses in the coming days, grouped by day: only what is for everyone in a visible course, and, if the
     * centre has linked course categories, only from those.
     *
     * @param int $now
     * @param int $days how far ahead
     * @param int[] $scope the course categories of the screen; empty, all of the site
     * @return array items of the contract
     */
    public static function deadlines(int $now, int $days, array $scope = []): array {
        global $DB;
        $c = 'local_oksigeniahechauka';
        $from = $now;
        $until = usergetmidnight($now, \core_date::get_server_timezone()) + ($days + 1) * DAYSECS;
        // The moment that matters of each kind; an exception made for a group or a person has a priority, and is not for a screen.
        $records = $DB->get_records_sql(
            "SELECT e.id, e.modulename, e.instance, e.timestart, c.fullname, c.category
               FROM {event} e
               JOIN {course} c ON c.id = e.courseid
              WHERE ((e.modulename = 'assign' AND e.eventtype = 'due')
                     OR (e.modulename = 'quiz' AND e.eventtype = 'close')
                     OR (e.modulename = 'workshop' AND e.eventtype = 'closesubmission'))
                AND e.visible = 1 AND c.visible = 1 AND e.groupid = 0 AND e.priority IS NULL
                AND e.timestart >= :from AND e.timestart < :until
           ORDER BY e.timestart, e.id",
            ['from' => $from, 'until' => $until],
            0,
            self::DEADLINES_MOST
        );
        $linked = array_filter(array_column(categories::all(), 'coursecat'));
        $system = ['context' => \context_system::instance()];
        $byday = [];
        foreach ($records as $record) {
            $colour = categories::of_coursecat((int) $record->category);
            // A screen linked to a category shows what is under it; otherwise, what the centre has linked, if it has.
            if ($scope ? !in_array((int) $record->category, $scope, true) : ($linked && !$colour)) {
                continue;
            }
            $name = $DB->get_field($record->modulename, 'name', ['id' => $record->instance]);
            if ($name === false) {
                continue;
            }
            $one = ['course' => items::plain(format_string($record->fullname, true, $system)),
                'activity' => items::plain(format_string($name, true, $system)),
                'kind' => $record->modulename === 'quiz' ? 'quiz' : 'due',
                'time' => userdate((int) $record->timestart, '%H:%M', \core_date::get_server_timezone())];
            if ($colour) {
                $one['color'] = $colour;
            }
            $byday[schedule::day((int) $record->timestart)][] = $one;
        }
        if (!$byday) {
            return [];
        }
        $list = [];
        foreach ($byday as $date => $entries) {
            $list[] = ['date' => $date, 'items' => $entries];
        }
        return [['id' => 'deadlines-' . schedule::day($now), 'type' => 'deadlines', 'zone' => 'extra',
            'label' => get_string('label_deadlines', $c), 'words' => ['due' => get_string('label_deadline_due', $c),
                'quiz' => get_string('label_deadline_quiz', $c)], 'days' => $list]];
    }

    /**
     * Whether the site has a public channel of its own to follow (Oksigenia Marandu, with a public Telegram channel): the
     * source is offered only then.
     *
     * @return bool
     */
    public static function has_channel(): bool {
        return (bool) self::the_channel();
    }

    /**
     * The organisation's public channel, as Marandu gives it; null without Marandu, without a channel or with a private one.
     *
     * @return array|null {url, title, members}
     */
    protected static function the_channel(): ?array {
        $api = '\\local_oksigeniamarandu\\api';
        if (!class_exists($api) || !method_exists($api, 'channel')) {
            return null;
        }
        try {
            $channel = $api::channel();
        } catch (\Throwable $e) {
            debugging('Hechauka: the channel of Marandu failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return null;
        }
        $url = is_array($channel) ? (string) ($channel['url'] ?? '') : '';
        return preg_match('#^https://#', $url) ? $channel : null;
    }

    /**
     * «Follow us»: the organisation's public channel, with its QR, as an item of the contract. The address says it comes from
     * the screens, so the shortener counts who arrives from them.
     *
     * @return array items of the contract
     */
    public static function channel(): array {
        $channel = self::the_channel();
        if (!$channel) {
            return [];
        }
        $c = 'local_oksigeniahechauka';
        $url = (string) $channel['url'];
        $url .= (strpos($url, '?') === false ? '?' : '&') . 'utm_source=pantallas';
        $network = preg_match('#^https://(t\.me|telegram\.me)/#i', (string) $channel['url']) ? 'telegram' : 'other';
        $item = ['id' => 'channel', 'type' => 'channel', 'zone' => 'extra', 'network' => $network,
            'title' => get_string($network === 'telegram' ? 'label_channel_telegram' : 'label_channel', $c),
            'text' => get_string('label_channel_text', $c),
            'name' => items::plain((string) ($channel['title'] ?? '')),
            'web' => $url];
        if (isset($channel['members']) && is_numeric($channel['members']) && (int) $channel['members'] > 0) {
            $item['members'] = (int) $channel['members'];
        }
        return [$item];
    }

    /**
     * Whether the site has the library's function.
     *
     * @return bool
     */
    public static function has_books(): bool {
        return class_exists('\\local_oksigeniaayvurenda\\api') && method_exists('\\local_oksigeniaayvurenda\\api', 'new_books');
    }

    /**
     * The library's centre of a screen, on a site with several centres (a course category each): the one of the first of
     * its categories that belongs to one. Null on a site of one centre, or for a screen with no category, which Oksigenia
     * Ayvurenda takes as the site's only centre.
     *
     * @param int[] $scope the course categories of the screen (screens::scope)
     * @return int|null
     */
    public static function library_centre(array $scope): ?int {
        if (!$scope || !method_exists('\\local_oksigeniaayvurenda\\api', 'centre_of_category')) {
            return null;
        }
        foreach ($scope as $category) {
            $centre = \local_oksigeniaayvurenda\api::centre_of_category((int) $category);
            if ($centre) {
                return (int) $centre;
            }
        }
        return null;
    }

    /**
     * What has come to the library lately, as an item of the contract. The library is not needed: nothing, if it is not there.
     *
     * @param int $now
     * @param int $days how far back
     * @param int[] $scope the course categories of the screen: on a site of several centres, only its centre's libraries
     * @return array items of the contract
     */
    public static function books(int $now, int $days, array $scope = []): array {
        if (!self::has_books()) {
            return [];
        }
        try {
            $list = \local_oksigeniaayvurenda\api::new_books($now - $days * DAYSECS, self::BOOKS_MOST, self::library_centre($scope));
        } catch (\Throwable $e) {
            debugging('Hechauka: the books of Ayvurenda failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return [];
        }
        $books = [];
        $places = self::book_places(array_map(function ($book) {
            return items::plain((string) $book['library']);
        }, $list));
        foreach ($list as $key => $book) {
            $one = ['title' => items::plain((string) $book['title']),
                'authors' => array_map([items::class, 'plain'], $book['authors']),
                'colour' => ['bg' => $book['colour']['background'], 'ink' => $book['colour']['ink']],
                'web' => (string) $book['url']];
            if ($places[$key] !== '') {
                $one['library'] = $places[$key];
            }
            if ((string) $book['subtitle'] !== '') {
                $one['subtitle'] = items::plain((string) $book['subtitle']);
            }
            if ($book['cover']) {
                $one['cover'] = files::media($book['cover']);
            }
            $books[] = $one;
        }
        if (!$books) {
            return [];
        }
        return [['id' => 'books-' . schedule::day($now), 'type' => 'books', 'zone' => 'extra',
            'label' => get_string('label_books', 'local_oksigeniahechauka'), 'books' => $books]];
    }

    /**
     * Whether the site's library tells what there is to celebrate this week.
     *
     * @return bool
     */
    public static function has_moments(): bool {
        return class_exists('\\local_oksigeniaayvurenda\\api') && method_exists('\\local_oksigeniaayvurenda\\api', 'moments');
    }

    /**
     * What the library celebrates this week, as its readers hear it and without names (Ayvurenda's own words: a round
     * number of loans, a book that reached its hundredth loan, the busiest day, readers at the goal of a challenge), as an
     * item of the contract. Nothing, if the library is not there or has nothing to tell.
     *
     * @param int $now
     * @param int[] $scope the course categories of the screen: on a site of several centres, only its centre's
     * @return array items of the contract
     */
    public static function moments(int $now, array $scope = []): array {
        if (!self::has_moments()) {
            return [];
        }
        try {
            $list = \local_oksigeniaayvurenda\api::moments(self::library_centre($scope), $now);
        } catch (\Throwable $e) {
            debugging('Hechauka: the moments of Ayvurenda failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return [];
        }
        $list = array_values(array_filter($list, function ($moment) {
            return trim((string) ($moment['text'] ?? '')) !== '';
        }));
        $list = array_slice($list, 0, self::MOMENTS_MOST);
        if (!$list) {
            return [];
        }
        $places = self::book_places(array_map(function ($moment) {
            return items::plain((string) ($moment['library'] ?? ''));
        }, $list));
        $moments = [];
        foreach ($list as $key => $moment) {
            $one = ['kind' => (string) ($moment['kind'] ?? ''), 'text' => items::plain((string) $moment['text'])];
            if ($places[$key] !== '') {
                $one['library'] = $places[$key];
            }
            if (($moment['cover'] ?? null) instanceof \stored_file) {
                $one['cover'] = files::media($moment['cover']);
            }
            $moments[] = $one;
        }
        return [['id' => 'moments-' . schedule::day($now), 'type' => 'moments', 'zone' => 'extra',
            'label' => get_string('label_moments', 'local_oksigeniahechauka'), 'moments' => $moments]];
    }

    /**
     * Whether the site's admissions tell their open acts: open days, talks and festivals with open sign-up.
     *
     * @return bool
     */
    public static function has_open_acts(): bool {
        return class_exists('\\local_oksigeniaeguahe\\api') && method_exists('\\local_oksigeniaeguahe\\api', 'open_acts');
    }

    /**
     * The open acts of the site's admissions (Eguahe), under way and coming, as an item of the contract: the days before,
     * the address to sign up, when the centre gives it; the day, the guide of the centre with its greeting, the turns and
     * how many families have come (a number, never who). Nothing, if the admissions are not there or have nothing open.
     *
     * @param int $now
     * @return array items of the contract
     */
    public static function open_acts(int $now): array {
        if (!self::has_open_acts()) {
            return [];
        }
        try {
            $list = \local_oksigeniaeguahe\api::open_acts(null, $now);
        } catch (\Throwable $e) {
            debugging('Hechauka: the open acts of Eguahe failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return [];
        }
        $acts = self::acts($list);
        if (!$acts) {
            return [];
        }
        return [['id' => 'openacts-' . schedule::day($now), 'type' => 'openacts', 'zone' => 'extra',
            'label' => get_string('label_openacts', 'local_oksigeniahechauka'), 'acts' => $acts]];
    }

    /**
     * The open acts as the contract has them, from what the admissions give: the nearest first, those with a name and
     * their hours, the centre only when they come from more than one. An act open to the community (a talk, a festival)
     * may come without an address: nobody signs up to it. Pure but for the guide's picture.
     *
     * @param array[] $list what \local_oksigeniaeguahe\api::open_acts() gives
     * @return array[] the acts of the item
     */
    public static function acts(array $list): array {
        $list = array_values(array_filter($list, function ($act) {
            return trim((string) ($act['name'] ?? '')) !== ''
                && (int) ($act['timeend'] ?? 0) > (int) ($act['timestart'] ?? 0);
        }));
        usort($list, function ($a, $b) {
            return [(int) $a['timestart'], (int) ($a['id'] ?? 0)] <=> [(int) $b['timestart'], (int) ($b['id'] ?? 0)];
        });
        $list = array_slice($list, 0, self::ACTS_MOST);
        $centres = count(array_unique(array_map(function ($act) {
            return (int) ($act['centreid'] ?? 0);
        }, $list)));
        $acts = [];
        foreach ($list as $act) {
            $one = ['id' => (int) ($act['id'] ?? 0), 'kind' => ($act['kind'] ?? '') === 'openday' ? 'openday' : 'other',
                'name' => items::plain((string) $act['name']), 'timestart' => (int) $act['timestart'],
                'timeend' => (int) $act['timeend'], 'today' => !empty($act['today'])];
            if (preg_match('~^https?://\S+$~i', (string) ($act['url'] ?? ''))) {
                $one['web'] = (string) $act['url'];
            }
            $place = items::plain((string) ($act['place'] ?? ''));
            if ($place !== '') {
                $one['place'] = $place;
            }
            $one['turns'] = array_values(array_map(function ($turn) {
                return ['timestart' => (int) $turn['timestart'], 'timeend' => (int) $turn['timeend'],
                    'full' => !empty($turn['full'])];
            }, array_filter((array) ($act['turns'] ?? []), function ($turn) {
                return (int) ($turn['timeend'] ?? 0) > (int) ($turn['timestart'] ?? 0);
            })));
            $one['capacity'] = max(0, (int) ($act['capacity'] ?? 0));
            $one['signed'] = max(0, (int) ($act['signed'] ?? 0));
            if ($one['today'] && isset($act['came'])) {
                $one['came'] = max(0, (int) $act['came']);
            }
            $guide = is_array($act['guide'] ?? null) ? $act['guide'] : null;
            $file = $guide ? self::guide_file($guide) : null;
            if ($file) {
                $one['guide'] = ['img' => files::media($file), 'hello' => items::plain((string) ($guide['hello'] ?? ''))];
            }
            if ($centres > 1) {
                $one['centre'] = items::plain((string) ($act['centre'] ?? ''));
            }
            $acts[] = $one;
        }
        return $acts;
    }

    /**
     * The picture of a centre's guide, kept among the screens' own files: a screen draws only what it has downloaded with
     * its key, never an address of the server. From the file the admissions give (`file`, `path`) or, failing that, from
     * the address of their picture, as long as it is one of theirs on this server.
     *
     * @param array $guide the guide of an act: img, hello, and maybe path or file
     * @return \stored_file|null
     */
    public static function guide_file(array $guide): ?\stored_file {
        global $CFG;
        $fs = get_file_storage();
        $source = ($guide['file'] ?? null) instanceof \stored_file ? $guide['file'] : null;
        $path = null;
        if (!$source) {
            $path = (string) ($guide['path'] ?? '');
            $img = strtok((string) ($guide['img'] ?? ''), '?#');
            $home = $CFG->wwwroot . '/local/oksigeniaeguahe/';
            if ($path === '' && is_string($img) && str_starts_with($img, $home)) {
                $path = $CFG->dirroot . '/local/oksigeniaeguahe/' . rawurldecode(substr($img, strlen($home)));
            }
            $real = $path !== '' ? realpath($path) : false;
            $root = realpath($CFG->dirroot . '/local/oksigeniaeguahe');
            $inside = $real && $root && str_starts_with($real, $root . DIRECTORY_SEPARATOR) && is_file($real);
            if (!$inside || !preg_match('~\.(webp|png|jpe?g)$~i', $real)) {
                return null;
            }
            $path = $real;
        }
        $name = clean_param($source ? $source->get_filename() : basename($path), PARAM_FILE);
        $hash = $source ? $source->get_contenthash() : sha1_file($path);
        if ($name === '' || !$hash) {
            return null;
        }
        $record = ['contextid' => files::context()->id, 'component' => files::COMPONENT, 'filearea' => files::GUIDE,
            'itemid' => 0, 'filepath' => '/', 'filename' => $name];
        $kept = $fs->get_file($record['contextid'], $record['component'], $record['filearea'], 0, '/', $name);
        if ($kept && $kept->get_contenthash() === $hash) {
            return $kept;
        }
        if ($kept) {
            $kept->delete();
        }
        try {
            return $source ? $fs->create_file_from_storedfile($record, $source) : $fs->create_file_from_pathname($record, $path);
        } catch (\Throwable $e) {
            debugging('Hechauka: the picture of a guide could not be kept: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return null;
        }
    }

    /**
     * Where each book is, as the shelf says it: nothing when they are all in the same library, where the name under a book
     * would read as a second author; with several, «Library …», so that it reads as a place.
     *
     * @param string[] $libraries the library of each book
     * @return string[] what to show of each, with the same keys; '' for nothing
     */
    public static function book_places(array $libraries): array {
        $names = array_map('trim', array_map('strval', $libraries));
        if (count(array_unique(array_filter($names, 'strlen'))) <= 1) {
            return array_fill_keys(array_keys($names), '');
        }
        // The word of the language («Biblioteca», «Library»): a name that already has it is left as it is.
        $word = \core_text::strtolower(trim(get_string('books_library', 'local_oksigeniahechauka', '')));
        $out = [];
        foreach ($names as $key => $name) {
            $has = $name === '' || ($word !== '' && str_contains(\core_text::strtolower($name), $word));
            $out[$key] = $has ? $name : get_string('books_library', 'local_oksigeniahechauka', $name);
        }
        return $out;
    }

    /**
     * The events of the site calendar in the coming days.
     *
     * @param int $now
     * @param int $days
     * @param int[] $scope the course categories of the screen, whose events and those of their courses it shows too
     * @return array items of the contract
     */
    public static function events(int $now, int $days, array $scope = []): array {
        global $DB;
        $from = usergetmidnight($now, \core_date::get_server_timezone());
        $until = $from + ($days + 1) * DAYSECS;
        $courses = $scope ? $DB->get_fieldset_select(
            'course',
            'id',
            'visible = 1 AND category IN (' . implode(',', array_map('intval', $scope)) . ')'
        ) : [];
        $own = $courses ? " OR (eventtype = 'course' AND courseid IN (" . implode(',', array_map('intval', $courses)) . '))' : '';
        $records = $DB->get_records_select(
            'event',
            "(eventtype = 'site' OR eventtype = 'category'$own) AND visible = 1 AND timestart < :until
             AND timestart + timeduration >= :from",
            ['from' => $from, 'until' => $until],
            'timestart',
            'id, name, location, timestart, timeduration, eventtype, categoryid, courseid',
            0,
            200
        );
        $items = [];
        $zone = \core_date::get_server_timezone();
        // The category of each course and the stage of each category, read once for all the events.
        $courseids = array_unique(array_map(function ($ev) {
            return (int) $ev->courseid;
        }, array_filter($records, function ($ev) {
            return $ev->eventtype === 'course';
        })));
        $coursecat = $courseids ? $DB->get_records_list('course', 'id', $courseids, '', 'id, category') : [];
        $stages = [];
        $stage = function (int $category) use (&$stages) {
            if (!array_key_exists($category, $stages)) {
                $stages[$category] = categories::of_coursecat($category);
            }
            return $stages[$category];
        };
        foreach ($records as $ev) {
            $start = (int) $ev->timestart;
            $end = $start + (int) $ev->timeduration;
            // A whole day, the way a calendar subscription leaves it: from midnight, lasting nothing or up to another
            // midnight. It lasts until the end of its last day.
            $allday = usergetmidnight($start, $zone) === $start
                && ($ev->timeduration == 0 || usergetmidnight($end, $zone) === $end);
            $last = $allday && $ev->timeduration > 0 ? $end - 60 : $end;
            $item = [
                'id' => 'event-' . $ev->id,
                'type' => 'event',
                'zone' => 'side',
                'title' => self::line($ev->name, 80),
                'start' => schedule::stamp($start),
                'when' => ['from' => schedule::day($start), 'until' => schedule::day($last)],
            ];
            if ($allday) {
                $item['allday'] = true;
            }
            if ($ev->eventtype === 'course') {
                $n = $stage((int) ($coursecat[(int) $ev->courseid]->category ?? 0));
                if ($n) {
                    $item['color'] = $n;
                }
            } else if ($ev->eventtype === 'category') {
                // An event of a course category: of the categories of this screen or, if it has none, only when the centre has
                // linked that category, in its colour.
                $n = $stage((int) $ev->categoryid);
                if ($scope ? !in_array((int) $ev->categoryid, $scope, true) : !$n) {
                    continue;
                }
                $item['color'] = $n;
            }
            if ($ev->timeduration > 0) {
                $item['end'] = schedule::stamp($last);
            }
            if (trim((string) $ev->location) !== '') {
                $item['detail'] = self::line($ev->location, 60);
            }
            $items[] = $item;
        }
        return $items;
    }

    /**
     * The recent news of the site, as notices.
     *
     * @param int $now
     * @param int $days how long a piece of news stays
     * @return array items of the contract
     */
    public static function news(int $now, int $days): array {
        global $DB;
        $forum = $DB->get_record('forum', ['course' => SITEID, 'type' => 'news'], 'id', IGNORE_MULTIPLE);
        if (!$forum) {
            return [];
        }
        $sql = "SELECT d.id, d.name, d.timemodified, p.message, p.messageformat
                  FROM {forum_discussions} d
                  JOIN {forum_posts} p ON p.id = d.firstpost
                 WHERE d.forum = :forum AND d.timemodified >= :since
                       AND (d.timestart = 0 OR d.timestart <= :now1) AND (d.timeend = 0 OR d.timeend > :now2)
              ORDER BY d.timemodified DESC";
        $records = $DB->get_records_sql($sql, ['forum' => $forum->id, 'since' => $now - $days * DAYSECS,
            'now1' => $now, 'now2' => $now], 0, 10);
        $items = [];
        $order = 1000;
        foreach ($records as $d) {
            $items[] = [
                'id' => 'news-' . $d->id,
                'type' => 'notice',
                'zone' => 'side',
                'order' => $order++,
                'title' => self::line($d->name, 70),
                'body' => self::line(html_to_text((string) $d->message, 0, false), 90),
                'when' => ['until' => schedule::day((int) $d->timemodified, $days)],
            ];
        }
        return $items;
    }

    /**
     * One clean line of a text, cut at a word if it is long.
     *
     * @param string $text
     * @param int $max characters
     * @return string
     */
    public static function line(string $text, int $max): string {
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($text)));
        if (\core_text::strlen($text) <= $max) {
            return $text;
        }
        $cut = \core_text::substr($text, 0, $max);
        $space = \core_text::strrpos($cut, ' ');
        return rtrim($space > $max * 0.6 ? \core_text::substr($cut, 0, $space) : $cut, ' ,.;:') . '…';
    }
}
