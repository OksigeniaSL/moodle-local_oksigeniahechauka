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

use local_oksigeniahechauka\local\sources;

/**
 * The events of the site calendar as the screens get them, also those that come from a calendar subscription.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\sources
 */
#[\PHPUnit\Framework\Attributes\CoversClass(sources::class)]
final class sources_test extends \advanced_testcase {
    /**
     * A site event.
     *
     * @param string $name
     * @param int $start
     * @param int $duration
     * @return void
     */
    protected function event(string $name, int $start, int $duration): void {
        global $DB;
        $DB->insert_record('event', (object) ['name' => $name, 'description' => '', 'format' => FORMAT_HTML,
            'eventtype' => 'site', 'courseid' => SITEID, 'groupid' => 0, 'userid' => 2, 'modulename' => '',
            'instance' => 0, 'timestart' => $start, 'timeduration' => $duration, 'visible' => 1,
            'timemodified' => $start]);
    }

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
     * All-day events, the way a calendar subscription leaves them (at midnight and lasting nothing, or from midnight to
     * midnight), last their whole days; an event with hours keeps them.
     */
    public function test_all_day_events(): void {
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        $this->event('Halloween', $this->moment('2026-10-31 00:00'), 0);
        $this->event('Puente', $this->moment('2026-12-07 00:00'), 2 * DAYSECS);
        $this->event('Acampada', $this->moment('2026-11-03 08:00'), $this->moment('2026-11-06 16:00')
            - $this->moment('2026-11-03 08:00'));
        $this->event('Reunión', $this->moment('2026-10-31 17:00'), 0);
        $items = [];
        foreach (sources::events($this->moment('2026-10-31 09:00'), 60) as $item) {
            $items[$item['title']] = $item;
        }
        $this->assertTrue($items['Halloween']['allday']);
        $this->assertSame(['from' => '2026-10-31', 'until' => '2026-10-31'], $items['Halloween']['when']);
        $this->assertArrayNotHasKey('end', $items['Halloween']);
        $this->assertTrue($items['Puente']['allday']);
        $this->assertSame(['from' => '2026-12-07', 'until' => '2026-12-08'], $items['Puente']['when']);
        $this->assertSame('2026-12-08T23:59', $items['Puente']['end']);
        $this->assertArrayNotHasKey('allday', $items['Acampada']);
        $this->assertSame('2026-11-06T16:00', $items['Acampada']['end']);
        $this->assertArrayNotHasKey('allday', $items['Reunión']);
    }
}
