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
    /** @var string The library's plugin. */
    const BOOKS = 'local_oksigeniaayvurenda';

    /** @var int The most books a screen gets. */
    const BOOKS_MOST = 12;

    /** @var int The most of the library's moments a screen gets: what is worth telling this week, not a report. */
    const MOMENTS_MOST = 4;

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
            $item['title'] = (string) ($data['title'] ?? '');
            return $item;
        }
        if (empty($data['served'])) {
            return null;
        }
        $menus = [];
        $names = [];
        $allergens = (bool) get_config('local_oksigeniahechauka', 'menuallergens');
        foreach ($data['meals'] ?? [] as $meal) {
            foreach ($meal['menus'] ?? [] as $menu) {
                if (isset($menu['chosen']) && !$menu['chosen']) {
                    // A menu of a diet: it is for whoever needs it, not for the screens.
                    continue;
                }
                $courses = [];
                foreach ($menu['dishes'] ?? [] as $dish) {
                    $part = (string) ($dish['part'] ?? '');
                    if (!isset($courses[$part])) {
                        $courses[$part] = ['label' => $part, 'dishes' => []];
                    }
                    $courses[$part]['dishes'][] = (string) ($dish['name'] ?? '');
                    if ($allergens) {
                        // One list per dish, in its order. An empty one says nothing about the dish, never that it has none.
                        $codes = [];
                        foreach ($dish['allergens'] ?? [] as $allergen) {
                            $codes[] = (string) $allergen['code'];
                            $names[$allergen['code']] = (string) $allergen['name'];
                        }
                        $courses[$part]['allergens'][] = $codes;
                    }
                }
                if ($courses) {
                    $menus[] = ['name' => (string) ($menu['name'] ?? ''), 'courses' => array_values($courses)];
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
     * What has come to the library lately, as an item of the contract. The library is not needed: nothing, if it is not there.
     *
     * @param int $now
     * @param int $days how far back
     * @return array items of the contract
     */
    public static function books(int $now, int $days): array {
        if (!self::has_books()) {
            return [];
        }
        try {
            $list = \local_oksigeniaayvurenda\api::new_books($now - $days * DAYSECS, self::BOOKS_MOST);
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
     * @return array items of the contract
     */
    public static function moments(int $now): array {
        if (!self::has_moments()) {
            return [];
        }
        try {
            $list = \local_oksigeniaayvurenda\api::moments(null, $now);
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
                $n = categories::of_coursecat((int) $DB->get_field('course', 'category', ['id' => $ev->courseid]));
                if ($n) {
                    $item['color'] = $n;
                }
            } else if ($ev->eventtype === 'category') {
                // An event of a course category: of the categories of this screen or, if it has none, only when the centre has
                // linked that category, in its colour.
                $n = categories::of_coursecat((int) $ev->categoryid);
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
