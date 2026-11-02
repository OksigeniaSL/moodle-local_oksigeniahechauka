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
     * Nobody has what is seasonal until the centre chooses it; then it goes with its dates, which are for any year and whatever the
     * length of the month.
     */
    public function test_seasonal(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        set_config('surprises', 1, 'local_oksigeniahechauka');
        $screen = $this->screen();
        $ids = array_column(manifest::build($screen, time())['surprises']['characters'], 'id');
        $this->assertSame(surprises::CHARACTERS, $ids);

        $_POST = ['surprises' => 1, 'surpriseevery' => 20, 'surprisewho' => ['gusanito', 'nieve'],
            'surprise_nieve_fromday' => 31, 'surprise_nieve_frommonth' => 11,
            'surprise_nieve_untilday' => 6, 'surprise_nieve_untilmonth' => 1];
        surprises::save_centre();
        $people = manifest::build($screen, time())['surprises']['characters'];
        $this->assertArrayNotHasKey('season', $people[0]);
        $this->assertSame('nieve', $people[1]['id']);
        $this->assertSame(['from' => '11-30', 'until' => '01-06'], $people[1]['season']);
        $this->assertStringEndsWith('/player/sorpresas/nieve/spr.nieve.atlas.json', $people[1]['atlas']);

        // What «Tu centro» shows, with those dates.
        $seasonal = surprises::centre_context(get_config('local_oksigeniahechauka'))['seasonal'][0];
        $this->assertTrue($seasonal['checked']);
        $this->assertTrue($seasonal['from']['days'][29]['selected']);
        $this->assertTrue($seasonal['from']['months'][10]['selected']);
        $this->assertTrue($seasonal['until']['days'][5]['selected']);
        $this->assertTrue($seasonal['until']['months'][0]['selected']);

        // Dates that are none do not change those it has; unticking it keeps them for when it is ticked again.
        $_POST = ['surprises' => 1, 'surprisewho' => ['nieve'], 'surprise_nieve_fromday' => 0, 'surprise_nieve_frommonth' => 13,
            'surprise_nieve_untilday' => 6, 'surprise_nieve_untilmonth' => 1];
        surprises::save_centre();
        $this->assertSame('11-30,01-06', get_config('local_oksigeniahechauka', 'surpriseseason_nieve'));
        $_POST = ['surprises' => 1, 'surprisewho' => ['gusanito']];
        surprises::save_centre();
        $this->assertSame('11-30,01-06', get_config('local_oksigeniahechauka', 'surpriseseason_nieve'));
        $ids = array_column(manifest::build($screen, time())['surprises']['characters'], 'id');
        $this->assertSame(['gusanito'], $ids);
    }

    /**
     * Nobody has the rain until the centre chooses it; then the manifest says that it comes with the rain, with no dates.
     */
    public function test_when_raining(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        set_config('surprises', 1, 'local_oksigeniahechauka');
        $screen = $this->screen();
        $this->assertNotContains('lluvia', array_column(manifest::build($screen, time())['surprises']['characters'], 'id'));

        $_POST = ['surprises' => 1, 'surpriseevery' => 20, 'surprisewho' => ['lluvia']];
        surprises::save_centre();
        $people = manifest::build($screen, time())['surprises']['characters'];
        $this->assertCount(1, $people);
        $this->assertSame('lluvia', $people[0]['id']);
        $this->assertSame('rain', $people[0]['when']);
        $this->assertArrayNotHasKey('season', $people[0]);

        // The centre's page says when it needs the place, and not when it has it.
        $context = surprises::centre_context(get_config('local_oksigeniahechauka'));
        $this->assertTrue($context['weather'][0]['checked']);
        $this->assertTrue($context['noplace']);
        set_config('lat', '28.4858', 'local_oksigeniahechauka');
        $this->assertFalse(surprises::centre_context(get_config('local_oksigeniahechauka'))['noplace']);
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
        foreach (surprises::everyone() as $id) {
            $folder = $CFG->dirroot . '/local/oksigeniahechauka/player/sorpresas/' . $id . '/';
            $atlas = json_decode(file_get_contents($folder . 'spr.' . $id . '.atlas.json'), true);
            $files = $atlas['meta']['pages'] ?? array_column($atlas['meta']['capas'], 'image');
            $this->assertNotEmpty($files);
            foreach ($files as $page) {
                $this->assertFileExists($folder . $page);
            }
            $this->assertFileExists($folder . 'retrato.webp');
        }
    }
}
