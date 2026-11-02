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

use local_oksigeniahechauka\local\birthdays;
use local_oksigeniahechauka\local\demo;
use local_oksigeniahechauka\local\sample;

/**
 * The public demonstration screen: off by default, never the birthdays, and only its own files.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\demo
 */
#[\PHPUnit\Framework\Attributes\CoversClass(demo::class)]
final class demo_test extends \advanced_testcase {
    /**
     * Off until the site says, and then what goes to every screen, without the birthdays, its files through demo.php.
     */
    public function test_the_demonstration(): void {
        $this->resetAfterTest();
        $this->assertFalse(demo::on());
        set_config('publicdemo', 1, 'local_oksigeniahechauka');
        $this->assertTrue(demo::on());
        $now = time();
        sample::add($now);
        [, $month, $day] = array_map('intval', explode('-', userdate($now, '%Y-%m-%d', \core_date::get_server_timezone(), false)));
        birthdays::add('Lucía Pérez', '3A', $day, $month);
        set_config('sourcebirthdays', 1, 'local_oksigeniahechauka');
        [$m, $ids] = demo::manifest($now);
        $types = array_column($m['items'], 'type');
        $this->assertNotContains('birthdays', $types);
        $this->assertContains('notice', $types);
        $this->assertArrayNotHasKey('power', $m);
        $this->assertFalse($m['screen']['sound']);
        $this->assertNotEmpty($ids);
        $this->assertStringContainsString('demo.php?media=' . $ids[0], json_encode($m, JSON_UNESCAPED_SLASHES));
    }
}
