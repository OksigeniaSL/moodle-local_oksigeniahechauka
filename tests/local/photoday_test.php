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
 * «The picture of the day»: the index once an hour, today's picture of the chosen themes kept on the server, and as an
 * item of the contract in the screen's language with its credit. Example data; the collection's answers are mocked.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\photoday
 */
#[\PHPUnit\Framework\Attributes\CoversClass(photoday::class)]
final class photoday_test extends \advanced_testcase {
    /**
     * An index of example: one of each theme.
     *
     * @return array[]
     */
    protected function index(): array {
        $one = function (string $id, string $theme) {
            return ['id' => $id, 'fichero' => 'imagenes/' . $id . '.png', 'categoria' => $theme,
                'titulo' => ['es' => 'Título ' . $id, 'en' => 'Title ' . $id], 'pie' => ['es' => 'Pie ' . $id, 'en' => 'Caption ' . $id],
                'credito' => 'Autor de ' . $id . ', CC BY 4.0'];
        };
        return [$one('a', 'universo'), $one('b', 'arte'), $one('c', 'vida'), $one('d', 'cerca'), $one('e', 'tierra')];
    }

    /**
     * A picture of example: a PNG 4 wide and 2 high.
     *
     * @return string
     */
    protected function png(): string {
        $im = imagecreatetruecolor(4, 2);
        ob_start();
        imagepng($im);
        return ob_get_clean();
    }

    /**
     * Which one is today's: in the order of the index, one a weekday, a weekend keeps Friday's, only the chosen themes.
     */
    public function test_of_day(): void {
        $index = $this->index();
        $all = photoday::THEMES;
        $monday = photoday::of_day($index, $all, '2026-11-16')['id'];
        $tuesday = photoday::of_day($index, $all, '2026-11-17')['id'];
        $this->assertNotSame($monday, $tuesday);
        $this->assertSame(photoday::of_day($index, $all, '2026-11-20'), photoday::of_day($index, $all, '2026-11-22'));
        $this->assertSame('b', photoday::of_day($index, ['arte'], '2026-11-16')['id']);
        $this->assertNull(photoday::of_day($index, [], '2026-11-16'));
        // A file that is not a plain name in its folder is never asked for.
        $this->assertNull(photoday::of_day([['fichero' => '../x.png', 'categoria' => 'arte']], $all, '2026-11-16'));
        // One of a season only in it, and the seasons the other way round in the south.
        $snow = [['fichero' => 'copo.jpg', 'categoria' => 'cerca', 'estacion' => 'invierno']];
        $this->assertNotNull(photoday::of_day($snow, $all, '2026-01-12'));
        $this->assertNull(photoday::of_day($snow, $all, '2026-07-13'));
        $this->assertNotNull(photoday::of_day($snow, $all, '2026-07-13', true));
        $this->assertSame('otono', photoday::season('2026-11-13'));
    }

    /**
     * The task brings the index and today's picture, keeps only that one, and the manifest gets it in the screen's
     * language, with its credit and its shape; nothing while the source is off.
     */
    public function test_refresh_and_item(): void {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $this->resetAfterTest();
        $c = 'local_oksigeniahechauka';
        set_config('sourcephotoday', 0, $c);
        $this->assertSame('off', photoday::refresh(time()));
        set_config('sourcephotoday', 1, $c);
        set_config('photodaythemes', 'arte', $c);
        \curl::mock_response($this->png());
        \curl::mock_response(json_encode(['tanda' => 1, 'fotos' => $this->index()]));
        $this->assertSame('today: b.png', photoday::refresh(time()));
        $this->assertSame('waiting', photoday::refresh(time() + 60));
        force_current_language('en');
        $item = photoday::items(time())[0];
        $this->assertSame('photoday', $item['type']);
        $this->assertSame('Title b', $item['title']);
        $this->assertSame('Caption b', $item['caption']);
        $this->assertSame('Autor de b, CC BY 4.0', $item['credit']);
        $this->assertSame('arte', $item['category']);
        $this->assertSame('h', $item['orientation']);
        $file = get_file_storage()->get_file(\context_system::instance()->id, files::COMPONENT, photoday::AREA, 0, '/', 'b.png');
        $this->assertTrue(files::from_source($file));
        // No theme chosen: no picture.
        set_config('photodaythemes', '', $c);
        $this->assertSame([], photoday::items(time()));
    }
}
