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
 * A Raspberry Pi for a screen: what it needs, the card for every centre and the file with this Moodle's address.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\card;
use local_oksigeniahechauka\local\icons;

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/prepare.php');
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('prepare_title', $c));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');

$name = optional_param('name', '', PARAM_TEXT);
$pasted = optional_param('keys', '', PARAM_RAW_TRIMMED);
[$keys, $bad] = card::keys($pasted);
if (data_submitted() && confirm_sesskey() && !$bad) {
    // The file for the card: downloaded, never kept.
    $conf = card::conf($name, $keys);
    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename="hechauka.conf"');
    header('Content-Length: ' . strlen($conf));
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo $conf;
    die();
}

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/prepare', [
    'action' => $url->out(false),
    'sesskey' => sesskey(),
    'image' => card::IMAGE,
    'imagesize' => display_size(card::IMAGE_SIZE),
    'imager' => card::IMAGER,
    'typed' => card::typed(),
    'name' => $name,
    'keys' => $pasted,
    'bad' => $bad,
    'add' => (new moodle_url('/local/oksigeniahechauka/screens.php'))->out(false) . '#add',
    'example' => card::hostname(get_string('prepare_name_example', $c)),
    'icons' => ['copy' => icons::svg('copy')],
]);
echo $OUTPUT->footer();
