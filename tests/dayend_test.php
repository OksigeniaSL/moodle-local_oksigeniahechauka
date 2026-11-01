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

use local_oksigeniahechauka\local\sources;

/**
 * When the day ends for the screens: the centre's hour, or four in the afternoon.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\sources
 */
#[\PHPUnit\Framework\Attributes\CoversClass(sources::class)]
final class dayend_test extends \advanced_testcase {
    /**
     * The hour each centre sets, and the default when it is missing or wrong.
     */
    public function test_day_end(): void {
        $this->resetAfterTest();
        $this->assertSame('16:00', sources::day_end());
        set_config('dayend', '21:30', 'local_oksigeniahechauka');
        $this->assertSame('21:30', sources::day_end());
        foreach (['25:00', '9:00', 'tarde', ''] as $wrong) {
            set_config('dayend', $wrong, 'local_oksigeniahechauka');
            $this->assertSame('16:00', sources::day_end(), $wrong);
        }
    }
}
