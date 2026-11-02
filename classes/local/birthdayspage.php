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
 * What the page of the birthdays shows.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class birthdayspage {
    /**
     * The context of the template.
     *
     * @param int $now
     * @return array
     */
    public static function context(int $now): array {
        $c = 'local_oksigeniahechauka';
        $config = get_config($c);
        $chosen = (string) ($config->birthdayfield ?? '');
        $fields = [['value' => '', 'label' => get_string('birthdays_field_none', $c), 'selected' => $chosen === '']];
        foreach (birthdays::fields() as $shortname => $name) {
            $fields[] = ['value' => $shortname, 'label' => $name, 'selected' => $chosen === $shortname];
        }
        $months = \core_calendar\type_factory::get_calendar_instance()->get_months();
        $monthlist = [];
        foreach ($months as $n => $name) {
            $monthlist[] = ['value' => $n, 'label' => $name];
        }
        $people = [];
        foreach (birthdays::all() as $row) {
            $picture = birthdays::list_picture((int) $row->id);
            $people[] = [
                'id' => (int) $row->id,
                'name' => $row->name,
                'group' => (string) $row->groupname,
                'date' => (int) $row->day . ' ' . ($months[(int) $row->month] ?? ''),
                'photo' => $picture ? \moodle_url::make_pluginfile_url(
                    $picture->get_contextid(),
                    $picture->get_component(),
                    $picture->get_filearea(),
                    $picture->get_itemid(),
                    $picture->get_filepath(),
                    $picture->get_filename()
                )->out(false) : '',
                'initial' => \core_text::substr($row->name, 0, 1),
            ];
        }
        $today = array_map(function ($person) {
            return $person['name'];
        }, birthdays::on($config, schedule::day($now)));
        return [
            'tabs' => home::tabs('centre', true),
            'hastabs' => true,
            'centre' => (new \moodle_url('/local/oksigeniahechauka/centre.php'))->out(false),
            'action' => (new \moodle_url('/local/oksigeniahechauka/birthdays.php'))->out(false),
            'sesskey' => sesskey(),
            'on' => !empty($config->sourcebirthdays),
            'fields' => $fields,
            'hasfields' => count($fields) > 1,
            'days' => range(1, 31),
            'months' => $monthlist,
            'people' => $people,
            'count' => count($people),
            'haspeople' => (bool) $people,
            'today' => implode(', ', $today),
            'hastoday' => (bool) $today,
        ];
    }
}
