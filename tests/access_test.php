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
use local_oksigeniahechauka\local\items;

/**
 * Who runs the screens without being administrators: the two roles, the groups where each one publishes, and what
 * each one may touch.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\access
 */
#[\PHPUnit\Framework\Attributes\CoversClass(access::class)]
final class access_test extends \advanced_testcase {
    /**
     * A group of screens.
     *
     * @param string $name
     * @return int
     */
    protected function group(string $name): int {
        global $DB;
        return (int) $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => $name, 'sortorder' => 0,
            'timecreated' => time(), 'timemodified' => time()]);
    }

    /**
     * An item made by someone, for some groups.
     *
     * @param int $userid
     * @param int[] $groups
     * @param bool $all
     * @return \stdClass
     */
    protected function item(int $userid, array $groups, bool $all = false): \stdClass {
        global $DB;
        $id = (int) $DB->insert_record('local_oksigeniahechauka_item', (object) ['type' => 'notice', 'title' => 'Aviso',
            'body' => '', 'data' => '{}', 'visible' => 1, 'targetall' => $all ? 1 : 0, 'everyweeks' => 0,
            'createdby' => $userid, 'usermodified' => $userid, 'timecreated' => time(), 'timemodified' => time()]);
        items::set_targets($id, $groups, []);
        return $DB->get_record('local_oksigeniahechauka_item', ['id' => $id]);
    }

    /**
     * Gives a role of the plugin in the whole site.
     *
     * @param string $shortname
     * @param int $userid
     * @return void
     */
    protected function give(string $shortname, int $userid): void {
        global $DB;
        role_assign((int) $DB->get_field('role', 'id', ['shortname' => $shortname]), $userid, \context_system::instance());
    }

    /**
     * The two roles are made at install, without archetype, with their capabilities, and the managers may give them.
     */
    public function test_roles_made_at_install(): void {
        global $DB;
        $this->resetAfterTest();
        $system = \context_system::instance();
        foreach (access::ROLES as $shortname => $capabilities) {
            $role = $DB->get_record('role', ['shortname' => $shortname], '*', MUST_EXIST);
            $this->assertSame('', (string) $role->archetype);
            $this->assertSame([(string) CONTEXT_SYSTEM], array_values(array_map('strval', get_role_contextlevels($role->id))));
            foreach (['view', 'publish', 'publishall', 'managescreens'] as $capability) {
                $given = $DB->record_exists('role_capabilities', ['roleid' => $role->id, 'contextid' => $system->id,
                    'capability' => 'local/oksigeniahechauka:' . $capability, 'permission' => CAP_ALLOW]);
                $this->assertSame(in_array($capability, $capabilities), $given, $shortname . ' ' . $capability);
            }
        }
        // Made twice, still two.
        $this->assertSame(0, access::create_roles());
        $manager = $DB->get_field('role', 'id', ['shortname' => 'manager']);
        $this->assertTrue($DB->record_exists('role_allow_assign', ['roleid' => $manager,
            'allowassign' => $DB->get_field('role', 'id', ['shortname' => access::PUBLISHER])]));
    }

    /**
     * Who publishes in some groups sends content only there, never to every screen nor to a single screen, and
     * changes only what they made, while it stays in their groups.
     */
    public function test_publisher_only_in_their_groups(): void {
        $this->resetAfterTest();
        $infantil = $this->group('Infantil');
        $primaria = $this->group('Primaria');
        $teacher = (int) $this->getDataGenerator()->create_user()->id;
        $other = (int) $this->getDataGenerator()->create_user()->id;

        // Without a group, nothing yet.
        $this->give(access::PUBLISHER, $teacher);
        $this->assertTrue(access::limited($teacher));
        $this->assertSame([], access::destinations($teacher)['groups']);
        $this->assertFalse(access::may_target(false, [$infantil], [], $teacher));

        access::set_editors($infantil, [$teacher]);
        $this->assertSame([$infantil], access::groups_of($teacher));
        $where = access::destinations($teacher);
        $this->assertFalse($where['all']);
        $this->assertSame([$infantil], array_keys($where['groups']));
        $this->assertSame([], $where['screens']);
        $this->assertTrue(access::may_target(false, [$infantil], [], $teacher));
        $this->assertFalse(access::may_target(false, [$infantil, $primaria], [], $teacher));
        $this->assertFalse(access::may_target(true, [], [], $teacher));
        $this->assertFalse(access::may_target(false, [$infantil], [7], $teacher));
        $this->assertFalse(access::may_target(false, [], [], $teacher));

        $this->assertTrue(access::may_edit($this->item($teacher, [$infantil]), $teacher));
        $this->assertFalse(access::may_edit($this->item($other, [$infantil]), $teacher));
        $this->assertFalse(access::may_edit($this->item($teacher, [], true), $teacher));

        // Out of the group, out of its content.
        $mine = $this->item($teacher, [$infantil]);
        access::set_editors($infantil, []);
        $this->assertSame([], access::groups_of($teacher));
        $this->assertFalse(access::may_edit($mine, $teacher));
    }

    /**
     * Who runs the screens publishes everywhere and changes anything; somebody without a role, nothing.
     */
    public function test_manager_everywhere_and_nobody_nothing(): void {
        $this->resetAfterTest();
        $infantil = $this->group('Infantil');
        $coordinator = (int) $this->getDataGenerator()->create_user()->id;
        $teacher = (int) $this->getDataGenerator()->create_user()->id;
        $nobody = (int) $this->getDataGenerator()->create_user()->id;
        $this->give(access::MANAGER, $coordinator);
        $this->assertFalse(access::limited($coordinator));
        $this->assertTrue(access::can('managescreens', $coordinator));
        $this->assertTrue(access::destinations($coordinator)['all']);
        $this->assertTrue(access::may_target(true, [], [], $coordinator));
        $this->assertTrue(access::may_edit($this->item($teacher, [$infantil]), $coordinator));

        $this->assertFalse(access::can('view', $nobody));
        $this->assertFalse(access::publishes($nobody));
        $this->assertFalse(access::may_target(false, [$infantil], [], $nobody));
        $this->assertFalse(access::may_edit($this->item($nobody, [$infantil]), $nobody));
    }

    /**
     * Who publishes in a group is set as a whole; a removed group takes its people with it.
     */
    public function test_editors_of_a_group(): void {
        $this->resetAfterTest();
        $infantil = $this->group('Infantil');
        $primaria = $this->group('Primaria');
        $a = (int) $this->getDataGenerator()->create_user(['firstname' => 'Ana', 'lastname' => 'Alonso'])->id;
        $b = (int) $this->getDataGenerator()->create_user(['firstname' => 'Bruno', 'lastname' => 'Bermejo'])->id;
        access::set_editors($infantil, [$a, $b]);
        access::set_editors($primaria, [$a]);
        $this->assertSame([$a, $b], array_map('intval', array_keys(access::editors($infantil))));
        access::set_editors($infantil, [$b]);
        $this->assertSame([$b], array_map('intval', array_keys(access::editors($infantil))));
        $this->assertSame([$primaria], access::groups_of($a));
        // The role comes from the panel only: a component assignment, with the group as its item.
        $this->assertTrue(access::can('publish', $a));
        access::forget_group($primaria);
        $this->assertSame([], access::groups_of($a));
        $this->assertFalse(access::can('publish', $a));
        $this->assertTrue(access::can('publish', $b));
    }
}
