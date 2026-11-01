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

use local_oksigeniahechauka\local\manifest;
use local_oksigeniahechauka\local\screens;
use local_oksigeniahechauka\local\surprises;

/**
 * Surprises: off until the centre turns them on, and each screen can leave them out.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\surprises
 */
#[\PHPUnit\Framework\Attributes\CoversClass(surprises::class)]
final class surprises_test extends \advanced_testcase {
    /**
     * A screen as the pairing leaves it.
     *
     * @return \stdClass
     */
    private function screen(): \stdClass {
        global $DB;
        $now = time();
        $id = $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Hall', 'template' => 'zones',
            'theme' => 'site', 'keyhash' => 'x', 'sortorder' => 0, 'timecreated' => $now, 'timemodified' => $now]);
        return $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id]);
    }

    /**
     * The manifest says nothing until the centre turns them on; then, how often and who, with where its files are.
     */
    public function test_off_until_the_centre_turns_them_on(): void {
        $this->resetAfterTest();
        $screen = $this->screen();
        $this->assertArrayNotHasKey('surprises', manifest::build($screen, time()));

        set_config('surprises', 1, 'local_oksigeniahechauka');
        $m = manifest::build($screen, time());
        $this->assertSame(20, $m['surprises']['every']);
        $this->assertSame('gusanito', $m['surprises']['characters'][0]['id']);
        $this->assertStringEndsWith(
            '/local/oksigeniahechauka/player/sorpresas/gusanito/spr.gusanito.atlas.json',
            $m['surprises']['characters'][0]['atlas']
        );
    }

    /**
     * A screen can leave them out, and the centre can leave a character out: with nobody left, none.
     */
    public function test_a_screen_or_nobody_chosen(): void {
        global $DB;
        $this->resetAfterTest();
        set_config('surprises', 1, 'local_oksigeniahechauka');
        $screen = $this->screen();
        $DB->set_field('local_oksigeniahechauka_screen', 'surprises', 0, ['id' => $screen->id]);
        $off = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $screen->id]);
        $this->assertArrayNotHasKey('surprises', manifest::build($off, time()));

        set_config('surprisewho', '', 'local_oksigeniahechauka');
        $this->assertArrayNotHasKey('surprises', manifest::build($screen, time()));
    }

    /**
     * What «Tu centro» saves comes back in the manifest, and a value that is not among the options does not change it.
     */
    public function test_save_centre(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $_POST = ['surprises' => 1, 'surpriseevery' => 60, 'surprisewho' => ['gusanito', 'unknown']];
        surprises::save_centre();
        $config = get_config('local_oksigeniahechauka');
        $this->assertSame('1', (string) $config->surprises);
        $this->assertSame('60', (string) $config->surpriseevery);
        $this->assertSame('gusanito', $config->surprisewho);

        $_POST = ['surprises' => 1, 'surpriseevery' => 5, 'surprisewho' => ['gusanito']];
        surprises::save_centre();
        $this->assertSame('60', (string) get_config('local_oksigeniahechauka', 'surpriseevery'));

        $_POST = [];
        surprises::save_centre();
        $this->assertSame('0', (string) get_config('local_oksigeniahechauka', 'surprises'));
    }

    /**
     * The order from a screen's sheet reaches the screen once.
     */
    public function test_asked_from_the_sheet(): void {
        $this->resetAfterTest();
        $screen = $this->screen();
        screens::ask((int) $screen->id, 'surprise');
        $this->assertSame(['surprise'], screens::take_commands((int) $screen->id));
        $this->assertSame([], screens::take_commands((int) $screen->id));
    }

    /**
     * The files of every character are there, and the atlas says the pages it needs.
     */
    public function test_files_are_there(): void {
        global $CFG;
        foreach (surprises::CHARACTERS as $id) {
            $folder = $CFG->dirroot . '/local/oksigeniahechauka/player/sorpresas/' . $id . '/';
            $atlas = json_decode(file_get_contents($folder . 'spr.' . $id . '.atlas.json'), true);
            $this->assertNotEmpty($atlas['meta']['pages']);
            foreach ($atlas['meta']['pages'] as $page) {
                $this->assertFileExists($folder . $page);
            }
            $this->assertFileExists($folder . 'retrato.webp');
        }
    }
}
