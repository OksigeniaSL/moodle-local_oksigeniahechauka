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

use local_oksigeniahechauka\local\categories;
use local_oksigeniahechauka\local\screens;
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

    /**
     * What falls due: assignments and quizzes of visible courses, for everyone, by days; not what is past, far off or hidden, and
     * only from the linked categories when there are any.
     */
    public function test_deadlines(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $now = time();
        $gen = $this->getDataGenerator();
        $first = $gen->create_category(['name' => 'Primero']);
        $second = $gen->create_category(['name' => 'Segundo']);
        $course = $gen->create_course(['fullname' => 'Matemáticas', 'category' => $first->id]);
        $other = $gen->create_course(['fullname' => 'Historia', 'category' => $second->id]);
        $hidden = $gen->create_course(['fullname' => 'Oculto', 'visible' => 0, 'category' => $first->id]);
        $gen->create_module('assign', ['course' => $course->id, 'name' => 'Problemas', 'duedate' => $now + 2 * DAYSECS]);
        $gen->create_module('assign', ['course' => $course->id, 'name' => 'Lejana', 'duedate' => $now + 40 * DAYSECS]);
        $gen->create_module('assign', ['course' => $course->id, 'name' => 'Pasada', 'duedate' => $now - DAYSECS]);
        $gen->create_module('assign', ['course' => $hidden->id, 'name' => 'Escondida', 'duedate' => $now + DAYSECS]);
        $gen->create_module('quiz', ['course' => $other->id, 'name' => 'Control', 'timeclose' => $now + 3 * DAYSECS]);

        $items = sources::deadlines($now, 7);
        $this->assertCount(1, $items);
        $this->assertSame('deadlines', $items[0]['type']);
        $this->assertSame('extra', $items[0]['zone']);
        $all = array_merge(...array_column($items[0]['days'], 'items'));
        $this->assertSame(['Problemas', 'Control'], array_column($all, 'activity'));
        $this->assertSame(['due', 'quiz'], array_column($all, 'kind'));
        $this->assertSame(['Matemáticas', 'Historia'], array_column($all, 'course'));

        // A linked category: only that one, in its colour.
        categories::save([['name' => 'Primero', 'coursecat' => $first->id]]);
        $all = array_merge(...array_column(sources::deadlines($now, 7)[0]['days'], 'items'));
        $this->assertSame(['Problemas'], array_column($all, 'activity'));
        $this->assertSame(1, $all[0]['color']);

        // Nothing falling due: no item at all, so no empty slide.
        $this->assertSame([], sources::deadlines($now - 10 * DAYSECS, 1));
    }

    /**
     * A screen in a group linked to a category shows the events and deadlines of it and what is under it, not of the others; a
     * screen with no link, what it always did.
     */
    public function test_screens_tied_to_a_category(): void {
        global $DB;
        $this->resetAfterTest();
        $this->setAdminUser();
        $now = time();
        $gen = $this->getDataGenerator();
        $faculty = $gen->create_category(['name' => 'Facultad']);
        $degree = $gen->create_category(['name' => 'Grado', 'parent' => $faculty->id]);
        $other = $gen->create_category(['name' => 'Otra']);
        $mine = $gen->create_course(['fullname' => 'Mío', 'category' => $degree->id]);
        $theirs = $gen->create_course(['fullname' => 'Suyo', 'category' => $other->id]);
        $gen->create_module('assign', ['course' => $mine->id, 'name' => 'Mi tarea', 'duedate' => $now + DAYSECS]);
        $gen->create_module('assign', ['course' => $theirs->id, 'name' => 'Su tarea', 'duedate' => $now + DAYSECS]);
        $event = function (string $name, array $extra) use ($now, $DB) {
            $DB->insert_record('event', (object) ($extra + ['name' => $name, 'description' => '', 'format' => 1, 'courseid' => 0,
                'groupid' => 0, 'userid' => 2, 'modulename' => '0', 'instance' => 0, 'timestart' => $now + DAYSECS,
                'timeduration' => 0, 'visible' => 1, 'timemodified' => $now, 'categoryid' => 0]));
        };
        $event('Del sitio', ['eventtype' => 'site']);
        $event('De la facultad', ['eventtype' => 'category', 'categoryid' => $faculty->id]);
        $event('De la otra', ['eventtype' => 'category', 'categoryid' => $other->id]);
        $event('Del curso', ['eventtype' => 'course', 'courseid' => $mine->id]);
        $event('Del suyo', ['eventtype' => 'course', 'courseid' => $theirs->id]);

        $screen = $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Facultad', 'keyhash' => 'x',
            'template' => 'zones', 'theme' => 'site', 'sortorder' => 0, 'timecreated' => $now, 'timemodified' => $now]);
        $this->assertSame([], screens::scope($screen));
        $titles = array_column(sources::events($now, 7, screens::scope($screen)), 'title');
        $this->assertSame(['Del sitio'], $titles);

        $group = $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => 'G', 'coursecat' => $faculty->id,
            'sortorder' => 0, 'timecreated' => $now, 'timemodified' => $now]);
        $DB->insert_record('local_oksigeniahechauka_member', (object) ['groupid' => $group, 'screenid' => $screen]);
        $scope = screens::scope($screen);
        $this->assertEqualsCanonicalizing([(int) $faculty->id, (int) $degree->id], $scope);
        $titles = array_column(sources::events($now, 7, $scope), 'title');
        sort($titles);
        $this->assertSame(['De la facultad', 'Del curso', 'Del sitio'], $titles);
        $all = array_merge(...array_column(sources::deadlines($now, 7, $scope)[0]['days'], 'items'));
        $this->assertSame(['Mi tarea'], array_column($all, 'activity'));
    }
}
