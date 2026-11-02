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

    /** Cuts listed. */
    const MOST_CUTS = 20;

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
     * The month in words, with its capital: «Octubre 2026».
     *
     * @param string $month
     * @return string
     */
    public static function month_name(string $month): string {
        $name = userdate(report::bounds($month)[0], get_string('strftimemonthyear', 'langconfig'));
        return \core_text::strtoupper(\core_text::substr($name, 0, 1)) . \core_text::substr($name, 1);
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
                    $state = $percent >= 99.5 ? 'full' : ($percent >= 90 ? 'some' : 'low');
                    $troubled += $percent < 99.5 ? 1 : 0;
                }
                $bars[] = ['state' => $state, 'height' => $percent === null ? 0 : max(8, (int) round($percent)),
                    'title' => $d . ': ' . ($percent === null ? get_string('report_day_none', $c) :
                        report::say_percent($percent, $decsep) . ' %')];
            }
            $count = count($s['cuts']);
            $facts = [!$count ? get_string('report_cuts_none', $c) :
                get_string($count === 1 ? 'report_cuts_one' : 'report_cuts_many', $c, $count)];
            if ($s['tvon'] + $s['tvoff'] > 0) {
                // A month of a television in whole hours.
                $facts[] = get_string('report_tv', $c, (object) ['on' => self::duration((int) round($s['tvon'] / 3600) * 3600),
                    'off' => self::duration((int) round($s['tvoff'] / 3600) * 3600)]);
            }
            $screens[] = [
                'name' => $s['name'],
                'url' => (new \moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $s['id']]))->out(false),
                'percent' => $s['percent'] === null ? '' : report::say_percent($s['percent'], $decsep),
                'hours' => $s['percent'] !== null,
                'low' => $s['percent'] !== null && $s['percent'] < 90,
                'bars' => $bars,
                'lastday' => count($s['days']),
                'barslabel' => get_string('report_bars', $c, (object) ['days' => count($s['days']), 'troubled' => $troubled]),
                'facts' => implode(' · ', $facts),
            ];
            foreach ($s['cuts'] as $cut) {
                $cuts[] = ['started' => (int) $cut->started, 'name' => $s['name'],
                    'when' => userdate((int) $cut->started, get_string('strftimedaydatetime', 'langconfig')),
                    'length' => $cut->ended ? self::duration((int) $cut->ended - (int) $cut->started) :
                        get_string('report_cut_open', $c), 'open' => !$cut->ended];
            }
        }
        usort($cuts, function ($a, $b) {
            return $b['started'] <=> $a['started'];
        });
        [$own, $sources] = self::played($data['played']);
        $count = count($screens);
        $first = self::first_month();
        $start = new \DateTimeImmutable($month . '-01', \core_date::get_server_timezone_object());
        $prev = $start->modify('-1 month')->format('Y-m');
        $next = $start->modify('+1 month')->format('Y-m');
        return [
            'tabs' => home::tabs('report', true),
            'hastabs' => true,
            'title' => self::month_name($month),
            'inprogress' => $month === $current,
            'prevurl' => $first && $first <= $prev ? (new \moodle_url($base, ['month' => $prev]))->out(false) : '',
            'nexturl' => $next <= $current ? (new \moodle_url($base, ['month' => $next]))->out(false) : '',
            'downloadurl' => (new \moodle_url($base, ['month' => $month, 'download' => 1]))->out(false),
            'hasdata' => $data['hasdata'],
            'summary' => !$data['hasdata'] ? '' : ($count === 1 ?
                get_string('report_summary_one', $c, report::say_percent($data['percent'], $decsep)) :
                get_string('report_summary_many', $c, (object) ['count' => $count,
                    'percent' => report::say_percent($data['percent'], $decsep)])),
            'screens' => $screens,
            'cuts' => array_slice($cuts, 0, self::MOST_CUTS),
            'hascuts' => (bool) $cuts,
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
