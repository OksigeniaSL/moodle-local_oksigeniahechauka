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
 * Who has a birthday: from a date field of the Moodle profile the centre chooses, from a list kept in the panel, or both. Never
 * the year: the list does not keep it, and the screens only ever get a name, a group and a picture.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class birthdays {
    /** @var string The list kept in the panel. */
    const TABLE = 'local_oksigeniahechauka_birthday';

    /** @var int The side of a picture of the list, in pixels. */
    const PHOTO = 640;

    /**
     * The date fields of the Moodle profile, to choose from.
     *
     * @return array shortname => name
     */
    public static function fields(): array {
        global $DB;
        $out = [];
        $records = $DB->get_records('user_info_field', ['datatype' => 'datetime'], 'sortorder', 'id, shortname, name');
        foreach ($records as $field) {
            $out[$field->shortname] = format_string($field->name, true, ['context' => \context_system::instance()]);
        }
        return $out;
    }

    /**
     * The month and the day to look for on a date. Whoever was born on 29 February has it on the 28th when there is no 29.
     *
     * @param string $date YYYY-MM-DD
     * @return array of [month, day]
     */
    protected static function days_of(string $date): array {
        [$year, $month, $day] = array_map('intval', explode('-', $date));
        $days = [[$month, $day]];
        if ($month === 2 && $day === 28 && !checkdate(2, 29, $year)) {
            $days[] = [2, 29];
        }
        return $days;
    }

    /**
     * The users whose date field falls on a date.
     *
     * @param string $shortname the field
     * @param string $date YYYY-MM-DD
     * @return int[] their ids
     */
    protected static function users_on(string $shortname, string $date): array {
        global $DB;
        if ($shortname === '') {
            return [];
        }
        $cache = \cache::make('local_oksigeniahechauka', 'birthdays');
        $key = sha1($shortname . '|' . $date);
        $ids = $cache->get($key);
        if ($ids !== false) {
            return $ids;
        }
        $ids = [];
        $wanted = array_map(function ($d) {
            return sprintf('%02d-%02d', $d[0], $d[1]);
        }, self::days_of($date));
        $zone = \core_date::get_server_timezone_object();
        $rows = $DB->get_recordset_sql(
            "SELECT d.userid, d.data
               FROM {user_info_data} d
               JOIN {user_info_field} f ON f.id = d.fieldid
               JOIN {user} u ON u.id = d.userid
              WHERE f.shortname = :shortname AND u.deleted = 0 AND u.suspended = 0",
            ['shortname' => $shortname]
        );
        foreach ($rows as $row) {
            $time = (int) $row->data;
            if ($time !== 0 && in_array((new \DateTime('@' . $time))->setTimezone($zone)->format('m-d'), $wanted, true)) {
                $ids[] = (int) $row->userid;
            }
        }
        $rows->close();
        $cache->set($key, $ids);
        return $ids;
    }

    /**
     * The picture of a Moodle user.
     *
     * @param int $userid
     * @return \stored_file|null
     */
    protected static function user_picture(int $userid): ?\stored_file {
        $context = \context_user::instance($userid, IGNORE_MISSING);
        if (!$context) {
            return null;
        }
        foreach (get_file_storage()->get_area_files($context->id, 'user', 'icon', 0, 'id', false) as $file) {
            if (strpos($file->get_filename(), 'f3.') === 0) {
                return $file;
            }
        }
        return null;
    }

    /**
     * The picture of someone on the list.
     *
     * @param int $id
     * @return \stored_file|null
     */
    public static function list_picture(int $id): ?\stored_file {
        $files = get_file_storage()->get_area_files(files::context()->id, files::COMPONENT, files::BIRTHDAY, $id, 'id', false);
        return $files ? reset($files) : null;
    }

    /**
     * Who has a birthday on a date, by name.
     *
     * @param \stdClass $config the plugin's
     * @param string $date YYYY-MM-DD
     * @return array of {name, group, photo}, those without a group or a picture without them
     */
    public static function on(\stdClass $config, string $date): array {
        global $DB;
        $people = [];
        $ids = self::users_on((string) ($config->birthdayfield ?? ''), $date);
        $rows = [];
        foreach (self::days_of($date) as [$month, $day]) {
            $rows = array_merge($rows, array_values($DB->get_records(self::TABLE, ['month' => $month, 'day' => $day])));
        }
        $users = self::users_by_idnumber(array_map(function ($row) {
            return (string) $row->idnumber;
        }, $rows));
        $linked = array_filter(array_map(function ($row) {
            return (int) ($row->userid ?? 0);
        }, $rows));
        $accounts = $linked ? $DB->get_records_list('user', 'id', array_values(array_unique($linked)), '', 'id, picture') : [];
        $seen = [];
        foreach ($rows as $row) {
            // Its account: the one it was linked to, or the one with its ID number.
            $user = !empty($row->userid) ? ($accounts[(int) $row->userid] ?? null) : ($users[(string) $row->idnumber] ?? null);
            if ($user && in_array((int) $user->id, $ids)) {
                // Already there, from the profile.
                continue;
            }
            // The same person twice (written by hand and brought from Cifra): once.
            $plain = self::plain_name($row->name);
            if (isset($seen[$plain])) {
                continue;
            }
            $seen[$plain] = true;
            // Its own picture, the one in the families' file, or the one of its Moodle account; none where a no counts.
            [$allowed, $familyphoto] = self::family_photo($row, $user ? (int) $user->id : 0);
            $photo = !$allowed ? null : (self::list_picture((int) $row->id) ?: $familyphoto
                ?: ($user && $user->picture ? self::user_picture((int) $user->id) : null));
            $people[] = self::person($row->name, (string) $row->groupname, $photo);
        }
        if ($ids) {
            foreach ($DB->get_records_list('user', 'id', $ids, '', 'id, firstname, lastname, department, picture') as $user) {
                // The first name and the first surname: enough to know who it is, and no more.
                $surname = preg_split('/\s+/', trim((string) $user->lastname))[0];
                [$allowed, $familyphoto] = self::family_photo(null, (int) $user->id);
                $people[] = self::person(
                    trim($user->firstname . ' ' . $surname),
                    (string) $user->department,
                    !$allowed ? null : ($familyphoto ?: ($user->picture ? self::user_picture((int) $user->id) : null))
                );
            }
        }
        usort($people, function ($a, $b) {
            return strcoll($a['name'], $b['name']);
        });
        return $people;
    }

    /**
     * Someone, as the screens get them.
     *
     * @param string $name
     * @param string $group
     * @param \stored_file|null $photo
     * @return array
     */
    protected static function person(string $name, string $group, ?\stored_file $photo): array {
        $out = ['name' => items::plain($name)];
        if (trim($group) !== '') {
            $out['group'] = items::plain($group);
        }
        if ($photo) {
            $out['photo'] = files::media($photo);
        }
        return $out;
    }

    /**
     * Today's and tomorrow's, as items of the contract: a screen without a network still knows tomorrow's.
     *
     * @param \stdClass $config the plugin's
     * @param int $now
     * @return array
     */
    public static function items(\stdClass $config, int $now): array {
        if (empty($config->sourcebirthdays)) {
            return [];
        }
        $items = [];
        foreach ([0, 1] as $add) {
            $date = schedule::day($now, $add);
            $people = self::on($config, $date);
            if ($people) {
                $items[] = ['id' => 'birthdays-' . $date, 'type' => 'birthdays', 'zone' => 'extra', 'date' => $date,
                    'when' => ['from' => $date, 'until' => $date], 'people' => $people];
            }
        }
        return $items;
    }

    /**
     * Whether a screen may read this picture: only of someone whose birthday is around now, and only with the birthdays on.
     *
     * @param \stored_file $file
     * @return bool
     */
    public static function may_show(\stored_file $file): bool {
        $config = get_config('local_oksigeniahechauka');
        if (empty($config->sourcebirthdays) || $file->is_directory()) {
            return false;
        }
        // Only the photos that the birthdays of yesterday, today or tomorrow show, with every rule already applied.
        $now = time();
        foreach ([schedule::day($now, -1), schedule::day($now), schedule::day($now, 1)] as $date) {
            foreach (self::on($config, $date) as $person) {
                if ((int) ($person['photo']['id'] ?? 0) === (int) $file->get_id()) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * The list, in the order of the year.
     *
     * @return array of records
     */
    public static function all(): array {
        global $DB;
        return array_values($DB->get_records(self::TABLE, null, 'month, day, name'));
    }

    /**
     * Someone on the list. With the same name on the same day, what comes updates what was there.
     *
     * @param string $name
     * @param string $group
     * @param int $day
     * @param int $month
     * @param string $idnumber the ID number in Moodle, often the one of enrolment: it matches a picture, or the Moodle user
     * @param string $email their email, to find their Moodle account when the ID number does not
     * @return int|null the id, or null if the date is no date or there is no name
     */
    public static function add(
        string $name,
        string $group,
        int $day,
        int $month,
        string $idnumber = '',
        string $email = ''
    ): ?int {
        global $DB, $USER;
        $name = \core_text::substr(trim($name), 0, 120);
        $group = \core_text::substr(trim($group), 0, 60);
        $idnumber = \core_text::substr(trim($idnumber), 0, 100);
        // Any leap year: 29 February is a date.
        if ($name === '' || !checkdate($month, $day, 2024)) {
            return null;
        }
        $now = time();
        if (!self::$batch) {
            self::$accounts = null;
        }
        $same = $DB->get_record(self::TABLE, ['name' => $name, 'month' => $month, 'day' => $day], '*', IGNORE_MULTIPLE);
        $idnumber = $idnumber !== '' ? $idnumber : (string) ($same->idnumber ?? '');
        $userid = self::account($name, $idnumber, $email);
        if ($same) {
            $update = ['id' => $same->id, 'groupname' => $group, 'usermodified' => $USER->id, 'timemodified' => $now];
            if ($idnumber !== '') {
                $update['idnumber'] = $idnumber;
            }
            if ($userid) {
                $update['userid'] = $userid;
            }
            $DB->update_record(self::TABLE, (object) $update);
            return (int) $same->id;
        }
        return (int) $DB->insert_record(self::TABLE, (object) ['name' => $name, 'groupname' => $group, 'month' => $month,
            'day' => $day, 'idnumber' => $idnumber !== '' ? $idnumber : null, 'userid' => $userid ?: null,
            'usermodified' => $USER->id, 'timecreated' => $now, 'timemodified' => $now]);
    }

    /**
     * The rows of the model a centre downloads: titles first, then two of example data.
     *
     * @return array of arrays
     */
    public static function model(): array {
        return array_map(function ($line) {
            return explode(';', $line);
        }, explode("\n", get_string('model_birthdays', 'local_oksigeniahechauka')));
    }

    /** @var array[] What a column holds, by the words of its title (plain: lower case, no accents); the first wins. */
    const TITLES = [
        'name' => ['nombre', 'name', 'first name', 'firstname', 'given name', 'nombre completo', 'full name', 'alumno',
            'persona'],
        'surname' => ['apellidos', 'apellido', 'apellido1', 'apellido 1', 'primer apellido', 'surname', 'surnames',
            'last name', 'lastname', 'family name'],
        'group' => ['grupo', 'group', 'clase', 'class', 'unidad', 'curso', 'course', 'form'],
        'date' => ['fecha de nacimiento', 'fecha nacimiento', 'f nacimiento', 'nacimiento', 'cumpleanos', 'fecha', 'birthday',
            'date of birth', 'birth date', 'birthdate', 'dob'],
        'day' => ['dia', 'day'],
        'month' => ['mes', 'month'],
        'idnumber' => ['numero de id', 'id number', 'idnumber', 'id', 'expediente', 'n expediente', 'nia', 'matricula',
            'student id'],
        'email' => ['correo', 'correo electronico', 'email', 'e mail', 'mail'],
    ];

    /** @var string[] Words that go with the surname after them: «de la Fuente» is one surname. */
    const PARTICLES = ['de', 'del', 'la', 'las', 'los', 'y', 'da', 'das', 'do', 'dos', 'di', 'du', 'van', 'von', 'der', 'den',
        'le'];

    /** @var string Where a row of the list comes from when Cifra brings it. */
    const CIFRA = 'cifra';

    /** @var array|null The accounts of the site by ID number, email and name, gathered once for a whole list. */
    protected static $accounts = null;

    /** @var bool Whether a whole list is being added, so that the accounts are gathered only once. */
    protected static $batch = false;

    /**
     * The Moodle account of someone on the list: by ID number, else by email, else by a name only one account has (the
     * first name and the first surname, or the whole name). Never a guess: two accounts that fit are none.
     *
     * @param string $name
     * @param string $idnumber
     * @param string $email
     * @return int the user id, or 0
     */
    public static function account(string $name, string $idnumber = '', string $email = ''): int {
        global $DB, $CFG;
        if (self::$accounts === null) {
            $index = ['idnumber' => [], 'email' => [], 'name' => []];
            $users = $DB->get_recordset_select(
                'user',
                'deleted = 0 AND suspended = 0 AND id <> :guest',
                ['guest' => $CFG->siteguest],
                '',
                'id, idnumber, email, firstname, lastname'
            );
            foreach ($users as $user) {
                $id = (int) $user->id;
                if (trim((string) $user->idnumber) !== '') {
                    $index['idnumber'][\core_text::strtolower(trim($user->idnumber))][$id] = $id;
                }
                if (trim((string) $user->email) !== '') {
                    $index['email'][\core_text::strtolower(trim($user->email))][$id] = $id;
                }
                $index['name'][self::plain_name($user->firstname . ' ' . self::first_surname((string) $user->lastname))][$id] = $id;
                $index['name'][self::plain_name($user->firstname . ' ' . $user->lastname)][$id] = $id;
            }
            $users->close();
            self::$accounts = $index;
        }
        $keys = ['idnumber' => \core_text::strtolower(trim($idnumber)), 'email' => \core_text::strtolower(trim($email)),
            'name' => self::plain_name($name)];
        foreach ($keys as $kind => $key) {
            if ($key === '' || empty(self::$accounts[$kind][$key])) {
                continue;
            }
            $ids = self::$accounts[$kind][$key];
            return count($ids) === 1 ? (int) reset($ids) : 0;
        }
        return 0;
    }

    /**
     * The columns of a first line made of titles: what each holds, or null when it is not a line of titles that says at least
     * the name and the date (or the day and the month).
     *
     * @param array $parts the fields of the first line
     * @return array|null [what => column]
     */
    protected static function titles(array $parts): ?array {
        $plain = array_map(function ($part) {
            return self::plain_name((string) $part);
        }, $parts);
        $map = [];
        foreach (self::TITLES as $what => $words) {
            foreach ($words as $word) {
                $column = array_search($word, $plain, true);
                if ($column !== false && !in_array($column, $map, true)) {
                    $map[$what] = $column;
                    break;
                }
            }
        }
        $dated = isset($map['date']) || (isset($map['day']) && isset($map['month']));
        return isset($map['name']) && $dated ? $map : null;
    }

    /**
     * The first surname of «Apellidos», as a screen says a name: «de la Fuente Martín» is «de la Fuente».
     *
     * @param string $surnames
     * @return string
     */
    protected static function first_surname(string $surnames): string {
        $out = [];
        foreach (preg_split('/\s+/u', trim($surnames), -1, PREG_SPLIT_NO_EMPTY) as $word) {
            $out[] = $word;
            if (!in_array(\core_text::strtolower($word), self::PARTICLES, true)) {
                break;
            }
        }
        return implode(' ', $out);
    }

    /**
     * The day and the month of a date as a sheet writes it: day first (15/03/2014, 15.3, 15-03-14) or a year first
     * (2014-03-15, also with its time).
     *
     * @param string $date
     * @return array|null [day, month]
     */
    protected static function day_month(string $date): ?array {
        $date = trim($date);
        if (preg_match('~^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$~', $date, $m)) {
            return [(int) $m[3], (int) $m[2]];
        }
        if (preg_match('~^(\d{1,2})[/.-](\d{1,2})(?:[/.-]\d{2,4})?$~', $date, $m)) {
            return [(int) $m[1], (int) $m[2]];
        }
        return null;
    }

    /**
     * What a line says, read by the titles of its columns.
     *
     * @param array $parts the fields of the line
     * @param array $map [what => column], from titles()
     * @return array|null [name, group, day, month, idnumber, email]
     */
    protected static function read_titled(array $parts, array $map): ?array {
        $get = function (string $what) use ($parts, $map): string {
            return isset($map[$what]) ? trim((string) ($parts[$map[$what]] ?? '')) : '';
        };
        $name = trim($get('name') . ' ' . self::first_surname($get('surname')));
        if (isset($map['date'])) {
            $date = self::day_month($get('date'));
        } else {
            $date = ctype_digit($get('day')) && ctype_digit($get('month')) ? [(int) $get('day'), (int) $get('month')] : null;
        }
        if ($name === '' || !$date) {
            return null;
        }
        return [$name, $get('group'), $date[0], $date[1], $get('idnumber'), $get('email')];
    }

    /**
     * What a line says: name, group, day, month and ID number. Two shapes: the model's columns (name, group, day, month and the
     * ID number, if any) or a date at the end («Lucía Pérez; 3.º A; 15/03», the group may be left out). Of a date, the day and
     * the month: a year there is ignored.
     *
     * @param array $parts the fields of the line
     * @return array|null [name, group, day, month, idnumber], or null if it is not understood
     */
    protected static function read_line(array $parts): ?array {
        $parts = array_map('trim', $parts);
        while ($parts && end($parts) === '') {
            array_pop($parts);
        }
        if (count($parts) >= 4 && ctype_digit($parts[2]) && ctype_digit($parts[3])) {
            return [$parts[0], $parts[1], (int) $parts[2], (int) $parts[3], $parts[4] ?? ''];
        }
        if (count($parts) < 2) {
            return null;
        }
        $date = self::day_month((string) array_pop($parts));
        if (!$date) {
            return null;
        }
        $name = (string) array_shift($parts);
        return [$name, implode(' ', $parts), $date[0], $date[1], ''];
    }

    /**
     * A list pasted in or a spreadsheet saved as CSV: a person per line. Pasted, the fields go apart at a semicolon, a tab or a
     * comma; from a file, at the one its first line uses, with quotes as a spreadsheet writes them. A first line that is no
     * person is the titles of the columns, and the example rows of the model are not added.
     *
     * @param string $text
     * @param bool $file it comes from a file
     * @return array {added: how many, wrong: the lines not understood}
     */
    public static function import(string $text, bool $file = false): array {
        $text = preg_replace('/^\xEF\xBB\xBF/', '', $text);
        if (!mb_check_encoding($text, 'UTF-8')) {
            // What a spreadsheet in Spanish or English saves as «CSV» by default.
            $text = \core_text::convert($text, 'windows-1252', 'utf-8');
        }
        $lines = array_values(array_filter(preg_split('/\R/u', $text), function ($line) {
            return trim($line) !== '';
        }));
        $separator = null;
        if ($file && $lines) {
            $count = [';' => substr_count($lines[0], ';'), "\t" => substr_count($lines[0], "\t"),
                ',' => substr_count($lines[0], ',')];
            arsort($count);
            $separator = (string) array_key_first($count);
        }
        $examples = [];
        foreach (array_slice(self::model(), 1) as $row) {
            $examples[] = self::plain_name($row[0]) . '|' . (int) ($row[2] ?? 0) . '|' . (int) ($row[3] ?? 0);
        }
        $added = 0;
        $wrong = [];
        self::$accounts = null;
        self::$batch = true;
        $split = function (string $line) use ($separator): array {
            return $separator !== null ? str_getcsv($line, $separator, '"', '') : preg_split('/[;\t,]/', $line);
        };
        // A first line of titles says what each column holds: what a management program exports, in any order.
        $map = $lines ? self::titles($split($lines[0])) : null;
        if ($map) {
            array_shift($lines);
        }
        foreach ($lines as $n => $line) {
            $parts = $split($line);
            $person = $map ? self::read_titled($parts, $map) : self::read_line($parts);
            if (!$person) {
                if ($map || $n > 0 || preg_match('/\d/', $line)) {
                    $wrong[] = $line;
                }
                continue;
            }
            [$name, $group, $day, $month, $idnumber] = $person;
            $email = (string) ($person[5] ?? '');
            if (in_array(self::plain_name($name) . '|' . $day . '|' . $month, $examples, true)) {
                continue;
            }
            if (self::add($name, $group, $day, $month, $idnumber, $email)) {
                $added++;
            } else {
                $wrong[] = $line;
            }
        }
        self::$accounts = null;
        self::$batch = false;
        return ['added' => $added, 'wrong' => $wrong];
    }

    /**
     * Takes someone off the list, with their picture.
     *
     * @param int $id
     * @return void
     */
    public static function delete(int $id): void {
        global $DB;
        get_file_storage()->delete_area_files(files::context()->id, files::COMPONENT, files::BIRTHDAY, $id);
        $DB->delete_records(self::TABLE, ['id' => $id]);
    }

    /**
     * The picture of someone on the list: reduced, since a screen shows it small and a phone's may weigh megabytes.
     *
     * @param int $id
     * @param string $path the file uploaded
     * @param string $filename its name
     * @return bool whether it was a picture
     */
    public static function set_picture(int $id, string $path, string $filename): bool {
        $fs = get_file_storage();
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
            return false;
        }
        // Read it whole first: a damaged one has a good header, and it must not take the rest of a folder with it.
        // phpcs:ignore Generic.PHP.NoSilencedErrors.Discouraged
        if (!@imagecreatefromstring((string) file_get_contents($path))) {
            return false;
        }
        $context = files::context()->id;
        $fs->delete_area_files($context, files::COMPONENT, files::BIRTHDAY, $id);
        $record = ['contextid' => $context, 'component' => files::COMPONENT, 'filearea' => files::BIRTHDAY, 'itemid' => $id,
            'filepath' => '/', 'filename' => 'o.' . $ext];
        $original = $fs->create_file_from_pathname($record, $path);
        $record['filename'] = 'p.' . $ext;
        $fs->convert_image($record, $original, self::PHOTO, self::PHOTO, true);
        $original->delete();
        return true;
    }

    /**
     * Who a file is for, by its name: a folder of pictures named after each person, or after their ID number, is what a centre
     * usually has.
     *
     * @param string $filename
     * @return int|null the id of the person on the list, when only one fits
     */
    public static function who_is(string $filename): ?int {
        $stem = trim(pathinfo($filename, PATHINFO_FILENAME));
        $wanted = self::plain_name($stem);
        $byid = [];
        $byname = [];
        foreach (self::all() as $row) {
            if ((string) $row->idnumber !== '' && \core_text::strtolower(trim($row->idnumber)) === \core_text::strtolower($stem)) {
                $byid[] = (int) $row->id;
            }
            if (self::plain_name($row->name) === $wanted) {
                $byname[] = (int) $row->id;
            }
        }
        if ($byid) {
            return count($byid) === 1 ? $byid[0] : null;
        }
        return count($byname) === 1 ? $byname[0] : null;
    }

    /**
     * The Moodle users with these ID numbers, when each one is only one.
     *
     * @param array $idnumbers
     * @return array idnumber => user record (id, picture)
     */
    protected static function users_by_idnumber(array $idnumbers): array {
        global $DB;
        $idnumbers = array_values(array_unique(array_filter(array_map('strval', $idnumbers), 'strlen')));
        if (!$idnumbers) {
            return [];
        }
        [$in, $params] = $DB->get_in_or_equal($idnumbers);
        $found = [];
        foreach ($DB->get_records_select('user', "idnumber $in AND deleted = 0", $params, '', 'id, idnumber, picture') as $user) {
            $found[$user->idnumber][] = $user;
        }
        $out = [];
        foreach ($found as $idnumber => $users) {
            if (count($users) === 1) {
                $out[$idnumber] = $users[0];
            }
        }
        return $out;
    }

    /**
     * A name to compare: no accents, no capitals, nothing but letters and numbers.
     *
     * @param string $name
     * @return string
     */
    protected static function plain_name(string $name): string {
        $ascii = \core_text::strtolower(\core_text::specialtoascii($name));
        return trim(preg_replace('/[^a-z0-9]+/', ' ', $ascii));
    }

    /**
     * The pupils of Cifra on the list, as Cifra has them tonight: who is new comes in, who changed is put right, who was
     * already there by hand (the same name and day) is taken over with its photo, and who left goes. Nothing is taken from a
     * list that comes empty when there were people: it would empty the screens by a failure.
     *
     * @param array[] $people as Cifra gives them, keyed by its id
     * @param int $now
     * @return array {added, updated, adopted, gone, count}
     */
    public static function from_cifra(array $people, int $now): array {
        global $DB, $USER;
        $have = [];
        $rows = $DB->get_records(self::TABLE, ['source' => self::CIFRA], '', 'id, sourcekey, name, groupname, day, month, userid');
        foreach ($rows as $row) {
            $have[(string) $row->sourcekey] = $row;
        }
        $present = cifra::present($people, $now);
        $done = ['added' => 0, 'updated' => 0, 'adopted' => 0, 'gone' => 0, 'count' => 0];
        if (!$present && $have) {
            throw new \moodle_exception('cifraerrorincomplete', 'local_oksigeniahechauka', '', 'alumnos');
        }
        self::$accounts = null;
        self::$batch = true;
        $seen = [];
        foreach ($present as $id => $person) {
            $date = self::day_month((string) ($person['fecha_nacimiento'] ?? ''));
            $name = trim(trim((string) ($person['nombre'] ?? '')) . ' ' .
                self::first_surname(trim((string) ($person['apellido1'] ?? ''))));
            if (!$date || $name === '' || !checkdate($date[1], $date[0], 2024)) {
                continue;
            }
            $key = (string) ($person['id'] ?? $id);
            $name = \core_text::substr($name, 0, 120);
            $group = \core_text::substr(trim((string) ($person['grupo_academico_principal']['etiqueta'] ?? '')), 0, 60);
            $fields = ['name' => $name, 'groupname' => $group, 'day' => $date[0], 'month' => $date[1],
                'source' => self::CIFRA, 'sourcekey' => $key, 'usermodified' => $USER->id, 'timemodified' => $now];
            $userid = self::account($name, '', (string) ($person['email'] ?? ''));
            if ($userid) {
                $fields['userid'] = $userid;
            }
            if (isset($have[$key])) {
                // Only what changed is written: the same person every night is not a change.
                $old = $have[$key];
                $same = $old->name === $name && (string) $old->groupname === $group && (int) $old->day === $date[0]
                    && (int) $old->month === $date[1] && (!$userid || (int) $old->userid === $userid);
                if (!$same) {
                    $DB->update_record(self::TABLE, (object) (['id' => $old->id] + $fields));
                    $done['updated']++;
                }
            } else {
                $same = $DB->get_record_select(
                    self::TABLE,
                    'source IS NULL AND month = :month AND day = :day AND name = :name',
                    ['month' => $date[1], 'day' => $date[0], 'name' => $name],
                    'id',
                    IGNORE_MULTIPLE
                );
                if ($same) {
                    $DB->update_record(self::TABLE, (object) (['id' => $same->id] + $fields));
                    $done['adopted']++;
                } else {
                    $DB->insert_record(self::TABLE, (object) ($fields + ['timecreated' => $now]));
                    $done['added']++;
                }
            }
            $seen[$key] = true;
        }
        foreach ($have as $key => $row) {
            if (!isset($seen[$key])) {
                self::delete((int) $row->id);
                $done['gone']++;
            }
        }
        self::$accounts = null;
        self::$batch = false;
        $done['count'] = count($seen);
        return $done;
    }

    /**
     * The nightly reading of Cifra, when it is on and the site has a connection: what happened is kept for the panel.
     *
     * @param int $now
     * @return string what happened, for the log of the task
     */
    public static function sync_cifra(int $now): string {
        $c = 'local_oksigeniahechauka';
        if (empty(get_config($c, 'birthdayscifra'))) {
            return 'off';
        }
        $cifra = cifra::of_site();
        try {
            if (!$cifra) {
                throw new \moodle_exception('cifraerrorsettings', $c);
            }
            $done = self::from_cifra($cifra->people(), $now);
        } catch (\moodle_exception $e) {
            set_config('birthdayscifrastatus', json_encode(['time' => $now, 'error' => $e->getMessage()]), $c);
            return 'error: ' . $e->errorcode;
        }
        set_config('birthdayscifrastatus', json_encode(['time' => $now] + $done), $c);
        return json_encode($done);
    }

    /**
     * The families' file (Oksigenia Family), when it is on the site with its photos on and the screens take them.
     *
     * @return string|null its API class
     */
    protected static function family(): ?string {
        return self::family_available() && get_config('local_oksigeniahechauka', 'birthdaysfamily') !== '0' ?
            '\\local_oksigeniafamily\\api' : null;
    }

    /**
     * Whether the families' file is on the site with its photos on: then the panel offers to take them.
     *
     * @return bool
     */
    public static function family_available(): bool {
        $api = '\\local_oksigeniafamily\\api';
        return class_exists($api) && method_exists($api, 'photos_enabled') && $api::is_available() && $api::photos_enabled();
    }

    /**
     * What the families' file says of someone: whether their image may be shown (yes unless a no counts) and its photo.
     *
     * @param \stdClass|null $row someone of the list, or null for a Moodle account alone
     * @param int $userid their account, or 0
     * @return array [allowed, stored_file|null]
     */
    protected static function family_photo(?\stdClass $row, int $userid): array {
        $api = self::family();
        if (!$api) {
            return [true, null];
        }
        if ($userid) {
            return [$api::photo_allowed_for_user($userid), $api::photo_for_user($userid)];
        }
        $key = null;
        if ($row && ($row->source ?? '') === self::CIFRA) {
            $key = 'cifra:' . $row->sourcekey;
        } else if ($row && trim((string) $row->idnumber) !== '') {
            $key = $api::student_key((string) $row->idnumber, 'idnumber');
        }
        return $key ? [$api::photo_allowed_for_key($key), $api::photo_for_key($key)] : [true, null];
    }
}
