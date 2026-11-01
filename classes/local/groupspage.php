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
 * «Pantallas y grupos», for who runs the screens: the screens in short rows (their picture, state, groups and «Ficha»),
 * adding one, and a card per group with its screens, who publishes in it and a search to add someone of the school.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class groupspage {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /**
     * Everything the page needs.
     *
     * @param int $now
     * @return array
     */
    public static function context(int $now): array {
        global $DB, $OUTPUT;
        $c = self::C;
        $url = new \moodle_url('/local/oksigeniahechauka/screens.php');
        $screens = $DB->get_records('local_oksigeniahechauka_screen', null, 'sortorder, name');
        $groups = $DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name');
        $members = [];
        foreach ($DB->get_records('local_oksigeniahechauka_member') as $m) {
            $members[(int) $m->groupid][] = (int) $m->screenid;
        }
        $rows = [];
        $vertical = [];
        foreach ($screens as $s) {
            $card = home::screen($s, $now, [], true);
            $vertical[(int) $s->id] = $card['vertical'];
            $rows[] = $card + ['shapeicon' => icons::svg($card['vertical'] ? 'tvv' : 'tv'),
                'groupnames' => array_map(function ($g) use ($groups) {
                    return ['name' => format_string($groups[$g] ?? '')];
                }, screens::groups_of((int) $s->id)), 'sheet' => (new \moodle_url(
                    '/local/oksigeniahechauka/screen.php',
                    ['id' => $s->id]
                ))->out(false)];
        }
        $cards = [];
        foreach ($groups as $id => $name) {
            $in = $members[$id] ?? [];
            $mine = [];
            $other = [];
            foreach ($screens as $s) {
                $entry = ['id' => (int) $s->id, 'name' => format_string($s->name),
                    'icon' => icons::svg($vertical[(int) $s->id] ? 'tvv' : 'tv')];
                if (in_array((int) $s->id, $in)) {
                    $mine[] = $entry + ['group' => (int) $id, 'label' => get_string('groups_unscreen', $c, (object) [
                        'screen' => $entry['name'], 'group' => format_string($name)])];
                } else {
                    $other[] = $entry;
                }
            }
            $people = [];
            foreach (access::editors((int) $id) as $user) {
                $people[] = self::person($user) + ['label' => get_string('groups_unpublish', $c, (object) [
                    'person' => fullname($user), 'group' => format_string($name)])];
            }
            $menu = new \action_menu();
            $menu->set_menu_trigger(icons::svg('dots') . \html_writer::span(
                get_string('more_actions', $c, format_string($name)),
                'visually-hidden sr-only'
            ), 'btn btn-sm btn-outline-secondary btn-icon no-caret');
            $menu->add_secondary_action(new \action_link(new \moodle_url($url, ['action' => 'deletegroup', 'id' => $id,
                'sesskey' => sesskey()]), get_string('groups_delete', $c)));
            $cards[] = [
                'id' => (int) $id,
                'name' => format_string($name),
                'screens' => $mine,
                'others' => $other,
                'hasothers' => (bool) $other,
                'people' => $people,
                'haspeople' => (bool) $people,
                'menu' => $OUTPUT->render($menu),
            ];
        }
        // Who publishes on every screen: chosen here by whoever runs the screens. Those who have it by another role
        // (running the screens, or a role of the site) are shown, but taken out only where they were given it.
        $system = \context_system::instance();
        $everywhere = [];
        foreach (access::holders('publishall', access::EVERYWHERE) as $h) {
            $runs = has_capability('local/oksigeniahechauka:managescreens', $system, $h['user']->id);
            $note = $h['own'] ? '' : get_string($runs ? 'groups_runs' : 'groups_byrole', $c);
            $everywhere[] = self::person($h['user'], $note) +
                ['own' => $h['own'], 'label' => get_string('groups_uneverywhere', $c, fullname($h['user']))];
        }
        // Who runs the screens: chosen here by whoever may give that role in Moodle (the administrator).
        $choose = access::may_choose_managers();
        $managers = [];
        foreach (access::holders('managescreens', access::MANAGER) as $h) {
            $managers[] = self::person($h['user'], $h['own'] ? '' : get_string('groups_byrole', $c)) +
                ['own' => $h['own'] && $choose, 'label' => get_string('groups_unmanager', $c, fullname($h['user']))];
        }
        return [
            'style' => home::stages(),
            'title' => get_string('panel_title', $c),
            'tabs' => home::tabs('screens', true),
            'hastabs' => true,
            'action' => $url->out(false),
            'sesskey' => sesskey(),
            'rows' => $rows,
            'count' => count($rows),
            'groups' => $cards,
            'everywhere' => $everywhere,
            'haseverywhere' => (bool) $everywhere,
            'managers' => $managers,
            'hasmanagers' => (bool) $managers,
            'choosemanagers' => $choose,
            'player' => (new \moodle_url('/local/oksigeniahechauka/player/'))->out(false),
            'claim' => (new \moodle_url('/local/oksigeniahechauka/claim.php'))->out(false),
            'people' => (new \moodle_url('/local/oksigeniahechauka/people.php'))->out(false),
            'admin' => has_capability('moodle/site:config', \context_system::instance()) ?
                (new \moodle_url('/admin/settings.php', ['section' => 'local_oksigeniahechauka_settings']))->out(false) : '',
            'icons' => ['qr' => icons::svg('qr'), 'x' => icons::svg('x'), 'plus' => icons::svg('plus'),
                'search' => icons::svg('search'), 'sliders' => icons::svg('sliders'), 'copy' => icons::svg('copy')],
            'strings' => json_encode(
                ['already' => get_string('groups_already', $c), 'none' => get_string('groups_nobody', $c),
                    'everywhere' => get_string('groups_already_everywhere', $c),
                    'managers' => get_string('groups_already_manager', $c)],
                JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP
            ),
        ];
    }

    /**
     * A person as the page draws them: initials, name, and under it a note or their department if any.
     *
     * @param \stdClass $user
     * @param string $note
     * @return array
     */
    protected static function person(\stdClass $user, string $note = ''): array {
        $words = preg_split('/\s+/', trim(($user->firstname ?? '') . ' ' . ($user->lastname ?? '')));
        return [
            'userid' => (int) $user->id,
            'name' => fullname($user),
            'initials' => \core_text::strtoupper(\core_text::substr($words[0] ?? '', 0, 1) .
                \core_text::substr(end($words) ?: '', 0, 1)),
            'detail' => $note !== '' ? $note : (string) ($user->department ?? ''),
        ];
    }

    /**
     * Does what the page asks: groups, their screens, who publishes in each.
     *
     * @param string $action
     * @param int $now
     * @return string|null the message to show, or null
     */
    public static function act(string $action, int $now): ?string {
        global $DB;
        $c = self::C;
        $group = optional_param('group', 0, PARAM_INT);
        $exists = $group && $DB->record_exists('local_oksigeniahechauka_group', ['id' => $group]);
        switch ($action) {
            case 'addgroup':
                $name = trim(optional_param('name', '', PARAM_TEXT));
                if ($name !== '') {
                    $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => $name, 'sortorder' => 0,
                        'timecreated' => $now, 'timemodified' => $now]);
                    return get_string('groups_made', $c, $name);
                }
                return null;
            case 'addmember':
                $screen = optional_param('screen', 0, PARAM_INT);
                if (
                    $exists && $DB->record_exists('local_oksigeniahechauka_screen', ['id' => $screen]) &&
                        !$DB->record_exists('local_oksigeniahechauka_member', ['groupid' => $group, 'screenid' => $screen])
                ) {
                    $DB->insert_record('local_oksigeniahechauka_member', (object) ['groupid' => $group, 'screenid' => $screen]);
                }
                return null;
            case 'removemember':
                $DB->delete_records('local_oksigeniahechauka_member', ['groupid' => $group,
                    'screenid' => optional_param('screen', 0, PARAM_INT)]);
                return null;
            case 'addeditor':
                $user = optional_param('user', 0, PARAM_INT);
                if ($exists && $DB->record_exists('user', ['id' => $user, 'deleted' => 0])) {
                    $now = array_map('intval', array_keys(access::editors($group)));
                    access::set_editors($group, array_merge($now, [$user]));
                }
                return null;
            case 'removeeditor':
                if ($exists) {
                    $user = optional_param('user', 0, PARAM_INT);
                    access::set_editors($group, array_diff(array_map('intval', array_keys(access::editors($group))), [$user]));
                }
                return null;
            case 'addeverywhere':
            case 'removeeverywhere':
            case 'addmanager':
            case 'removemanager':
                $manager = strpos($action, 'manager') !== false;
                if ($manager && !access::may_choose_managers()) {
                    throw new \required_capability_exception(\context_system::instance(), 'moodle/role:assign', 'nopermissions', '');
                }
                $user = optional_param('user', 0, PARAM_INT);
                if ($DB->record_exists('user', ['id' => $user, 'deleted' => 0]) && !isguestuser($user)) {
                    access::set_site_role($manager ? access::MANAGER : access::EVERYWHERE, $user, strpos($action, 'add') === 0);
                }
                return null;
        }
        return null;
    }
}
