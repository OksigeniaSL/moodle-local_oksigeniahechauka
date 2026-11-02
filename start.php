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
 * «Empezar»: the setting up of the screens on one page, with the screen beside it.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use core\output\notification;
use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\place;
use local_oksigeniahechauka\local\startpage;

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/start.php');
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('start_title', $c));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');
$now = time();

if (data_submitted() && confirm_sesskey()) {
    $pick = optional_param('pick', -1, PARAM_INT);
    if ($pick >= 0) {
        // A place of the list: its point, its map and its weather.
        $results = json_decode(optional_param('results', '[]', PARAM_RAW), true);
        $chosen = is_array($results) ? ($results[$pick] ?? null) : null;
        if (is_array($chosen) && isset($chosen['lat'], $chosen['lon'])) {
            place::choose(
                clean_param($chosen['name'] ?? '', PARAM_TEXT),
                clean_param($chosen['detail'] ?? '', PARAM_TEXT),
                (float) $chosen['lat'],
                (float) $chosen['lon'],
                $now
            );
        }
        redirect($url);
    }
    startpage::save();
    if (optional_param('touched', 0, PARAM_BOOL)) {
        // Saved as it is touched: the page goes on where it is.
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(startpage::states());
        die();
    }
    redirect($url, get_string('centre_saved', $c), null, notification::NOTIFY_SUCCESS);
}

set_config('startseen', 1, $c);
$query = optional_param('q', '', PARAM_TEXT);
$version = ['v' => get_config($c, 'version')];
$PAGE->requires->js(new moodle_url('/local/oksigeniahechauka/player/tiempo-iconos.js', $version));
$PAGE->requires->js(new moodle_url('/local/oksigeniahechauka/panel/start.js', $version));
echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/start', startpage::context($query, $now));
echo $OUTPUT->footer();
