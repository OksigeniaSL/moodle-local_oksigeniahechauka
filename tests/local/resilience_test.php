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
 * What keeps the screens going when something around them fails: another plugin that throws, an agenda read again, a
 * list from Cifra that comes without a field or short of most of the centre. Example data.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\manifest
 */
#[\PHPUnit\Framework\Attributes\CoversClass(manifest::class)]
final class resilience_test extends \advanced_testcase {
    /**
     * A screen.
     *
     * @return \stdClass
     */
    protected function screen(): \stdClass {
        global $DB;
        $id = $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Entrance', 'template' => 'zones',
            'theme' => 'site', 'timecreated' => time(), 'timemodified' => time()]);
        return $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id]);
    }

    /**
     * Every source of Moodle off, so that only what a test turns on is there.
     */
    protected function quiet(): void {
        foreach (
            ['sourcemenu', 'sourcecalendar', 'sourcenews', 'sourcebooks', 'sourceweather', 'sourcephotoday',
                'sourcemoments', 'sourceinstagram', 'sourceopenacts', 'sourcechannel', 'sourcedeadlines',
                'sourcebirthdays'] as $source
        ) {
            set_config($source, 0, 'local_oksigeniahechauka');
        }
    }

    /**
     * Someone of Cifra, as its list gives them.
     *
     * @param int $id
     * @param string $born
     * @return array
     */
    protected function pupil(int $id, string $born): array {
        return ['id' => $id, 'nombre' => 'Pupil ' . $id, 'apellido1' => 'Example', 'fecha_nacimiento' => $born,
            'grupo_academico_principal' => ['etiqueta' => 'Pri 1'], 'fecha_baja' => null];
    }

    /**
     * Today's birthdays come although the plugin of the families throws, without the photos while it fails.
     */
    public function test_a_plugin_that_throws_leaves_the_birthdays(): void {
        global $DB;
        $this->resetAfterTest();
        $this->quiet();
        set_config('sourcebirthdays', 1, 'local_oksigeniahechauka');
        $now = time();
        [, $month, $day] = array_map('intval', explode('-', schedule::day($now)));
        $DB->insert_record(birthdays::TABLE, (object) ['name' => 'Ana Example', 'groupname' => 'Pri 1', 'day' => $day,
            'month' => $month, 'idnumber' => 'X1', 'usermodified' => 2, 'timecreated' => $now, 'timemodified' => $now]);
        if (!class_exists('\\local_oksigeniafamily\\api')) {
            require_once(__DIR__ . '/../fixtures/family_that_throws.php');
        }
        if (!property_exists('\\local_oksigeniafamily\\api', 'on')) {
            $this->markTestSkipped('Oksigenia Family is on this site: the stand-in cannot take its place.');
        }
        \local_oksigeniafamily\api::$on = true;
        try {
            $m = manifest::build($this->screen(), $now);
        } finally {
            \local_oksigeniafamily\api::$on = false;
        }
        $this->assertNotEmpty($this->getDebuggingMessages(), 'the fault is noted for whoever runs the site');
        $this->resetDebugging();
        $this->assertNotEmpty(array_filter($m['items'], function ($it) {
            return ($it['type'] ?? '') === 'birthdays';
        }), 'the birthday is on the screen');
    }

    /**
     * Reading an agenda again with the same events keeps the manifest as it was: the screens take nothing again.
     */
    public function test_an_agenda_read_again_keeps_the_etag(): void {
        global $DB;
        $this->resetAfterTest();
        $this->quiet();
        $screen = $this->screen();
        $now = time();
        $id = (int) $DB->insert_record('local_oksigeniahechauka_item', (object) ['type' => 'agenda', 'title' => 'Agenda',
            'body' => '', 'data' => json_encode(['url' => 'https://example.com/a.ics']), 'visible' => 1, 'targetall' => 1,
            'everyweeks' => 0, 'timecreated' => $now, 'timemodified' => $now]);
        $events = [['uid' => 'u1', 'title' => 'Staff meeting', 'detail' => '', 'start' => $now + DAYSECS,
            'end' => $now + DAYSECS + HOURSECS, 'allday' => false]];
        agendas::store($id, $events);
        $first = manifest::build($screen, $now)['etag'];
        agendas::store($id, $events);
        $this->assertSame($first, manifest::build($screen, $now)['etag']);
    }

    /**
     * A pupil still in Cifra whose date does not come (a field renamed, a permission taken away) keeps their row.
     */
    public function test_cifra_without_dates_takes_nobody_out(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        birthdays::from_cifra([1 => $this->pupil(1, '2015-03-04'), 2 => $this->pupil(2, '2015-05-06')], time());
        $done = birthdays::from_cifra([1 => $this->pupil(1, ''), 2 => $this->pupil(2, '')], time());
        $this->assertSame(0, $done['gone']);
        $this->assertSame(2, $DB->count_records(birthdays::TABLE, ['source' => birthdays::CIFRA]));
    }

    /**
     * A list that suddenly lacks a quarter of the centre removes nothing; the few who leave in a normal year do go.
     */
    public function test_cifra_short_of_most_of_the_centre_removes_nothing(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $all = [];
        for ($i = 1; $i <= 240; $i++) {
            $all[$i] = $this->pupil($i, '2015-03-04');
        }
        birthdays::from_cifra($all, time());
        try {
            birthdays::from_cifra(array_slice($all, 0, 100, true), time());
            $this->fail('a list short of most of the centre is not taken');
        } catch (\moodle_exception $e) {
            $this->assertSame('cifraerrormanygone', $e->errorcode);
        }
        $this->assertSame(240, $DB->count_records(birthdays::TABLE, ['source' => birthdays::CIFRA]));
        $done = birthdays::from_cifra(array_slice($all, 0, 220, true), time());
        $this->assertSame(20, $done['gone']);
    }

    /**
     * In a small centre, a list that comes short is not taken either; Cifra giving everyone new ids writes nothing; and the
     * very same people missing on a third day in a row have left: they go.
     */
    public function test_cifra_many_gone_go_on_the_third_night(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $all = [];
        for ($i = 1; $i <= 60; $i++) {
            $all[$i] = $this->pupil($i, '2015-03-04');
        }
        $day = mktime(23, 0, 0, 6, 1, 2027);
        birthdays::from_cifra($all, $day);
        $renumbered = [];
        foreach ($all as $i => $pupil) {
            $renumbered[1000 + $i] = ['id' => 1000 + $i] + $pupil;
        }
        foreach ([[array_slice($all, 0, 10, true), $day + DAYSECS], [$renumbered, $day + DAYSECS]] as [$list, $when]) {
            try {
                birthdays::from_cifra($list, $when);
                $this->fail('a list short of most of a small centre is not taken');
            } catch (\moodle_exception $e) {
                $this->assertSame('cifraerrormanygone', $e->errorcode);
            }
            $this->assertSame(60, $DB->count_records(birthdays::TABLE), 'nothing written');
        }
        // The end of a stage: the same 50 missing, day after day.
        $left = array_slice($all, 0, 10, true);
        foreach ([2, 3, 4] as $n) {
            try {
                birthdays::from_cifra($left, $day + $n * DAYSECS);
                $this->assertSame(4, $n, 'not before the third day in a row');
            } catch (\moodle_exception $e) {
                $this->assertNotSame(4, $n);
            }
        }
        $this->assertSame(10, $DB->count_records(birthdays::TABLE));
    }

    /**
     * A source that fails gives what it gave today, and is noted once: a screen that does not ask for it leaves the note
     * as it was, and it goes when the source answers again.
     */
    public function test_a_source_that_fails_gives_what_it_gave_today(): void {
        $this->resetAfterTest();
        require_once(__DIR__ . '/../fixtures/manifest_probe.php');
        $now = time();
        $ok = function () {
            return [['id' => 'a', 'type' => 'notice']];
        };
        $fail = function () {
            throw new \coding_exception('down');
        };
        $this->assertSame($ok(), manifest_probe::source('menus', $ok, $now));
        $this->assertSame($ok(), manifest_probe::source('menus', $fail, $now), 'what it gave today');
        $this->assertArrayHasKey('menus', manifest::failures());
        $this->resetDebugging();
        $since = manifest::failures()['menus']['time'];
        // Another screen, which does not ask for it: the note stays as it was.
        manifest_probe::source('news', $ok, $now + 60);
        $this->assertSame($since, manifest::failures()['menus']['time']);
        // Another day, still failing: nothing kept from yesterday.
        $this->assertSame([], manifest_probe::source('menus', $fail, $now + DAYSECS));
        $this->resetDebugging();
        manifest_probe::source('menus', $ok, $now + DAYSECS + 60);
        $this->assertSame([], manifest::failures());
    }

    /**
     * A screen whose manifest cannot be built goes on beating, and the panel says so after a while, as a warning and not as
     * a screen without signal; once built, it is well again.
     */
    public function test_a_screen_without_its_manifest_is_said_in_the_panel(): void {
        $this->resetAfterTest();
        $screen = $this->screen();
        $now = time();
        $screen->lastseen = $now;
        manifest::note_broken((int) $screen->id, $now - 300, 'Call to undefined function');
        $state = \local_oksigeniahechauka\local\home::state($screen, [], $now);
        $this->assertSame(['warn', 'stale'], [$state['key'], $state['why']], 'it beats: not «without signal»');
        manifest::note_broken((int) $screen->id, $now, null);
        $this->assertSame('on', \local_oksigeniahechauka\local\home::state($screen, [], $now)['key']);
    }
}
