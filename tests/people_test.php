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

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\people;

/**
 * Choosing people in the panel: by name for whoever runs the screens, also by email for whoever may see emails in this
 * Moodle; and what is said under someone who has it through a role of the site.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\people
 * @covers     \local_oksigeniahechauka\local\access
 */
#[\PHPUnit\Framework\Attributes\CoversClass(people::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(access::class)]
final class people_test extends \advanced_testcase {
    /**
     * By email only for whoever may see emails, and then the email is under the name.
     */
    public function test_by_email_only_for_whoever_may_see_emails(): void {
        global $CFG, $DB;
        $this->resetAfterTest();
        $CFG->showuseridentity = 'email';
        $gen = $this->getDataGenerator();
        $gen->create_user(['firstname' => 'Darío', 'lastname' => 'Pérez', 'email' => 'dperez@centre.example',
            'department' => 'Secretaría']);
        $runs = $gen->create_user(['firstname' => 'Marta', 'lastname' => 'León']);
        $managerrole = (int) $DB->get_field('role', 'id', ['shortname' => access::MANAGER]);
        role_assign($managerrole, $runs->id, \context_system::instance()->id);

        // Whoever runs the screens, without seeing emails: by name, and the email is neither searched nor shown.
        $this->setUser($runs);
        $this->assertFalse(people::by_email());
        $found = people::find('Pérez', []);
        $this->assertCount(1, $found);
        $this->assertSame('Secretaría', $found[0]['detail']);
        $this->assertSame([], people::find('dperez@cen', []));

        // The administrator sees emails here: by email too, and under the name.
        $this->setAdminUser();
        $this->assertTrue(people::by_email());
        $found = people::find('dperez@cen', []);
        $this->assertCount(1, $found);
        $this->assertSame('Darío Pérez', $found[0]['name']);
        $this->assertSame('Secretaría · dperez@centre.example', $found[0]['detail']);
        $this->assertSame('DP', $found[0]['initials']);

        // Less than two characters, nobody.
        $this->assertSame([], people::find('d', []));
    }

    /**
     * Someone who runs the screens through Moodle's «Manager» of the whole site is shown with that role's name.
     */
    public function test_a_role_of_the_site_is_named(): void {
        global $DB;
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Sergio', 'lastname' => 'Ruiz']);
        $system = \context_system::instance();
        $manager = $DB->get_record('role', ['shortname' => 'manager']);
        role_assign($manager->id, $user->id, $system->id);
        $holders = access::holders('managescreens', access::MANAGER);
        $mine = array_values(array_filter($holders, fn($h) => (int) $h['user']->id === (int) $user->id));
        $this->assertCount(1, $mine);
        $this->assertFalse($mine[0]['own']);
        $this->assertSame(role_get_name($manager, $system), $mine[0]['via']);
    }
}
