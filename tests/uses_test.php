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

use local_oksigeniahechauka\local\uses;

/**
 * What each screen is for, and another use at some hours.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\uses
 */
#[\PHPUnit\Framework\Attributes\CoversClass(uses::class)]
final class uses_test extends \advanced_testcase {
    /**
     * A use as it comes, or informative; the windows that are right, and none of the wrong ones.
     */
    public function test_uses_and_plan(): void {
        $this->assertSame('info', uses::valid(null));
        $this->assertSame('info', uses::valid('nonsense'));
        $this->assertSame('showcase', uses::valid('showcase'));
        $plan = uses::plan(json_encode([
            ['days' => [6, 7], 'from' => '00:00', 'until' => '24:00', 'use' => 'showcase'],
            ['days' => [1, 2, 3, 4, 5, 6, 7], 'from' => '18:00', 'until' => '08:00', 'use' => 'mixed'],
            ['days' => [1], 'from' => '10:00', 'until' => '10:00', 'use' => 'mixed'],
            ['days' => [9], 'from' => '25:00', 'until' => '10:00', 'use' => 'mixed'],
            ['days' => [1], 'from' => '09:00', 'until' => '10:00', 'use' => 'cinema'],
        ]));
        $this->assertSame([
            ['days' => [6, 7], 'from' => '00:00', 'until' => '24:00', 'use' => 'showcase'],
            ['days' => [], 'from' => '18:00', 'until' => '08:00', 'use' => 'mixed'],
        ], $plan);
        $this->assertSame([], uses::plan('nonsense'));
        $screen = (object) ['screenuse' => 'mixed', 'useplan' => json_encode([$plan[0]])];
        $this->assertSame(['use' => 'mixed', 'useplan' => [$plan[0]]], uses::contract($screen));
        $this->assertSame(['use' => 'info'], uses::contract((object) ['screenuse' => '', 'useplan' => null]));
    }
}
