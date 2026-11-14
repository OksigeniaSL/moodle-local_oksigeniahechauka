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
 * «Our networks», box by box: the block of «Your centre» sends here each gesture (an account or an address written, a switch
 * turned) and gets back what the box has now, written as the screens will show it (classes/local/networks.php).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\networks;

require_login(null, false);
access::require_cap('managescreens');
require_sesskey();
$box = [];
$value = optional_param('value', null, PARAM_RAW_TRIMMED);
if ($value !== null) {
    $box['value'] = $value;
}
$show = optional_param('show', null, PARAM_BOOL);
if ($show !== null) {
    $box['show'] = (bool) $show;
}
$now = networks::change(required_param('network', PARAM_ALPHA), $box);
header('Content-Type: application/json; charset=utf-8');
echo json_encode($now, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
