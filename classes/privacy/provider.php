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
 * Privacy provider for local_oksigeniahechauka.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\privacy;

use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;
use local_oksigeniahechauka\local\birthdays;

/**
 * The only things about a person: who created each piece of content of the screens and who changed it last. Screens and
 * their heartbeats are about devices, not people; the logos are the centre's, and keep nobody's name.
 */
class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\core_userlist_provider,
    \core_privacy\local\request\plugin\provider {
    /** Table of the content. */
    const TABLE = 'local_oksigeniahechauka_item';

    /** @var string The birthdays list, where someone may be linked to their account. */
    const BIRTHDAYS = 'local_oksigeniahechauka_birthday';

    /**
     * What is stored.
     *
     * @param collection $collection
     * @return collection
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_database_table(self::TABLE, [
            'createdby' => 'privacy:metadata:item:createdby',
            'usermodified' => 'privacy:metadata:item:usermodified',
            'timemodified' => 'privacy:metadata:item:timemodified',
        ], 'privacy:metadata:item');
        $collection->add_database_table('local_oksigeniahechauka_birthday', [
            'name' => 'privacy:metadata:birthday:name',
            'groupname' => 'privacy:metadata:birthday:groupname',
            'userid' => 'privacy:metadata:birthday:userid',
            'month' => 'privacy:metadata:birthday:month',
            'day' => 'privacy:metadata:birthday:day',
            'usermodified' => 'privacy:metadata:birthday:usermodified',
        ], 'privacy:metadata:birthday');
        return $collection;
    }

    /**
     * The system context, if the person changed any content.
     *
     * @param int $userid
     * @return contextlist
     */
    public static function get_contexts_for_userid(int $userid): contextlist {
        global $DB;
        $list = new contextlist();
        if (
            $DB->record_exists_select(self::TABLE, 'usermodified = :a OR createdby = :b', ['a' => $userid, 'b' => $userid])
                || $DB->record_exists(self::BIRTHDAYS, ['userid' => $userid])
        ) {
            $list->add_system_context();
        }
        return $list;
    }

    /**
     * Who changed content, in the system context.
     *
     * @param userlist $userlist
     * @return void
     */
    public static function get_users_in_context(userlist $userlist): void {
        if ($userlist->get_context()->contextlevel != CONTEXT_SYSTEM) {
            return;
        }
        $userlist->add_from_sql(
            'usermodified',
            'SELECT usermodified FROM {' . self::TABLE . '} WHERE usermodified > 0',
            []
        );
        $userlist->add_from_sql(
            'createdby',
            'SELECT createdby FROM {' . self::TABLE . '} WHERE createdby > 0',
            []
        );
        $userlist->add_from_sql('userid', 'SELECT userid FROM {' . self::BIRTHDAYS . '} WHERE userid > 0', []);
    }

    /**
     * The content a person changed last.
     *
     * @param approved_contextlist $contextlist
     * @return void
     */
    public static function export_user_data(approved_contextlist $contextlist): void {
        global $DB;
        foreach ($contextlist->get_contexts() as $context) {
            if ($context->contextlevel != CONTEXT_SYSTEM) {
                continue;
            }
            $id = $contextlist->get_user()->id;
            $items = $DB->get_records_select(
                self::TABLE,
                'usermodified = :a OR createdby = :b',
                ['a' => $id, 'b' => $id],
                'id',
                'id, type, title, timemodified'
            );
            $out = [];
            foreach ($items as $item) {
                $out[] = [
                    'type' => $item->type,
                    'title' => $item->title,
                    'timemodified' => \core_privacy\local\request\transform::datetime($item->timemodified),
                ];
            }
            $birthdays = [];
            foreach ($DB->get_records(self::BIRTHDAYS, ['userid' => $id], 'id', 'id, name, groupname, day, month') as $row) {
                $birthdays[] = ['name' => $row->name, 'group' => (string) $row->groupname, 'day' => (int) $row->day,
                    'month' => (int) $row->month];
            }
            if ($out || $birthdays) {
                writer::with_context($context)->export_data(
                    [get_string('pluginname', 'local_oksigeniahechauka')],
                    (object) ['items' => $out, 'birthdays' => $birthdays]
                );
            }
        }
    }

    /**
     * Forgets who changed the content; the content stays, it belongs to the site.
     *
     * @param \context $context
     * @return void
     */
    public static function delete_data_for_all_users_in_context(\context $context): void {
        global $DB;
        if ($context->contextlevel == CONTEXT_SYSTEM) {
            $DB->set_field_select(self::TABLE, 'usermodified', 0, 'usermodified > 0');
            $DB->set_field_select(self::TABLE, 'createdby', 0, 'createdby > 0');
            foreach ($DB->get_fieldset_select(self::BIRTHDAYS, 'id', 'userid > 0') as $rowid) {
                birthdays::delete((int) $rowid);
            }
        }
    }

    /**
     * Forgets that this person changed the content.
     *
     * @param approved_contextlist $contextlist
     * @return void
     */
    public static function delete_data_for_user(approved_contextlist $contextlist): void {
        global $DB;
        foreach ($contextlist->get_contexts() as $context) {
            if ($context->contextlevel == CONTEXT_SYSTEM) {
                $DB->set_field(self::TABLE, 'usermodified', 0, ['usermodified' => $contextlist->get_user()->id]);
                $DB->set_field(self::TABLE, 'createdby', 0, ['createdby' => $contextlist->get_user()->id]);
                // Their birthday leaves the list, with its photo.
                foreach ($DB->get_fieldset_select(self::BIRTHDAYS, 'id', 'userid = ?', [$contextlist->get_user()->id]) as $rowid) {
                    birthdays::delete((int) $rowid);
                }
            }
        }
    }

    /**
     * Forgets that these people changed the content.
     *
     * @param approved_userlist $userlist
     * @return void
     */
    public static function delete_data_for_users(approved_userlist $userlist): void {
        global $DB;
        if ($userlist->get_context()->contextlevel != CONTEXT_SYSTEM || !$userlist->get_userids()) {
            return;
        }
        [$in, $params] = $DB->get_in_or_equal($userlist->get_userids(), SQL_PARAMS_NAMED);
        $DB->set_field_select(self::TABLE, 'usermodified', 0, 'usermodified ' . $in, $params);
        $DB->set_field_select(self::TABLE, 'createdby', 0, 'createdby ' . $in, $params);
        foreach ($DB->get_fieldset_select(self::BIRTHDAYS, 'id', 'userid ' . $in, $params) as $rowid) {
            birthdays::delete((int) $rowid);
        }
    }
}
