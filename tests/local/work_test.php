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
 * The screens as a door of «Your work»: nothing without a permission; for who runs them, the ones without a sign of life;
 * for who publishes everywhere, an urgent notice left on. Example data.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\work
 */
#[\PHPUnit\Framework\Attributes\CoversClass(work::class)]
final class work_test extends \advanced_testcase {
    /**
     * Gives a role of the plugin in the whole site.
     *
     * @param int $userid
     * @param string $shortname
     */
    protected function give(int $userid, string $shortname): void {
        global $DB;
        role_assign((int) $DB->get_field('role', 'id', ['shortname' => $shortname]), $userid, \context_system::instance());
    }

    /**
     * The door, by permission.
     */
    public function test_cards(): void {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/local/oksigeniahechauka/lib.php');
        $this->resetAfterTest();
        $now = time();
        $gen = $this->getDataGenerator();
        $nobody = $gen->create_user();
        $this->assertSame([], local_oksigeniahechauka_oksigenia_work((int) $nobody->id));

        $manager = $gen->create_user();
        $this->give((int) $manager->id, access::MANAGER);
        $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Entrada', 'keyhash' => sha1('a'),
            'lastseen' => $now - 30, 'alerts' => 1, 'timecreated' => $now]);
        $down = $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Comedor', 'keyhash' => sha1('b'),
            'lastseen' => $now - 2 * HOURSECS, 'alerts' => 1, 'timecreated' => $now]);
        $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Nueva', 'keyhash' => sha1('c'),
            'lastseen' => 0, 'alerts' => 1, 'timecreated' => $now]);
        $cards = work::cards((int) $manager->id, $now);
        $this->assertCount(1, $cards);
        $card = $cards[0];
        $this->assertSame('local_oksigeniahechauka', $card['key']);
        $this->assertStringContainsString('/local/oksigeniahechauka/index.php', $card['url']);
        $this->assertCount(1, $card['alerts']);
        $this->assertSame('urgent', $card['alerts'][0]['level']);
        $this->assertStringContainsString('Comedor', $card['alerts'][0]['text']);
        $this->assertStringContainsString('id=' . $down, $card['alerts'][0]['url']);
        $said = get_string('work_screens_down', 'local_oksigeniahechauka', (object) ['count' => 3, 'down' => 1]);
        $this->assertSame($said, $card['status']);
        $this->assertLessThanOrEqual(2, count($card['actions']));

        // Whoever publishes only in some groups: what is theirs, no alerts about screens.
        $publisher = $gen->create_user();
        $this->give((int) $publisher->id, access::PUBLISHER);
        $card = work::cards((int) $publisher->id, $now)[0];
        $this->assertSame([], $card['alerts']);
        $this->assertSame(get_string('work_mine', 'local_oksigeniahechauka', 0), $card['status']);

        // An urgent notice left on, for whoever can take it off.
        $DB->insert_record('local_oksigeniahechauka_item', (object) ['type' => 'urgent', 'title' => 'Simulacro', 'visible' => 1,
            'data' => '{}', 'timecreated' => $now, 'timemodified' => $now]);
        \cache::make('local_oksigeniahechauka', 'work')->purge();
        $levels = array_column(work::cards((int) $manager->id, $now)[0]['alerts'], 'level');
        $this->assertSame(['urgent', 'today'], $levels);

        // Three without a sign of life are one alert, to the panel.
        foreach (['Patio', 'Biblioteca'] as $name) {
            $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => $name, 'keyhash' => sha1($name),
                'lastseen' => $now - 2 * HOURSECS, 'alerts' => 1, 'timecreated' => $now]);
        }
        \cache::make('local_oksigeniahechauka', 'work')->purge();
        $alerts = work::cards((int) $manager->id, $now)[0]['alerts'];
        $this->assertSame(get_string('work_down_many', 'local_oksigeniahechauka', 3), $alerts[0]['text']);
        $this->assertCount(2, $alerts);
    }
}
