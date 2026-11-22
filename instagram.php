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
 * The Instagram accounts of «Your centre», one by one: the block sends here what is chosen for an account (its way, its
 * words, its screens) and gets back whether it was kept (classes/local/instagram.php). The screens get it within five
 * minutes, at the next reading.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\instagram;

require_login(null, false);
access::require_cap('managescreens');
require_sesskey();
$ok = instagram::change(
    required_param('account', PARAM_ALPHANUM),
    required_param('show', PARAM_ALPHA),
    optional_param('words', '', PARAM_TEXT),
    optional_param_array('groups', [], PARAM_INT)
);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(
    ['ok' => $ok, 'message' => get_string($ok ? 'instagram_saved' : 'instagram_notsaved', 'local_oksigeniahechauka')],
    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);
