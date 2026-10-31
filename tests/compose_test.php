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
use local_oksigeniahechauka\local\compose;
use local_oksigeniahechauka\local\items;

/**
 * Adding content: the shortcuts of «Cuándo», the defaults that end by themselves, and saving only where one may.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\compose
 */
#[\PHPUnit\Framework\Attributes\CoversClass(compose::class)]
final class compose_test extends \advanced_testcase {
    /**
     * The shortcuts mean their dates on the day they are saved; the defaults end by themselves.
     */
    public function test_shortcuts_and_defaults(): void {
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        // Monday 2 November 2026.
        $today = '2026-11-02';
        $this->assertSame(['2026-11-02', '2026-11-02'], compose::window('today', $today));
        $this->assertSame(['2026-11-02', '2026-11-06'], compose::window('friday', $today));
        $this->assertSame(['2026-11-06', '2026-11-06'], compose::window('friday', '2026-11-06'));
        $this->assertSame(['2026-11-07', '2026-11-13'], compose::window('friday', '2026-11-07'));
        $this->assertSame(['2026-11-02', '2026-11-15'], compose::window('twoweeks', $today));
        $this->assertSame([null, null], compose::window('always', $today));
        $this->assertSame(['2026-11-02', null], compose::window('fromnow', $today));
        $this->assertSame(['2026-11-02', '2026-11-06'], compose::window(
            'untilover',
            $today,
            '',
            '',
            '2026-11-05',
            '2026-11-06'
        ));
        $this->assertSame(['2026-11-05', '2026-11-05'], compose::window('thatday', $today, '', '', '2026-11-05'));
        $this->assertSame(['2026-11-03', null], compose::window('dates', $today, '2026-11-03', ''));
        $this->assertSame([null, null], compose::window('dates', $today, 'no', ''));
        $this->assertSame('friday', compose::default_when('notice', $today));
        $this->assertSame('today', compose::default_when('ticker', '2026-11-06'));
        $this->assertSame('twoweeks', compose::default_when('media', $today));
        $this->assertSame('untilover', compose::default_when('event', $today));
        $this->assertSame('Portrait photo · 683 × 1024', compose::file_about(683, 1024, false));
    }

    /**
     * A teacher saves a notice in their group; never on every screen, never without a group.
     */
    public function test_save_where_one_may(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        force_current_language('es');
        $now = (new \DateTime('2026-11-02 10:45', \core_date::get_server_timezone_object()))->getTimestamp();
        $infantil = (int) $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => 'Infantil',
            'sortorder' => 0, 'timecreated' => $now, 'timemodified' => $now]);
        $teacher = $this->getDataGenerator()->create_user();
        role_assign(
            (int) $DB->get_field('role', 'id', ['shortname' => access::PUBLISHER]),
            $teacher->id,
            \context_system::instance()
        );
        access::set_editors($infantil, [(int) $teacher->id]);
        $this->setUser($teacher);

        $_POST = ['title' => 'Trae una hoja seca el jueves', 'body' => '', 'when' => 'friday', 'days' => [1, 2, 3, 4, 5, 6, 7],
            'groups' => [$infantil], 'whereall' => 1, 'publish' => 1, 'sesskey' => sesskey()];
        [$id, , $errors] = compose::save(null, 'notice', $now);
        $this->assertSame([], $errors);
        $item = $DB->get_record('local_oksigeniahechauka_item', ['id' => $id]);
        $this->assertSame(['2026-11-02', '2026-11-06'], [$item->datefrom, $item->dateuntil]);
        $this->assertSame((int) $teacher->id, (int) $item->createdby);
        // The choice «Todas las pantallas» is not theirs: it goes to their group.
        $this->assertSame(['all' => false, 'groups' => [$infantil], 'screens' => []], items::targets($item));

        // Without a group, it says so and saves nothing.
        $_POST['groups'] = [];
        [$id, , $errors] = compose::save(null, 'notice', $now);
        $this->assertSame(0, $id);
        $this->assertArrayHasKey('where', $errors);
        // Without a title either.
        $_POST = ['title' => '', 'groups' => [$infantil], 'days' => [1], 'sesskey' => sesskey()];
        [, , $errors] = compose::save(null, 'notice', $now);
        $this->assertArrayHasKey('title', $errors);
        $_POST = [];
    }
}
