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
 * The example the centre finds the first time, put in again or taken out: a piece of each kind, each saying what it does.
 *
 * Usage: php local/oksigeniahechauka/cli/sample.php [--remove]
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/clilib.php');

use local_oksigeniahechauka\local\sample;

[$options] = cli_get_params(['remove' => false, 'help' => false], ['h' => 'help']);
if ($options['help']) {
    echo "The example for the screens. --remove takes it away.\n";
    exit(0);
}
if ($options['remove']) {
    cli_writeln('Example removed: ' . sample::remove() . ' pieces.');
    exit(0);
}
cli_writeln('Example added: ' . sample::add(time()) . ' pieces.');
