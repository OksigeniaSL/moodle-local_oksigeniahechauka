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
 * A new screen, from the phone (DESIGN.md): the TV shows a code and a QR, the phone opens this page; it says the screen
 * was found, asks whether it is new or replaces another, its name and groups, and starts it.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\claimpage;
use local_oksigeniahechauka\local\keys;
use local_oksigeniahechauka\local\screens;

$code = keys::clean_code(optional_param('code', '', PARAM_RAW_TRIMMED));
$done = optional_param('done', 0, PARAM_INT);
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
$c = 'local_oksigeniahechauka';
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/local/oksigeniahechauka/claim.php', $done ? ['done' => $done] : ['code' => $code]));
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('claim_title', $c));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');
$now = time();

if ($done) {
    // Step 3: it is running.
    $screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $done], '*', MUST_EXIST);
    echo $OUTPUT->header();
    echo $OUTPUT->render_from_template('local_oksigeniahechauka/claim', claimpage::done($screen));
    echo $OUTPUT->footer();
    die();
}

$pair = screens::pairing($code, $now);
$errors = [];
if ($pair && data_submitted() && confirm_sesskey()) {
    [$id, $errors] = claimpage::save($pair, $now);
    if ($id) {
        redirect(new moodle_url('/local/oksigeniahechauka/claim.php', ['done' => $id]));
    }
}
echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/claim', $pair ? claimpage::form($pair, $code, $now, $errors) :
    claimpage::notfound($code));
echo $OUTPUT->footer();
