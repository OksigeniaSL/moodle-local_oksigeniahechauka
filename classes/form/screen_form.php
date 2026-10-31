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
 * The settings of one screen.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\form;

use local_oksigeniahechauka\local\schedule;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');

/**
 * Its name, layout, light or dark, groups, and the hours it is on.
 */
class screen_form extends \moodleform {
    /**
     * The fields.
     *
     * @return void
     */
    protected function definition(): void {
        global $DB;
        $f = $this->_form;
        $c = 'local_oksigeniahechauka';
        $f->addElement('hidden', 'id');
        $f->setType('id', PARAM_INT);

        $f->addElement('text', 'name', get_string('name', $c), ['size' => 40, 'maxlength' => 100]);
        $f->setType('name', PARAM_TEXT);
        $f->addRule('name', null, 'required', null, 'client');
        $f->addElement('select', 'template', get_string('template', $c), [
            'zones' => get_string('template_zones', $c),
            'full' => get_string('template_full', $c),
        ]);
        $f->addElement('select', 'theme', get_string('thememode', $c), [
            'site' => get_string('thememode_site', $c),
            'light' => get_string('thememode_light', $c),
            'dark' => get_string('thememode_dark', $c),
            'auto' => get_string('thememode_auto', $c),
        ]);
        $groups = $DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name');
        if ($groups) {
            $boxes = [];
            foreach ($groups as $id => $name) {
                $boxes[] = $f->createElement('advcheckbox', $id, '', format_string($name));
            }
            $f->addGroup($boxes, 'groups', get_string('groups', $c), ' ', true);
        }

        $f->addElement('header', 'powerhdr', get_string('power', $c));
        $f->setExpanded('powerhdr', true);
        $f->addElement('select', 'powermode', get_string('power_mode', $c), [
            'always' => get_string('power_always', $c),
            'hours' => get_string('power_hours', $c),
        ]);
        $f->addHelpButton('powermode', 'power_mode', $c);
        $short = explode(',', get_string('days_short', $c));
        $days = [];
        for ($d = 1; $d <= 7; $d++) {
            $days[] = $f->createElement('advcheckbox', $d, '', $short[$d - 1]);
        }
        $f->addGroup($days, 'powerdays', get_string('weekdays', $c), ' ', true);
        $f->hideIf('powerdays', 'powermode', 'eq', 'always');
        $range = [
            $f->createElement('text', 'from', '', ['size' => 5, 'maxlength' => 5, 'placeholder' => '07:30']),
            $f->createElement('text', 'to', '', ['size' => 5, 'maxlength' => 5, 'placeholder' => '18:30']),
        ];
        $f->addGroup($range, 'powerrange', get_string('times', $c), ' – ', true);
        $f->setType('powerrange[from]', PARAM_RAW_TRIMMED);
        $f->setType('powerrange[to]', PARAM_RAW_TRIMMED);
        $f->hideIf('powerrange', 'powermode', 'eq', 'always');
        $f->addElement('advcheckbox', 'sound', '', get_string('sound', $c));
        $f->addHelpButton('sound', 'sound', $c);
        $f->addElement('advcheckbox', 'alerts', '', get_string('alerts', $c));
        $f->addHelpButton('alerts', 'alerts', $c);
        $f->setDefault('alerts', 1);

        $this->add_action_buttons();
    }

    /**
     * A name, and hours that are hours on at least one day.
     *
     * @param array $data
     * @param array $files
     * @return array
     */
    public function validation($data, $files): array {
        $errors = parent::validation($data, $files);
        if (trim($data['name'] ?? '') === '') {
            $errors['name'] = get_string('required');
        }
        if (($data['powermode'] ?? '') === 'hours') {
            $from = item_form::hour($data['powerrange']['from'] ?? '');
            $to = item_form::hour($data['powerrange']['to'] ?? '');
            if (!schedule::is_hour($from) || !schedule::is_hour($to)) {
                $errors['powerrange'] = get_string('wronghour', 'local_oksigeniahechauka');
            }
            if (!array_filter((array) ($data['powerdays'] ?? []))) {
                $errors['powerdays'] = get_string('power_nodays', 'local_oksigeniahechauka');
            }
        }
        return $errors;
    }
}
