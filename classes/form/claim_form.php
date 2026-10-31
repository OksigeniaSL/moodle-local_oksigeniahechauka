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
 * The form that gives a new screen its name.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\form;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');

/**
 * A name, a layout and the groups; or the screen whose device this one replaces.
 */
class claim_form extends \moodleform {
    /**
     * The fields.
     *
     * @return void
     */
    protected function definition(): void {
        global $DB;
        $f = $this->_form;
        $c = 'local_oksigeniahechauka';
        $f->addElement('hidden', 'code');
        $f->setType('code', PARAM_ALPHANUM);

        $screens = [0 => get_string('claim_new', $c)];
        foreach ($DB->get_records('local_oksigeniahechauka_screen', null, 'sortorder, name', 'id, name') as $s) {
            $screens[$s->id] = format_string($s->name);
        }
        if (count($screens) > 1) {
            $f->addElement('select', 'screenid', get_string('claim_existing', $c), $screens);
            $f->addHelpButton('screenid', 'claim_existing', $c);
        } else {
            $f->addElement('hidden', 'screenid', 0);
        }
        $f->setType('screenid', PARAM_INT);

        $f->addElement('text', 'name', get_string('name', $c), ['size' => 40, 'maxlength' => 100]);
        $f->setType('name', PARAM_TEXT);
        $f->hideIf('name', 'screenid', 'neq', 0);

        $f->addElement('select', 'template', get_string('template', $c), [
            'zones' => get_string('template_zones', $c),
            'full' => get_string('template_full', $c),
        ]);
        $f->hideIf('template', 'screenid', 'neq', 0);

        $groups = $DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name');
        if ($groups) {
            $boxes = [];
            foreach ($groups as $id => $name) {
                $boxes[] = $f->createElement('advcheckbox', $id, '', format_string($name));
            }
            $f->addGroup($boxes, 'groups', get_string('groups', $c), ' ', true);
            $f->hideIf('groups', 'screenid', 'neq', 0);
        }
        $f->addElement('text', 'newgroup', get_string('groups_add', $c), ['size' => 30, 'maxlength' => 100]);
        $f->setType('newgroup', PARAM_TEXT);
        $f->hideIf('newgroup', 'screenid', 'neq', 0);

        $this->add_action_buttons(true, get_string('claim_go', $c));
    }

    /**
     * A new screen needs a name.
     *
     * @param array $data
     * @param array $files
     * @return array
     */
    public function validation($data, $files): array {
        $errors = parent::validation($data, $files);
        if (empty($data['screenid']) && trim($data['name'] ?? '') === '') {
            $errors['name'] = get_string('required');
        }
        return $errors;
    }
}
