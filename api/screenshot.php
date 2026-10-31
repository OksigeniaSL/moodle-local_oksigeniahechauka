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
 * Contract: a screen sends what it is really showing (docs/contract.md, «Screenshot»).
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

endpoint::method('POST');
$screen = endpoint::screen();
$type = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
$ext = ['image/jpeg' => 'jpg', 'image/png' => 'png'][$type] ?? '';
if ($ext === '') {
    endpoint::fail(415, 'type', 'image/jpeg or image/png');
}
$max = 2 * 1024 * 1024;
$raw = file_get_contents('php://input', false, null, 0, $max + 1);
if ($raw === false || $raw === '' || strlen($raw) > $max) {
    endpoint::fail(413, 'toolarge');
}
$fs = get_file_storage();
$fs->delete_area_files(files::context()->id, files::COMPONENT, files::SHOT, $screen->id);
$fs->create_file_from_string([
    'contextid' => files::context()->id,
    'component' => files::COMPONENT,
    'filearea' => files::SHOT,
    'itemid' => $screen->id,
    'filepath' => '/',
    'filename' => 'shot-' . time() . '.' . $ext,
], $raw);
http_response_code(204);
die();
