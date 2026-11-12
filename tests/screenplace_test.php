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

use local_oksigeniahechauka\local\centre;
use local_oksigeniahechauka\local\manifest;
use local_oksigeniahechauka\local\schedule;
use local_oksigeniahechauka\local\screenplace;
use local_oksigeniahechauka\local\sheet;

/**
 * Where a screen is, with its opening hours, and the centre's own sentence: from the panel to the manifest.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\screenplace
 * @covers     \local_oksigeniahechauka\local\centre
 */
#[\PHPUnit\Framework\Attributes\CoversClass(screenplace::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(centre::class)]
final class screenplace_test extends \advanced_testcase {
    /**
     * A screen.
     *
     * @return \stdClass
     */
    protected function screen(): \stdClass {
        global $DB;
        $id = $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Hall', 'template' => 'zones',
            'theme' => 'site', 'timecreated' => time(), 'timemodified' => time()]);
        return $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id]);
    }

    /**
     * The place as the sheet keeps it: its rows of hours, the days it closes from today on, its words guessed from its name;
     * a name without hours is not kept, and no name is no place.
     */
    public function test_kept_from_the_sheet(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $screen = $this->screen();
        $now = time();
        $soon = schedule::day($now, 3);
        $_POST = ['name' => 'Hall', 'always' => 1, 'placename' => 'Biblioteca', 'placedays0' => [4, 1, 2, 3, 9],
            'placefrom' => ['08:00', '08:00'], 'placeuntil' => ['17:00', '14:00'], 'placedays1' => [5],
            'placeclosed' => ['2020-01-01', $soon, 'mañana', $soon]];
        $this->assertSame([], sheet::save($screen));
        $place = screenplace::get($DB->get_record('local_oksigeniahechauka_screen', ['id' => $screen->id]));
        $this->assertSame([
            'name' => 'Biblioteca',
            'words' => 'f',
            'hours' => [['days' => [1, 2, 3, 4], 'from' => '08:00', 'until' => '17:00'],
                ['days' => [5], 'from' => '08:00', 'until' => '14:00']],
            'closed' => [$soon],
        ], $place);

        // To the screen, with the days it closes; the words in English are the same for any name.
        $m = manifest::build($DB->get_record('local_oksigeniahechauka_screen', ['id' => $screen->id]), $now);
        $this->assertSame(['name' => 'Biblioteca', 'hours' => $place['hours'], 'closed' => [$soon]], $m['screen']['place']);

        // Until midnight, and a row with no day: wrong.
        $_POST = ['name' => 'Hall', 'always' => 1, 'placename' => 'Comedor', 'placedays0' => [1, 2, 3, 4, 5],
            'placefrom' => ['12:00', '13:00'], 'placeuntil' => ['23:59', '15:00']];
        $this->assertArrayHasKey('place', sheet::save($screen));
        $_POST['placefrom'] = ['12:00'];
        $_POST['placeuntil'] = ['23:59'];
        $this->assertSame([], sheet::save($screen));
        $place = screenplace::get($DB->get_record('local_oksigeniahechauka_screen', ['id' => $screen->id]));
        $this->assertSame(['m', '24:00'], [$place['words'], $place['hours'][0]['until']]);

        // A name without hours says nothing, so it is not kept; without a name, no place at all.
        $_POST = ['name' => 'Hall', 'always' => 1, 'placename' => 'Gimnasio'];
        $this->assertArrayHasKey('place', sheet::save($screen));
        $_POST = ['name' => 'Hall', 'always' => 1, 'placename' => ''];
        $this->assertSame([], sheet::save($screen));
        $screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $screen->id]);
        $this->assertNull(screenplace::get($screen));
        $this->assertArrayNotHasKey('place', manifest::build($screen, $now)['screen']);
        $_POST = [];
    }

    /**
     * The first guess of how its state is said, from the first word of its name.
     */
    public function test_feminine_guess(): void {
        $this->assertTrue(screenplace::feminine('Biblioteca'));
        $this->assertTrue(screenplace::feminine('Secretaría del centro'));
        $this->assertTrue(screenplace::feminine('Recepción'));
        $this->assertFalse(screenplace::feminine('Comedor'));
        $this->assertFalse(screenplace::feminine('Salón de actos'));
    }

    /**
     * The centre's sentence: on one line, never longer than what fits, and to every screen; empty, nothing.
     */
    public function test_centre_phrase(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $screen = $this->screen();
        $_POST = ['centrephrase' => "  Aprender juntos,\n   crecer juntos  "];
        centre::save();
        $this->assertSame('Aprender juntos, crecer juntos', get_config('local_oksigeniahechauka', 'centrephrase'));
        $this->assertSame('Aprender juntos, crecer juntos', manifest::build($screen, time())['centre']['phrase']);
        $_POST = ['centrephrase' => str_repeat('palabra ', 20)];
        centre::save();
        $this->assertSame(centre::PHRASE, \core_text::strlen(get_config('local_oksigeniahechauka', 'centrephrase')));
        $_POST = ['centrephrase' => ''];
        centre::save();
        $this->assertArrayNotHasKey('phrase', manifest::build($screen, time())['centre']);
        $_POST = [];
    }
}
