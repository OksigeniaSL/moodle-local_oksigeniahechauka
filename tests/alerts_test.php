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

use local_oksigeniahechauka\local\alerts;

/**
 * The warning when a screen stops answering: once, within its hours, and again when it comes back.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\alerts
 */
#[\PHPUnit\Framework\Attributes\CoversClass(alerts::class)]
final class alerts_test extends \advanced_testcase {
    /**
     * A paired screen.
     *
     * @param string $name
     * @param array $fields
     * @return int
     */
    protected function screen(string $name, array $fields = []): int {
        global $DB;
        return (int) $DB->insert_record('local_oksigeniahechauka_screen', (object) ($fields + ['name' => $name,
            'template' => 'zones', 'theme' => 'site', 'keyhash' => sha1($name), 'alerts' => 1, 'alerted' => 0,
            'timecreated' => 1, 'timemodified' => 1]));
    }

    /**
     * A moment on the site clock.
     *
     * @param string $when
     * @return int
     */
    protected function moment(string $when): int {
        return (new \DateTime($when, new \DateTimeZone('Europe/Madrid')))->getTimestamp();
    }

    /**
     * Someone who runs the screens.
     *
     * @return \stdClass
     */
    protected function manager(): \stdClass {
        global $DB;
        $user = $this->getDataGenerator()->create_user();
        role_assign($DB->get_field('role', 'id', ['shortname' => 'manager']), $user->id, \context_system::instance());
        return $user;
    }

    /**
     * Down for a while: one warning to whoever runs the screens; and one more when it comes back.
     */
    public function test_down_and_back(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setTimezone('Europe/Madrid');
        $manager = $this->manager();
        $now = $this->moment('2026-11-02 10:00');
        $id = $this->screen('Library', ['lastseen' => $now - 60]);
        $sink = $this->redirectMessages();

        $this->assertSame(['down' => 0, 'back' => 0], alerts::check($now));
        $this->assertSame(['down' => 1, 'back' => 0], alerts::check($now + 1200));
        $this->assertSame(['down' => 0, 'back' => 0], alerts::check($now + 1800));
        $messages = $sink->get_messages();
        $this->assertCount(1, $messages);
        $this->assertEquals($manager->id, $messages[0]->useridto);
        $this->assertStringContainsString('Library', $messages[0]->subject);

        $DB->set_field('local_oksigeniahechauka_screen', 'lastseen', $now + 1900, ['id' => $id]);
        $this->assertSame(['down' => 0, 'back' => 1], alerts::check($now + 1950));
        $this->assertCount(2, $sink->get_messages());
        $this->assertEquals(0, $DB->get_field('local_oksigeniahechauka_screen', 'alerted', ['id' => $id]));
    }

    /**
     * Not outside its hours, not when it has only just reached them, not when its warning is off, not when it has
     * no key.
     */
    public function test_quiet(): void {
        $this->resetAfterTest();
        $this->setTimezone('Europe/Madrid');
        $this->manager();
        $power = json_encode([['days' => [1, 2, 3, 4, 5], 'on' => '07:30', 'off' => '18:30']]);
        $friday = $this->moment('2026-11-06 18:29');
        $this->screen('Hall', ['lastseen' => $friday, 'power' => $power]);
        $this->screen('Gym', ['lastseen' => $friday, 'power' => $power, 'alerts' => 0]);
        $this->screen('Old', ['lastseen' => $friday, 'power' => $power, 'keyhash' => null]);
        $sink = $this->redirectMessages();

        $this->assertSame(['down' => 0, 'back' => 0], alerts::check($this->moment('2026-11-06 22:00')));
        $this->assertSame(['down' => 0, 'back' => 0], alerts::check($this->moment('2026-11-09 07:40')));
        $this->assertSame(['down' => 1, 'back' => 0], alerts::check($this->moment('2026-11-09 07:50')));
        $this->assertCount(1, $sink->get_messages());
    }
}
