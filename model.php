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
 * A model to fill in a spreadsheet, as CSV with the separator of the user's language: the birthdays list or a table.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;

$c = 'local_oksigeniahechauka';
$kind = required_param('kind', PARAM_ALPHA);
require_login(null, false);
if ($kind === 'birthdays') {
    access::require_cap('managescreens');
} else if ($kind === 'table') {
    access::require_cap('publishall');
} else {
    throw new moodle_exception('invalidparameter', 'debug');
}
$separator = get_string('listsep', 'langconfig');
$out = fopen('php://temp', 'w+');
// The mark that tells a spreadsheet the letters are UTF-8: without it, accents come out wrong.
fwrite($out, "\xEF\xBB\xBF");
foreach (explode("\n", get_string('model_' . $kind, $c)) as $line) {
    fputcsv($out, explode(';', $line), $separator, '"', '');
}
rewind($out);
\core\session\manager::write_close();
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . clean_filename(get_string('model_' . $kind . '_file', $c)) . '"');
header('Cache-Control: private, max-age=0');
fpassthru($out);
fclose($out);
