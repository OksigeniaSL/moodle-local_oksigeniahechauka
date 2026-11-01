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
        $vars = colours::vars(['colourprimary' => '#F2C200', 'colouraccent' => '#e8a33a', 'colour2' => '#2f8a55',
            'colour3' => 'no']);
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
}
