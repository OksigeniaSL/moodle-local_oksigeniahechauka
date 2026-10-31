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
 * Upgrades of local_oksigeniahechauka.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Brings the tables of an older version up to this one.
 *
 * @param int $oldversion
 * @return bool
 */
function xmldb_local_oksigeniahechauka_upgrade($oldversion) {
    global $DB;
    $dbman = $DB->get_manager();

    if ($oldversion < 2026103102) {
        // Warning when a screen goes down.
        $table = new xmldb_table('local_oksigeniahechauka_screen');
        $field = new xmldb_field('alerts', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '1', 'lastip');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        $field = new xmldb_field('alerted', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0', 'alerts');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_plugin_savepoint(true, 2026103102, 'local', 'oksigeniahechauka');
    }

    if ($oldversion < 2026103106) {
        // What a screen does at its next heartbeat: reload, from the panel.
        $table = new xmldb_table('local_oksigeniahechauka_screen');
        $field = new xmldb_field('command', XMLDB_TYPE_CHAR, '20', null, null, null, null, 'alerted');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_plugin_savepoint(true, 2026103106, 'local', 'oksigeniahechauka');
    }

    return true;
}
