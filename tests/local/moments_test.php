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
 * «The library celebrates»: what Ayvurenda celebrates this week, on the screens, in its own words and without names.
 * Example data, with a stand-in for Ayvurenda.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\sources
 */
#[\PHPUnit\Framework\Attributes\CoversClass(sources::class)]
final class moments_test extends \advanced_testcase {
    /**
     * Nothing to tell, nothing; then the most worth telling first, four at most, as plain text, with the cover of the book
     * the moment is about and the library only when there are several.
     */
    public function test_moments(): void {
        if (class_exists('\local_oksigeniaayvurenda\api') && !property_exists('\local_oksigeniaayvurenda\api', 'moments')) {
            $this->markTestSkipped('Oksigenia Ayvurenda is installed: its own tests cover its moments.');
        }
        $this->resetAfterTest();
        require_once(__DIR__ . '/../fixtures/ayvurenda_api.php');
        $now = make_timestamp(2026, 11, 13, 10, 0);
        \local_oksigeniaayvurenda\api::$moments = [];
        $this->assertTrue(sources::has_moments());
        $this->assertSame([], sources::moments($now));

        $cover = get_file_storage()->create_file_from_string(['contextid' => \context_system::instance()->id,
            'component' => 'local_oksigeniaayvurenda', 'filearea' => 'cover', 'itemid' => 7, 'filepath' => '/',
            'filename' => 'cover.jpg'], 'example cover');
        $one = function (string $kind, string $text, $cover = null, string $library = 'Biblioteca') {
            return ['kind' => $kind, 'text' => $text, 'recordid' => $cover ? 7 : 0, 'cover' => $cover, 'library' => $library,
                'entityid' => 1];
        };
        \local_oksigeniaayvurenda\api::$moments = [
            $one('loans', 'Este curso ya van 1.000 libros prestados. El número 1.000 fue «<b>El faro</b>».'),
            $one('book', '«Momo» ha llegado esta semana a las 100 salidas.', $cover),
            $one('record', ' '),
            $one('record', 'El martes fue el día con más préstamos del curso: 64 libros.'),
            $one('quest', 'Un lector ha llegado esta semana a la meta de «Diez libros».'),
            $one('first', '12 lectores se han llevado esta semana su primer libro de la biblioteca.'),
        ];
        $item = sources::moments($now)[0];
        $this->assertSame('moments', $item['type']);
        $this->assertSame('extra', $item['zone']);
        $this->assertSame(get_string('label_moments', 'local_oksigeniahechauka'), $item['label']);
        $this->assertSame(['loans', 'book', 'record', 'quest'], array_column($item['moments'], 'kind'));
        $this->assertSame('Este curso ya van 1.000 libros prestados. El número 1.000 fue «El faro».',
            $item['moments'][0]['text']);
        $this->assertArrayNotHasKey('cover', $item['moments'][0]);
        $this->assertArrayHasKey('cover', $item['moments'][1]);
        $this->assertArrayNotHasKey('library', $item['moments'][0]);

        // Two libraries: each moment says where, as a place.
        \local_oksigeniaayvurenda\api::$moments = [$one('record', 'El martes fue el día con más préstamos.', null, 'Norte'),
            $one('first', '12 lectores se han llevado su primer libro.', null, 'Sur')];
        $item = sources::moments($now)[0];
        $this->assertSame(get_string('books_library', 'local_oksigeniahechauka', 'Norte'), $item['moments'][0]['library']);
        \local_oksigeniaayvurenda\api::$moments = [];
    }

    /**
     * On the screens only when the centre leaves it on.
     */
    public function test_in_the_manifest(): void {
        if (class_exists('\local_oksigeniaayvurenda\api') && !property_exists('\local_oksigeniaayvurenda\api', 'moments')) {
            $this->markTestSkipped('Oksigenia Ayvurenda is installed: its own tests cover its moments.');
        }
        $this->resetAfterTest();
        require_once(__DIR__ . '/../fixtures/ayvurenda_api.php');
        \local_oksigeniaayvurenda\api::$moments = [['kind' => 'record', 'text' => 'El martes fue el día con más préstamos.',
            'recordid' => 0, 'cover' => null, 'library' => 'Biblioteca', 'entityid' => 1]];
        $method = new \ReflectionMethod(manifest::class, 'source_items');
        $types = function (bool $on) use ($method) {
            $config = (object) ['sourcemoments' => $on ? 1 : 0];
            return array_column($method->invoke(null, $config, time(), []), 'type');
        };
        $this->assertContains('moments', $types(true));
        $this->assertNotContains('moments', $types(false));
        \local_oksigeniaayvurenda\api::$moments = [];
    }
}
