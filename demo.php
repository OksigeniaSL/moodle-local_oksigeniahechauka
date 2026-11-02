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
 * The public demonstration screen: what goes to every screen, in the frame of a television, for anyone and without signing
 * in. Off unless the site turns it on (Site administration › Plugins › Local plugins › Hechauka).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// phpcs:disable moodle.Files.RequireLogin.Missing

define('NO_MOODLE_COOKIES', true);

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\demo;
use local_oksigeniahechauka\local\endpoint;
use local_oksigeniahechauka\local\files;
use local_oksigeniahechauka\local\player_page;

$c = 'local_oksigeniahechauka';
if (!demo::on()) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo get_string('demo_off', $c);
    die();
}
$PAGE->set_context(context_system::instance());
$now = time();
if (optional_param('manifest', 0, PARAM_BOOL)) {
    endpoint::send(demo::manifest($now)[0]);
}
$media = optional_param('media', 0, PARAM_INT);
if ($media) {
    // Only a file that the demonstration screen shows now.
    $file = in_array($media, demo::manifest($now)[1], true) ? get_file_storage()->get_file_by_id($media) : false;
    if (!$file || !files::readable($file)) {
        http_response_code(404);
        die();
    }
    send_stored_file($file, 3600, 0, false, ['dontdie' => false]);
}
$shape = optional_param('shape', 'horizontal', PARAM_ALPHA) === 'vertical' ? 'vertical' : 'horizontal';
if (optional_param('frame', 0, PARAM_BOOL)) {
    player_page::send([
        'contract' => \local_oksigeniahechauka\local\manifest::CONTRACT,
        'mode' => 'demo',
        'lang' => current_language(),
        'manifest_url' => (new moodle_url('/local/oksigeniahechauka/demo.php', ['manifest' => 1]))->out(false),
        'refresh_ms' => demo::REFRESH_MS,
        'strings' => player_page::strings(),
    ], true);
}
[$width, $height] = $shape === 'vertical' ? [1080, 1920] : [1920, 1080];
$frame = (new moodle_url('/local/oksigeniahechauka/demo.php', ['frame' => 1, 'shape' => $shape]))->out(false);
$other = (new moodle_url('/local/oksigeniahechauka/demo.php', ['shape' => $shape === 'vertical' ? 'horizontal' : 'vertical']))
    ->out(false);
header('Content-Type: text/html; charset=utf-8');
header('X-Frame-Options: SAMEORIGIN');
$sitename = format_string($SITE->fullname, true, ['context' => context_system::instance()]);
echo $OUTPUT->render_from_template('local_oksigeniahechauka/demo', [
    'lang' => current_language(),
    'title' => get_string('demo_title', $c),
    'centre' => $sitename,
    'home' => (new moodle_url('/'))->out(false),
    'back' => get_string('demo_back', $c, $sitename),
    'frame' => $frame,
    'width' => $width,
    'height' => $height,
    'vertical' => $shape === 'vertical',
    'other' => $other,
    'css' => (new moodle_url('/local/oksigeniahechauka/panel/demo.css', ['v' => get_config($c, 'version')]))->out(false),
    'js' => (new moodle_url('/local/oksigeniahechauka/panel/demo.js', ['v' => get_config($c, 'version')]))->out(false),
]);
