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
 * The monthly report of the screens: how much of its hours each one was working, when it stopped and what came out.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\reportpage;
use local_oksigeniahechauka\local\schedule;

$c = 'local_oksigeniahechauka';
$now = time();
$month = optional_param('month', '', PARAM_ALPHANUMEXT);
$current = substr(schedule::day($now), 0, 7);
if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) || $month > $current) {
    $month = $current;
}
$url = new moodle_url('/local/oksigeniahechauka/report.php', ['month' => $month]);
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
if (optional_param('download', 0, PARAM_BOOL)) {
    [$columns, $rows] = reportpage::download($month, $now);
    \core\dataformat::download_data('hechauka-' . $month, 'csv', $columns, new ArrayIterator($rows));
    die();
}
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('report_title', $c));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');
$PAGE->requires->js(new moodle_url('/local/oksigeniahechauka/panel/report.js', ['v' => get_config($c, 'version')]));

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/report', reportpage::context($month, $now));
echo $OUTPUT->footer();
