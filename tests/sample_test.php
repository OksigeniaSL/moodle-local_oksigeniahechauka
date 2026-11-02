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

use local_oksigeniahechauka\local\items;
use local_oksigeniahechauka\local\manifest;
use local_oksigeniahechauka\local\sample;

/**
 * The example a centre finds the first time: what it brings, what the screens say, and taking it out.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\sample
 */
#[\PHPUnit\Framework\Attributes\CoversClass(sample::class)]
final class sample_test extends \advanced_testcase {
    /**
     * A piece of each kind reaches a screen, marked as example data, and goes with one call, pictures and all.
     */
    public function test_add_and_remove(): void {
        global $DB;
        $this->resetAfterTest();
        $this->assertFalse(sample::exists());
        $now = time();
        $this->assertSame(9, sample::add($now));
        $this->assertTrue(sample::exists());
        $types = array_count_values(array_column(array_map('get_object_vars', sample::items()), 'type'));
        ksort($types);
        $this->assertSame(['event' => 1, 'media' => 2, 'notice' => 3, 'table' => 1, 'ticker' => 2], $types);
        $screen = (object) ['id' => 0, 'name' => 'x', 'template' => 'zones', 'theme' => 'site', 'power' => null,
            'lastinfo' => null];
        $m = manifest::build($screen, $now);
        $this->assertTrue($m['sample']);
        $table = array_values(array_filter($m['items'], function ($it) {
            return $it['type'] === 'table';
        }));
        $this->assertCount(1, $table);
        $this->assertNotEmpty($table[0]['rows']);
        // Again, no doubles.
        sample::add($now);
        $this->assertCount(9, sample::items());
        $this->assertSame(9, sample::remove());
        $this->assertFalse(sample::exists());
        $this->assertSame(0, $DB->count_records('files', ['component' => 'local_oksigeniahechauka', 'filearea' => 'media']));
        $this->assertArrayNotHasKey('sample', manifest::build($screen, $now));
    }

    /**
     * Its event, once over, moves to the next working day.
     */
    public function test_refresh(): void {
        $this->resetAfterTest();
        $now = time();
        sample::add($now);
        $event = array_values(array_filter(sample::items(), function ($it) {
            return $it->type === 'event';
        }))[0];
        $start = (int) items::data($event)['start'];
        $this->assertGreaterThan($now, $start);
        sample::refresh($start + 2 * HOURSECS);
        global $DB;
        $moved = items::data($DB->get_record('local_oksigeniahechauka_item', ['id' => $event->id]));
        $this->assertGreaterThan($start + 2 * HOURSECS, (int) $moved['start']);
        $day = (new \DateTimeImmutable('@' . $moved['start']))->setTimezone(\core_date::get_server_timezone_object());
        $this->assertLessThanOrEqual(5, (int) $day->format('N'));
        $this->assertSame('10:00', $day->format('H:i'));
    }

    /**
     * A test site starts empty.
     */
    public function test_not_in_test_sites(): void {
        $this->assertFalse(sample::at_install());
    }
}
