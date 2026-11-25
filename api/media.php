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
 * Contract: a file a screen needs, with the key of the screen. Only what is published for that screen.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// phpcs:disable moodle.Files.RequireLogin.Missing

define('NO_MOODLE_COOKIES', true);
define('NO_DEBUG_DISPLAY', true);

require(__DIR__ . '/../../../config.php');

use local_oksigeniahechauka\local\endpoint;
use local_oksigeniahechauka\local\files;
use local_oksigeniahechauka\local\items;

endpoint::method('GET');
$fileid = required_param('f', PARAM_INT);
$signed = optional_param('t', '', PARAM_ALPHANUM);
if ($signed !== '' && endpoint::key() === '') {
    // A display whose own player asks for a video, without the key (files::stream).
    $screen = files::stream_screen(
        $fileid,
        optional_param('s', 0, PARAM_INT),
        optional_param('u', '', PARAM_ALPHANUMEXT),
        $signed,
        time()
    );
    if (!$screen) {
        endpoint::fail(401, 'nokey');
    }
} else {
    $signed = '';
    $screen = endpoint::screen();
}
$file = get_file_storage()->get_file_by_id($fileid);
if ($signed !== '' && $file && strpos((string) $file->get_mimetype(), 'video/') !== 0) {
    endpoint::fail(404, 'notfound');
}
if (!$file || !files::readable($file)) {
    endpoint::fail(404, 'notfound');
}
$area = $file->get_filearea();
// The files of an item, by its id, only in the areas of items: the pictures of «A day here» have small numbers of their own.
$ofitem = $file->get_component() === files::COMPONENT
    && in_array($area, [files::MEDIA, files::VIDEO, files::POSTER, files::BACKDROP]);
$reaches = files::is_logo($file) || files::from_source($file, $screen)
    || ($ofitem && items::reaches((int) $file->get_itemid(), (int) $screen->id));
if (!$reaches) {
    endpoint::fail(404, 'notfound');
}
\core\session\manager::write_close();
// The screen stores it by its hash: it never needs to ask for the same file twice.
send_stored_file($file, YEARSECS, 0, false, ['cacheability' => 'private', 'immutable' => true]);
