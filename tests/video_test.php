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

use local_oksigeniahechauka\local\items;
use local_oksigeniahechauka\local\video;

/**
 * Videos made ready for the screens, held back while that happens, and as they were when it cannot be done.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\video
 */
#[\PHPUnit\Framework\Attributes\CoversClass(video::class)]
final class video_test extends \advanced_testcase {
    /**
     * A picture-or-video item with a video file.
     *
     * @return int
     */
    protected function video_item(): int {
        global $DB;
        $id = (int) $DB->insert_record('local_oksigeniahechauka_item', (object) ['type' => 'media',
            'title' => 'Clip', 'body' => '', 'data' => '{}', 'visible' => 1, 'targetall' => 1, 'everyweeks' => 0,
            'timecreated' => time(), 'timemodified' => time()]);
        get_file_storage()->create_file_from_string(['contextid' => \context_system::instance()->id,
            'component' => 'local_oksigeniahechauka', 'filearea' => 'media', 'itemid' => $id, 'filepath' => '/',
            'filename' => 'clip.mp4'], 'not really a video');
        return $id;
    }

    /**
     * The item of the contract for an item.
     *
     * @param int $id
     * @return array|null
     */
    protected function contract(int $id): ?array {
        global $DB;
        return items::to_contract($DB->get_record('local_oksigeniahechauka_item', ['id' => $id]));
    }

    /**
     * The length and size of a video, from what ffmpeg says.
     */
    public function test_parse_info(): void {
        $log = "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'out.mp4':\n"
            . "  Duration: 00:00:31.50, start: 0.000000, bitrate: 2101 kb/s\n"
            . "  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709, progressive), "
            . "1080x1920 [SAR 1:1 DAR 9:16], 2098 kb/s, 30 fps, 30 tbr, 15360 tbn (default)\n"
            . "At least one output file must be specified\n";
        $this->assertSame(['duration' => 31.5, 'width' => 1080, 'height' => 1920], video::parse_info($log));
        $this->assertSame(['duration' => 0.0, 'width' => 0, 'height' => 0], video::parse_info('nothing'));
    }

    /**
     * What every screen plays, without taking the whole server.
     */
    public function test_command(): void {
        $command = video::convert_command('/opt/ffmpeg/ffmpeg', '/tmp/in', '/tmp/out.mp4');
        $this->assertSame('/opt/ffmpeg/ffmpeg', $command[0]);
        $this->assertSame('/tmp/out.mp4', end($command));
        foreach (['libx264', 'yuv420p', '+faststart', 'aac', '0:a:0?'] as $part) {
            $this->assertContains($part, $command);
        }
        $this->assertSame('2', $command[array_search('-threads', $command) + 1]);
        $this->assertSame('30', $command[array_search('-fpsmax', $command) + 1]);
    }

    /**
     * Without ffmpeg, the video goes as it was uploaded, at once.
     */
    public function test_without_ffmpeg(): void {
        global $DB;
        $this->resetAfterTest();
        $id = $this->video_item();
        video::queue($id);
        $data = items::data($DB->get_record('local_oksigeniahechauka_item', ['id' => $id]));
        $this->assertSame('asis', $data['videostate']);
        $this->assertEmpty(\core\task\manager::get_adhoc_tasks('\local_oksigeniahechauka\task\prepare_video'));
        $this->assertSame('video', $this->contract($id)['type']);
    }

    /**
     * With ffmpeg, the video waits for its task; if the conversion fails, it goes as it was uploaded.
     */
    public function test_held_then_failed(): void {
        global $DB;
        $this->resetAfterTest();
        $fake = is_executable('/usr/bin/true') ? '/usr/bin/true' : '/bin/true';
        if (!is_executable($fake)) {
            $this->markTestSkipped('No «true» command to stand in for ffmpeg.');
        }
        // A program that ends well and makes nothing: a conversion that fails.
        set_config('ffmpeg', $fake, 'local_oksigeniahechauka');
        $id = $this->video_item();
        video::queue($id);
        $this->assertNull($this->contract($id));
        $this->assertCount(1, \core\task\manager::get_adhoc_tasks('\local_oksigeniahechauka\task\prepare_video'));

        // Saving it again without a new file does not ask for another conversion.
        video::queue($id);
        $this->assertCount(1, \core\task\manager::get_adhoc_tasks('\local_oksigeniahechauka\task\prepare_video'));

        $this->expectOutputRegex('/failed/');
        $this->runAdhocTasks('\local_oksigeniahechauka\task\prepare_video');
        $data = items::data($DB->get_record('local_oksigeniahechauka_item', ['id' => $id]));
        $this->assertSame('failed', $data['videostate']);
        $this->assertSame('video', $this->contract($id)['type']);
    }
}
