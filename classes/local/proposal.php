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
 * «Propose an improvement», the piece the tools of the site share, from Oksigenia Marandu where it is: on each page of the
 * panel, beside its title, for whoever may propose. The person marks on a picture of what they see what they would change
 * and says how; it reaches whoever gathers the improvements of the site. Without Marandu, or for whoever may not, nothing.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class proposal {
    /**
     * The button for a page, for the proposal_button template; false when it has nothing to open.
     *
     * @param string $screen the page, as the panel names it («What is on», «Your centre»…)
     * @return array|false
     */
    public static function button(string $screen) {
        $api = '\local_oksigeniamarandu\api';
        if (!class_exists($api) || !method_exists($api, 'proposal_js')) {
            return false;
        }
        try {
            if (!$api::proposal_js()) {
                return false;
            }
        } catch (\Throwable $e) {
            debugging('Hechauka: «Propose an improvement» of Marandu failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return false;
        }
        return ['component' => 'local_oksigeniahechauka', 'screen' => $screen,
            'label' => get_string('proposal:button', 'local_oksigeniamarandu'), 'icon' => icons::svg('msg')];
    }
}
