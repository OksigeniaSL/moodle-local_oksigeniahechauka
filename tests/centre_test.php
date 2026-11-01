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

use local_oksigeniahechauka\local\colours;
use local_oksigeniahechauka\local\place;

/**
 * «Tu centro»: the text that reads on each colour of the school, the places found, and the map drawn by the plugin.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\colours
 * @covers     \local_oksigeniahechauka\local\place
 */
#[\PHPUnit\Framework\Attributes\CoversClass(colours::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(place::class)]
final class centre_test extends \advanced_testcase {
    /**
     * Any colour can be chosen: the text on it, white or dark, reaches 4.5:1, and so does the colour as text.
     */
    public function test_text_on_each_colour(): void {
        $this->assertSame(colours::DARK, colours::on('#f2c200'));
        $this->assertSame('#ffffff', colours::on('#1f5f8b'));
        foreach (['#e8a33a', '#f2c200', '#2f8a55', '#ffffff'] as $hex) {
            $this->assertGreaterThanOrEqual(4.5, colours::contrast(
                colours::readable($hex, colours::LIGHT_SURFACE),
                colours::LIGHT_SURFACE
            ));
            $this->assertGreaterThanOrEqual(4.5, colours::contrast(
                colours::readable($hex, colours::DARK_SURFACE),
                colours::DARK_SURFACE
            ));
            // Large and bold on the screens: 3:1 at least, whatever the colour.
            $this->assertGreaterThanOrEqual(3, colours::contrast(colours::on($hex), $hex));
        }
        $vars = colours::vars(['colourprimary' => '#F2C200', 'colouraccent' => '#e8a33a'], [2 => '#2f8a55', 3 => 'no']);
        $this->assertSame('#f2c200', $vars['--hk-primario']);
        $this->assertSame(colours::DARK, $vars['--hk-sobre-primario']);
        $this->assertArrayHasKey('--hk-acento-texto', $vars);
        $this->assertArrayHasKey('--hk-marca-2-oscuro', $vars);
        $this->assertArrayNotHasKey('--hk-marca-3', $vars);
    }

    /**
     * The places of Nominatim's answer: the town, then its province, region and country; the same place once.
     */
    public function test_places_found(): void {
        $this->resetAfterTest();
        $answer = [
            ['lat' => '28.4858', 'lon' => '-16.3159', 'display_name' => 'San Cristóbal de La Laguna, Santa Cruz de Tenerife',
                'address' => ['city' => 'San Cristóbal de La Laguna', 'province' => 'Santa Cruz de Tenerife',
                'state' => 'Canarias', 'country' => 'España']],
            ['lat' => '28.48', 'lon' => '-16.31', 'display_name' => 'La Laguna',
                'address' => ['city' => 'San Cristóbal de La Laguna', 'province' => 'Santa Cruz de Tenerife',
                'state' => 'Canarias', 'country' => 'España']],
            ['lat' => '40.0', 'lon' => '-3.0', 'display_name' => 'Somewhere, Spain', 'address' => []],
            ['display_name' => 'No point'],
        ];
        $found = place::results($answer);
        $this->assertCount(2, $found);
        $this->assertSame(
            ['San Cristóbal de La Laguna', 'Santa Cruz de Tenerife, Canarias, España', 28.4858, -16.3159],
            [$found[0]['name'], $found[0]['detail'], $found[0]['lat'], $found[0]['lon']]
        );
        $this->assertSame('Somewhere', $found[1]['name']);
        // A point written as «latitud, longitud» needs no service.
        $point = place::search('28,4858; -16,3159');
        $this->assertSame([28.4858, -16.3159], [$point[0]['lat'], $point[0]['lon']]);
        $this->assertSame([], place::search('95, 10'));
    }

    /**
     * The map: the land around the point cut to its box, the grid of degrees and the 100 km bar; the open sea, no land.
     */
    public function test_map_around_a_point(): void {
        $map = place::map(28.4858, -16.3159);
        $this->assertStringStartsWith('M', $map['land']);
        $this->assertGreaterThan(5, substr_count($map['land'], 'Z'));
        $this->assertSame(50, $map['km100']);
        // Every point of the land within the box, give or take its margin.
        preg_match_all('/[ML](-?[\d.]+) (-?[\d.]+)/', $map['land'], $m);
        $this->assertGreaterThan(-40, min(array_map('floatval', $m[1])));
        $this->assertLessThan(360, max(array_map('floatval', $m[1])));
        $this->assertStringContainsString('V200', $map['grid']);
        $this->assertSame('', place::map(0.0, -30.0)['land']);
    }

    /**
     * Each centre names its own categories: none by default, any name and words, the top course categories of Moodle
     * brought in and linked, an id that stays, and the old numbers of the four colours read as positions.
     */
    public function test_categories_of_each_centre(): void {
        global $DB;
        $this->resetAfterTest();
        $this->assertSame([], \local_oksigeniahechauka\local\categories::all());
        $cats = \local_oksigeniahechauka\local\categories::class;
        $cats::save([['name' => 'Ingeniería', 'words' => 'Ing, ETSI'], ['name' => 'Derecho', 'colour' => '#123456'],
            ['name' => ''], ['name' => 'Ciencias de la Salud']]);
        $all = $cats::all();
        $this->assertSame(['Ingeniería', 'Derecho', 'Ciencias de la Salud'], array_column($all, 'name'));
        $this->assertSame(['ing', 'etsi'], $all[0]['words']);
        $this->assertSame(['derecho'], $all[1]['words']);
        $this->assertSame('#123456', $all[1]['colour']);
        $this->assertSame(2, $cats::position($all[1]['id']));
        $this->assertSame(3, $cats::resolve(3));
        $this->assertSame(0, $cats::resolve(4));
        $this->assertSame([['n' => 1, 'name' => 'Ingeniería', 'words' => ['ing', 'etsi']]], array_slice($cats::contract(), 0, 1));
        // Moodle's top course categories, linked; a course category below one of them takes its colour.
        $faculty = $this->getDataGenerator()->create_category(['name' => 'Facultad de Bellas Artes']);
        $below = $this->getDataGenerator()->create_category(['name' => 'Grado en Diseño', 'parent' => $faculty->id]);
        $found = array_values(array_filter($cats::from_moodle(), function ($c) use ($faculty) {
            return $c['coursecat'] === (int) $faculty->id;
        }));
        $this->assertSame('Facultad de Bellas Artes', $found[0]['name']);
        $cats::save(array_merge($all, $found));
        $this->assertSame(4, $cats::of_coursecat((int) $below->id));
        $this->assertSame(0, $cats::of_coursecat(999999));
    }
}
