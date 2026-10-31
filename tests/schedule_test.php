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

use local_oksigeniahechauka\local\schedule;

/**
 * The schedule of an item, as the contract says it.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\schedule
 */
#[\PHPUnit\Framework\Attributes\CoversClass(schedule::class)]
final class schedule_test extends \advanced_testcase {
    /**
     * An item without dates, days or hours is always on.
     */
    public function test_always(): void {
        $this->assertNull(schedule::when((object) ['datefrom' => null, 'dateuntil' => null, 'days' => null,
            'times' => null, 'everyweeks' => 0, 'timecreated' => 0]));
    }

    /**
     * Dates, weekdays, ranges and weeks go to the contract; what is not valid is left out.
     */
    public function test_full(): void {
        $when = schedule::when((object) [
            'datefrom' => '2026-11-02',
            'dateuntil' => '2026-12-18',
            'days' => '5,1,3,9,3',
            'times' => json_encode([['08:00', '10:30'], ['25:00', '26:00'], ['14:00']]),
            'everyweeks' => 2,
            'timecreated' => 0,
        ]);
        $this->assertSame([
            'from' => '2026-11-02',
            'until' => '2026-12-18',
            'days' => [1, 3, 5],
            'times' => [['08:00', '10:30']],
            'every' => 2,
        ], $when);
    }

    /**
     * Every weekday is the same as no weekday; every N weeks without a first day counts from when it was made.
     */
    public function test_defaults(): void {
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        $when = schedule::when((object) ['datefrom' => '', 'dateuntil' => '', 'days' => '1,2,3,4,5,6,7',
            'times' => '', 'everyweeks' => 3, 'timecreated' => make_timestamp(2026, 11, 4, 12)]);
        $this->assertSame(['from' => '2026-11-04', 'every' => 3], $when);
    }

    /**
     * Hours and dates are checked.
     */
    public function test_checks(): void {
        $this->assertTrue(schedule::is_hour('08:30'));
        $this->assertTrue(schedule::is_hour('23:59'));
        $this->assertFalse(schedule::is_hour('24:00'));
        $this->assertFalse(schedule::is_hour('8:30'));
        $this->assertTrue(schedule::is_date('2026-11-02'));
        $this->assertFalse(schedule::is_date('2/11/2026'));
        $this->assertFalse(schedule::is_date(null));
    }
}
