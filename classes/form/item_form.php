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
 * The form of a piece of content: a picture or a video, a notice, an event or a line of the ticker.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\form;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');

use local_oksigeniahechauka\local\schedule;

/**
 * What it is, when it shows and where.
 */
class item_form extends \moodleform {
    /**
     * The fields.
     *
     * @return void
     */
    protected function definition(): void {
        global $DB;
        $f = $this->_form;
        $c = 'local_oksigeniahechauka';
        $type = $this->_customdata['type'];

        $f->addElement('hidden', 'id');
        $f->setType('id', PARAM_INT);
        $f->addElement('hidden', 'type', $type);
        $f->setType('type', PARAM_ALPHA);

        // What it is.
        if ($type === 'media') {
            $f->addElement('filemanager', 'media', get_string('type_media', $c), null, [
                'subdirs' => 0,
                'maxfiles' => 1,
                'accepted_types' => ['image', 'video'],
                'return_types' => FILE_INTERNAL,
            ]);
            $f->addRule('media', null, 'required', null, 'client');
        }
        $f->addElement('text', 'title', get_string('title_' . $type, $c), ['size' => 60, 'maxlength' => 255]);
        $f->setType('title', PARAM_TEXT);
        if ($type !== 'media') {
            $f->addRule('title', null, 'required', null, 'client');
        }
        if ($type !== 'ticker') {
            $f->addElement('text', 'body', get_string('body_' . $type, $c), ['size' => 60, 'maxlength' => 200]);
            $f->setType('body', PARAM_TEXT);
        }
        if ($type === 'media') {
            $f->addElement('advcheckbox', 'caption', '', get_string('caption', $c));
            $f->setDefault('caption', 1);
            $f->addElement('select', 'fit', get_string('fit', $c), [
                'cover' => get_string('fit_cover', $c),
                'blur' => get_string('fit_blur', $c),
                'contain' => get_string('fit_contain', $c),
            ]);
            $f->addElement('text', 'duration', get_string('duration', $c), ['size' => 4]);
            $f->setType('duration', PARAM_INT);
            $f->addHelpButton('duration', 'duration', $c);
        }
        if ($type === 'notice') {
            $f->addElement('advcheckbox', 'important', '', get_string('important', $c));
        }
        if ($type === 'event') {
            $f->addElement('date_time_selector', 'start', get_string('event_start', $c));
            $f->addElement('date_time_selector', 'end', get_string('end', $c), ['optional' => true]);
            $colours = [];
            for ($i = 1; $i <= 4; $i++) {
                $colours[$i] = get_string('colour_n', $c, $i);
            }
            $f->addElement('select', 'colour', get_string('colour', $c), $colours);
        }

        // When.
        $f->addElement('header', 'when', get_string('schedule', $c));
        $f->setExpanded('when', false);
        $f->addElement('date_selector', 'datefrom', get_string('datefrom', $c), ['optional' => true]);
        $f->addElement('date_selector', 'dateuntil', get_string('dateuntil', $c), ['optional' => true]);
        $short = explode(',', get_string('days_short', $c));
        $days = [];
        for ($d = 1; $d <= 7; $d++) {
            $days[] = $f->createElement('advcheckbox', $d, '', $short[$d - 1]);
        }
        $f->addGroup($days, 'days', get_string('weekdays', $c), ' ', true);
        for ($r = 0; $r < 2; $r++) {
            $range = [
                $f->createElement('text', 'from', '', ['size' => 5, 'maxlength' => 5, 'placeholder' => '08:00']),
                $f->createElement('text', 'to', '', ['size' => 5, 'maxlength' => 5, 'placeholder' => '10:30']),
            ];
            $f->addGroup($range, 'range' . $r, $r === 0 ? get_string('times', $c) : '', ' – ', true);
            $f->setType('range' . $r . '[from]', PARAM_RAW_TRIMMED);
            $f->setType('range' . $r . '[to]', PARAM_RAW_TRIMMED);
        }
        $f->addHelpButton('range0', 'times', $c);
        $every = [1 => get_string('everyweeks_1', $c)];
        for ($n = 2; $n <= 4; $n++) {
            $every[$n] = get_string('everyweeks_n', $c, $n);
        }
        $f->addElement('select', 'everyweeks', get_string('everyweeks', $c), $every);

        // Where.
        $f->addElement('header', 'wherehdr', get_string('where', $c));
        $f->setExpanded('wherehdr', false);
        $f->addElement('advcheckbox', 'targetall', '', get_string('all', $c));
        $f->setDefault('targetall', 1);
        $groups = $DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name');
        if ($groups) {
            $boxes = [];
            foreach ($groups as $id => $name) {
                $boxes[] = $f->createElement('advcheckbox', $id, '', format_string($name));
            }
            $f->addGroup($boxes, 'groups', get_string('groups', $c), ' ', true);
            $f->hideIf('groups', 'targetall', 'checked');
        }
        $screens = $DB->get_records_menu('local_oksigeniahechauka_screen', null, 'sortorder, name', 'id, name');
        if ($screens) {
            $boxes = [];
            foreach ($screens as $id => $name) {
                $boxes[] = $f->createElement('advcheckbox', $id, '', format_string($name));
            }
            $f->addGroup($boxes, 'screens', get_string('screens', $c), ' ', true);
            $f->hideIf('screens', 'targetall', 'checked');
        }

        $f->addElement('header', 'publishhdr', get_string('published', $c));
        $f->addElement('advcheckbox', 'visible', '', get_string('published', $c));
        $f->setDefault('visible', 1);

        $this->add_action_buttons();
    }

    /**
     * Hours that are hours, and ranges with both ends.
     *
     * @param array $data
     * @param array $files
     * @return array
     */
    public function validation($data, $files): array {
        $errors = parent::validation($data, $files);
        for ($r = 0; $r < 2; $r++) {
            $from = trim($data['range' . $r]['from'] ?? '');
            $to = trim($data['range' . $r]['to'] ?? '');
            if ($from === '' && $to === '') {
                continue;
            }
            if ($from === '' || $to === '') {
                $errors['range' . $r] = get_string('wrongrange', 'local_oksigeniahechauka');
            } else if (!schedule::is_hour(self::hour($from)) || !schedule::is_hour(self::hour($to))) {
                $errors['range' . $r] = get_string('wronghour', 'local_oksigeniahechauka');
            }
        }
        return $errors;
    }

    /**
     * An hour as people type it: «8:30», «8.30» or «830».
     *
     * @param string $text
     * @return string «HH:MM»
     */
    public static function hour(string $text): string {
        $text = trim(str_replace(['.', 'h', 'H'], ':', $text));
        if (preg_match('/^(\d{1,2})$/', $text, $m)) {
            return sprintf('%02d:00', $m[1]);
        }
        if (preg_match('/^(\d{1,2}):?(\d{2})$/', $text, $m)) {
            return sprintf('%02d:%02d', $m[1], $m[2]);
        }
        return $text;
    }
}
