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

/**
 * Videos made ready for the screens.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * A video as it comes from a phone (HEVC, 4K, 60 fps, turned on its side) does not play on every screen. With ffmpeg,
 * the server makes of it what every screen plays: H.264 in MP4, 1080p at most, 30 fps at most, without sound, and a
 * still and a blurred still for the poster and the backdrop. Without ffmpeg, the video goes as it was uploaded.
 *
 * The state of each video is in the data of its item: videosource (the content hash of the upload it was made from),
 * videostate (pending, ready, failed or asis), videoqueued, and the duration and size of the result.
 */
class video {
    /** Seconds a conversion may last. */
    const TIMEOUT = 1200;

    /** Seconds of video kept, at most. */
    const MAX_SECONDS = 600;

    /** Seconds a pending video is held back from the screens before it goes as it was uploaded. */
    const HOLD = 3600;

    /** The parts made from the upload. */
    const AREAS = [files::VIDEO, files::POSTER, files::BACKDROP];

    /**
     * The path of ffmpeg, if it is set and can run.
     *
     * @return string|null
     */
    public static function ffmpeg(): ?string {
        $path = trim((string) get_config('local_oksigeniahechauka', 'ffmpeg'));
        if ($path === '' || !function_exists('proc_open') || !is_file($path) || !is_executable($path)) {
            return null;
        }
        return $path;
    }

    /**
     * Whether a file is a video.
     *
     * @param \stored_file $file
     * @return bool
     */
    public static function is_video(\stored_file $file): bool {
        return strpos((string) $file->get_mimetype(), 'video/') === 0;
    }

    /**
     * After an item is saved: if its video is new, forgets what was made from the old one and asks for a new
     * conversion.
     *
     * @param int $itemid
     * @return void
     */
    public static function queue(int $itemid): void {
        global $DB;
        $record = $DB->get_record('local_oksigeniahechauka_item', ['id' => $itemid]);
        if (!$record) {
            return;
        }
        $data = items::data($record);
        $file = files::first(files::MEDIA, $itemid);
        $source = $file && self::is_video($file) ? $file->get_contenthash() : '';
        $same = $source !== '' && ($data['videosource'] ?? '') === $source;
        if ($same && !(($data['videostate'] ?? '') === 'asis' && self::ffmpeg())) {
            // Nothing new; a video that went as it was is made ready when ffmpeg arrives and it is saved again.
            return;
        }
        $fs = get_file_storage();
        foreach (self::AREAS as $area) {
            $fs->delete_area_files(files::context()->id, files::COMPONENT, $area, $itemid);
        }
        foreach (['videosource', 'videostate', 'videoqueued', 'videoduration', 'videowidth', 'videoheight'] as $key) {
            unset($data[$key]);
        }
        if ($source !== '') {
            $data['videosource'] = $source;
            if (self::ffmpeg()) {
                $data['videostate'] = 'pending';
                $data['videoqueued'] = time();
                $task = new \local_oksigeniahechauka\task\prepare_video();
                $task->set_custom_data(['itemid' => $itemid, 'source' => $source]);
                \core\task\manager::queue_adhoc_task($task, true);
            } else {
                $data['videostate'] = 'asis';
            }
        }
        $DB->set_field('local_oksigeniahechauka_item', 'data', json_encode($data), ['id' => $itemid]);
    }

    /**
     * Whether a video is still being prepared and should not reach the screens yet.
     *
     * @param array $data the data of its item
     * @param int $now
     * @return bool
     */
    public static function held(array $data, int $now): bool {
        return ($data['videostate'] ?? '') === 'pending' && $now - (int) ($data['videoqueued'] ?? 0) < self::HOLD;
    }

    /**
     * Makes the video of an item ready for the screens. Run by the task, one at a time.
     *
     * @param int $itemid
     * @param string $source the content hash of the upload the task was asked for
     * @return string ready, failed, asis or gone (the item or its upload changed meanwhile)
     */
    public static function prepare(int $itemid, string $source): string {
        $file = files::first(files::MEDIA, $itemid);
        if (!$file || $file->get_contenthash() !== $source) {
            return 'gone';
        }
        $ffmpeg = self::ffmpeg();
        if (!$ffmpeg) {
            self::finish($itemid, $source, ['videostate' => 'asis']);
            return 'asis';
        }
        $dir = make_request_directory();
        $in = $dir . '/in';
        $out = $dir . '/out.mp4';
        $file->copy_content_to($in);
        [$code, $log] = self::run(self::convert_command($ffmpeg, $in, $out), self::TIMEOUT);
        if ($code !== 0 || !is_file($out) || filesize($out) === 0) {
            // In the log of the task, for whoever runs the site.
            mtrace('ffmpeg: ' . self::last_line($log));
            self::finish($itemid, $source, ['videostate' => 'failed']);
            return 'failed';
        }
        [, $log] = self::run([$ffmpeg, '-hide_banner', '-nostdin', '-i', $out], 60);
        $info = self::parse_info($log);
        $poster = $dir . '/poster.jpg';
        $at = $info['duration'] > 2 ? 1.0 : $info['duration'] / 2;
        self::run([$ffmpeg, '-hide_banner', '-nostdin', '-y', '-ss', sprintf('%.2f', $at), '-i', $out,
            '-frames:v', '1', '-q:v', '3', $poster], 60);
        $backdrop = $dir . '/backdrop.jpg';
        if (is_file($poster)) {
            self::run([$ffmpeg, '-hide_banner', '-nostdin', '-y', '-i', $poster,
                '-vf', 'scale=320:-2,gblur=sigma=6', '-q:v', '4', $backdrop], 60);
        }

        // The conversion took a while: the item may have been deleted or given another file.
        $now = files::first(files::MEDIA, $itemid);
        if (!$now || $now->get_contenthash() !== $source) {
            return 'gone';
        }
        $fs = get_file_storage();
        $name = pathinfo($file->get_filename(), PATHINFO_FILENAME);
        $made = [files::VIDEO => [$out, $name . '.mp4'], files::POSTER => [$poster, $name . '.jpg'],
            files::BACKDROP => [$backdrop, $name . '-backdrop.jpg']];
        foreach ($made as $area => [$path, $filename]) {
            $fs->delete_area_files(files::context()->id, files::COMPONENT, $area, $itemid);
            if (is_file($path) && filesize($path) > 0) {
                $fs->create_file_from_pathname([
                    'contextid' => files::context()->id,
                    'component' => files::COMPONENT,
                    'filearea' => $area,
                    'itemid' => $itemid,
                    'filepath' => '/',
                    'filename' => $filename,
                ], $path);
            }
        }
        self::finish($itemid, $source, ['videostate' => 'ready', 'videoduration' => $info['duration'],
            'videowidth' => $info['width'], 'videoheight' => $info['height']]);
        return 'ready';
    }

    /**
     * What ffmpeg is told to do with an upload: every screen plays H.264 in MP4. 1080p at most in either
     * orientation, never larger than the upload; 30 fps at most; no sound (screens play muted); the index at the start,
     * so a screen can begin before the whole file has arrived. Two threads for reading and two for writing, so the
     * server keeps serving its pages (a 4K video from a phone takes about 400 MB like this, twice as much without).
     *
     * @param string $ffmpeg
     * @param string $in
     * @param string $out
     * @return string[]
     */
    public static function convert_command(string $ffmpeg, string $in, string $out): array {
        $scale = "scale=w='if(gte(iw,ih),min(iw,1920),min(iw,1080))':h='if(gte(iw,ih),min(ih,1080),min(ih,1920))'"
            . ':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1';
        return [$ffmpeg, '-hide_banner', '-nostdin', '-y', '-threads', '2', '-i', $in, '-t', (string) self::MAX_SECONDS,
            '-map', '0:v:0', '-an', '-sn', '-dn', '-vf', $scale, '-fpsmax', '30',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-maxrate', '6M', '-bufsize', '12M',
            '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            '-threads', '2', $out];
    }

    /**
     * The duration and size of a video, from what ffmpeg says about it.
     *
     * @param string $log what «ffmpeg -i» writes
     * @return array ['duration' => float, 'width' => int, 'height' => int]
     */
    public static function parse_info(string $log): array {
        $info = ['duration' => 0.0, 'width' => 0, 'height' => 0];
        if (preg_match('/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/', $log, $m)) {
            $info['duration'] = round((int) $m[1] * 3600 + (int) $m[2] * 60 + (float) $m[3], 2);
        }
        if (preg_match('/Stream #[^\n]*Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/', $log, $m)) {
            $info['width'] = (int) $m[1];
            $info['height'] = (int) $m[2];
        }
        return $info;
    }

    /**
     * Writes the result into the data of the item, if the item still has the same upload.
     *
     * @param int $itemid
     * @param string $source
     * @param array $values
     * @return void
     */
    protected static function finish(int $itemid, string $source, array $values): void {
        global $DB;
        $record = $DB->get_record('local_oksigeniahechauka_item', ['id' => $itemid]);
        if (!$record) {
            return;
        }
        $data = items::data($record);
        if (($data['videosource'] ?? '') !== $source) {
            return;
        }
        unset($data['videoqueued']);
        $DB->set_field('local_oksigeniahechauka_item', 'data', json_encode($values + $data), ['id' => $itemid]);
    }

    /**
     * Runs a command without a shell, with a time limit.
     *
     * @param string[] $command
     * @param int $timeout seconds
     * @return array [exit code (-1 when it could not start, -2 when it ran out of time), what it wrote]
     */
    protected static function run(array $command, int $timeout): array {
        $pipes = [];
        $process = proc_open($command, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (!is_resource($process)) {
            return [-1, ''];
        }
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        $log = '';
        $deadline = time() + $timeout;
        while (true) {
            $log = substr($log . stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]), -20000);
            $status = proc_get_status($process);
            if (!$status['running']) {
                $code = (int) $status['exitcode'];
                break;
            }
            if (time() > $deadline) {
                proc_terminate($process, 9);
                $code = -2;
                break;
            }
            usleep(200000);
        }
        $log .= stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);
        return [$code, $log];
    }

    /**
     * The last line of a log, short.
     *
     * @param string $log
     * @return string
     */
    protected static function last_line(string $log): string {
        $lines = array_values(array_filter(array_map('trim', explode("\n", $log))));
        return $lines ? substr(end($lines), 0, 200) : '';
    }
}
