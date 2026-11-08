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
 * The birthday in Moodle: the card of the dashboard, from the profile and from the list, until it is closed, and the
 * notification of the morning, once a year. Example data.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\greeting
 */
#[\PHPUnit\Framework\Attributes\CoversClass(greeting::class)]
final class greeting_test extends \advanced_testcase {
    /** @var string A picture of one pixel. */
    const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    /**
     * A date field of the profile, read by the plugin.
     */
    protected function field(): void {
        $this->getDataGenerator()->create_custom_profile_field(['datatype' => 'datetime', 'shortname' => 'nacimiento',
            'name' => 'Nacimiento', 'param1' => 1950, 'param2' => 2030]);
        set_config('birthdayfield', 'nacimiento', 'local_oksigeniahechauka');
        \cache::make('local_oksigeniahechauka', 'birthdays')->purge();
    }

    /**
     * Someone born on a day, by the field of the profile.
     *
     * @param string $firstname
     * @param int $year
     * @param int $month
     * @param int $day
     * @return \stdClass
     */
    protected function born(string $firstname, int $year, int $month, int $day): \stdClass {
        global $CFG;
        require_once($CFG->dirroot . '/user/profile/lib.php');
        $user = $this->getDataGenerator()->create_user(['firstname' => $firstname, 'lastname' => 'Pérez García']);
        profile_save_custom_fields($user->id, ['nacimiento' => make_timestamp($year, $month, $day, 12)]);
        return $user;
    }

    /**
     * An hour of a day of the centre.
     *
     * @param int $year
     * @param int $month
     * @param int $day
     * @param int $hour
     * @return int
     */
    protected function moment(int $year, int $month, int $day, int $hour = 12): int {
        $text = sprintf('%04d-%02d-%02d %02d:00', $year, $month, $day, $hour);
        return (new \DateTime($text, \core_date::get_server_timezone_object()))->getTimestamp();
    }

    /**
     * From the profile: on their day, not on another nor for anyone else; closed, it does not come back until next year; and
     * the centre can turn it off.
     */
    public function test_card_until_closed(): void {
        $this->resetAfterTest();
        $this->field();
        $lucia = $this->born('Lucía', 2014, 3, 15);
        $other = $this->born('Otro', 2014, 4, 20);
        $day = $this->moment(2026, 3, 15);

        $card = greeting::card((int) $lucia->id, $day);
        $this->assertSame('Lucía', $card['firstname']);
        $this->assertSame('Lucía Pérez', $card['name']);
        $this->assertSame('L', $card['initial']);
        $this->assertFalse($card['hasphoto']);
        $this->assertStringNotContainsString('2014', json_encode($card));
        $this->assertNull(greeting::card((int) $lucia->id, $this->moment(2026, 3, 16)));
        $this->assertNull(greeting::card((int) $other->id, $day));

        set_config('greetcard', 0, 'local_oksigeniahechauka');
        $this->assertNull(greeting::card((int) $lucia->id, $day));
        set_config('greetcard', 1, 'local_oksigeniahechauka');

        greeting::close((int) $lucia->id, $day);
        $this->assertNull(greeting::card((int) $lucia->id, $day + HOURSECS));
        $this->assertNotNull(greeting::card((int) $lucia->id, $this->moment(2027, 3, 15)));
    }

    /**
     * Born on 29 February: on the 28th when the year has no 29th, on the 29th when it has.
     */
    public function test_leap_day(): void {
        $this->resetAfterTest();
        $this->field();
        $user = $this->born('Bisiesto', 2012, 2, 29);
        $this->assertNotNull(greeting::card((int) $user->id, $this->moment(2026, 2, 28)));
        $this->assertNull(greeting::card((int) $user->id, $this->moment(2026, 3, 1)));
        $this->assertNotNull(greeting::card((int) $user->id, $this->moment(2028, 2, 29)));
        $this->assertNull(greeting::card((int) $user->id, $this->moment(2028, 2, 28)));
    }

    /**
     * From the list: by the account it was linked to, or by an ID number only one account has; with the list's picture
     * first; never for an account that is not in use.
     */
    public function test_from_the_list(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $linked = $this->getDataGenerator()->create_user(['firstname' => 'Ana', 'lastname' => 'Ruiz', 'idnumber' => 'E-1']);
        $id = birthdays::add('Ana Ruiz', '3.º A', 15, 3, 'E-1');
        $this->assertSame((int) $linked->id, (int) $DB->get_field(birthdays::TABLE, 'userid', ['id' => $id]));
        // On the list before the account existed: by the ID number.
        birthdays::add('Beto Gil', '1.º B', 15, 3, 'E-3');
        $later = $this->getDataGenerator()->create_user(['firstname' => 'Beto', 'lastname' => 'Gil', 'idnumber' => 'E-3']);
        // Two accounts with the ID number: none.
        birthdays::add('Gemelo', '', 15, 3, 'E-2');
        $twin = $this->getDataGenerator()->create_user(['idnumber' => 'E-2']);
        $this->getDataGenerator()->create_user(['idnumber' => 'E-2']);
        $day = $this->moment(2026, 3, 15);

        $card = greeting::card((int) $linked->id, $day);
        $this->assertSame('Ana', $card['firstname']);
        $this->assertSame('3.º A', $card['group']);
        // The party once a day: seen today, the card is just there; next year, the party again.
        $this->assertFalse($card['seen']);
        greeting::seen((int) $linked->id, '2026-03-15');
        $this->assertTrue(greeting::card((int) $linked->id, $day)['seen']);
        $this->assertFalse(greeting::card((int) $linked->id, $this->moment(2027, 3, 15))['seen']);
        // A pupil, only when the school's records say so.
        $this->assertFalse($card['student']);
        $DB->set_field(birthdays::TABLE, 'source', birthdays::CIFRA, ['id' => $id]);
        $this->assertTrue(greeting::card((int) $linked->id, $day)['student']);
        $DB->set_field(birthdays::TABLE, 'source', null, ['id' => $id]);
        $this->assertSame('1.º B', greeting::card((int) $later->id, $day)['group']);
        $this->assertNull(greeting::card((int) $twin->id, $day));
        $config = get_config('local_oksigeniahechauka');
        $this->assertSame([(int) $linked->id, (int) $later->id], birthdays::accounts_on($config, '2026-03-15'));

        // The picture of the list goes first, and only to them, on their day.
        $file = get_file_storage()->create_file_from_string(['contextid' => files::context()->id, 'component' => files::COMPONENT,
            'filearea' => files::BIRTHDAY, 'itemid' => $id, 'filepath' => '/', 'filename' => 'ana.png'], base64_decode(self::PNG));
        $this->assertTrue(greeting::card((int) $linked->id, $day)['hasphoto']);
        $this->assertEquals($file->get_id(), greeting::photo((int) $linked->id, $day)->get_id());
        $this->assertNull(greeting::photo((int) $linked->id, $this->moment(2026, 3, 16)));
        $this->assertNull(greeting::photo((int) $later->id, $day));

        $DB->set_field('user', 'suspended', 1, ['id' => $later->id]);
        $this->assertNull(greeting::card((int) $later->id, $day));
        $this->assertSame([(int) $linked->id], birthdays::accounts_on($config, '2026-03-15'));
    }

    /**
     * The notification: off until the centre turns it on, from seven, and once a year.
     */
    public function test_notification(): void {
        $this->resetAfterTest();
        $this->field();
        $this->preventResetByRollback();
        $lucia = $this->born('Lucía', 2014, 3, 15);
        $this->born('Otro', 2014, 4, 20);
        $sink = $this->redirectMessages();

        $this->assertSame('off', greeting::send($this->moment(2026, 3, 15, 9)));
        set_config('greetnotify', 1, 'local_oksigeniahechauka');
        $this->assertSame('not yet', greeting::send($this->moment(2026, 3, 15, 6)));
        $this->assertSame(0, $sink->count());

        $this->assertSame('1 sent', greeting::send($this->moment(2026, 3, 15, 8)));
        $messages = $sink->get_messages();
        $this->assertCount(1, $messages);
        $this->assertSame((int) $lucia->id, (int) $messages[0]->useridto);
        $this->assertSame('birthday', $messages[0]->eventtype);
        $this->assertStringContainsString('Lucía', $messages[0]->subject);

        $this->assertSame('0 sent', greeting::send($this->moment(2026, 3, 15, 9)));
        $this->assertSame('1 sent', greeting::send($this->moment(2027, 3, 15, 8)));
        $sink->close();
    }
}
