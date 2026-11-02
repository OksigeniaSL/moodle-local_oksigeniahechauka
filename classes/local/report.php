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
 * The month of each screen, for whoever decides: how much of its hours it was working, when it stopped, and what came out.
 *
 * The state is sampled by the task of every five minutes, so nothing here adds to the heartbeat of a screen; what came out is
 * added up by the player, which sends it every ten heartbeats.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class report {
    /** A day of a screen. */
    const STAT = 'local_oksigeniahechauka_stat';

    /** A time a screen stopped within its hours. */
    const CUT = 'local_oksigeniahechauka_cut';

    /** A screen that gave signs of life this many seconds ago is still working. */
    const ALIVE_WITHIN = 180;

    /** At most this many seconds count from a sample to the next: if the cron stops, nobody knows what happened meanwhile. */
    const MOST_SPAN = 900;

    /** A cut shorter than this, a restart, counts in the percentage and is not listed. */
    const LEAST_CUT = 600;

    /** Different things kept for a screen and a day. */
    const MOST_KEYS = 300;

    /** Months kept. */
    const KEEP_MONTHS = 14;

    /** What comes by itself, under one name each. */
    const SOURCES = ['agenda', 'birthdays', 'books', 'calendar', 'deadlines', 'menu', 'news'];

    /**
     * The row of a screen and a day, created if it is the first.
     *
     * @param int $screenid
     * @param string $day YYYY-MM-DD
     * @return \stdClass
     */
    protected static function row(int $screenid, string $day): \stdClass {
        global $DB;
        $where = ['screenid' => $screenid, 'day' => $day];
        $row = $DB->get_record(self::STAT, $where);
        if ($row) {
            return $row;
        }
        try {
            $DB->insert_record(self::STAT, (object) $where);
        } catch (\dml_exception $e) {
            // The beat of the screen got there first: the record is there anyway.
            debugging($e->getMessage(), DEBUG_DEVELOPER);
        }
        return $DB->get_record(self::STAT, $where, '*', MUST_EXIST);
    }

    /**
     * Writes down how every screen is now. Called every few minutes.
     *
     * @param int $now
     * @return void
     */
    public static function sample(int $now): void {
        global $DB;
        $last = (int) get_config('local_oksigeniahechauka', 'reportsample');
        set_config('reportsample', $now, 'local_oksigeniahechauka');
        $span = $last ? min($now - $last, self::MOST_SPAN) : 0;
        if ($span <= 0) {
            return;
        }
        $day = schedule::day($now);
        foreach ($DB->get_records_select('local_oksigeniahechauka_screen', 'keyhash IS NOT NULL AND lastseen > 0') as $screen) {
            $info = json_decode((string) ($screen->lastinfo ?? ''), true) ?: [];
            $due = schedule::power_on(schedule::power($screen->power), $now);
            $alive = $now - $screen->lastseen <= self::ALIVE_WITHIN && !screens::frozen($info);
            $tv = $info['device']['tv'] ?? '';
            $row = self::row((int) $screen->id, $day);
            $DB->execute(
                'UPDATE {' . self::STAT . '} SET due = due + ?, up = up + ?, tvon = tvon + ?, tvoff = tvoff + ? WHERE id = ?',
                [$due ? $span : 0, $due && $alive ? $span : 0, $tv === 'on' ? $span : 0, $tv === 'standby' ? $span : 0, $row->id]
            );
            self::cut($screen, $due, $alive, $now, $span);
        }
    }

    /**
     * Opens or closes the cut of a screen.
     *
     * @param \stdClass $screen
     * @param bool $due it should be on now
     * @param bool $alive it is working now
     * @param int $now
     * @param int $span seconds since the last sample
     * @return void
     */
    protected static function cut(\stdClass $screen, bool $due, bool $alive, int $now, int $span): void {
        global $DB;
        $open = $DB->get_record_select(self::CUT, 'screenid = ? AND ended IS NULL', [$screen->id]);
        if ($due && !$alive && !$open) {
            $started = max((int) $screen->lastseen, $now - $span);
            $DB->insert_record(self::CUT, (object) ['screenid' => $screen->id, 'started' => $started]);
        } else if ($open && ($alive || !$due)) {
            if ($now - $open->started < self::LEAST_CUT) {
                $DB->delete_records(self::CUT, ['id' => $open->id]);
            } else {
                $DB->set_field(self::CUT, 'ended', $now, ['id' => $open->id]);
            }
        }
    }

    /**
     * Under what name something shown is counted: an item by its own, what comes by itself by where it comes from.
     *
     * @param string $id the id in the contract
     * @return string|null null if it is nothing to count
     */
    public static function key(string $id): ?string {
        if (preg_match('/^[ia](\d+)(-\d+)?$/', $id, $m)) {
            return 'i' . $m[1];
        }
        if (preg_match('/^c\d+$/', $id)) {
            return 'agenda';
        }
        if (preg_match('/^event-\d+$/', $id)) {
            return 'calendar';
        }
        $from = explode('-', $id)[0];
        return in_array($from, self::SOURCES) ? $from : null;
    }

    /**
     * Adds what a player counted: id => [times, seconds].
     *
     * @param \stdClass $screen
     * @param mixed $played what it sent
     * @param int $now
     * @return void
     */
    public static function add_played(\stdClass $screen, $played, int $now): void {
        global $DB;
        if (!is_array($played) || !$played) {
            return;
        }
        $row = self::row((int) $screen->id, schedule::day($now));
        $kept = json_decode((string) ($row->played ?? ''), true) ?: [];
        foreach ($played as $id => $pair) {
            $key = self::key((string) $id);
            if ($key === null || !is_array($pair) || (!isset($kept[$key]) && count($kept) >= self::MOST_KEYS)) {
                continue;
            }
            $times = max(0, min((int) ($pair[0] ?? 0), 2000));
            $seconds = max(0, min((int) ($pair[1] ?? 0), 7200));
            $kept[$key] = [($kept[$key][0] ?? 0) + $times, ($kept[$key][1] ?? 0) + $seconds];
        }
        $DB->set_field(self::STAT, 'played', json_encode($kept), ['id' => $row->id]);
    }

    /**
     * Where a month starts and ends on the site's calendar.
     *
     * @param string $month YYYY-MM
     * @return array [first second, first second of the next, days]
     */
    public static function bounds(string $month): array {
        $start = new \DateTimeImmutable($month . '-01 00:00:00', \core_date::get_server_timezone_object());
        return [$start->getTimestamp(), $start->modify('+1 month')->getTimestamp(), (int) $start->format('t')];
    }

    /**
     * The share of its hours, never rounded up: 99.96 % is not 100 %.
     *
     * @param int $up
     * @param int $due
     * @return float|null null if there were no hours
     */
    public static function percent(int $up, int $due): ?float {
        return $due > 0 ? floor($up / $due * 1000) / 10 : null;
    }

    /**
     * A percentage in words: «99,6», «100».
     *
     * @param float $percent
     * @param string $decsep
     * @return string
     */
    public static function say_percent(float $percent, string $decsep): string {
        return $percent >= 100 ? '100' : str_replace('.', $decsep, number_format($percent, 1, '.', ''));
    }

    /**
     * What a month says.
     *
     * @param string $month YYYY-MM
     * @param int $now
     * @return array due, up, percent, screens (worst first), played (most first), hasdata
     */
    public static function month(string $month, int $now): array {
        global $DB;
        [$from, $to, $days] = self::bounds($month);
        $rows = $DB->get_records_select(self::STAT, 'day >= ? AND day <= ?', [$month . '-01', $month . '-31']);
        $byscreen = [];
        $played = [];
        foreach ($rows as $row) {
            $byscreen[$row->screenid][(int) substr($row->day, 8, 2)] = $row;
            foreach (json_decode((string) ($row->played ?? ''), true) ?: [] as $key => $pair) {
                $played[$key] = [($played[$key][0] ?? 0) + $pair[0], ($played[$key][1] ?? 0) + $pair[1]];
            }
        }
        $cuts = [];
        foreach ($DB->get_records_select(self::CUT, 'started >= ? AND started < ?', [$from, $to], 'started DESC') as $cut) {
            $cuts[$cut->screenid][] = $cut;
        }
        $names = $byscreen ? $DB->get_records_list(
            'local_oksigeniahechauka_screen',
            'id',
            array_keys($byscreen),
            '',
            'id, name'
        ) : [];
        $screens = [];
        $alldue = 0;
        $allup = 0;
        foreach ($byscreen as $screenid => $ofday) {
            $row = ['id' => (int) $screenid, 'name' => items::plain((string) ($names[$screenid]->name ?? '')),
                'due' => 0, 'up' => 0, 'tvon' => 0, 'tvoff' => 0, 'days' => [], 'cuts' => $cuts[$screenid] ?? []];
            for ($d = 1; $d <= $days; $d++) {
                $one = $ofday[$d] ?? null;
                $due = $one ? (int) $one->due : 0;
                $up = $one ? (int) $one->up : 0;
                $row['days'][$d] = self::percent($up, $due);
                $row['due'] += $due;
                $row['up'] += $up;
                $row['tvon'] += $one ? (int) $one->tvon : 0;
                $row['tvoff'] += $one ? (int) $one->tvoff : 0;
            }
            $row['percent'] = self::percent($row['up'], $row['due']);
            $alldue += $row['due'];
            $allup += $row['up'];
            $screens[] = $row;
        }
        usort($screens, function ($a, $b) {
            return ($a['percent'] ?? 101) <=> ($b['percent'] ?? 101) ?: strcmp($a['name'], $b['name']);
        });
        uasort($played, function ($a, $b) {
            return $b[1] <=> $a[1];
        });
        return ['due' => $alldue, 'up' => $allup, 'percent' => self::percent($allup, $alldue), 'screens' => $screens,
            'played' => $played, 'hasdata' => $alldue > 0];
    }

    /**
     * Warns everyone who runs the screens about the month that has just ended, once.
     *
     * @param int $now
     * @return int how many were told
     */
    public static function send_last_month(int $now): int {
        $month = substr(schedule::day(self::bounds(substr(schedule::day($now), 0, 7))[0] - 1), 0, 7);
        if (get_config('local_oksigeniahechauka', 'reportsent') === $month) {
            return 0;
        }
        set_config('reportsent', $month, 'local_oksigeniahechauka');
        $data = self::month($month, $now);
        if (!$data['hasdata']) {
            return 0;
        }
        $c = 'local_oksigeniahechauka';
        $strings = get_string_manager();
        $url = new \moodle_url('/local/oksigeniahechauka/report.php', ['month' => $month]);
        $told = 0;
        foreach (alerts::recipients() as $user) {
            $user = \core_user::get_user($user->id);
            if (!$user || $user->deleted || $user->suspended) {
                continue;
            }
            $lang = $user->lang ?: null;
            $decsep = $strings->get_string('decsep', 'langconfig', null, $lang);
            $lines = [];
            foreach ($data['screens'] as $screen) {
                if ($screen['percent'] === null) {
                    continue;
                }
                $cuts = count($screen['cuts']);
                $lines[] = $strings->get_string('report_line', $c, (object) [
                    'name' => $screen['name'],
                    'percent' => self::say_percent($screen['percent'], $decsep),
                    'cuts' => !$cuts ? $strings->get_string('report_cuts_none', $c, null, $lang) :
                        $strings->get_string($cuts === 1 ? 'report_cuts_one' : 'report_cuts_many', $c, $cuts, $lang),
                ], $lang);
            }
            $a = (object) [
                'month' => userdate(self::bounds($month)[0], $strings->get_string('strftimemonthyear', 'langconfig', null, $lang)),
                'percent' => self::say_percent($data['percent'], $decsep),
                'lines' => implode("\n", $lines),
                'url' => $url->out(false),
            ];
            $message = new \core\message\message();
            $message->component = $c;
            $message->name = 'monthlyreport';
            $message->userfrom = \core_user::get_noreply_user();
            $message->userto = $user;
            $message->subject = $strings->get_string('report_mail_subject', $c, $a, $lang);
            $message->fullmessage = $strings->get_string('report_mail_body', $c, $a, $lang);
            $message->fullmessageformat = FORMAT_PLAIN;
            $message->fullmessagehtml = '';
            $message->smallmessage = $message->subject;
            $message->notification = 1;
            $message->contexturl = $url->out(false);
            $message->contexturlname = get_string('report_title', $c);
            message_send($message);
            $told++;
        }
        return $told;
    }

    /**
     * Forgets what is too old to matter.
     *
     * @param int $now
     * @return void
     */
    public static function purge(int $now): void {
        global $DB;
        $limit = (new \DateTimeImmutable('@' . $now))->setTimezone(\core_date::get_server_timezone_object())
            ->modify('-' . self::KEEP_MONTHS . ' months');
        $DB->delete_records_select(self::STAT, 'day < ?', [$limit->format('Y-m-d')]);
        $DB->delete_records_select(self::CUT, 'started < ?', [$limit->getTimestamp()]);
    }

    /**
     * Forgets a screen.
     *
     * @param int $screenid
     * @return void
     */
    public static function forget(int $screenid): void {
        global $DB;
        $DB->delete_records(self::STAT, ['screenid' => $screenid]);
        $DB->delete_records(self::CUT, ['screenid' => $screenid]);
    }
}
