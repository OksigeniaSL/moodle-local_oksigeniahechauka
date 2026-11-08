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
use local_oksigeniahechauka\local\sites;
use local_oksigeniahechauka\local\weather;

/**
 * The sites of a centre: which one a screen belongs to, what its manifest takes from it, and forgetting one.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\sites
 */
#[\PHPUnit\Framework\Attributes\CoversClass(sites::class)]
final class sites_test extends \advanced_testcase {
    /**
     * A group with its screens.
     *
     * @param string $name
     * @param int $order
     * @param int[] $screens
     * @return int
     */
    private function group(string $name, int $order, array $screens): int {
        global $DB;
        $id = $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => $name, 'sortorder' => $order]);
        foreach ($screens as $screen) {
            $DB->insert_record('local_oksigeniahechauka_member', (object) ['groupid' => $id, 'screenid' => $screen]);
        }
        return $id;
    }

    /**
     * A screen.
     *
     * @param string $name
     * @return \stdClass
     */
    private function screen(string $name): \stdClass {
        global $DB;
        $id = $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => $name, 'template' => 'zones',
            'theme' => 'site', 'timecreated' => 1, 'timemodified' => 1]);
        return $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id]);
    }

    /**
     * A screen takes the first of its groups that is a site, and its manifest its name and its weather.
     */
    public function test_a_screen_in_a_site(): void {
        $this->resetAfterTest();
        $now = time();
        $school = $this->screen('Entrada');
        $camp = $this->screen('Comedor del campamento');
        $sports = $this->group('Deportes', 1, [$camp->id]);
        $site = $this->group('Campamento', 2, [$camp->id]);
        $this->assertNull(sites::of_screen((int) $camp->id));
        sites::set($site, '');
        $this->assertSame($site, sites::of_screen((int) $camp->id));
        $this->assertNull(sites::of_screen((int) $school->id));
        $this->assertSame('Campamento', sites::name($site));
        sites::set($site, 'La Maresía');
        $this->assertSame('La Maresía', sites::name($site));
        $this->assertSame([$site], sites::all());
        $this->assertFalse(sites::is_site($sports));

        // The weather of its place, not the centre's.
        $c = 'local_oksigeniahechauka';
        set_config('sourceweather', 1, $c);
        // Ten minutes ago, but never yesterday: run just after midnight, the hour would not be today's.
        $midnight = usergetmidnight($now, \core_date::get_server_timezone());
        $hour = ['t' => max($now - 600, $midnight), 'temp' => 31.0, 'sky' => 'clearsky_day', 'rain' => 0];
        set_config('weatherdata', json_encode(['hours' => [['temp' => 18.0] + $hour], 'updated' => $now]), $c);
        set_config('lat' . sites::suffix($site), 28.48, $c);
        set_config('lon' . sites::suffix($site), -16.42, $c);
        set_config('weatherdata' . sites::suffix($site), json_encode(['hours' => [$hour], 'updated' => $now]), $c);
        $this->assertEquals([$hour], weather::hours(sites::suffix($site)));
        $m = manifest::build($camp, $now);
        $this->assertSame('La Maresía', $m['centre']['name']);
        $this->assertEquals(31, $m['weather']['now']['temp'] ?? null);
        $m = manifest::build($school, $now);
        $this->assertNotSame('La Maresía', $m['centre']['name']);
        $this->assertEquals(18, $m['weather']['now']['temp'] ?? null);
    }

    /**
     * Forgotten, nothing of it is left and its screens are the centre's again.
     */
    public function test_forget(): void {
        $this->resetAfterTest();
        $camp = $this->screen('Comedor');
        $site = $this->group('Campamento', 1, [$camp->id]);
        sites::set($site, 'La Maresía');
        set_config('lat' . sites::suffix($site), 28.48, 'local_oksigeniahechauka');
        get_file_storage()->create_file_from_string(['contextid' => \context_system::instance()->id,
            'component' => 'local_oksigeniahechauka', 'filearea' => 'logo', 'itemid' => $site, 'filepath' => '/',
            'filename' => 'logo.svg'], '<svg xmlns="http://www.w3.org/2000/svg"/>');
        $this->assertNotNull(sites::logo($site));
        sites::forget($site);
        $this->assertNull(sites::of_screen((int) $camp->id));
        $this->assertNull(sites::logo($site));
        $this->assertFalse(get_config('local_oksigeniahechauka', 'lat' . sites::suffix($site)));
    }
}
