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
use local_oksigeniahechauka\local\greeting;

/**
 * The way to the panel for who runs the screens without being an administrator: the administration tree is only built
 * for who may see the site configuration, so the panel has its link in the main bar and in the user menu. And the birthday
 * card at the top of the dashboard.
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

    /**
     * The birthday card, on the dashboard of whoever has a birthday today.
     *
     * @param \core\hook\output\before_footer_html_generation $hook
     * @return void
     */
    public static function before_footer(\core\hook\output\before_footer_html_generation $hook): void {
        $hook->add_html(self::greeting_html());
    }

    /**
     * The card, ready to go to the top of the page as soon as the browser reads it (no jump after the page shows); empty
     * where it does not go.
     *
     * @return string HTML
     */
    public static function greeting_html(): string {
        global $PAGE, $USER, $OUTPUT;
        if (during_initial_install() || !isloggedin() || isguestuser() || !in_array($PAGE->pagetype, greeting::PAGES, true)) {
            return '';
        }
        try {
            $card = greeting::card((int) $USER->id, time());
        } catch (\Throwable $e) {
            // A problem of the greeting never breaks the dashboard.
            debugging('Birthday card: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return '';
        }
        if (!$card) {
            return '';
        }
        if (!$card['seen']) {
            // The party plays once a day; the next time, the card is just there.
            greeting::seen((int) $USER->id, $card['date']);
        }
        // What CSS cannot do (the confetti, the creature, the way out): plain scripts, because Firefox 98 does not start
        // AMD modules in Moodle 5.3. Without them the card is whole, and closes by its form.
        $v = ['v' => (string) get_config('local_oksigeniahechauka', 'version')];
        if (!$card['hasphoto']) {
            $PAGE->requires->js(new \moodle_url('/local/oksigeniahechauka/player/src/bichito-hechauka.js', $v));
        }
        $PAGE->requires->js(new \moodle_url('/local/oksigeniahechauka/js/greeting.js', $v));
        $id = 'local-oksigeniahechauka-greeting';
        return '<template id="' . $id . '">' . $OUTPUT->render_from_template('local_oksigeniahechauka/greeting', $card)
            . '</template>' . \html_writer::script('(function() {
    var source = document.getElementById(' . json_encode($id) . ');
    var main = document.querySelector(\'#region-main [role="main"]\') || document.querySelector(\'[role="main"]\');
    if (!source || !main) {
        return;
    }
    main.insertBefore(source.content.cloneNode(true), main.firstChild);
    var card = main.querySelector(".hk-greeting");
    var form = card && card.querySelector("form.hk-greeting-close");
    if (!form || !window.fetch) {
        return;
    }
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        var body = new URLSearchParams(new FormData(form));
        body.set("ajax", "1");
        card.classList.add("is-closing");
        fetch(form.action, {method: "POST", body: body, credentials: "same-origin"}).then(function(r) {
            if (!r.ok) {
                throw new Error(r.status);
            }
            return window.HkGreeting ? window.HkGreeting.leave(card) : card.remove();
        }).catch(function() {
            form.submit();
        });
    });
})();');
    }
}
