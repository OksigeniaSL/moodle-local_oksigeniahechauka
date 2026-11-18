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
 * «How to get here» and «Get to know the centre», gesture by gesture: the blocks of «Your centre» send here each piece
 * written, each picture put or taken out and each moment of «A day here» added, moved or taken out, and get back what the
 * blocks show now (classes/local/touch.php).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\touch;

require_login(null, false);
access::require_cap('managescreens');
require_sesskey();
$in = [];
$params = ['key' => PARAM_ALPHANUM, 'value' => PARAM_RAW_TRIMMED, 'n' => PARAM_INT, 'to' => PARAM_INT,
    'time' => PARAM_RAW_TRIMMED, 'title' => PARAM_TEXT, 'words' => PARAM_TEXT];
foreach ($params as $name => $type) {
    $value = optional_param($name, null, $type);
    if ($value !== null) {
        $in[$name] = $value;
    }
}
$upload = $_FILES['file'] ?? null;
if (!empty($upload['name']) && empty($upload['error']) && is_uploaded_file($upload['tmp_name'])) {
    $in['file'] = $upload['tmp_name'];
    $in['filename'] = $upload['name'];
}
$now = touch::change(required_param('what', PARAM_ALPHA), $in);
header('Content-Type: application/json; charset=utf-8');
echo json_encode($now, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
