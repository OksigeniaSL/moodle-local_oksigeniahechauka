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

/**
 * The only thing about a person: who last changed each piece of content of the screens. Screens and their
 * heartbeats are about devices, not people.
 */
class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\core_userlist_provider,
    \core_privacy\local\request\plugin\provider {
    /** Table of the content. */
    const TABLE = 'local_oksigeniahechauka_item';

    /**
     * What is stored.
     *
     * @param collection $collection
     * @return collection
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_database_table(self::TABLE, [
            'usermodified' => 'privacy:metadata:item:usermodified',
            'timemodified' => 'privacy:metadata:item:timemodified',
        ], 'privacy:metadata:item');
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
        if ($DB->record_exists(self::TABLE, ['usermodified' => $userid])) {
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
            $items = $DB->get_records(
                self::TABLE,
                ['usermodified' => $contextlist->get_user()->id],
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
            if ($out) {
                writer::with_context($context)->export_data(
                    [get_string('pluginname', 'local_oksigeniahechauka')],
                    (object) ['items' => $out]
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
    }
}
