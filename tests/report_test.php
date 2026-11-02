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

namespace local_oksigeniahechauka;

use local_oksigeniahechauka\local\report;
use local_oksigeniahechauka\local\schedule;
use local_oksigeniahechauka\local\screens;

/**
 * The monthly report: what is sampled, what is counted and who hears about it.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\report
 */
#[\PHPUnit\Framework\Attributes\CoversClass(report::class)]
final class report_test extends \advanced_testcase {
    /**
     * A screen with a key, seen at a given moment.
     *
     * @param int $seen
     * @param string|null $power
     * @param array $info
     * @return \stdClass
     */
    private function screen(int $seen, ?string $power = null, array $info = []): \stdClass {
        global $DB;
        $id = $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Entrada', 'keyhash' => 'x',
            'lastseen' => $seen, 'power' => $power, 'lastinfo' => json_encode($info), 'timecreated' => 1, 'timemodified' => 1]);
        return $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id]);
    }

    /**
     * Seen lately, it counts as working; silent or frozen, as due only, and the television is written down.
     */
    public function test_sample(): void {
        global $DB;
        $this->resetAfterTest();
        $now = 1793000000;
        $alive = $this->screen($now - 60, null, ['device' => ['tv' => 'on']]);
        $silent = $this->screen($now - 3000);
        $frozen = $this->screen($now - 60, null, ['device' => ['frozen' => true]]);
        report::sample($now - 300);
        report::sample($now);
        $row = $DB->get_record(report::STAT, ['screenid' => $alive->id]);
        $this->assertSame(schedule::day($now), $row->day);
        $this->assertSame([300, 300, 300, 0], [(int) $row->due, (int) $row->up, (int) $row->tvon, (int) $row->tvoff]);
        $row = $DB->get_record(report::STAT, ['screenid' => $silent->id]);
        $this->assertSame([300, 0], [(int) $row->due, (int) $row->up]);
        $row = $DB->get_record(report::STAT, ['screenid' => $frozen->id]);
        $this->assertSame([300, 0], [(int) $row->due, (int) $row->up]);
    }

    /**
     * The first sample counts nothing, and a long silence of the cron counts as a quarter of an hour.
     */
    public function test_sample_span(): void {
        global $DB;
        $this->resetAfterTest();
        $now = 1793000000;
        $screen = $this->screen($now - 60);
        report::sample($now - 86400);
        $this->assertFalse($DB->record_exists(report::STAT, ['screenid' => $screen->id]));
        report::sample($now);
        $this->assertSame(report::MOST_SPAN, (int) $DB->get_field(report::STAT, 'due', ['screenid' => $screen->id]));
    }

    /**
     * Outside its hours a screen owes nothing.
     */
    public function test_out_of_hours(): void {
        global $DB;
        $this->resetAfterTest();
        $now = (new \DateTimeImmutable('2026-10-07 03:00:00', \core_date::get_server_timezone_object()))->getTimestamp();
        $power = json_encode([['days' => [1, 2, 3, 4, 5], 'on' => '08:00', 'off' => '18:00']]);
        $screen = $this->screen($now - 5000, $power);
        report::sample($now - 300);
        report::sample($now);
        $this->assertSame(0, (int) $DB->get_field(report::STAT, 'due', ['screenid' => $screen->id]));
        $this->assertFalse($DB->record_exists(report::CUT, ['screenid' => $screen->id]));
    }

    /**
     * A cut opens when it stops, closes when it comes back, and a restart is not a cut.
     */
    public function test_cuts(): void {
        global $DB;
        $this->resetAfterTest();
        $now = 1793000000;
        $screen = $this->screen($now - 1000);
        report::sample($now - 300);
        report::sample($now);
        $cut = $DB->get_record(report::CUT, ['screenid' => $screen->id]);
        $this->assertNull($cut->ended);
        // It comes back too soon to be listed.
        $DB->set_field('local_oksigeniahechauka_screen', 'lastseen', $now + 180, ['id' => $screen->id]);
        report::sample($now + 200);
        $this->assertFalse($DB->record_exists(report::CUT, ['screenid' => $screen->id]));
        // A long one stays, with its end.
        $DB->set_field('local_oksigeniahechauka_screen', 'lastseen', $now, ['id' => $screen->id]);
        report::sample($now + 600);
        $DB->set_field('local_oksigeniahechauka_screen', 'lastseen', $now + 2400, ['id' => $screen->id]);
        report::sample($now + 2500);
        $cut = $DB->get_record(report::CUT, ['screenid' => $screen->id]);
        $this->assertSame($now + 2500, (int) $cut->ended);
    }

    /**
     * Under what name each thing is counted.
     */
    public function test_key(): void {
        $this->assertSame('i12', report::key('i12'));
        $this->assertSame('i12', report::key('i12-345'));
        $this->assertSame('i12', report::key('a12'));
        $this->assertSame('agenda', report::key('c7'));
        $this->assertSame('calendar', report::key('event-7'));
        $this->assertSame('menu', report::key('menu-2026-11-02-eve'));
        $this->assertSame('birthdays', report::key('birthdays-2026-11-02'));
        $this->assertNull(report::key('sample-i'));
        $this->assertNull(report::key(''));
    }

    /**
     * What a player sends is added up, what it should not send is left out.
     */
    public function test_played(): void {
        global $DB;
        $this->resetAfterTest();
        $now = 1793000000;
        $screen = $this->screen($now);
        $sent = ['i1' => [2, 30], 'i1-5' => [1, 10], 'hola' => [9, 9], 'menu-x' => 'no', 'c3' => [1, 99999]];
        report::add_played($screen, $sent, $now);
        report::add_played($screen, ['i1' => [1, 5]], $now);
        report::add_played($screen, 'nada', $now);
        $kept = json_decode($DB->get_field(report::STAT, 'played', ['screenid' => $screen->id]), true);
        $this->assertSame(['i1' => [4, 45], 'agenda' => [1, 7200]], $kept);
    }

    /**
     * A month: its share never rounded up, the worst first.
     */
    public function test_month(): void {
        global $DB;
        $this->resetAfterTest();
        $good = $this->screen(1);
        $bad = $this->screen(1);
        $DB->insert_record(report::STAT, (object) ['screenid' => $good->id, 'day' => '2026-10-05', 'due' => 100000, 'up' => 99990]);
        $DB->insert_record(report::STAT, (object) ['screenid' => $bad->id, 'day' => '2026-10-05', 'due' => 1000, 'up' => 500]);
        $DB->insert_record(report::STAT, (object) ['screenid' => $bad->id, 'day' => '2026-09-30', 'due' => 1000, 'up' => 0]);
        $data = report::month('2026-10', 1793000000);
        $this->assertSame([(int) $bad->id, (int) $good->id], array_map(function ($s) {
            return (int) $s['id'];
        }, $data['screens']));
        $this->assertSame(50.0, $data['screens'][0]['percent']);
        $this->assertSame(99.9, $data['screens'][1]['percent']);
        $this->assertCount(31, $data['screens'][0]['days']);
        $this->assertSame('99,9', report::say_percent(99.9, ','));
        $this->assertSame('100', report::say_percent(100.0, ','));
    }

    /**
     * The first of the month those who run the screens hear about it, once; with nothing to say, nothing.
     */
    public function test_send(): void {
        global $DB;
        $this->resetAfterTest();
        $now = (new \DateTimeImmutable('2026-11-01 08:10:00', \core_date::get_server_timezone_object()))->getTimestamp();
        $sink = $this->redirectMessages();
        $this->assertSame(0, report::send_last_month($now));
        $this->assertSame(0, $sink->count());
        unset_config('reportsent', 'local_oksigeniahechauka');
        $screen = $this->screen(1);
        $DB->insert_record(report::STAT, (object) ['screenid' => $screen->id, 'day' => '2026-10-05', 'due' => 1000, 'up' => 500]);
        $this->assertSame(1, report::send_last_month($now));
        $this->assertSame(0, report::send_last_month($now));
        $messages = $sink->get_messages();
        $this->assertCount(1, $messages);
        $this->assertStringContainsString('50', $messages[0]->subject);
        $this->assertStringContainsString('Entrada', $messages[0]->fullmessage);
        $this->assertStringContainsString('report.php?month=2026-10', $messages[0]->fullmessage);
    }

    /**
     * What is too old goes, and so does everything about a screen that goes.
     */
    public function test_forget(): void {
        global $DB;
        $this->resetAfterTest();
        $now = (new \DateTimeImmutable('2026-11-01', \core_date::get_server_timezone_object()))->getTimestamp();
        $screen = $this->screen(1);
        $DB->insert_record(report::STAT, (object) ['screenid' => $screen->id, 'day' => '2024-01-01']);
        $DB->insert_record(report::STAT, (object) ['screenid' => $screen->id, 'day' => '2026-10-01']);
        $DB->insert_record(report::CUT, (object) ['screenid' => $screen->id, 'started' => 1000]);
        report::purge($now);
        $this->assertSame(1, $DB->count_records(report::STAT));
        $this->assertSame(0, $DB->count_records(report::CUT));
        screens::delete((int) $screen->id);
        $this->assertSame(0, $DB->count_records(report::STAT));
    }
}
