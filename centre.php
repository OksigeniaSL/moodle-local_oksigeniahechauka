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
 * «Tu centro», for who runs the screens: where the school is (for the weather), its colours and its logo, with the
 * screen beside them. The same settings as the site administration, so whoever runs the screens needs no more.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\centre;
use local_oksigeniahechauka\local\place;

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/centre.php');
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('tab_centre', $c));
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
    centre::save();
    redirect($url, get_string('centre_saved', $c), null, \core\output\notification::NOTIFY_SUCCESS);
}

$query = optional_param('q', '', PARAM_TEXT);
$PAGE->requires->js(new moodle_url('/local/oksigeniahechauka/player/tiempo-iconos.js', ['v' => get_config($c, 'version')]));
$PAGE->requires->js(new moodle_url('/local/oksigeniahechauka/panel/centre.js', ['v' => get_config($c, 'version')]));
echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/centre', centre::context($query, $now));
echo $OUTPUT->footer();
