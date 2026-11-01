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
 * The categories of each centre, to colour its events: what each institution calls its parts (the stages of a school,
 * the faculties of a university, the areas of an academy), each with its colour and the words that mark it in a title
 * or in «for whom». None by default; they can be brought from Moodle's top course categories, each linked to its own,
 * so the events of that course category reach the screens in its colour.
 *
 * Stored in the setting «categories» as a list: id (stable, what an item keeps), name, colour, words, coursecat (the
 * linked Moodle course category, or 0). On the screens a category is its position, 1 to 6.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class categories {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /** @var int How many a centre can have (the screens keep six colours apart). */
    const MAX = 6;

    /** @var string[] The colours a new category takes, one after another; any can be changed. */
    const PALETTE = ['#1f5f8b', '#2f8a55', '#c9842a', '#b23a48', '#6b4fa0', '#1b8a8f'];

    /**
     * The centre's categories, in order.
     *
     * @return array [{id, name, colour, words: string[], coursecat}]
     */
    public static function all(): array {
        $list = json_decode((string) get_config(self::C, 'categories'), true);
        $out = [];
        foreach (is_array($list) ? $list : [] as $i => $cat) {
            if (!is_array($cat) || trim((string) ($cat['name'] ?? '')) === '' || count($out) >= self::MAX) {
                continue;
            }
            $out[] = [
                'id' => preg_match('/^[a-z0-9]{1,16}$/', (string) ($cat['id'] ?? '')) ? $cat['id'] : 'c' . ($i + 1),
                'name' => trim((string) $cat['name']),
                'colour' => colours::valid($cat['colour'] ?? '') ? strtolower($cat['colour']) : self::PALETTE[count($out)],
                'words' => self::words(implode(',', (array) ($cat['words'] ?? []))),
                'coursecat' => (int) ($cat['coursecat'] ?? 0),
            ];
        }
        return $out;
    }

    /**
     * The words of a category from what one writes: «Inf, Infantil» → [inf, infantil].
     *
     * @param string $text
     * @return string[]
     */
    public static function words(string $text): array {
        $out = [];
        foreach (preg_split('/[,;\n]+/', $text) as $word) {
            $word = \core_text::strtolower(trim($word));
            if ($word !== '' && !in_array($word, $out) && count($out) < 12) {
                $out[] = \core_text::substr($word, 0, 40);
            }
        }
        return $out;
    }

    /**
     * Saves the centre's categories.
     *
     * @param array $list [{id, name, colour, words, coursecat}]
     * @return void
     */
    public static function save(array $list): void {
        $clean = [];
        foreach ($list as $cat) {
            $name = trim((string) ($cat['name'] ?? ''));
            if ($name === '' || count($clean) >= self::MAX) {
                continue;
            }
            $words = is_array($cat['words'] ?? null) ? $cat['words'] : self::words((string) ($cat['words'] ?? ''));
            $clean[] = [
                'id' => preg_match('/^[a-z0-9]{1,16}$/', (string) ($cat['id'] ?? '')) ? $cat['id'] : self::new_id(),
                'name' => \core_text::substr($name, 0, 60),
                'colour' => colours::valid($cat['colour'] ?? '') ? strtolower($cat['colour']) : self::PALETTE[count($clean)],
                'words' => $words ?: self::words($name),
                'coursecat' => (int) ($cat['coursecat'] ?? 0),
            ];
        }
        set_config('categories', json_encode($clean), self::C);
    }

    /**
     * A new stable id.
     *
     * @return string
     */
    public static function new_id(): string {
        return 'c' . substr(md5(uniqid('', true)), 0, 8);
    }

    /**
     * The top course categories of the site, as categories of the screens: their name, a colour of the palette, their
     * name as the word that marks them, and the link to them.
     *
     * @return array
     */
    public static function from_moodle(): array {
        global $DB;
        $out = [];
        foreach ($DB->get_records('course_categories', ['parent' => 0], 'sortorder', 'id, name', 0, self::MAX) as $cat) {
            $name = format_string($cat->name, true, ['context' => \context_coursecat::instance($cat->id)]);
            $out[] = ['id' => self::new_id(), 'name' => $name, 'colour' => self::PALETTE[count($out)],
                'words' => self::words($name), 'coursecat' => (int) $cat->id];
        }
        return $out;
    }

    /**
     * The position (1 to 6) of a category by its id, or 0.
     *
     * @param string $id
     * @return int
     */
    public static function position(string $id): int {
        foreach (self::all() as $i => $cat) {
            if ($cat['id'] === $id) {
                return $i + 1;
            }
        }
        return 0;
    }

    /**
     * The position of the category linked to a Moodle course category, or to the top category above it; 0 if none.
     *
     * @param int $coursecat
     * @return int
     */
    public static function of_coursecat(int $coursecat): int {
        global $DB;
        $path = (string) $DB->get_field('course_categories', 'path', ['id' => $coursecat]);
        $ids = array_map('intval', array_filter(explode('/', $path)));
        foreach (self::all() as $i => $cat) {
            if ($cat['coursecat'] && in_array($cat['coursecat'], $ids)) {
                return $i + 1;
            }
        }
        return 0;
    }

    /**
     * What the screens need: each category's position, name and words (its colour goes with the theme).
     *
     * @return array
     */
    public static function contract(): array {
        $out = [];
        foreach (self::all() as $i => $cat) {
            $out[] = ['n' => $i + 1, 'name' => $cat['name'], 'words' => $cat['words']];
        }
        return $out;
    }

    /**
     * The colour of each category, by position, for the theme of the screens and the panel.
     *
     * @return array position => «#rrggbb»
     */
    public static function colours(): array {
        $out = [];
        foreach (self::all() as $i => $cat) {
            $out[$i + 1] = $cat['colour'];
        }
        return $out;
    }

    /**
     * Lower case, without accents, split in words: how the screens compare words (categoryOf in player/src/agenda.js).
     *
     * @param string $text
     * @return string[]
     */
    protected static function tokens(string $text): array {
        $plain = \core_text::strtolower(\core_text::specialtoascii($text));
        return array_values(array_filter(preg_split('/[^a-z0-9ñ]+/u', $plain), 'strlen'));
    }

    /**
     * The category the words of a text mark, as the screens decide it: a word that starts a word of the text, or a phrase
     * of several words found whole; the closest wins (a whole word over a beginning, a longer beginning over a shorter
     * one), then the first; 0 if none.
     *
     * @param string $text
     * @param array|null $all the categories, or null for the centre's
     * @return int
     */
    public static function of_text(string $text, ?array $all = null): int {
        $tokens = self::tokens($text);
        if (!$tokens) {
            return 0;
        }
        $joined = ' ' . implode(' ', $tokens) . ' ';
        $best = 0;
        $found = 0;
        foreach (($all ?? self::all()) as $i => $cat) {
            foreach ($cat['words'] as $word) {
                $w = implode(' ', self::tokens($word));
                if ($w === '') {
                    continue;
                }
                $score = 0;
                if (strpos($w, ' ') !== false) {
                    $score = strpos($joined, ' ' . $w . ' ') !== false ? 1000 + strlen($w) : 0;
                } else if (in_array($w, $tokens, true)) {
                    $score = 1000 + strlen($w);
                } else if (
                    array_filter($tokens, function ($t) use ($w) {
                        return strpos($t, $w) === 0;
                    })
                ) {
                    $score = strlen($w);
                }
                if ($score > $best) {
                    $best = $score;
                    $found = $i + 1;
                }
            }
        }
        return $found;
    }

    /**
     * How many events each category has from today to six days on, as the screens will colour them: those of the
     * agendas, of the site and course categories of the calendar, and those made in the panel.
     *
     * @param int $now
     * @return array position => count
     */
    public static function week_counts(int $now): array {
        global $DB;
        $from = usergetmidnight($now, \core_date::get_server_timezone());
        $until = $from + 7 * DAYSECS;
        $all = self::all();
        $counts = array_fill(1, max(1, count($all)), 0);
        $group = function (string $title, string $detail): string {
            $parts = explode(' - ', $title, 2);
            return count($parts) === 2 ? $parts[0] : $detail;
        };
        $add = function (int $n) use (&$counts) {
            if ($n) {
                $counts[$n] = ($counts[$n] ?? 0) + 1;
            }
        };
        $agendas = [];
        foreach ($DB->get_records('local_oksigeniahechauka_item', ['type' => 'agenda', 'visible' => 1]) as $agenda) {
            $data = items::data($agenda);
            $agendas[$agenda->id] = self::resolve($data['category'] ?? ($data['color'] ?? 0));
        }
        $sql = 'timestart < :until AND timeend >= :from';
        foreach (
            $DB->get_records_select(
                'local_oksigeniahechauka_calevent',
                $sql,
                ['from' => $from, 'until' => $until],
                '',
                'id, itemid, title, detail'
            ) as $ev
        ) {
            if (!array_key_exists($ev->itemid, $agendas)) {
                continue;
            }
            $add($agendas[$ev->itemid] ?: (self::of_text($group($ev->title, (string) $ev->detail), $all) ?:
                self::of_text($ev->title, $all)));
        }
        foreach (
            $DB->get_records_select(
                'event',
                "(eventtype = 'site' OR eventtype = 'category') AND visible = 1
                AND timestart < :until AND timestart + timeduration >= :from",
                ['from' => $from, 'until' => $until],
                '',
                'id, name, location, eventtype, categoryid'
            ) as $ev
        ) {
            $add($ev->eventtype === 'category' ? self::of_coursecat((int) $ev->categoryid) :
                (self::of_text($group((string) $ev->name, (string) $ev->location), $all) ?: self::of_text($ev->name, $all)));
        }
        foreach ($DB->get_records('local_oksigeniahechauka_item', ['type' => 'event', 'visible' => 1]) as $item) {
            $data = items::data($item);
            $start = (int) ($data['start'] ?? 0);
            if ($start < $from || $start >= $until) {
                continue;
            }
            $words = self::of_text($group($item->title, (string) $item->body), $all) ?: self::of_text($item->title, $all);
            $add(self::resolve($data['category'] ?? ($data['color'] ?? 0)) ?: $words);
        }
        return $counts;
    }

    /**
     * The position a stored item colour means: an id of a category, or a number of the old four colours.
     *
     * @param mixed $value
     * @return int
     */
    public static function resolve($value): int {
        if (is_string($value) && !is_numeric($value)) {
            return self::position($value);
        }
        $n = (int) $value;
        return $n >= 1 && $n <= count(self::all()) ? $n : 0;
    }
}
