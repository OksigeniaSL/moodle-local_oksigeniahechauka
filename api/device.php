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
 * The software of the screens' own device (device/): its manifest, Oksigenia's signature of it and each of its files, for
 * the guardian of each screen to keep itself up to date from its Moodle. Public: it is the plugin's own free code, and a
 * screen only installs what the signature vouches for.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// phpcs:disable moodle.Files.RequireLogin.Missing

define('NO_MOODLE_COOKIES', true);
define('NO_DEBUG_DISPLAY', true);

require(__DIR__ . '/../../../config.php');

$dir = __DIR__ . '/../device/';
$name = optional_param('f', 'manifest.json', PARAM_PATH);

// What a new screen asks when someone types this Moodle's address on it: that Hechauka is here, the name of the site,
// to say where it got connected, and its time zone, which the device takes as its own.
if ($name === 'hola') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Content-Type-Options: nosniff');
    echo json_encode([
        'hechauka' => 1,
        'version' => (int) get_config('local_oksigeniahechauka', 'version'),
        'sitio' => format_string($SITE->fullname, true, ['context' => context_system::instance(), 'escape' => false]),
        'zona' => core_date::get_server_timezone(),
    ]);
    die();
}
$manifest = json_decode((string) file_get_contents($dir . 'manifest.json'), true);
$allowed = ['manifest.json', 'manifest.sig'];
foreach ($manifest['files'] ?? [] as $entry) {
    $allowed[] = 'raiz' . $entry['path'];
}
if (!in_array($name, $allowed, true) || !is_readable($dir . $name)) {
    http_response_code(404);
    die();
}
header('Content-Type: application/octet-stream');
header('Content-Length: ' . filesize($dir . $name));
header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');
readfile($dir . $name);
