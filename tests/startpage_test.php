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

use local_oksigeniahechauka\local\categories;
use local_oksigeniahechauka\local\startpage;

/**
 * «Empezar»: when it comes up, what a kind of centre proposes and what it leaves alone, what comes by itself, and what is missing.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\startpage
 */
#[\PHPUnit\Framework\Attributes\CoversClass(startpage::class)]
final class startpage_test extends \advanced_testcase {
    /**
     * The first time and with no screen; never again once seen, and never for someone who does not run the screens.
     */
    public function test_when_it_comes_up(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $this->assertTrue(startpage::is_due());
        set_config('startseen', 1, 'local_oksigeniahechauka');
        $this->assertFalse(startpage::is_due());
        unset_config('startseen', 'local_oksigeniahechauka');
        $this->setUser($this->getDataGenerator()->create_user());
        $this->assertFalse(startpage::is_due());
    }

    /**
     * A kind proposes its categories only if asked and only where there are none, and the sources are saved as they come.
     */
    public function test_what_a_kind_proposes(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $c = 'local_oksigeniahechauka';
        $_POST = ['kind' => 'university', 'categories' => 1, 'sourcecalendar' => 1];
        startpage::save();
        $this->assertSame('university', get_config($c, 'centrekind'));
        $this->assertSame('21:00', get_config($c, 'dayend'));
        $this->assertCount(4, categories::all());
        $this->assertSame('1', (string) get_config($c, 'sourcecalendar'));
        $this->assertSame('0', (string) get_config($c, 'sourcenews'));

        // With categories of its own, nothing is touched; and what is not on the list is no kind.
        categories::save([['name' => 'Mías']]);
        $_POST = ['kind' => 'school', 'categories' => 1];
        startpage::save();
        $this->assertCount(1, categories::all());
        $this->assertSame('21:00', get_config($c, 'dayend'));
        $_POST = ['kind' => 'castle'];
        startpage::save();
        $this->assertSame('school', get_config($c, 'centrekind'));
    }

    /**
     * What is missing says so, and goes away as it is done.
     */
    public function test_what_is_missing(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $labels = array_column(startpage::missing(), 'label');
        $this->assertContains(get_string('start_missing_place', 'local_oksigeniahechauka'), $labels);
        $this->assertContains(get_string('start_missing_screen', 'local_oksigeniahechauka'), $labels);
        set_config('lat', 28.4, 'local_oksigeniahechauka');
        set_config('lon', -16.3, 'local_oksigeniahechauka');
        $labels = array_column(startpage::missing(), 'label');
        $this->assertNotContains(get_string('start_missing_place', 'local_oksigeniahechauka'), $labels);
    }
}
