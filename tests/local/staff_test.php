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
 * The people of the birthday list and their accounts: linked by themselves when the name fits a single account, never to
 * someone else already on the list, by hand from the panel; and the weekend's birthdays on the screens the day before.
 * Example data.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\birthdays
 */
#[\PHPUnit\Framework\Attributes\CoversClass(birthdays::class)]
final class staff_test extends \advanced_testcase {
    /**
     * A line of the list as it was written before the links existed: no account.
     *
     * @param string $name
     * @param int $day
     * @param int $month
     * @return int its id
     */
    protected function written(string $name, int $day, int $month): int {
        global $DB;
        return (int) $DB->insert_record(birthdays::TABLE, (object) ['name' => $name, 'groupname' => '', 'day' => $day,
            'month' => $month, 'usermodified' => 0, 'timecreated' => time(), 'timemodified' => time()]);
    }

    /**
     * The words of the name in a single account, with its first name first; two that fit are none; never an account already
     * on the list with another birthday; a second line with another date does not take the same account.
     */
    public function test_relink(): void {
        global $DB;
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $yaiza = $gen->create_user(['firstname' => 'Yaiza', 'lastname' => 'Corujo Febles']);
        $rafael = $gen->create_user(['firstname' => 'Rafael Adrián', 'lastname' => 'García García']);
        $gen->create_user(['firstname' => 'María', 'lastname' => 'Martín López']);
        $gen->create_user(['firstname' => 'María', 'lastname' => 'Martín Pérez']);
        // A pupil already on the list, from the school's records, with another birthday.
        $pupil = $gen->create_user(['firstname' => 'Ana', 'lastname' => 'Rodríguez de la Cruz']);
        $DB->insert_record(birthdays::TABLE, (object) ['name' => 'Ana Rodríguez', 'groupname' => '3.º A', 'day' => 2,
            'month' => 2, 'userid' => $pupil->id, 'source' => birthdays::CIFRA, 'sourcekey' => 'p1', 'usermodified' => 0,
            'timecreated' => time(), 'timemodified' => time()]);

        $a = $this->written('Yaiza Corujo', 15, 3);
        $b = $this->written('Rafael García', 1, 6);
        $c = $this->written('María Martín', 9, 9);
        $d = $this->written('Ana Rodríguez Cruz', 20, 10);
        $e = $this->written('Corujo Yaiza', 4, 4);
        $f = $this->written('Yaiza Corujo Febles', 16, 3);

        $this->assertSame(2, birthdays::relink());
        $this->assertEquals($yaiza->id, $DB->get_field(birthdays::TABLE, 'userid', ['id' => $a]));
        $this->assertEquals($rafael->id, $DB->get_field(birthdays::TABLE, 'userid', ['id' => $b]));
        // Two Marías Martín: neither.
        $this->assertEmpty($DB->get_field(birthdays::TABLE, 'userid', ['id' => $c]));
        // The pupil is on the list with another birthday: not her.
        $this->assertEmpty($DB->get_field(birthdays::TABLE, 'userid', ['id' => $d]));
        // A surname first is not a first name.
        $this->assertEmpty($DB->get_field(birthdays::TABLE, 'userid', ['id' => $e]));
        // Yaiza's account already has her birthday: a second line with another date is someone else.
        $this->assertEmpty($DB->get_field(birthdays::TABLE, 'userid', ['id' => $f]));
        $this->assertSame(0, birthdays::relink());

        // By hand, from the panel: linked, and unlinked.
        $this->assertTrue(birthdays::link($c, (int) $rafael->id));
        $this->assertEquals($rafael->id, $DB->get_field(birthdays::TABLE, 'userid', ['id' => $c]));
        $this->assertTrue(birthdays::link($c, 0));
        $this->assertEmpty($DB->get_field(birthdays::TABLE, 'userid', ['id' => $c]));
        $this->assertFalse(birthdays::link($c, 999999));
        $this->assertFalse(birthdays::link(999999, (int) $rafael->id));
    }

    /**
     * The weekend after a day, by the site's calendar: Saturday and Sunday unless it says otherwise.
     */
    public function test_weekend_after(): void {
        $this->resetAfterTest();
        $this->assertSame(['2026-11-14', '2026-11-15'], birthdays::weekend_after('2026-11-13'));
        $this->assertSame([], birthdays::weekend_after('2026-11-12'));
        $this->assertSame([], birthdays::weekend_after('2026-11-14'));
        // A weekend of Friday and Saturday.
        set_config('calendar_weekend', (1 << 5) | (1 << 6));
        $this->assertSame(['2026-11-13', '2026-11-14'], birthdays::weekend_after('2026-11-12'));
        $this->assertSame([], birthdays::weekend_after('2026-11-15'));
    }

    /**
     * The screens on the day before the weekend: the weekend's birthdays too, each with their day, and the heading that
     * says so.
     */
    public function test_weekend_on_the_screens(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        birthdays::add('Luis Viernes', '2.º B', 13, 11);
        birthdays::add('Sara Domingo', '', 15, 11);
        $config = (object) ['sourcebirthdays' => 1];
        $friday = (new \DateTime('2026-11-13 10:00', \core_date::get_server_timezone_object()))->getTimestamp();
        $items = birthdays::items($config, $friday);
        $this->assertSame('birthdays-2026-11-13', $items[0]['id']);
        $this->assertSame(get_string('label_birthdays_andweekend', 'local_oksigeniahechauka'), $items[0]['label']);
        $this->assertSame(['Luis Viernes', 'Sara Domingo'], array_column($items[0]['people'], 'name'));
        $this->assertStringContainsString(' ', $items[0]['people'][1]['group']);
        $this->assertSame('2.º B', $items[0]['people'][0]['group']);
        // On Thursday, tomorrow's item has them too, so that a screen without network knows them.
        $thursday = $friday - DAYSECS;
        $items = birthdays::items($config, $thursday);
        $this->assertCount(1, $items);
        $this->assertSame('birthdays-2026-11-13', $items[0]['id']);
        // Only the weekend's: its own heading.
        birthdays::delete((int) birthdays::all()[0]->id);
        $items = birthdays::items($config, $friday);
        $this->assertSame(get_string('label_birthdays_weekend_one', 'local_oksigeniahechauka'), $items[0]['label']);
        // On Sunday itself, a screen that is on shows it as any other day.
        $sunday = $friday + 2 * DAYSECS;
        $this->assertArrayNotHasKey('label', birthdays::items($config, $sunday)[0]);
    }
}
