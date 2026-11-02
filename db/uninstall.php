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
 * What Moodle does not take away by itself on uninstalling: the plugin's roles and who has them.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Takes out the roles this plugin made.
 *
 * @return bool
 */
function xmldb_local_oksigeniahechauka_uninstall() {
    global $DB;
    role_unassign_all(['component' => 'local_oksigeniahechauka']);
    $ours = ['oksigeniahechauka_publisher', 'oksigeniahechauka_publishall', 'oksigeniahechauka_manager'];
    foreach ($ours as $shortname) {
        $id = (int) $DB->get_field('role', 'id', ['shortname' => $shortname]);
        if ($id) {
            delete_role($id);
        }
    }
    return true;
}
