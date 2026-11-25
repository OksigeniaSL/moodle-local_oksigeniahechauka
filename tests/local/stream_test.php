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
 * The address of a video that needs no key, for the displays whose own player asks for it: good for one screen, one file and a
 * few days, and dead with the screen's key.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\files
 */
#[\PHPUnit\Framework\Attributes\CoversClass(files::class)]
final class stream_test extends \advanced_testcase {
    /**
     * A paired screen.
     *
     * @param string $name
     * @return \stdClass
     */
    protected function screen(string $name): \stdClass {
        global $DB;
        $id = $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => $name, 'template' => 'zones',
            'theme' => 'site', 'keyhash' => sha1($name), 'timecreated' => 1, 'timemodified' => 1]);
        return $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id]);
    }

    /**
     * The address opens its file to its screen until its day, and nothing else.
     */
    public function test_the_address(): void {
        global $DB;
        $this->resetAfterTest();
        $now = strtotime('2026-11-25 12:00 UTC');
        $one = $this->screen('Entrada');
        $two = $this->screen('Biblioteca');
        $url = new \moodle_url(files::stream(45, $one, '2026-11-28'));
        $this->assertSame('45', $url->param('f'));
        $sign = (string) $url->param('t');
        $this->assertMatchesRegularExpression('/^[0-9a-f]{40}$/', $sign);
        $id = (int) $one->id;
        $this->assertSame($one->id, files::stream_screen(45, $id, '2026-11-28', $sign, $now)->id);
        $this->assertNotNull(files::stream_screen(45, $id, '2026-11-28', $sign, $now + 3 * DAYSECS));
        // Not for another file, another screen, another day, nor once it is over.
        $this->assertNull(files::stream_screen(46, $id, '2026-11-28', $sign, $now));
        $this->assertNull(files::stream_screen(45, (int) $two->id, '2026-11-28', $sign, $now));
        $this->assertNull(files::stream_screen(45, $id, '2026-12-28', $sign, $now));
        $this->assertNull(files::stream_screen(45, $id, '2026-11-28', $sign, $now + 4 * DAYSECS));
        $this->assertNull(files::stream_screen(45, $id, 'x', $sign, $now));
        $this->assertNull(files::stream_screen(45, $id, '2026-11-28', '', $now));
        // Out with its key: paired again, or taken off.
        $DB->set_field('local_oksigeniahechauka_screen', 'keyhash', sha1('otra'), ['id' => $id]);
        $this->assertNull(files::stream_screen(45, $id, '2026-11-28', $sign, $now));
        $DB->set_field('local_oksigeniahechauka_screen', 'keyhash', null, ['id' => $id]);
        $this->assertNull(files::stream_screen(45, $id, '2026-11-28', $sign, $now));
        $this->assertNull(files::stream_screen(45, $id, '2026-11-28', '', $now));
    }
}
