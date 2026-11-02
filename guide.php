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
 * The guide inside the panel: the «How it works» pieces, each in a dialog, and the printed guide to download.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\home;
use local_oksigeniahechauka\local\icons;

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/guide.php');
$context = context_system::instance();
require_login(null, false);
access::require_cap('view');
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string('guide_title', $c));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');

$dir = __DIR__ . '/docs/guia/';
$lang = \local_oksigeniahechauka\local\howto::lang();
$base = (new moodle_url('/local/oksigeniahechauka/docs/guia/'))->out(false);
$pdf = is_readable($dir . 'hechauka-guia-' . $lang . '.pdf') ? $base . 'hechauka-guia-' . $lang . '.pdf' : '';
$managescreens = access::can('managescreens');
$pieces = \local_oksigeniahechauka\local\howto::all();

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/guide', [
    'tabs' => home::tabs('guide', $managescreens),
    'hastabs' => $managescreens,
    'back' => (new moodle_url('/local/oksigeniahechauka/index.php'))->out(false),
    'backicon' => icons::svg('back'),
    'pdf' => $pdf,
    'pdficon' => icons::svg('out'),
    'pieces' => $pieces,
]);
echo $OUTPUT->footer();
