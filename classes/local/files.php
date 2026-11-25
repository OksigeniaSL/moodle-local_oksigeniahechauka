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
 * The files of the screens: pictures and videos, their posters, the logos and the screenshots.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * Where each file lives and how the contract describes it.
 */
class files {
    /** Component of every file. */
    const COMPONENT = 'local_oksigeniahechauka';

    /** @var array The files of a long list of items, read at once (prime): area => itemid => stored_file[]. */
    protected static $primed = [];

    /** The file of an item, as it was uploaded. */
    const MEDIA = 'media';

    /** A video made ready for the screens, when the server can convert it. */
    const VIDEO = 'video';

    /** A still of a video. */
    const POSTER = 'poster';

    /** The picture of someone on the list of birthdays. */
    const BIRTHDAY = 'birthday';

    /** A blurred still of a video, behind it when it does not fill its zone. */
    const BACKDROP = 'backdrop';

    /** The logo of the site for the light theme. */
    const LOGO = 'logo';

    /** The logo of the site for the dark theme. */
    const LOGODARK = 'logodark';

    /** The picture of a centre's guide for its open acts, copied from the admissions plugin (item id 0). */
    const GUIDE = 'guide';

    /** The last screenshot of each screen (item id = screen id). */
    const SHOT = 'shot';

    /**
     * The context of every file.
     *
     * @return \context_system
     */
    public static function context(): \context_system {
        return \context_system::instance();
    }

    /**
     * The first file of an area and item, or null.
     *
     * @param string $area
     * @param int $itemid
     * @return \stored_file|null
     */
    public static function first(string $area, int $itemid): ?\stored_file {
        if (isset(self::$primed[$area][$itemid])) {
            return self::$primed[$area][$itemid] ? reset(self::$primed[$area][$itemid]) : null;
        }
        $fs = get_file_storage();
        $list = $fs->get_area_files(self::context()->id, self::COMPONENT, $area, $itemid, 'sortorder, id', false);
        return $list ? reset($list) : null;
    }

    /**
     * Every file of an item in an area, oldest first (an album's photos).
     *
     * @param string $area
     * @param int $itemid
     * @return \stored_file[]
     */
    public static function all(string $area, int $itemid): array {
        if (isset(self::$primed[$area][$itemid])) {
            $list = self::$primed[$area][$itemid];
            usort($list, function ($a, $b) {
                return $a->get_id() <=> $b->get_id();
            });
            return $list;
        }
        return array_values(get_file_storage()->get_area_files(self::context()->id, self::COMPONENT, $area, $itemid, 'id', false));
    }

    /**
     * How many files an item has in an area (an album's photos).
     *
     * @param string $area
     * @param int $itemid
     * @return int
     */
    public static function count(string $area, int $itemid): int {
        if (isset(self::$primed[$area][$itemid])) {
            return count(self::$primed[$area][$itemid]);
        }
        return count(get_file_storage()->get_area_files(self::context()->id, self::COMPONENT, $area, $itemid, 'id', false));
    }

    /**
     * The files of many items in some areas, in one reading: first() and count() take them from there (the panel's list,
     * with hundreds of items). An empty list of items forgets them.
     *
     * @param string[] $areas
     * @param int[] $itemids
     * @return void
     */
    public static function prime(array $areas, array $itemids): void {
        global $DB;
        self::$primed = [];
        if (!$itemids || !$areas) {
            return;
        }
        $fs = get_file_storage();
        foreach ($areas as $area) {
            foreach ($itemids as $id) {
                self::$primed[$area][(int) $id] = [];
            }
        }
        [$inareas, $areaparams] = $DB->get_in_or_equal($areas, SQL_PARAMS_NAMED, 'area');
        foreach (array_chunk(array_values(array_unique(array_map('intval', $itemids))), 1000) as $chunk) {
            [$initems, $itemparams] = $DB->get_in_or_equal($chunk, SQL_PARAMS_NAMED, 'item');
            $rows = $DB->get_recordset_select(
                'files',
                "contextid = :context AND component = :component AND filearea $inareas AND itemid $initems AND filename <> '.'",
                ['context' => self::context()->id, 'component' => self::COMPONENT] + $areaparams + $itemparams,
                'sortorder, id'
            );
            foreach ($rows as $row) {
                self::$primed[$row->filearea][(int) $row->itemid][] = $fs->get_file_instance($row);
            }
            $rows->close();
        }
    }

    /**
     * A media object of the contract for a file.
     *
     * @param \stored_file $file
     * @param array $extra more fields (duration…)
     * @return array
     */
    public static function media(\stored_file $file, array $extra = []): array {
        $media = [
            'id' => (int) $file->get_id(),
            'url' => (new \moodle_url('/local/oksigeniahechauka/api/media.php', ['f' => $file->get_id()]))->out(false),
            'sha1' => $file->get_contenthash(),
            'size' => (int) $file->get_filesize(),
            'mime' => $file->get_mimetype(),
        ];
        $info = $file->is_valid_image() ? $file->get_imageinfo() : null;
        if ($info) {
            $media['width'] = (int) $info['width'];
            $media['height'] = (int) $info['height'];
        }
        return $media + $extra;
    }

    /**
     * An address for a video that needs no key: for the displays whose own player asks for it (player/src/videos.js). Signed with
     * the screen's, for that file only and for a few days, it dies with the screen's key.
     *
     * @param int $fileid
     * @param \stdClass $screen {id, keyhash}
     * @param string $until the last day it is good for, YYYY-MM-DD
     * @return string
     */
    public static function stream(int $fileid, \stdClass $screen, string $until): string {
        return (new \moodle_url('/local/oksigeniahechauka/api/media.php', ['f' => $fileid, 's' => (int) $screen->id,
            'u' => $until, 't' => self::stream_sign($fileid, $screen, $until)]))->out(false);
    }

    /**
     * The signature of such an address; empty for a screen without a key.
     *
     * @param int $fileid
     * @param \stdClass $screen
     * @param string $until
     * @return string
     */
    protected static function stream_sign(int $fileid, \stdClass $screen, string $until): string {
        $key = (string) ($screen->keyhash ?? '');
        return $key === '' ? '' : substr(hash_hmac('sha256', 'stream|' . $fileid . '|' . $screen->id . '|' . $until, $key), 0, 40);
    }

    /**
     * The screen a signed address was made for, if it is good.
     *
     * @param int $fileid
     * @param int $screenid
     * @param string $until
     * @param string $sign
     * @param int $now
     * @return \stdClass|null
     */
    public static function stream_screen(int $fileid, int $screenid, string $until, string $sign, int $now): ?\stdClass {
        global $DB;
        if (!preg_match('/^\d{4}-\d\d-\d\d$/', $until) || $until < schedule::day($now)) {
            return null;
        }
        $screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $screenid]);
        $good = $screen ? self::stream_sign($fileid, $screen, $until) : '';
        return $good !== '' && hash_equals($good, $sign) ? $screen : null;
    }

    /**
     * The logo of the Moodle site, which the screens use until the centre sets one of its own: the first day, they already
     * look like the centre's.
     *
     * @return \stored_file|null
     */
    public static function site_logo(): ?\stored_file {
        $fs = get_file_storage();
        foreach (['logo', 'logocompact'] as $area) {
            $found = $fs->get_area_files(self::context()->id, 'core_admin', $area, 0, 'itemid, filepath, filename', false);
            if ($found) {
                return reset($found);
            }
        }
        return null;
    }

    /**
     * Whether a file is a logo, which any screen may read.
     *
     * @param \stored_file $file
     * @return bool
     */
    public static function is_logo(\stored_file $file): bool {
        // The QR of a public link, too: any screen may show it.
        return $file->get_component() === 'core_admin' || in_array($file->get_filearea(), [self::LOGO, self::LOGODARK, links::QR]);
    }

    /**
     * Whether a file comes with what arrives by itself and is no item's: a cover of the library, a picture of a birthday,
     * the guide of the open acts, a picture of the centre's Instagram.
     *
     * @param \stored_file $file
     * @param \stdClass|null $screen the screen that asks for it, when a screen does
     * @return bool
     */
    public static function from_source(\stored_file $file, ?\stdClass $screen = null): bool {
        // What only the screen people touch shows (who receives a visit, the plan, «A day here»): only to one.
        $door = in_array($file->get_filearea(), [touch::VISIT, touch::MAP, touch::DAY]);
        if ($screen && $door && $file->get_component() === self::COMPONENT && !touch::contract($screen)) {
            return false;
        }
        if ($file->get_component() === self::COMPONENT && $file->get_filearea() === photoday::AREA) {
            return !$file->is_directory() && (int) $file->get_itemid() === 0;
        }
        if ($file->get_component() === self::COMPONENT && $file->get_filearea() === instagram::AREA) {
            return !$file->is_directory() && (int) $file->get_itemid() === 0;
        }
        if ($file->get_component() === self::COMPONENT && $file->get_filearea() === self::GUIDE) {
            return !$file->is_directory() && (int) $file->get_itemid() === 0;
        }
        // The door screen's: who receives a visit and its plan, the centre's map, the pictures of «A day here».
        if ($file->get_component() === self::COMPONENT && in_array($file->get_filearea(), [touch::VISIT, touch::MAP])) {
            return !$file->is_directory() && (int) $file->get_itemid() === 0;
        }
        if ($file->get_component() === self::COMPONENT && $file->get_filearea() === touch::DAY) {
            return !$file->is_directory() && (int) $file->get_itemid() >= 1 && (int) $file->get_itemid() <= touch::DAY_MOST;
        }
        if ($file->get_component() === sources::BOOKS && $file->get_filearea() === 'cover') {
            return !$file->is_directory() && sources::has_books();
        }
        $listed = $file->get_component() === self::COMPONENT && $file->get_filearea() === self::BIRTHDAY;
        if ($file->get_component() === 'user' || $file->get_component() === 'local_oksigeniafamily' || $listed) {
            return birthdays::may_show($file);
        }
        return false;
    }

    /**
     * Whether a file is one of the screens', in an area a screen may read.
     *
     * @param \stored_file $file
     * @return bool
     */
    public static function readable(\stored_file $file): bool {
        if ($file->get_component() === 'core_admin') {
            return in_array($file->get_filearea(), ['logo', 'logocompact']) && !$file->is_directory();
        }
        if (self::from_source($file)) {
            return true;
        }
        return $file->get_component() === self::COMPONENT
            && (int) $file->get_contextid() === (int) self::context()->id
            && in_array($file->get_filearea(), [self::MEDIA, self::VIDEO, self::POSTER, self::BACKDROP, self::LOGO,
                self::LOGODARK, links::QR])
            && !$file->is_directory();
    }
}
