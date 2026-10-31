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

use local_oksigeniahechauka\local\agendas;
use local_oksigeniahechauka\local\items;
use local_oksigeniahechauka\local\manifest;
use local_oksigeniahechauka\local\screens;

/**
 * The manifest of a screen: what reaches it, and only that.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\manifest
 * @covers     \local_oksigeniahechauka\local\items
 */
#[\PHPUnit\Framework\Attributes\CoversClass(manifest::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(items::class)]
final class manifest_test extends \advanced_testcase {
    /**
     * A screen.
     *
     * @param string $name
     * @return \stdClass
     */
    protected function screen(string $name): \stdClass {
        global $DB;
        $id = $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => $name, 'template' => 'zones',
            'theme' => 'site', 'timecreated' => time(), 'timemodified' => time()]);
        return $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id]);
    }

    /**
     * A notice.
     *
     * @param string $title
     * @param array $fields
     * @return int
     */
    protected function notice(string $title, array $fields = []): int {
        global $DB;
        return (int) $DB->insert_record('local_oksigeniahechauka_item', (object) ($fields + ['type' => 'notice',
            'title' => $title, 'body' => '', 'data' => '{}', 'visible' => 1, 'targetall' => 1, 'everyweeks' => 0,
            'timecreated' => time(), 'timemodified' => time()]));
    }

    /**
     * The titles of the notices in a manifest.
     *
     * @param array $m
     * @return string[]
     */
    protected function titles(array $m): array {
        $out = [];
        foreach ($m['items'] as $item) {
            if ($item['type'] === 'notice') {
                $out[] = $item['title'];
            }
        }
        sort($out);
        return $out;
    }

    /**
     * Every screen, a group, one screen; hidden and finished items stay out.
     */
    public function test_targets(): void {
        global $DB;
        $this->resetAfterTest();
        foreach (['sourcemenu', 'sourcecalendar', 'sourcenews'] as $source) {
            set_config($source, 0, 'local_oksigeniahechauka');
        }
        $library = $this->screen('Library');
        $hall = $this->screen('Hall');
        $group = (int) $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => 'Primary']);
        screens::set_groups((int) $hall->id, [$group]);

        $this->notice('Everywhere');
        $this->notice('Hidden', ['visible' => 0]);
        $this->notice('Over', ['dateuntil' => '2020-01-01']);
        $forgroup = $this->notice('Primary only', ['targetall' => 0]);
        items::set_targets($forgroup, [$group], []);
        $forlibrary = $this->notice('Library only', ['targetall' => 0]);
        items::set_targets($forlibrary, [], [(int) $library->id]);

        $now = time();
        $this->assertSame(['Everywhere', 'Library only'], $this->titles(manifest::build($library, $now)));
        $this->assertSame(['Everywhere', 'Primary only'], $this->titles(manifest::build($hall, $now)));
        $this->assertTrue(items::reaches($forgroup, (int) $hall->id));
        $this->assertFalse(items::reaches($forgroup, (int) $library->id));
    }

    /**
     * The etag changes with the content and only with it.
     */
    public function test_etag(): void {
        global $DB;
        $this->resetAfterTest();
        foreach (['sourcemenu', 'sourcecalendar', 'sourcenews'] as $source) {
            set_config($source, 0, 'local_oksigeniahechauka');
        }
        $screen = $this->screen('Library');
        $now = time();
        $first = manifest::build($screen, $now);
        $this->assertSame($first['etag'], manifest::build($screen, $now)['etag']);
        $this->assertSame(1, $first['contract']);
        $id = $this->notice('New');
        $second = manifest::build($screen, $now);
        $this->assertNotSame($first['etag'], $second['etag']);
        $DB->set_field('local_oksigeniahechauka_item', 'visible', 0, ['id' => $id]);
        $this->assertSame($first['etag'], manifest::build($screen, $now)['etag']);
    }

    /**
     * Notices, events and the ticker, as the contract says them.
     */
    public function test_contract_items(): void {
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        $start = make_timestamp(2026, 11, 2, 10, 30);
        $event = items::to_contract((object) ['id' => 5, 'type' => 'event', 'title' => 'Theatre', 'body' => 'Year 3',
            'sortorder' => 2, 'duration' => 0, 'datefrom' => null, 'dateuntil' => null, 'days' => null,
            'times' => null, 'everyweeks' => 0, 'timecreated' => 0,
            'data' => json_encode(['start' => $start, 'end' => $start + HOURSECS, 'color' => 2])]);
        $this->assertSame('event', $event['type']);
        $this->assertSame('2026-11-02T10:30', $event['start']);
        $this->assertSame('2026-11-02T11:30', $event['end']);
        $this->assertSame('Year 3', $event['detail']);
        $this->assertSame(['from' => '2026-11-02', 'until' => '2026-11-02'], $event['when']);

        $notice = items::to_contract((object) ['id' => 6, 'type' => 'notice', 'title' => 'Photos',
            'body' => '<b>Tuesday</b>', 'sortorder' => 1, 'duration' => 0, 'datefrom' => null, 'dateuntil' => null,
            'days' => '1', 'times' => null, 'everyweeks' => 0, 'timecreated' => 0, 'data' => '{"important":true}']);
        $this->assertSame('Tuesday', $notice['body']);
        $this->assertSame('important', $notice['tone']);
        $this->assertSame(['days' => [1]], $notice['when']);

        $this->assertNull(items::to_contract((object) ['id' => 7, 'type' => 'media', 'title' => 'No file', 'body' => '',
            'sortorder' => 0, 'duration' => 0, 'datefrom' => null, 'dateuntil' => null, 'days' => null, 'times' => null,
            'everyweeks' => 0, 'timecreated' => 0, 'data' => '{}']));
    }

    /**
     * An agenda brings its events to the screens it goes to, and only to those; with its colour, whole days kept whole.
     */
    public function test_agenda(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        $infant = $this->screen('Infantil');
        $hall = $this->screen('Hall');
        $now = (new \DateTime('2026-11-02 09:00', new \DateTimeZone('Atlantic/Canary')))->getTimestamp();
        $id = (int) $DB->insert_record('local_oksigeniahechauka_item', (object) ['type' => 'agenda',
            'title' => 'Infantil', 'body' => '', 'data' => json_encode(['url' => 'https://example.com/a.ics',
            'color' => 3]), 'visible' => 1, 'targetall' => 0, 'everyweeks' => 0, 'timecreated' => $now,
            'timemodified' => $now]);
        items::set_targets($id, [], [(int) $infant->id]);
        $day = function (string $when): int {
            return (new \DateTime($when, new \DateTimeZone('Atlantic/Canary')))->getTimestamp();
        };
        agendas::store($id, [
            ['uid' => 'x', 'title' => 'Fiesta del otoño', 'detail' => 'Patio', 'start' => $day('2026-11-06 00:00'),
                'end' => $day('2026-11-07 00:00'), 'allday' => true],
            ['uid' => 'y', 'title' => 'Teatro', 'detail' => '', 'start' => $day('2026-11-03 10:00'),
                'end' => $day('2026-11-03 11:00'), 'allday' => false],
            ['uid' => 'z', 'title' => 'Pasado', 'detail' => '', 'start' => $day('2026-10-20 10:00'),
                'end' => $day('2026-10-20 11:00'), 'allday' => false],
        ]);
        $events = array_values(array_filter(manifest::build($infant, $now)['items'], function ($it) {
            return $it['type'] === 'event';
        }));
        $this->assertCount(2, $events);
        $this->assertSame('Teatro', $events[0]['title']);
        $this->assertSame('2026-11-03T11:00', $events[0]['end']);
        $this->assertSame(3, $events[0]['color']);
        $this->assertTrue($events[1]['allday']);
        $this->assertSame(['from' => '2026-11-06', 'until' => '2026-11-06'], $events[1]['when']);
        $this->assertSame('Patio', $events[1]['detail']);
        $this->assertSame([], array_values(array_filter(manifest::build($hall, $now)['items'], function ($it) {
            return $it['type'] === 'event';
        })));
        items::delete($id);
        $this->assertSame(0, $DB->count_records(agendas::TABLE));
    }
}
