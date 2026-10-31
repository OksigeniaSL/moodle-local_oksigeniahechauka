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

namespace local_oksigeniahechauka;

use local_oksigeniahechauka\local\ical;

/**
 * Reading an iCal calendar: the events a school calendar has, and only those that touch the days asked for.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\ical
 */
#[\PHPUnit\Framework\Attributes\CoversClass(ical::class)]
final class ical_test extends \advanced_testcase {
    /**
     * A moment on the site clock.
     *
     * @param string $when
     * @return int
     */
    protected function moment(string $when): int {
        return (new \DateTime($when, new \DateTimeZone('Atlantic/Canary')))->getTimestamp();
    }

    /**
     * Events as «title start end allday», start and end on the site clock.
     *
     * @param array $events
     * @return string[]
     */
    protected function lines(array $events): array {
        $zone = new \DateTimeZone('Atlantic/Canary');
        return array_map(function ($e) use ($zone) {
            $f = function ($t) use ($zone) {
                return $t ? (new \DateTime('@' . $t))->setTimezone($zone)->format('Y-m-d H:i') : '-';
            };
            return $e['title'] . ' | ' . $f($e['start']) . ' | ' . $f($e['end']) . ($e['allday'] ? ' | día' : '');
        }, $events);
    }

    /**
     * One-off, all-day, many-day, in UTC, in a zone of their own, with a long folded title; cancelled and alarms out.
     */
    public function test_events(): void {
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n" .
            "BEGIN:VEVENT\r\nUID:a\r\nDTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101\r\nSUMMARY:🎃 Halloween\r\n" .
            "BEGIN:VALARM\r\nTRIGGER:-PT15M\r\nDESCRIPTION:no\r\nEND:VALARM\r\nEND:VEVENT\r\n" .
            "BEGIN:VEVENT\r\nUID:b\r\nDTSTART:20261103T080000Z\r\nDTEND:20261106T160000Z\r\nSUMMARY:3º ESO - Acampada\r\n" .
            "LOCATION:Las Lagunetas\\, Gran Canaria\r\nEND:VEVENT\r\n" .
            "BEGIN:VEVENT\r\nUID:c\r\nDTSTART;TZID=Europe/Madrid:20261105T110000\r\nDURATION:PT2H\r\n" .
            "SUMMARY:Reunión con un título largo que Google parte\r\n  en dos líneas\r\nEND:VEVENT\r\n" .
            "BEGIN:VEVENT\r\nUID:d\r\nDTSTART:20261104T090000Z\r\nSUMMARY:Anulado\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\n" .
            "BEGIN:VEVENT\r\nUID:e\r\nDTSTART;VALUE=DATE:20261201\r\nSUMMARY:Lejos\r\nEND:VEVENT\r\n" .
            "BEGIN:VEVENT\r\nUID:f\r\nDTSTART;TZID=Atlantic/Canary:20261102T000000\r\n" .
            "DTEND;TZID=Atlantic/Canary:20261103T000000\r\nSUMMARY:Festivo con horas\r\nEND:VEVENT\r\n" .
            "END:VCALENDAR\r\n";
        $events = ical::events(
            $ics,
            $this->moment('2026-10-31 00:00'),
            $this->moment('2026-11-14 23:59'),
            new \DateTimeZone('Atlantic/Canary')
        );
        $this->assertSame([
            '🎃 Halloween | 2026-10-31 00:00 | 2026-11-01 00:00 | día',
            'Festivo con horas | 2026-11-02 00:00 | 2026-11-03 00:00 | día',
            '3º ESO - Acampada | 2026-11-03 08:00 | 2026-11-06 16:00',
            'Reunión con un título largo que Google parte en dos líneas | 2026-11-05 10:00 | 2026-11-05 12:00',
        ], $this->lines($events));
        $this->assertSame('Las Lagunetas, Gran Canaria', $events[2]['detail']);
    }

    /**
     * Repeating events: weekly on some days until a date, with an exception and a moved occurrence; daily by count;
     * monthly; and the ones from before the window that still repeat into it.
     */
    public function test_repeating(): void {
        $ics = "BEGIN:VCALENDAR\n" .
            "BEGIN:VEVENT\nUID:w\nDTSTART;TZID=Atlantic/Canary:20261005T163000\nDTEND;TZID=Atlantic/Canary:20261005T173000\n" .
            "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261112T000000Z\nEXDATE;TZID=Atlantic/Canary:20261104T163000\n" .
            "SUMMARY:Ajedrez\nEND:VEVENT\n" .
            "BEGIN:VEVENT\nUID:w\nRECURRENCE-ID;TZID=Atlantic/Canary:20261102T163000\n" .
            "DTSTART;TZID=Atlantic/Canary:20261102T180000\nDTEND;TZID=Atlantic/Canary:20261102T190000\nSUMMARY:Ajedrez (tarde)\n" .
            "END:VEVENT\n" .
            "BEGIN:VEVENT\nUID:d\nDTSTART;VALUE=DATE:20261109\nRRULE:FREQ=DAILY;COUNT=3\nSUMMARY:Semana cultural\nEND:VEVENT\n" .
            "BEGIN:VEVENT\nUID:m\nDTSTART;VALUE=DATE:20260912\nRRULE:FREQ=MONTHLY\nSUMMARY:Mercadillo\nEND:VEVENT\n" .
            "END:VCALENDAR\n";
        $events = ical::events(
            $ics,
            $this->moment('2026-11-01 00:00'),
            $this->moment('2026-11-14 23:59'),
            new \DateTimeZone('Atlantic/Canary')
        );
        $this->assertSame([
            'Ajedrez (tarde) | 2026-11-02 18:00 | 2026-11-02 19:00',
            'Semana cultural | 2026-11-09 00:00 | 2026-11-10 00:00 | día',
            'Ajedrez | 2026-11-09 16:30 | 2026-11-09 17:30',
            'Semana cultural | 2026-11-10 00:00 | 2026-11-11 00:00 | día',
            'Semana cultural | 2026-11-11 00:00 | 2026-11-12 00:00 | día',
            'Ajedrez | 2026-11-11 16:30 | 2026-11-11 17:30',
            'Mercadillo | 2026-11-12 00:00 | 2026-11-13 00:00 | día',
        ], $this->lines($events));
    }
}
