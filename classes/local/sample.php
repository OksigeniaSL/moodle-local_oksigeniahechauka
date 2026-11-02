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
 * The example a centre finds the first time: a piece of each kind, each one saying what it does, so that neither the panel nor
 * the first screen starts empty. The screens show «Example data» while any of it is left; it goes with one button, and anything
 * of it changed in the panel becomes the centre's.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class sample {
    /** The plugin. */
    const C = 'local_oksigeniahechauka';

    /** The mark in the data of each piece. */
    const MARK = '%"sample":true%';

    /**
     * The pieces of the example still there.
     *
     * @return \stdClass[]
     */
    public static function items(): array {
        global $DB;
        return $DB->get_records_select('local_oksigeniahechauka_item', $DB->sql_like('data', ':m'), ['m' => self::MARK]);
    }

    /**
     * Whether any of the example is left.
     *
     * @return bool
     */
    public static function exists(): bool {
        return (bool) get_config(self::C, 'sampledata') && (bool) self::items();
    }

    /**
     * The next working day after a moment, at an hour of the site's calendar.
     *
     * @param int $now
     * @param int $hour
     * @return int
     */
    protected static function next_workday(int $now, int $hour): int {
        $day = (new \DateTimeImmutable('@' . $now))->setTimezone(\core_date::get_server_timezone_object())->setTime($hour, 0);
        do {
            $day = $day->modify('+1 day');
        } while ((int) $day->format('N') > 5);
        return $day->getTimestamp();
    }

    /**
     * Puts the example in, in the language of the site, taking out any example there was.
     *
     * @param int $now
     * @return int how many pieces
     */
    public static function add(int $now): int {
        global $DB;
        self::remove();
        $admin = get_admin();
        $by = $admin ? (int) $admin->id : 0;
        $order = (int) $DB->get_field_sql('SELECT COALESCE(MAX(sortorder), 0) FROM {local_oksigeniahechauka_item}');
        $s = function (string $key): string {
            return get_string('sample_' . $key, self::C);
        };
        $add = function (string $type, string $title, string $body, array $data) use ($DB, $now, $by, &$order): int {
            return (int) $DB->insert_record('local_oksigeniahechauka_item', (object) [
                'type' => $type, 'title' => $title, 'body' => $body, 'data' => json_encode(['sample' => true] + $data),
                'duration' => 0, 'sortorder' => ++$order, 'visible' => 1, 'targetall' => 1, 'everyweeks' => 0,
                'createdby' => $by, 'usermodified' => $by, 'timecreated' => $now, 'timemodified' => $now,
            ]);
        };
        $fs = get_file_storage();
        $picture = function (int $itemid, string $name) use ($fs) {
            $where = ['contextid' => files::context()->id, 'component' => files::COMPONENT, 'filearea' => files::MEDIA,
                'itemid' => $itemid, 'filepath' => '/', 'filename' => $name];
            $fs->create_file_from_pathname($where, __DIR__ . '/../../player/demo/media/' . $name);
        };
        $count = 0;
        $add('notice', $s('important'), $s('important_body'), ['important' => true]);
        $add('notice', $s('alone'), $s('alone_body'), []);
        $add('notice', $s('phone'), $s('phone_body'), []);
        $picture($add('media', $s('photo'), $s('photo_body'), ['caption' => true, 'fit' => 'cover']), 'huerto.jpg');
        $picture($add('media', $s('upright'), $s('upright_body'), ['caption' => true, 'fit' => 'blur']), 'huerto-vertical.jpg');
        $start = self::next_workday($now, 10);
        $add('event', $s('event'), $s('event_body'), ['start' => $start, 'end' => $start + HOURSECS, 'category' => '']);
        $table = tables::parse(get_string('model_table', self::C));
        if ($table) {
            $add('table', $s('table'), '', ['table' => $table, 'count' => count($table['rows']), 'result' => 'ok',
                'fetched' => $now]);
            $count++;
        }
        $add('ticker', $s('ticker'), '', []);
        $add('ticker', $s('ticker_remove'), '', []);
        set_config('sampledata', 1, self::C);
        return $count + 8;
    }

    /**
     * Takes the example out, with its pictures.
     *
     * @return int how many pieces went
     */
    public static function remove(): int {
        $items = self::items();
        foreach ($items as $item) {
            items::delete((int) $item->id);
        }
        unset_config('sampledata', self::C);
        return count($items);
    }

    /**
     * Keeps the example's event ahead: once it is over, it moves to the next working day.
     *
     * @param int $now
     * @return void
     */
    public static function refresh(int $now): void {
        global $DB;
        foreach (self::items() as $item) {
            $data = items::data($item);
            if ($item->type !== 'event' || (int) ($data['end'] ?? 0) > $now) {
                continue;
            }
            $data['start'] = self::next_workday($now, 10);
            $data['end'] = $data['start'] + HOURSECS;
            $DB->set_field('local_oksigeniahechauka_item', 'data', json_encode($data), ['id' => $item->id]);
        }
    }

    /**
     * Whether the example should go in at install: not in the test sites, which start empty on purpose.
     *
     * @return bool
     */
    public static function at_install(): bool {
        return !(defined('PHPUNIT_UTIL') && PHPUNIT_UTIL) && !(defined('BEHAT_UTIL') && BEHAT_UTIL)
            && !(defined('PHPUNIT_TEST') && PHPUNIT_TEST) && !(defined('BEHAT_SITE_RUNNING') && BEHAT_SITE_RUNNING);
    }
}
