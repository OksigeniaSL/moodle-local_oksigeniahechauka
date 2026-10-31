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
require_once($CFG->dirroot . '/repository/lib.php'); // FILE_INTERNAL, which a page does not always have loaded.

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
        if ($type === 'agenda') {
            $f->addElement('text', 'url', get_string('agenda_url', $c), ['size' => 60, 'maxlength' => 1000]);
            $f->setType('url', PARAM_RAW_TRIMMED);
            $f->addRule('url', null, 'required', null, 'client');
            $f->addHelpButton('url', 'agenda_url', $c);
            $colours = [0 => get_string('colour_bystage', $c)];
            for ($i = 1; $i <= 4; $i++) {
                $colours[$i] = get_string('colour_n', $c, $i);
            }
            $f->addElement('select', 'colour', get_string('colour', $c), $colours);
        }
        if ($type !== 'ticker' && $type !== 'agenda') {
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

        // An agenda brings its own dates.
        if ($type !== 'agenda') {
            // When: the dates, the days and the hours, each said as people say it; together they make every combination.
            $f->addElement('header', 'when', get_string('schedule', $c));
            $f->setExpanded('when', true);
            $f->addElement('select', 'dates', get_string('dates', $c), [
                'always' => get_string('schedule_always', $c),
                'day' => get_string('dates_day', $c),
                'range' => get_string('dates_range', $c),
                'from' => get_string('dates_from', $c),
                'until' => get_string('dates_until', $c),
            ]);
            $f->addElement('date_selector', 'day', get_string('day', $c));
            $f->hideIf('day', 'dates', 'neq', 'day');
            $f->addElement('date_selector', 'datefrom', get_string('datefrom', $c));
            $f->hideIf('datefrom', 'dates', 'in', ['always', 'day', 'until']);
            $f->addElement('date_selector', 'dateuntil', get_string('dateuntil', $c));
            $f->hideIf('dateuntil', 'dates', 'in', ['always', 'day', 'from']);

            $f->addElement('select', 'daysmode', get_string('weekdays', $c), [
                'all' => get_string('daysmode_all', $c),
                'some' => get_string('daysmode_some', $c),
            ]);
            $short = explode(',', get_string('days_short', $c));
            $days = [];
            for ($d = 1; $d <= 7; $d++) {
                $days[] = $f->createElement('advcheckbox', $d, '', $short[$d - 1]);
            }
            $f->addGroup($days, 'days', '', ' ', true);
            $f->hideIf('days', 'daysmode', 'eq', 'all');
            // On a single day, weekdays and «every N weeks» mean nothing.
            $f->hideIf('daysmode', 'dates', 'eq', 'day');
            $f->hideIf('days', 'dates', 'eq', 'day');

            $f->addElement('select', 'hoursmode', get_string('times', $c), [
                'all' => get_string('hoursmode_all', $c),
                'some' => get_string('hoursmode_some', $c),
            ]);
            for ($r = 0; $r < 2; $r++) {
                $range = [
                    $f->createElement('text', 'from', '', ['size' => 5, 'maxlength' => 5, 'placeholder' => '08:00']),
                    $f->createElement('text', 'to', '', ['size' => 5, 'maxlength' => 5, 'placeholder' => '10:30']),
                ];
                $f->addGroup($range, 'range' . $r, '', ' – ', true);
                $f->setType('range' . $r . '[from]', PARAM_RAW_TRIMMED);
                $f->setType('range' . $r . '[to]', PARAM_RAW_TRIMMED);
                $f->hideIf('range' . $r, 'hoursmode', 'eq', 'all');
            }
            $f->addHelpButton('hoursmode', 'times', $c);
            $every = [1 => get_string('everyweeks_1', $c)];
            for ($n = 2; $n <= 4; $n++) {
                $every[$n] = get_string('everyweeks_n', $c, $n);
            }
            $f->addElement('select', 'everyweeks', get_string('everyweeks', $c), $every);
            $f->hideIf('everyweeks', 'dates', 'eq', 'day');
        }

        // Where.
        $f->addElement('header', 'wherehdr', get_string('where', $c));
        $f->setExpanded('wherehdr', false);
        // Only where the user may publish: who publishes in some groups gets those groups, and no single screen.
        $where = $this->_customdata['destinations'] ?? ['all' => true, 'groups' => [], 'screens' => []];
        if ($where['all']) {
            $f->addElement('advcheckbox', 'targetall', '', get_string('all', $c));
            $f->setDefault('targetall', 1);
        } else {
            $f->addElement('hidden', 'targetall', 0);
            $f->setType('targetall', PARAM_BOOL);
            $f->setExpanded('wherehdr', true);
        }
        $groups = $where['groups'];
        if ($groups) {
            $boxes = [];
            foreach ($groups as $id => $name) {
                $boxes[] = $f->createElement('advcheckbox', $id, '', format_string($name));
            }
            $f->addGroup($boxes, 'groups', get_string('groups', $c), ' ', true);
            if ($where['all']) {
                $f->hideIf('groups', 'targetall', 'checked');
            } else if (count($groups) === 1) {
                $f->setDefault('groups[' . array_key_first($groups) . ']', 1);
            }
        }
        $screens = $where['screens'];
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
        $c = 'local_oksigeniahechauka';
        $where = $this->_customdata['destinations'] ?? ['all' => true];
        if (!$where['all'] && !array_filter((array) ($data['groups'] ?? []))) {
            $errors['groups'] = get_string('publish_choosegroup', $c);
        }
        if (($data['type'] ?? '') === 'agenda') {
            if (!preg_match('#^(https?|webcal)://#i', trim($data['url'] ?? ''))) {
                $errors['url'] = get_string('agenda_bad_url', $c);
            }
            return $errors;
        }
        if (($data['dates'] ?? '') === 'range' && (int) $data['dateuntil'] < (int) $data['datefrom']) {
            $errors['dateuntil'] = get_string('wrongdates', $c);
        }
        $someday = ($data['dates'] ?? '') !== 'day' && ($data['daysmode'] ?? '') === 'some';
        if ($someday && !array_filter((array) ($data['days'] ?? []))) {
            $errors['days'] = get_string('power_nodays', $c);
        }
        if (($data['hoursmode'] ?? '') !== 'some') {
            return $errors;
        }
        $any = false;
        for ($r = 0; $r < 2; $r++) {
            $from = trim($data['range' . $r]['from'] ?? '');
            $to = trim($data['range' . $r]['to'] ?? '');
            if ($from === '' && $to === '') {
                continue;
            }
            if ($from === '' || $to === '') {
                $errors['range' . $r] = get_string('wrongrange', $c);
            } else if (!schedule::is_hour(self::hour($from)) || !schedule::is_hour(self::hour($to))) {
                $errors['range' . $r] = get_string('wronghour', $c);
            } else {
                $any = true;
            }
        }
        if (!$any && !isset($errors['range0']) && !isset($errors['range1'])) {
            $errors['range0'] = get_string('notimes', $c);
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
