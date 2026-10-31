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

namespace local_oksigeniahechauka;

use local_oksigeniahechauka\local\access;

/**
 * The way to the panel for who runs the screens without being an administrator: the administration tree is only built
 * for who may see the site configuration, so the panel has its link in the main bar and in the user menu.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {
    /**
     * Whether the current user gets the link.
     *
     * @return bool
     */
    protected static function shown(): bool {
        if (during_initial_install() || !isloggedin() || isguestuser()) {
            return false;
        }
        return access::can('view');
    }

    /**
     * «Screens» in the main bar.
     *
     * @param \core\hook\navigation\primary_extend $hook
     * @return void
     */
    public static function primary_extend(\core\hook\navigation\primary_extend $hook): void {
        if (!self::shown()) {
            return;
        }
        $hook->get_primaryview()->add(
            get_string('menulink', 'local_oksigeniahechauka'),
            new \moodle_url('/local/oksigeniahechauka/index.php'),
            \navigation_node::TYPE_ROOTNODE,
            null,
            'local_oksigeniahechauka'
        );
    }

    /**
     * «Screens» in the user menu.
     *
     * @param \core_user\hook\extend_user_menu $hook
     * @return void
     */
    public static function extend_user_menu($hook): void {
        if (!self::shown()) {
            return;
        }
        $url = new \moodle_url('/local/oksigeniahechauka/index.php');
        $title = get_string('menulink', 'local_oksigeniahechauka');
        if (method_exists($hook, 'add_menu_item')) {
            // Moodle 5.3 and later.
            $hook->add_menu_item(new \core_user\output\user_action_menu\link($url, $title));
        } else {
            // Moodle 4.5 to 5.2 take the menu item as a plain object.
            $hook->add_navitem((object) ['itemtype' => 'link', 'url' => $url, 'title' => $title]);
        }
    }
}
