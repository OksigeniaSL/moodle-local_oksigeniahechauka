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
 * Contract: the heartbeat of a screen, every minute; the answer says whether its manifest changed.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// phpcs:disable moodle.Files.RequireLogin.Missing

define('NO_MOODLE_COOKIES', true);
define('NO_DEBUG_DISPLAY', true);

require(__DIR__ . '/../../../config.php');

use local_oksigeniahechauka\local\endpoint;
use local_oksigeniahechauka\local\manifest;
use local_oksigeniahechauka\local\screens;

endpoint::method('POST');
$screen = endpoint::screen();
$now = time();
screens::heartbeat($screen, endpoint::body(), $now);
$screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $screen->id]);
endpoint::send(['manifest' => manifest::build($screen, $now)['etag'], 'commands' => []]);
