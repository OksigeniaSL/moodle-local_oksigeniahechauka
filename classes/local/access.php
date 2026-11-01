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

namespace local_oksigeniahechauka\local;

/**
 * Who runs the screens, without being administrators.
 *
 * Four capabilities in the system context: view (the panel and the preview), publish (one's own content, in the groups
 * of screens where one publishes), publishall (any content, on any screen) and managescreens (the screens, their groups
 * and who publishes in each). Three roles are made at install, without archetype so they never take capabilities of
 * other plugins: «Publishes on the screens», «Publishes on every screen» and «Runs the screens». Whoever runs the screens
 * chooses who publishes in each group (the first role, as a component assignment with the group as its item, so it is
 * never undone by hand in the administration) and who publishes on every screen (the second, a plain assignment in the
 * whole site). Who runs the screens is chosen in the panel too, by whoever may give that role in Moodle.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class access {
    /** @var string The component of the assignments the panel makes. */
    const COMPONENT = 'local_oksigeniahechauka';

    /** @var string The role of who publishes in some groups. */
    const PUBLISHER = 'oksigeniahechauka_publisher';

    /** @var string The role of who publishes on every screen. */
    const EVERYWHERE = 'oksigeniahechauka_publishall';

    /** @var string The role of who runs the screens. */
    const MANAGER = 'oksigeniahechauka_manager';

    /** @var array The roles made at install: short name => capabilities of the plugin. */
    const ROLES = [
        self::PUBLISHER => ['view', 'publish'],
        self::EVERYWHERE => ['view', 'publish', 'publishall'],
        self::MANAGER => ['view', 'publish', 'publishall', 'managescreens'],
    ];

    /**
     * Whether the user has a capability of the plugin.
     *
     * @param string $capability view, publish, publishall or managescreens
     * @param int|null $userid the current user when null
     * @return bool
     */
    public static function can(string $capability, ?int $userid = null): bool {
        return has_capability('local/oksigeniahechauka:' . $capability, \context_system::instance(), $userid);
    }

    /**
     * Stops the page if the user lacks a capability of the plugin.
     *
     * @param string $capability
     * @return void
     */
    public static function require_cap(string $capability): void {
        require_capability('local/oksigeniahechauka:' . $capability, \context_system::instance());
    }

    /**
     * Whether the user publishes at all, everywhere or in some groups.
     *
     * @param int|null $userid
     * @return bool
     */
    public static function publishes(?int $userid = null): bool {
        return self::can('publishall', $userid) || self::can('publish', $userid);
    }

    /**
     * Whether the user only sees and touches what they made, in their groups.
     *
     * @param int|null $userid
     * @return bool
     */
    public static function limited(?int $userid = null): bool {
        return !self::can('publishall', $userid) && self::can('publish', $userid);
    }

    /**
     * Makes the roles that are not there yet, and lets the managers of the site give them.
     *
     * @return int how many were made
     */
    public static function create_roles(): int {
        global $DB;
        $system = \context_system::instance();
        $made = 0;
        foreach (self::ROLES as $shortname => $capabilities) {
            $id = (int) $DB->get_field('role', 'id', ['shortname' => $shortname]);
            if ($id) {
                // There already: completed only if an install cut short left it without any capability of ours.
                $some = $DB->record_exists_select('role_capabilities', 'roleid = ? AND ' .
                    $DB->sql_like('capability', '?'), [$id, 'local/oksigeniahechauka:%']);
                if (!$some) {
                    foreach ($capabilities as $capability) {
                        assign_capability('local/oksigeniahechauka:' . $capability, CAP_ALLOW, $id, $system->id, true);
                    }
                }
                continue;
            }
            $id = create_role(
                get_string('role_' . $shortname, self::COMPONENT),
                $shortname,
                get_string('role_' . $shortname . '_desc', self::COMPONENT)
            );
            set_role_contextlevels($id, [CONTEXT_SYSTEM]);
            foreach ($capabilities as $capability) {
                assign_capability('local/oksigeniahechauka:' . $capability, CAP_ALLOW, $id, $system->id, true);
            }
            foreach (get_archetype_roles('manager') as $manager) {
                core_role_set_assign_allowed($manager->id, $id);
            }
            $made++;
        }
        $system->mark_dirty();
        return $made;
    }

    /**
     * The id of the role of who publishes in some groups.
     *
     * @return int 0 if it was removed
     */
    protected static function publisher_role(): int {
        global $DB;
        return (int) $DB->get_field('role', 'id', ['shortname' => self::PUBLISHER]);
    }

    /**
     * The groups of screens where the user publishes, given in the panel.
     *
     * @param int $userid
     * @return int[]
     */
    public static function groups_of(int $userid): array {
        global $DB;
        $sql = "SELECT DISTINCT ra.itemid
                  FROM {role_assignments} ra
                  JOIN {local_oksigeniahechauka_group} g ON g.id = ra.itemid
                 WHERE ra.component = :component AND ra.userid = :userid AND ra.contextid = :contextid";
        return array_map('intval', $DB->get_fieldset_sql($sql, ['component' => self::COMPONENT, 'userid' => $userid,
            'contextid' => \context_system::instance()->id]));
    }

    /**
     * Who publishes in a group, given in the panel.
     *
     * @param int $groupid
     * @return \stdClass[] users, by name
     */
    public static function editors(int $groupid): array {
        global $DB;
        $fields = \core_user\fields::for_name()->get_sql('u', false, '', '', false)->selects;
        $sql = "SELECT DISTINCT u.id, $fields
                  FROM {role_assignments} ra
                  JOIN {user} u ON u.id = ra.userid AND u.deleted = 0
                 WHERE ra.component = :component AND ra.itemid = :itemid AND ra.contextid = :contextid
              ORDER BY u.lastname, u.firstname";
        return $DB->get_records_sql($sql, ['component' => self::COMPONENT, 'itemid' => $groupid,
            'contextid' => \context_system::instance()->id]);
    }

    /**
     * Sets who publishes in a group: those given keep or take the role there; the rest lose it there.
     *
     * @param int $groupid
     * @param int[] $userids
     * @return void
     */
    public static function set_editors(int $groupid, array $userids): void {
        $roleid = self::publisher_role();
        if (!$roleid) {
            throw new \moodle_exception('role_missing', self::COMPONENT);
        }
        $contextid = \context_system::instance()->id;
        $want = array_unique(array_map('intval', $userids));
        $have = array_map('intval', array_keys(self::editors($groupid)));
        foreach (array_diff($have, $want) as $userid) {
            role_unassign($roleid, $userid, $contextid, self::COMPONENT, $groupid);
        }
        foreach (array_diff($want, $have) as $userid) {
            role_assign($roleid, $userid, $contextid, self::COMPONENT, $groupid);
        }
    }

    /**
     * Who holds a capability of the plugin in the whole site, by name, and whether the panel may take it from them:
     * only when it comes from the role given for it (plain, in the site), not from another role of Moodle.
     *
     * @param string $capability publishall or managescreens
     * @param string $shortname the role that gives it
     * @return array [{user, own}]
     */
    public static function holders(string $capability, string $shortname): array {
        global $DB;
        $system = \context_system::instance();
        $fields = 'u.id, ' . \core_user\fields::for_name()->get_sql('u', false, '', '', false)->selects . ', u.department';
        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => $shortname]);
        $own = $roleid ? array_map('intval', $DB->get_fieldset_select(
            'role_assignments',
            'userid',
            "roleid = :roleid AND contextid = :contextid AND component = ''",
            ['roleid' => $roleid, 'contextid' => $system->id]
        )) : [];
        $out = [];
        $users = get_users_by_capability($system, 'local/oksigeniahechauka:' . $capability, $fields, 'u.lastname, u.firstname');
        foreach ($users as $user) {
            $out[] = ['user' => $user, 'own' => in_array((int) $user->id, $own)];
        }
        return $out;
    }

    /**
     * Gives or takes one of the site-wide roles (publishes on every screen, runs the screens): a plain assignment in the
     * whole site, the same one the administration would make, so it can also be undone there.
     *
     * @param string $shortname EVERYWHERE or MANAGER
     * @param int $userid
     * @param bool $give
     * @return void
     */
    public static function set_site_role(string $shortname, int $userid, bool $give): void {
        global $DB;
        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => $shortname]);
        if (!$roleid || !array_key_exists($shortname, self::ROLES) || $shortname === self::PUBLISHER) {
            throw new \moodle_exception('role_missing', self::COMPONENT);
        }
        $contextid = \context_system::instance()->id;
        if ($give) {
            role_assign($roleid, $userid, $contextid);
        } else {
            role_unassign($roleid, $userid, $contextid);
        }
    }

    /**
     * Whether the user may choose who runs the screens: whoever may give that role in Moodle (the administrator, and
     * those the site lets give it).
     *
     * @return bool
     */
    public static function may_choose_managers(): bool {
        global $DB;
        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => self::MANAGER]);
        return $roleid && array_key_exists($roleid, get_assignable_roles(\context_system::instance()));
    }

    /**
     * A group is removed: nobody publishes in it any more.
     *
     * @param int $groupid
     * @return void
     */
    public static function forget_group(int $groupid): void {
        role_unassign_all(['component' => self::COMPONENT, 'itemid' => $groupid,
            'contextid' => \context_system::instance()->id]);
    }

    /**
     * Where the user may send content: everything, or some groups and no single screen.
     *
     * @param int|null $userid
     * @return array all (bool), groups (id => name), screens (id => name)
     */
    public static function destinations(?int $userid = null): array {
        global $DB, $USER;
        $userid = $userid ?? (int) $USER->id;
        $groups = $DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name');
        $screens = $DB->get_records_menu('local_oksigeniahechauka_screen', null, 'sortorder, name', 'id, name');
        if (self::can('publishall', $userid)) {
            return ['all' => true, 'groups' => $groups, 'screens' => $screens];
        }
        if (!self::can('publish', $userid)) {
            return ['all' => false, 'groups' => [], 'screens' => []];
        }
        return ['all' => false, 'groups' => array_intersect_key($groups, array_flip(self::groups_of($userid))),
            'screens' => []];
    }

    /**
     * Whether the user may send content to these destinations.
     *
     * @param bool $all every screen
     * @param int[] $groups
     * @param int[] $screens
     * @param int|null $userid
     * @return bool
     */
    public static function may_target(bool $all, array $groups, array $screens, ?int $userid = null): bool {
        global $USER;
        $userid = $userid ?? (int) $USER->id;
        if (self::can('publishall', $userid)) {
            return true;
        }
        if (!self::can('publish', $userid) || $all || $screens || !$groups) {
            return false;
        }
        return !array_diff(array_map('intval', $groups), self::groups_of($userid));
    }

    /**
     * Whether the user may change, hide or remove an item: any, with publishall; their own, still in their groups,
     * with publish.
     *
     * @param \stdClass $item
     * @param int|null $userid
     * @return bool
     */
    public static function may_edit(\stdClass $item, ?int $userid = null): bool {
        global $USER;
        $userid = $userid ?? (int) $USER->id;
        if (self::can('publishall', $userid)) {
            return true;
        }
        if (!self::can('publish', $userid) || (int) ($item->createdby ?? 0) !== $userid) {
            return false;
        }
        $targets = items::targets($item);
        return self::may_target($targets['all'], $targets['groups'], $targets['screens'], $userid);
    }
}
