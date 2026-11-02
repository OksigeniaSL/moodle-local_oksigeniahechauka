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
use local_oksigeniahechauka\local\files;
use local_oksigeniahechauka\local\manifest;
use local_oksigeniahechauka\local\schedule;

/**
 * The birthdays: from a date of the profile and from the list, on the right day, off until the centre turns them on, and a screen
 * can only read the picture of someone whose birthday is around now.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\birthdays
 */
#[\PHPUnit\Framework\Attributes\CoversClass(birthdays::class)]
final class birthdays_test extends \advanced_testcase {
    /**
     * A date field of the profile, as Moodle keeps it, for a user.
     *
     * @param string $firstname
     * @param string $lastname
     * @param int $time
     * @return \stdClass the user
     */
    protected function born(string $firstname, string $lastname, int $time): \stdClass {
        global $CFG;
        require_once($CFG->dirroot . '/user/profile/lib.php');
        $user = $this->getDataGenerator()->create_user(['firstname' => $firstname, 'lastname' => $lastname, 'department' => '3A']);
        profile_save_custom_fields($user->id, ['nacimiento' => $time]);
        return $user;
    }

    /**
     * Off by default, then from the field of the profile: the first surname, the group, and only on their day.
     */
    public function test_from_the_profile(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $this->getDataGenerator()->create_custom_profile_field(['datatype' => 'datetime', 'shortname' => 'nacimiento',
            'name' => 'Nacimiento', 'param1' => 1950, 'param2' => 2030]);
        $now = time();
        $today = schedule::day($now);
        [$year, $month, $day] = array_map('intval', explode('-', $today));
        $born = make_timestamp($year - 11, $month, $day, 12);
        $this->born('Lucía', 'Pérez García', $born);
        $this->born('Otro', 'Día', $born + 40 * DAYSECS);

        $c = 'local_oksigeniahechauka';
        $this->assertArrayHasKey('nacimiento', birthdays::fields());
        $this->assertSame([], birthdays::items(get_config($c), $now));

        set_config('sourcebirthdays', 1, $c);
        set_config('birthdayfield', 'nacimiento', $c);
        \cache::make($c, 'birthdays')->purge();
        $items = birthdays::items(get_config($c), $now);
        $this->assertCount(1, $items);
        $this->assertSame('birthdays-' . $today, $items[0]['id']);
        $this->assertSame([['name' => 'Lucía Pérez', 'group' => '3A']], $items[0]['people']);
        $this->assertStringNotContainsString((string) ($year - 11), json_encode($items));
    }

    /**
     * The list: a person per line, the year is not kept, what is not understood is said, and the same person is not twice.
     */
    public function test_the_list(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $done = birthdays::import(
            "Ana Ruiz; 3.º A; 15/03\nBeto, 02-11-2014\nCarla;\t1.º B\t29/02\nsin fecha\nMal; 31/02\n\nAna Ruiz; 4.º A; 15/03"
        );
        $this->assertSame(4, $done['added']);
        $this->assertSame(['sin fecha', 'Mal; 31/02'], $done['wrong']);
        $this->assertCount(3, birthdays::all());
        $this->assertSame('4.º A', $DB->get_field(birthdays::TABLE, 'groupname', ['name' => 'Ana Ruiz']));
        $config = (object) [];
        $this->assertSame([['name' => 'Ana Ruiz', 'group' => '4.º A']], birthdays::on($config, '2026-03-15'));
        $this->assertSame([['name' => 'Beto']], birthdays::on($config, '2026-11-02'));
        // The 29th of February, on the 28th when there is none, and on its day when there is.
        $this->assertSame('Carla', birthdays::on($config, '2026-02-28')[0]['name']);
        $this->assertSame('Carla', birthdays::on($config, '2028-02-29')[0]['name']);
        $this->assertSame([], birthdays::on($config, '2028-02-28'));
        $this->assertSame((int) $DB->get_field(birthdays::TABLE, 'id', ['name' => 'Ana Ruiz']), birthdays::who_is('ANA ruiz.JPG'));
        $this->assertNull(birthdays::who_is('nadie.jpg'));
    }

    /**
     * A screen reads a picture only with the birthdays on and around that person's day.
     */
    public function test_who_may_be_read(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $c = 'local_oksigeniahechauka';
        $now = time();
        [, $month, $day] = array_map('intval', explode('-', schedule::day($now)));
        $near = birthdays::add('Cerca', '', $day, $month);
        [, $farmonth, $farday] = array_map('intval', explode('-', schedule::day($now, 60)));
        $far = birthdays::add('Lejos', '', $farday, $farmonth);
        $fs = get_file_storage();
        $file = function (int $id) use ($fs) {
            return $fs->create_file_from_string(['contextid' => files::context()->id, 'component' => files::COMPONENT,
                'filearea' => files::BIRTHDAY, 'itemid' => $id, 'filepath' => '/', 'filename' => 'p.jpg'], 'x');
        };
        $nearfile = $file($near);
        $farfile = $file($far);
        $this->assertFalse(files::readable($nearfile));
        set_config('sourcebirthdays', 1, $c);
        $this->assertTrue(files::readable($nearfile));
        $this->assertFalse(files::readable($farfile));
        // Nobody can reach a user's own files by this door.
        $user = $this->getDataGenerator()->create_user();
        $other = $fs->create_file_from_string(['contextid' => \context_user::instance($user->id)->id, 'component' => 'user',
            'filearea' => 'private', 'itemid' => 0, 'filepath' => '/', 'filename' => 'f3.jpg'], 'x');
        $this->assertFalse(files::readable($other));
    }

    /**
     * A spreadsheet saved as CSV: its titles, its quotes, the encoding it saves by default; the model's examples left out.
     */
    public function test_the_sheet(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $model = implode("\n", array_map(function ($row) {
            return implode(';', $row);
        }, birthdays::model()));
        $sheet = "\xEF\xBB\xBF" . $model . "\n\"Pérez, Ana\";4.º A;7;5;A-77\nSin fecha;1.º B;;\n";
        $done = birthdays::import($sheet, true);
        $this->assertSame(1, $done['added']);
        $this->assertSame(['Sin fecha;1.º B;;'], $done['wrong']);
        $this->assertSame('A-77', $DB->get_field(birthdays::TABLE, 'idnumber', ['name' => 'Pérez, Ana']));
        // What a spreadsheet in Spanish saves as CSV: commas and Windows letters.
        $done = birthdays::import(\core_text::convert("Nombre,Grupo,Día,Mes\nMaría Núñez,2.º C,1,12", 'utf-8', 'windows-1252'), true);
        $this->assertSame(1, $done['added']);
        $this->assertTrue($DB->record_exists(birthdays::TABLE, ['name' => 'María Núñez', 'groupname' => '2.º C', 'day' => 1,
            'month' => 12]));
        $this->assertCount(2, birthdays::all());
    }

    /**
     * The ID number: a picture named after it finds its person, and the Moodle user with it is not twice.
     */
    public function test_the_idnumber(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $this->getDataGenerator()->create_custom_profile_field(['datatype' => 'datetime', 'shortname' => 'nacimiento',
            'name' => 'Nacimiento', 'param1' => 1950, 'param2' => 2030]);
        $now = time();
        $today = schedule::day($now);
        [$year, $month, $day] = array_map('intval', explode('-', $today));
        $inprofile = $this->born('Lucía', 'Pérez', make_timestamp($year - 11, $month, $day, 12));
        $this->getDataGenerator()->create_user(['idnumber' => 'M-2']);
        global $DB;
        $DB->set_field('user', 'idnumber', 'M-1', ['id' => $inprofile->id]);
        birthdays::add('Lucía Pérez', '3A', $day, $month, 'M-1');
        $other = birthdays::add('Pablo Ruiz', '3A', $day, $month, 'M-2');
        birthdays::add('Pablo Ruiz', '4A', 3, 3);
        $this->assertSame($other, birthdays::who_is('m-2.JPG'));
        // Two with the same name: by name it is nobody, by ID number it is one.
        $this->assertNull(birthdays::who_is('Pablo Ruiz.jpg'));
        $config = (object) ['birthdayfield' => 'nacimiento'];
        $this->assertSame(['Lucía Pérez', 'Pablo Ruiz'], array_column(birthdays::on($config, $today), 'name'));
    }

    /**
     * A manifest carries them, in a zone of their own.
     */
    public function test_in_the_manifest(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $now = time();
        [, $month, $day] = array_map('intval', explode('-', schedule::day($now)));
        birthdays::add('Hoy Mismo', '1A', $day, $month);
        set_config('sourcebirthdays', 1, 'local_oksigeniahechauka');
        $screen = (object) ['id' => 0, 'name' => 'x', 'template' => 'zones', 'theme' => 'site', 'power' => null,
            'lastinfo' => null];
        $found = array_values(array_filter(manifest::build($screen, $now)['items'], function ($it) {
            return $it['type'] === 'birthdays';
        }));
        $this->assertCount(1, $found);
        $this->assertSame('extra', $found[0]['zone']);
    }
}
