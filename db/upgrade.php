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

    if ($oldversion < 2026103107) {
        // The sound of a screen.
        $table = new xmldb_table('local_oksigeniahechauka_screen');
        $field = new xmldb_field('sound', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'command');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        // The events of the agendas.
        $table = new xmldb_table('local_oksigeniahechauka_calevent');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('itemid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('uid', XMLDB_TYPE_CHAR, '255', null, null, null, null);
        $table->add_field('title', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL, null, null);
        $table->add_field('detail', XMLDB_TYPE_CHAR, '255', null, null, null, null);
        $table->add_field('timestart', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('timeend', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('allday', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0');
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_key('itemid', XMLDB_KEY_FOREIGN, ['itemid'], 'local_oksigeniahechauka_item', ['id']);
        $table->add_index('timestart', XMLDB_INDEX_NOTUNIQUE, ['timestart']);
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        upgrade_plugin_savepoint(true, 2026103107, 'local', 'oksigeniahechauka');
    }

    if ($oldversion < 2026103108) {
        // Where each item goes is asked at every request of a screen: indexes for its groups and screens.
        $table = new xmldb_table('local_oksigeniahechauka_target');
        foreach (['groupid', 'screenid'] as $name) {
            $index = new xmldb_index($name, XMLDB_INDEX_NOTUNIQUE, [$name]);
            if (!$dbman->index_exists($table, $index)) {
                $dbman->add_index($table, $index);
            }
        }
        upgrade_plugin_savepoint(true, 2026103108, 'local', 'oksigeniahechauka');
    }

    if ($oldversion < 2026110100) {
        // Who made each item, so who publishes only in some groups changes only what they made. Until now, whoever
        // changed it last.
        $table = new xmldb_table('local_oksigeniahechauka_item');
        $field = new xmldb_field('createdby', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0', 'targetall');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
            $DB->execute('UPDATE {local_oksigeniahechauka_item} SET createdby = usermodified');
        }
        // The two roles to run the screens without being administrators. Moodle stores the new capabilities after the
        // upgrade steps (and the old «manage» goes, its permissions copied to the four new ones): the roles need them now.
        update_capabilities('local_oksigeniahechauka');
        \local_oksigeniahechauka\local\access::create_roles();
        upgrade_plugin_savepoint(true, 2026110100, 'local', 'oksigeniahechauka');
    }

    if ($oldversion < 2026110200) {
        // The four fixed stage colours become the centre's own categories (each centre names its parts); the colours a
        // site had chosen are kept as its first categories, to be named in «Tu centro».
        $c = 'local_oksigeniahechauka';
        $list = [];
        for ($i = 1; $i <= 4; $i++) {
            $colour = (string) get_config($c, 'colour' . $i);
            if (preg_match('/^#[0-9a-fA-F]{6}$/', $colour)) {
                $list[] = ['id' => 'c' . $i, 'name' => get_string('category_n', $c, $i), 'colour' => $colour, 'words' => [],
                    'coursecat' => 0];
            }
            unset_config('colour' . $i, $c);
        }
        if ($list && !get_config($c, 'categories')) {
            set_config('categories', json_encode($list), $c);
        }
        upgrade_plugin_savepoint(true, 2026110200, 'local', 'oksigeniahechauka');
    }

    return true;
}
