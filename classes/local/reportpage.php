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
 * What the page of the monthly report shows.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class reportpage {
    /** Lines of each list of what came out. */
    const MOST_LINES = 12;

    /** Cuts in sight; the others, one click away. */
    const CUTS_IN_SIGHT = 5;

    /** Cuts listed. */
    const MOST_CUTS = 100;

    /**
     * Seconds in words: «5 h 12 min».
     *
     * @param int $seconds
     * @return string
     */
    public static function duration(int $seconds): string {
        $c = 'local_oksigeniahechauka';
        $minutes = (int) round($seconds / 60);
        if ($minutes < 1) {
            return get_string('report_min_less', $c);
        }
        if ($minutes < 60) {
            return get_string('report_min', $c, $minutes);
        }
        if ($minutes % 60 === 0) {
            return get_string('report_h', $c, intdiv($minutes, 60));
        }
        return get_string('report_h_min', $c, (object) ['h' => intdiv($minutes, 60), 'min' => $minutes % 60]);
    }

    /**
     * With its capital.
     *
     * @param string $text
     * @return string
     */
    protected static function capital(string $text): string {
        return \core_text::strtoupper(\core_text::substr($text, 0, 1)) . \core_text::substr($text, 1);
    }

    /**
     * The name of a month alone, with its capital: «Septiembre».
     *
     * @param string $month
     * @return string
     */
    protected static function month_alone(string $month): string {
        return self::capital(userdate(report::bounds($month)[0], '%B'));
    }

    /**
     * What the page says first: the month as a whole, and the screen that failed most if one did.
     *
     * @param array $data what report::month() gives
     * @param string $decsep
     * @return array [sentence, what follows]
     */
    protected static function summary(array $data, string $decsep): array {
        $c = 'local_oksigeniahechauka';
        $hours = array_values(array_filter($data['screens'], function ($s) {
            return $s['percent'] !== null;
        }));
        $count = count($hours);
        $percent = report::say_percent($data['percent'], $decsep);
        $first = $count === 1 ? get_string('report_summary_one', $c, $percent) :
            get_string('report_summary_many', $c, (object) ['count' => $count, 'percent' => $percent]);
        $cuts = array_sum(array_map(function ($s) {
            return count($s['cuts']);
        }, $hours));
        $saycuts = function (int $n) use ($c): string {
            return get_string($n === 1 ? 'report_cuts_one' : 'report_cuts_many', $c, $n);
        };
        // Screens come worst first.
        $worst = $hours[0];
        if ($count > 1 && $worst['percent'] < report::NAME_UNDER) {
            $a = (object) ['name' => $worst['name'], 'percent' => report::say_percent($worst['percent'], $decsep),
                'cuts' => $saycuts(count($worst['cuts']))];
            return [$first, get_string($worst['cuts'] ? 'report_worst' : 'report_worst_nocuts', $c, $a)];
        }
        if (!$cuts) {
            return [$first, get_string('report_cuts_empty', $c)];
        }
        return [$first, get_string('report_cuts_total', $c, $saycuts($cuts))];
    }

    /**
     * The first day with anything written down.
     *
     * @return string|null YYYY-MM
     */
    protected static function first_month(): ?string {
        global $DB;
        $day = $DB->get_field_sql('SELECT MIN(day) FROM {' . report::STAT . '}');
        return $day ? substr($day, 0, 7) : null;
    }

    /**
     * What came out, panel items and sources apart.
     *
     * @param array $played key => [times, seconds], most first
     * @return array [own, sources]
     */
    protected static function played(array $played): array {
        global $DB;
        $c = 'local_oksigeniahechauka';
        $ids = [];
        foreach (array_keys($played) as $key) {
            if ($key[0] === 'i') {
                $ids[] = (int) substr($key, 1);
            }
        }
        $records = $ids ? $DB->get_records_list('local_oksigeniahechauka_item', 'id', $ids, '', 'id, type, title') : [];
        $own = [];
        $sources = [];
        foreach ($played as $key => $pair) {
            $line = ['times' => $pair[0] === 1 ? get_string('report_times_one', $c) : get_string('report_times_many', $c, $pair[0]),
                'length' => self::duration((int) $pair[1])];
            if ($key[0] !== 'i') {
                $sources[] = $line + ['title' => get_string('report_source_' . $key, $c)];
                continue;
            }
            $record = $records[(int) substr($key, 1)] ?? null;
            $title = $record ? items::plain((string) $record->title) : '';
            if (!$record) {
                $title = get_string('report_deleted', $c);
            } else if ($title === '') {
                $title = get_string('kind_' . $record->type, $c);
            }
            $own[] = $line + ['title' => $title];
        }
        return [array_slice($own, 0, self::MOST_LINES), array_slice($sources, 0, self::MOST_LINES)];
    }

    /**
     * The template's context.
     *
     * @param string $month YYYY-MM
     * @param int $now
     * @return array
     */
    public static function context(string $month, int $now): array {
        global $DB;
        $c = 'local_oksigeniahechauka';
        $data = report::month($month, $now);
        $decsep = get_string('decsep', 'langconfig');
        $today = schedule::day($now);
        $current = substr($today, 0, 7);
        $base = new \moodle_url('/local/oksigeniahechauka/report.php');
        $screens = [];
        $cuts = [];
        foreach ($data['screens'] as $s) {
            $bars = [];
            $troubled = 0;
            foreach ($s['days'] as $d => $percent) {
                $state = 'none';
                if ($percent !== null) {
                    $state = $percent >= report::FULL_DAY ? 'full' : ($percent >= report::LOW_DAY ? 'some' : 'low');
                    $troubled += $percent < report::FULL_DAY ? 1 : 0;
                }
                $bars[] = ['state' => $state, 'height' => $percent === null ? 0 : max(8, (int) round($percent)),
                    'title' => $d . ': ' . ($percent === null ? get_string('report_day_none', $c) :
                        report::say_percent($percent, $decsep) . ' %')];
            }
            $count = count($s['cuts']);
            $facts = !$count ? get_string('report_cuts_none', $c) :
                get_string($count === 1 ? 'report_cuts_one' : 'report_cuts_many', $c, $count);
            $screens[] = [
                'name' => $s['name'],
                'url' => (new \moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $s['id']]))->out(false),
                'percent' => $s['percent'] === null ? '' : report::say_percent($s['percent'], $decsep),
                'hours' => $s['percent'] !== null,
                'low' => $s['percent'] !== null && $s['percent'] < report::LOW_DAY,
                'bars' => $bars,
                'lastday' => count($s['days']),
                'barslabel' => get_string('report_bars', $c, (object) ['days' => count($s['days']), 'troubled' => $troubled]),
                'facts' => self::capital($facts),
            ];
            foreach ($s['cuts'] as $cut) {
                $cuts[] = ['seconds' => ($cut->ended ? (int) $cut->ended : $now) - (int) $cut->started, 'name' => $s['name'],
                    'when' => self::capital(userdate((int) $cut->started, get_string('report_cut_when', $c))),
                    'length' => $cut->ended ? self::duration((int) $cut->ended - (int) $cut->started) :
                        get_string('report_cut_open', $c), 'open' => !$cut->ended];
            }
        }
        usort($cuts, function ($a, $b) {
            return $b['seconds'] <=> $a['seconds'];
        });
        $allcuts = count($cuts);
        $cuts = array_slice($cuts, 0, self::MOST_CUTS);
        [$own, $sources] = self::played($data['played']);
        [$summary, $summarymore] = $data['hasdata'] ? self::summary($data, $decsep) : ['', ''];
        $first = self::first_month();
        $start = new \DateTimeImmutable($month . '-01', \core_date::get_server_timezone_object());
        $prev = $start->modify('-1 month')->format('Y-m');
        $next = $start->modify('+1 month')->format('Y-m');
        return [
            'tabs' => home::tabs('report', true),
            'hastabs' => true,
            'title' => get_string('report_heading', $c, userdate(report::bounds($month)[0], get_string('report_month_format', $c))),
            'centre' => manifest::centre_name(),
            'inprogress' => $month === $current,
            'prevurl' => $first && $first <= $prev ? (new \moodle_url($base, ['month' => $prev]))->out(false) : '',
            'prevname' => self::month_alone($prev),
            'nexturl' => $next <= $current ? (new \moodle_url($base, ['month' => $next]))->out(false) : '',
            'nextname' => self::month_alone($next),
            'downloadurl' => (new \moodle_url($base, ['month' => $month, 'download' => 1]))->out(false),
            'hasdata' => $data['hasdata'],
            // With no screen yet, the empty month says how to start.
            'addscreen' => !$data['hasdata'] && !$DB->record_exists_select('local_oksigeniahechauka_screen',
                'keyhash IS NOT NULL') ? (new \moodle_url('/local/oksigeniahechauka/screens.php'))->out(false) : '',
            'summary' => $summary,
            'summarymore' => $summarymore,
            'screens' => $screens,
            'hascuts' => (bool) $cuts,
            'cutstitle' => get_string($allcuts > self::CUTS_IN_SIGHT ? 'report_cuts_longest' : 'report_cuts_title', $c),
            'cuts' => array_slice($cuts, 0, self::CUTS_IN_SIGHT),
            'hasmorecuts' => $allcuts > self::CUTS_IN_SIGHT,
            'morecuts' => array_slice($cuts, self::CUTS_IN_SIGHT),
            'morecutslabel' => get_string('report_cuts_more', $c, $allcuts),
            'own' => $own,
            'hasown' => (bool) $own,
            'sources' => $sources,
            'hassources' => (bool) $sources,
            'hasplayed' => $own || $sources,
        ];
    }

    /**
     * The rows of the download.
     *
     * @param string $month YYYY-MM
     * @param int $now
     * @return array [columns, rows]
     */
    public static function download(string $month, int $now): array {
        $c = 'local_oksigeniahechauka';
        $hours = function (int $seconds): string {
            return number_format($seconds / 3600, 1, '.', '');
        };
        $columns = [];
        foreach (['screen', 'percent', 'due', 'up', 'cuts', 'tvon', 'tvoff'] as $key) {
            $columns[$key] = get_string('report_csv_' . $key, $c);
        }
        $rows = [];
        foreach (report::month($month, $now)['screens'] as $s) {
            $rows[] = [$s['name'], $s['percent'] ?? '', $hours($s['due']), $hours($s['up']), count($s['cuts']),
                $hours($s['tvon']), $hours($s['tvoff'])];
        }
        return [$columns, $rows];
    }
}
