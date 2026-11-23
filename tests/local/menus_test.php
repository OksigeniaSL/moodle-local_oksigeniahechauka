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
 * The menus of a day on the screens, from what Oksigenia Meals gives: every menu but those of a diet, in plain text.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\sources
 */
#[\PHPUnit\Framework\Attributes\CoversClass(sources::class)]
final class menus_test extends \advanced_testcase {
    /**
     * A day of Meals: the usual menu, a nursery's (given without choosing, not a diet), a diet's, and one written with an
     * entity.
     *
     * @param bool $withdiet whether Meals says «diet» (0.115.0 and later)
     * @return array
     */
    protected function day(bool $withdiet): array {
        $menu = function (string $name, bool $chosen, bool $diet, string $dish) use ($withdiet): array {
            $out = ['name' => $name, 'chosen' => $chosen, 'dishes' => [['part' => 'Primero', 'name' => $dish,
                'allergens' => [['code' => 'gluten', 'name' => 'Gluten &amp; trigo']]]]];
            return $withdiet ? $out + ['diet' => $diet] : $out;
        };
        return ['day' => '2026-12-24', 'served' => true, 'meals' => [['menus' => [
            $menu('Menú A', true, false, 'Lentejas'),
            $menu('Guardería', false, false, 'Puré de verduras'),
            $menu('Sin gluten', false, true, 'Arroz'),
            $menu('Menú B', true, false, 'Mac &amp; cheese'),
        ]]]];
    }

    /**
     * With «diet», the nursery's menu comes out and the diet's does not; the words, plain; each dish with its drawing and its
     * allergens, in its order.
     */
    public function test_menus_with_diet(): void {
        $this->resetAfterTest();
        $drawing = fn(string $dish) => $dish === 'Lentejas' ? 'lentejas' : '';
        $item = sources::menu_of(['type' => 'menu'], $this->day(true), true, $drawing);
        $this->assertSame(['Menú A', 'Guardería', 'Menú B'], array_column($item['menus'], 'name'));
        $this->assertSame(['Mac & cheese'], $item['menus'][2]['courses'][0]['dishes']);
        $this->assertSame(['lentejas'], $item['menus'][0]['courses'][0]['icons']);
        $this->assertSame([['gluten']], $item['menus'][1]['courses'][0]['allergens']);
        $this->assertSame(['gluten' => 'Gluten & trigo'], $item['allergennames']);
    }

    /**
     * Without «diet» (Meals before 0.115.0), a menu not chosen is taken for a diet's, as before.
     */
    public function test_menus_without_diet(): void {
        $this->resetAfterTest();
        $item = sources::menu_of(['type' => 'menu'], $this->day(false), false, null);
        $this->assertSame(['Menú A', 'Menú B'], array_column($item['menus'], 'name'));
        $this->assertArrayNotHasKey('allergens', $item['menus'][0]['courses'][0]);
        $this->assertArrayNotHasKey('icons', $item['menus'][0]['courses'][0]);
    }

    /**
     * A day with only menus of a diet has nothing for the screens.
     */
    public function test_only_diets(): void {
        $this->resetAfterTest();
        $day = ['meals' => [['menus' => [['name' => 'Sin gluten', 'chosen' => false, 'diet' => true,
            'dishes' => [['part' => 'Primero', 'name' => 'Arroz']]]]]]];
        $this->assertNull(sources::menu_of(['type' => 'menu'], $day, true, null));
    }
}
