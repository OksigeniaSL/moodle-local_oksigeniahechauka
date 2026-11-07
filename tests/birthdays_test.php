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
        // The picture of the Moodle account of someone of the list, by their ID number: on their day, not on another.
        $pupil = $this->getDataGenerator()->create_user(['idnumber' => 'E-1']);
        $pupilcontext = \context_user::instance($pupil->id);
        $picture = $fs->create_file_from_string(['contextid' => $pupilcontext->id, 'component' => 'user', 'filearea' => 'icon',
            'itemid' => 0, 'filepath' => '/', 'filename' => 'f3.png'], 'x');
        $this->assertFalse(files::readable($picture));
        birthdays::add('Lejos con ID', '', $farday, $farmonth, 'E-1');
        $this->assertFalse(files::readable($picture));
        birthdays::add('Cerca con ID', '', $day, $month, 'E-1');
        $this->assertTrue(files::readable($picture));
        // Two accounts with the same ID number when it is added: it is linked to neither, and no picture goes.
        $twin = $this->getDataGenerator()->create_user(['idnumber' => 'E-2']);
        $this->getDataGenerator()->create_user(['idnumber' => 'E-2']);
        $twinpicture = $fs->create_file_from_string(['contextid' => \context_user::instance($twin->id)->id, 'component' => 'user',
            'filearea' => 'icon', 'itemid' => 0, 'filepath' => '/', 'filename' => 'f3.png'], 'x');
        birthdays::add('Gemelo', '', $day, $month, 'E-2');
        $this->assertFalse(files::readable($twinpicture));
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
        $sheet = \core_text::convert("Nombre,Grupo,Día,Mes\nMaría Núñez,2.º C,1,12", 'utf-8', 'windows-1252');
        $done = birthdays::import($sheet, true);
        $this->assertSame(1, $done['added']);
        $this->assertTrue($DB->record_exists(birthdays::TABLE, ['name' => 'María Núñez', 'groupname' => '2.º C', 'day' => 1,
            'month' => 12]));
        $this->assertCount(2, birthdays::all());
    }

    /**
     * What a management program exports: titles in any order, the surnames apart, the whole date of birth and an ID number.
     */
    public function test_a_sheet_with_titles(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $sheet = "\xEF\xBB\xBFNombre;Apellidos;Curso;Grupo;Expediente;Fecha de nacimiento\r\n" .
            "Lucía;de la Fuente Martín;1º ESO;ESO 1º A;10234;15/03/2013\r\n" .
            "Pablo;Ruiz Gómez;5º Primaria;Pri 5º B;9876;02/11/2015\r\n" .
            "Sin;Fecha;1º ESO;ESO 1º B;555;\r\n";
        $done = birthdays::import($sheet, true);
        $this->assertSame(2, $done['added']);
        $this->assertSame(['Sin;Fecha;1º ESO;ESO 1º B;555;'], $done['wrong']);
        $this->assertTrue($DB->record_exists(birthdays::TABLE, ['name' => 'Lucía de la Fuente', 'groupname' => 'ESO 1º A',
            'day' => 15, 'month' => 3, 'idnumber' => '10234']));
        $this->assertTrue($DB->record_exists(birthdays::TABLE, ['name' => 'Pablo Ruiz', 'groupname' => 'Pri 5º B',
            'day' => 2, 'month' => 11, 'idnumber' => '9876']));

        // In English, with the year first and the day and month apart in another one.
        $done = birthdays::import("Student ID,Date of birth,First name,Last name,Class\nA-1,2014-07-09,Emma,Clark,Year 6\n", true);
        $this->assertSame(1, $done['added']);
        $this->assertTrue($DB->record_exists(birthdays::TABLE, ['name' => 'Emma Clark', 'groupname' => 'Year 6', 'day' => 9,
            'month' => 7, 'idnumber' => 'A-1']));
        $done = birthdays::import("Name\tDay\tMonth\nOmar Haddad\t30\t1\n", true);
        $this->assertSame(1, $done['added']);
        $this->assertTrue($DB->record_exists(birthdays::TABLE, ['name' => 'Omar Haddad', 'day' => 30, 'month' => 1]));
    }

    /**
     * Someone of the list linked to their Moodle account: by ID number, else by email, else by a name only one account has;
     * two accounts with the name are none. The picture of a linked account goes on their day.
     */
    public function test_linked_to_their_account(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $gen = $this->getDataGenerator();
        $byid = $gen->create_user(['firstname' => 'Ana', 'lastname' => 'Ruiz Gil', 'idnumber' => 'E-7']);
        $bymail = $gen->create_user(['firstname' => 'Bruno', 'lastname' => 'Díaz', 'email' => 'bdiaz@centre.example']);
        $byname = $gen->create_user(['firstname' => 'Lucía', 'lastname' => 'de la Fuente Martín']);
        $gen->create_user(['firstname' => 'Pablo', 'lastname' => 'Ruiz']);
        $gen->create_user(['firstname' => 'Pablo', 'lastname' => 'Ruiz']);
        [, $month, $day] = array_map('intval', explode('-', schedule::day(time())));
        $sheet = "Nombre;Apellidos;Grupo;Fecha de nacimiento;Expediente;Correo\n" .
            "Ana;Ruiz Gil;ESO 1º A;" . $day . "/" . $month . "/2013;E-7;\n" .
            "Bruno;Díaz;Profesorado;3/4/1980;;bdiaz@centre.example\n" .
            "Lucía;de la Fuente Martín;Pri 2º B;5/6/2018;;\n" .
            "Pablo;Ruiz;Secretaría;7/8/1975;;\n";
        $this->assertSame(4, birthdays::import($sheet, true)['added']);
        $link = fn(string $name) => (int) $DB->get_field(birthdays::TABLE, 'userid', ['name' => $name]);
        $this->assertSame((int) $byid->id, $link('Ana Ruiz'));
        $this->assertSame((int) $bymail->id, $link('Bruno Díaz'));
        $this->assertSame((int) $byname->id, $link('Lucía de la Fuente'));
        $this->assertSame(0, $link('Pablo Ruiz'));
        // One added by hand finds its account too.
        $one = birthdays::add('Bruno Díaz', '', 3, 4);
        $this->assertSame((int) $bymail->id, (int) $DB->get_field(birthdays::TABLE, 'userid', ['id' => $one]));

        // The picture of a linked account, on their day.
        set_config('sourcebirthdays', 1, 'local_oksigeniahechauka');
        $picture = get_file_storage()->create_file_from_string(['contextid' => \context_user::instance($byid->id)->id,
            'component' => 'user', 'filearea' => 'icon', 'itemid' => 0, 'filepath' => '/', 'filename' => 'f3.png'],
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='));
        $this->assertTrue(files::readable($picture));
        $DB->set_field('user', 'picture', $picture->get_id(), ['id' => $byid->id]);
        $today = birthdays::on(get_config('local_oksigeniahechauka'), schedule::day(time()));
        $this->assertSame(['Ana Ruiz'], array_column($today, 'name'));
        $this->assertNotEmpty($today[0]['photo']);
    }

    /**
     * The pupils of Cifra: who is new comes in, who was there by hand is taken over, who changed is put right, who left goes,
     * and an empty list does not empty the screens. The same person twice is shown once.
     */
    public function test_from_cifra(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $pupil = $this->getDataGenerator()->create_user(['firstname' => 'Emma', 'lastname' => 'Clark',
            'email' => 'emma@centre.example']);
        $handmade = birthdays::add('Omar Haddad', 'Pri 3º', 30, 1, '881');
        birthdays::add('Staff Member', 'Secretaría', 2, 2);
        $person = function (int $id, string $first, string $last, string $born, string $group, string $email = '') {
            return ['id' => $id, 'nombre' => $first, 'apellido1' => $last, 'apellido2' => 'X', 'fecha_nacimiento' => $born,
                'email' => $email, 'grupo_academico_principal' => ['etiqueta' => $group], 'fecha_baja' => null];
        };
        $people = [
            11 => $person(11, 'Emma', 'Clark', '2014-07-09', 'Pri 6º A', 'emma@centre.example'),
            12 => $person(12, 'Omar', 'Haddad', '2017-01-30', 'Pri 3º B'),
            13 => $person(13, 'Lía', 'Faro', '2015-13-02', 'Pri 5º C'),
            14 => $person(14, 'Darío', 'Pérez', '', 'Pri 1º A'),
        ];
        $done = birthdays::from_cifra($people, time());
        $this->assertSame(['added' => 1, 'updated' => 0, 'adopted' => 1, 'gone' => 0, 'count' => 2], $done);
        $emma = $DB->get_record(birthdays::TABLE, ['source' => birthdays::CIFRA, 'sourcekey' => '11']);
        $this->assertSame((int) $pupil->id, (int) $emma->userid);
        $this->assertSame('Pri 6º A', $emma->groupname);
        // Omar was there by hand, with his ID number: now he is Cifra's, the same row.
        $omar = $DB->get_record(birthdays::TABLE, ['id' => $handmade]);
        $this->assertSame([birthdays::CIFRA, '12', '881', 'Pri 3º B'],
            [$omar->source, $omar->sourcekey, $omar->idnumber, $omar->groupname]);
        // A date that is not one, and no date: out.
        $this->assertFalse($DB->record_exists(birthdays::TABLE, ['sourcekey' => '13']));
        $this->assertFalse($DB->record_exists(birthdays::TABLE, ['sourcekey' => '14']));

        // Next night: Emma changed group, Omar left; the staff, written by hand, stays.
        $people[11]['grupo_academico_principal']['etiqueta'] = 'ESO 1º A';
        $people[12]['fecha_baja'] = '2026-01-01T00:00:00+01:00';
        $done = birthdays::from_cifra($people, time());
        $this->assertSame(1, $done['updated']);
        $this->assertSame(1, $done['gone']);
        $this->assertSame('ESO 1º A', $DB->get_field(birthdays::TABLE, 'groupname', ['sourcekey' => '11']));
        $this->assertFalse($DB->record_exists(birthdays::TABLE, ['id' => $handmade]));
        $this->assertTrue($DB->record_exists(birthdays::TABLE, ['name' => 'Staff Member']));

        // A list that comes empty takes nobody away.
        try {
            birthdays::from_cifra([], time());
            $this->fail('An empty list was taken.');
        } catch (\moodle_exception $e) {
            $this->assertSame('cifraerrorincomplete', $e->errorcode);
        }
        $this->assertTrue($DB->record_exists(birthdays::TABLE, ['sourcekey' => '11']));

        // Written by hand and brought from Cifra too: once on the screen.
        birthdays::add('Emma Clark', '6A', 9, 7);
        set_config('sourcebirthdays', 1, 'local_oksigeniahechauka');
        $this->assertSame(['Emma Clark'], array_column(birthdays::on(get_config('local_oksigeniahechauka'), '2026-07-09'), 'name'));

        // Off, the task does nothing; on without a connection, it says so.
        $this->assertSame('off', birthdays::sync_cifra(time()));
        set_config('birthdayscifra', 1, 'local_oksigeniahechauka');
        $this->assertSame('error: cifraerrorsettings', birthdays::sync_cifra(time()));
    }

    /**
     * Someone who asks to be forgotten leaves the list; the rest stays.
     */
    public function test_privacy_forgets_a_linked_birthday(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Ana', 'lastname' => 'Ruiz', 'idnumber' => 'E-9']);
        birthdays::add('Ana Ruiz', 'ESO 1º A', 1, 3, 'E-9');
        birthdays::add('Otra Persona', '', 2, 3);
        $contexts = \local_oksigeniahechauka\privacy\provider::get_contexts_for_userid($user->id);
        $this->assertCount(1, $contexts);
        \local_oksigeniahechauka\privacy\provider::delete_data_for_user(
            new \core_privacy\local\request\approved_contextlist($user, 'local_oksigeniahechauka', $contexts->get_contextids()));
        $this->assertFalse($DB->record_exists(birthdays::TABLE, ['userid' => $user->id]));
        $this->assertTrue($DB->record_exists(birthdays::TABLE, ['name' => 'Otra Persona']));
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
