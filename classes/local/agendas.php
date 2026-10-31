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
 * The agendas: iCal addresses that reach their screens.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * An agenda is a piece of content like a notice: a name, an iCal address, a colour and where it goes (every screen,
 * some groups, some screens). The server reads it every few minutes and keeps the events of the coming weeks; each
 * screen gets the events of the agendas that reach it.
 */
class agendas {
    /** The table of their events. */
    const TABLE = 'local_oksigeniahechauka_calevent';

    /** Days behind and ahead that are kept. */
    const BEHIND = 1;

    /** The biggest calendar read. */
    const MAX_BYTES = 5 * 1024 * 1024;

    /**
     * Reads an agenda and keeps its events; what happened stays in the data of the item.
     *
     * @param int $itemid
     * @param int $now
     * @return string ok or the error
     */
    public static function fetch(int $itemid, int $now): string {
        global $DB;
        $item = $DB->get_record('local_oksigeniahechauka_item', ['id' => $itemid, 'type' => 'agenda']);
        if (!$item) {
            return 'gone';
        }
        $data = items::data($item);
        $url = (string) ($data['url'] ?? '');
        $result = 'ok';
        $events = null;
        if (!preg_match('#^(https?|webcal)://#i', $url)) {
            $result = 'url';
        } else {
            $url = preg_replace('#^webcal://#i', 'https://', $url);
            global $CFG;
            require_once($CFG->libdir . '/filelib.php'); // The curl class, which a task does not have loaded.
            $curl = new \curl(['ignoresecurity' => false]);
            $curl->setHeader(['User-Agent: ' . weather::AGENT, 'Accept: text/calendar, */*']);
            $body = $curl->get($url, [], ['CURLOPT_TIMEOUT' => 30, 'CURLOPT_CONNECTTIMEOUT' => 10,
                'CURLOPT_MAXFILESIZE' => self::MAX_BYTES, 'CURLOPT_FOLLOWLOCATION' => true, 'CURLOPT_MAXREDIRS' => 3]);
            $code = (int) ($curl->get_info()['http_code'] ?? 0);
            if ($curl->get_errno() || $code !== 200 || strpos((string) $body, 'BEGIN:VCALENDAR') === false) {
                $result = $curl->get_errno() ? 'network' : ($code !== 200 ? 'http ' . $code : 'notical');
            } else {
                $zone = \core_date::get_server_timezone_object();
                $from = usergetmidnight($now, \core_date::get_server_timezone()) - self::BEHIND * DAYSECS;
                $to = $from + (self::BEHIND + manifest::HORIZON + 1) * DAYSECS;
                $events = ical::events((string) $body, $from, $to, $zone);
            }
        }
        if ($events !== null) {
            self::store($itemid, $events);
        }
        $data['fetched'] = $now;
        $data['result'] = $result;
        if ($events !== null) {
            $data['count'] = count($events);
        }
        $DB->set_field('local_oksigeniahechauka_item', 'data', json_encode($data), ['id' => $itemid]);
        return $result;
    }

    /**
     * Keeps the events of an agenda in place of the ones before.
     *
     * @param int $itemid
     * @param array $events as ical::events() gives them
     * @return void
     */
    public static function store(int $itemid, array $events): void {
        global $DB;
        $transaction = $DB->start_delegated_transaction();
        $DB->delete_records(self::TABLE, ['itemid' => $itemid]);
        $rows = [];
        foreach ($events as $e) {
            $rows[] = (object) ['itemid' => $itemid, 'uid' => $e['uid'] ?: null,
                'title' => $e['title'] !== '' ? $e['title'] : '·', 'detail' => $e['detail'] ?: null,
                'timestart' => $e['start'], 'timeend' => $e['end'], 'allday' => $e['allday'] ? 1 : 0];
        }
        $DB->insert_records(self::TABLE, $rows);
        $transaction->allow_commit();
    }

    /**
     * Reads every published agenda whose last reading is older than the given age.
     *
     * @param int $now
     * @param int $age seconds
     * @return array itemid => result
     */
    public static function fetch_all(int $now, int $age): array {
        global $DB;
        $out = [];
        foreach ($DB->get_records('local_oksigeniahechauka_item', ['type' => 'agenda', 'visible' => 1]) as $item) {
            $data = items::data($item);
            if ($now - (int) ($data['fetched'] ?? 0) >= $age) {
                $out[$item->id] = self::fetch((int) $item->id, $now);
            }
        }
        return $out;
    }

    /**
     * The events of an agenda as items of the contract, from today to the horizon.
     *
     * @param \stdClass $item
     * @param int $now
     * @return array
     */
    public static function contract(\stdClass $item, int $now): array {
        global $DB;
        $data = items::data($item);
        $color = (int) ($data['color'] ?? 1);
        $from = usergetmidnight($now, \core_date::get_server_timezone());
        $to = $from + (manifest::HORIZON + 1) * DAYSECS;
        $rows = $DB->get_records_select(
            self::TABLE,
            'itemid = :item AND timestart < :to AND
                (timeend >= :from OR (timeend = 0 AND timestart >= :from2))',
            ['item' => $item->id, 'to' => $to, 'from' => $from, 'from2' => $from],
            'timestart',
            '*',
            0,
            300
        );
        $out = [];
        foreach ($rows as $r) {
            $start = (int) $r->timestart;
            $end = (int) $r->timeend;
            // An all-day event ends at the midnight after its last day: its last day is the one before.
            $last = $end > 0 ? ($r->allday ? $end - 60 : $end) : $start;
            $event = ['id' => 'c' . $r->id, 'type' => 'event', 'zone' => 'side', 'title' => $r->title,
                'start' => schedule::stamp($start),
                'when' => ['from' => schedule::day($start), 'until' => schedule::day($last)]];
            if ($color >= 1 && $color <= 4) {
                // Without a colour of its own, the screen takes each event's stage from its title.
                $event['color'] = $color;
            }
            if ($end > 0) {
                $event['end'] = schedule::stamp($last);
            }
            if ($r->allday) {
                $event['allday'] = true;
            }
            if ((string) $r->detail !== '') {
                $event['detail'] = sources::line($r->detail, 60);
            }
            $out[] = $event;
        }
        return $out;
    }

    /**
     * Forgets the events of an agenda that is deleted.
     *
     * @param int $itemid
     * @return void
     */
    public static function delete(int $itemid): void {
        global $DB;
        $DB->delete_records(self::TABLE, ['itemid' => $itemid]);
    }
}
