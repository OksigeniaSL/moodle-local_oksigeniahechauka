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
 * A professional Samsung for a screen: the player installed with its URL Launcher, and how it starts with it.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\icons;
use local_oksigeniahechauka\local\playerlink;

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/samsung.php');
$context = context_system::instance();
require_login(null, false);
access::require_cap('managescreens');
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('samsung_title', $c));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');

// The whole address goes in the URL Launcher (the screen asks beside it for sssp_config.xml, which a short link does not
// have); the short one, if there is one, is what is typed afterwards in the app.
$short = playerlink::short();
echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/samsung', [
    'long' => playerlink::long(),
    'short' => $short,
    'hasshort' => $short !== '',
    'add' => (new moodle_url('/local/oksigeniahechauka/screens.php'))->out(false) . '#add',
    'icons' => ['copy' => icons::svg('copy')],
    'back' => (new moodle_url('/local/oksigeniahechauka/screens.php'))->out(false),
    'backlabel' => get_string('tab_screens', $c),
    'backicon' => icons::svg('back'),
]);
echo $OUTPUT->footer();
