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
        global $DB;
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
        $rows = birthdays::all();
        $ids = array_values(array_unique(array_filter(array_map(function ($row) {
            return (int) $row->userid;
        }, $rows))));
        $names = \core_user\fields::for_name()->get_sql('', false, '', '', false)->selects;
        $accounts = $ids ? $DB->get_records_list('user', 'id', $ids, '', 'id, ' . $names) : [];
        $unlinked = 0;
        foreach ($rows as $row) {
            $picture = birthdays::list_picture((int) $row->id);
            $account = !empty($row->userid) && isset($accounts[(int) $row->userid]) ? fullname($accounts[(int) $row->userid]) : '';
            if ($account === '') {
                $unlinked++;
            }
            $people[] = [
                'id' => (int) $row->id,
                'name' => $row->name,
                'group' => (string) $row->groupname,
                'idnumber' => (string) $row->idnumber,
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
                'account' => $account,
                'linked' => $account !== '',
                'userid' => $account !== '' ? (int) $row->userid : 0,
            ];
        }
        $today = array_map(function ($person) {
            return $person['name'];
        }, birthdays::on($config, schedule::day($now)));
        return [
            'tabs' => home::tabs('centre', true, 'cumpleanos'),
            'howto' => howto::button('cumpleanos'),
            'hastabs' => true,
            'centre' => (new \moodle_url('/local/oksigeniahechauka/centre.php'))->out(false),
            'action' => (new \moodle_url('/local/oksigeniahechauka/birthdays.php'))->out(false),
            'modelurl' => (new \moodle_url('/local/oksigeniahechauka/model.php', ['kind' => 'birthdays']))->out(false),
            'moodlepictures' => has_capability('tool/uploaduser:uploaduserpictures', \context_system::instance()) ?
                (new \moodle_url('/admin/tool/uploaduser/picture.php'))->out(false) : '',
            'sesskey' => sesskey(),
            'people_url' => (new \moodle_url('/local/oksigeniahechauka/people.php'))->out(false),
            'icons' => ['x' => icons::svg('x'), 'search' => icons::svg('search')],
            'unlinked' => $unlinked,
            'hasunlinked' => $unlinked > 0,
            'linkstrings' => json_encode([
                'title' => get_string('birthdays_link_title', $c, '{name}'),
                'none' => get_string('birthdays_link_none', $c),
            ], JSON_UNESCAPED_UNICODE),
            'on' => !empty($config->sourcebirthdays),
            'cifra' => self::cifra($config),
            'family' => birthdays::family_available() ? ['on' => ($config->birthdaysfamily ?? '1') !== '0'] : null,
            'greetcard' => greeting::card_on(),
            'greetnotify' => greeting::notify_on(),
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

    /**
     * The pupils from Cifra: offered only where the site has a connection with Cifra, with what the last reading did.
     *
     * @param \stdClass $config
     * @return array|null on, status
     */
    protected static function cifra(\stdClass $config): ?array {
        if (!cifra::of_site()) {
            return null;
        }
        $c = 'local_oksigeniahechauka';
        $status = json_decode((string) ($config->birthdayscifrastatus ?? ''), true) ?: [];
        if (!empty($status['error'])) {
            $text = get_string('birthdays_cifra_error', $c, $status['error']);
        } else if (isset($status['count'])) {
            $text = get_string('birthdays_cifra_status', $c, (object) ['count' => $status['count'],
                'time' => userdate((int) $status['time'], get_string('strftimedatetimeshort', 'langconfig'))]);
        } else {
            $text = get_string('birthdays_cifra_help', $c);
        }
        return ['on' => !empty($config->birthdayscifra), 'status' => $text];
    }
}
