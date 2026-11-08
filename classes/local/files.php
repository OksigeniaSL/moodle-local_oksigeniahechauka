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
        $fs = get_file_storage();
        $list = $fs->get_area_files(self::context()->id, self::COMPONENT, $area, $itemid, 'sortorder, id', false);
        return $list ? reset($list) : null;
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
     * Whether a file comes with what arrives by itself and is no item's: a cover of the library, a picture of a birthday.
     *
     * @param \stored_file $file
     * @return bool
     */
    public static function from_source(\stored_file $file): bool {
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
