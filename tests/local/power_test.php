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
 * A screen's power hours in several windows, as its sheet sends them: each with its days and hours, never two lighting the
 * same day at the same hours, and said in one sentence.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\sheet
 */
#[\PHPUnit\Framework\Attributes\CoversClass(sheet::class)]
final class power_test extends \advanced_testcase {
    /**
     * Monday to Friday and Saturday with other hours; all the week as no days; what is wrong, said.
     */
    public function test_windows_from(): void {
        [$windows, $wrong] = sheet::windows_from(
            [0 => '1,2,3,4,5', 1 => '6'],
            [0 => '07:05', 1 => '09:05'],
            [0 => '19:55', 1 => '13:55']
        );
        $this->assertSame('', $wrong);
        $this->assertSame([['days' => [1, 2, 3, 4, 5], 'on' => '07:05', 'off' => '19:55'],
            ['days' => [6], 'on' => '09:05', 'off' => '13:55']], $windows);
        $this->assertSame(
            [['days' => [], 'on' => '08:00', 'off' => '20:00']],
            sheet::windows_from([3 => '7,1,2,3,4,5,6,6'], [3 => '08:00'], [3 => '20:00'])[0]
        );
        $this->assertSame('power_nodays', sheet::windows_from([0 => ''], [0 => '08:00'], [0 => '20:00'])[1]);
        $this->assertSame('wronghour', sheet::windows_from([0 => '1'], [0 => '25:00'], [0 => '20:00'])[1]);
        $this->assertSame('power_nodays', sheet::windows_from([], [], [])[1]);
    }

    /**
     * Two windows that light the same day at the same hours are turned down; the same day at other hours, or a night window
     * that ends where the next morning's begins, are not.
     */
    public function test_overlap(): void {
        $this->assertSame('power_overlap', sheet::windows_from(
            [0 => '1,2,3', 1 => '3'],
            [0 => '08:00', 1 => '12:00'],
            [0 => '14:00', 1 => '18:00']
        )[1]);
        $this->assertSame('', sheet::windows_from(
            [0 => '1,2,3', 1 => '3'],
            [0 => '08:00', 1 => '15:00'],
            [0 => '14:00', 1 => '18:00']
        )[1]);
        // Sunday night into Monday morning, and Monday from 06:00: they meet, they do not overlap.
        $this->assertSame('', sheet::windows_from(
            [0 => '7', 1 => '1'],
            [0 => '22:00', 1 => '06:00'],
            [0 => '06:00', 1 => '12:00']
        )[1]);
        $this->assertSame('power_overlap', sheet::windows_from(
            [0 => '7', 1 => '1'],
            [0 => '22:00', 1 => '05:00'],
            [0 => '06:00', 1 => '12:00']
        )[1]);
    }

    /**
     * One window as before; several in one sentence.
     */
    public function test_sentence(): void {
        $this->resetAfterTest();
        $names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $one = sheet::sentence([['days' => [1, 2, 3, 4, 5], 'on' => '07:05', 'off' => '19:55']], $names);
        $this->assertStringStartsWith('On Monday to Friday, from 07:05 to 19:55.', $one);
        $two = sheet::sentence([['days' => [1, 2, 3, 4, 5], 'on' => '07:05', 'off' => '19:55'],
            ['days' => [6], 'on' => '09:05', 'off' => '13:55']], $names);
        $this->assertStringStartsWith('On Monday to Friday, from 07:05 to 19:55 and ', $two);
        $this->assertStringContainsString('Saturdays, from 09:05 to 13:55.', $two);
    }
}
