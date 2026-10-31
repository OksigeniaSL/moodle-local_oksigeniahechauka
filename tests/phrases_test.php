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

use local_oksigeniahechauka\local\home;
use local_oksigeniahechauka\local\phrases;
use local_oksigeniahechauka\local\schedule;

/**
 * Time said as people say it in the panel, and the state of each screen on its wall.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\phrases
 * @covers     \local_oksigeniahechauka\local\home
 */
#[\PHPUnit\Framework\Attributes\CoversClass(phrases::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(home::class)]
final class phrases_test extends \advanced_testcase {
    /**
     * A moment of the site's calendar.
     *
     * @param string $text «YYYY-MM-DD HH:MM»
     * @return int
     */
    protected function moment(string $text): int {
        return (new \DateTime($text, \core_date::get_server_timezone_object()))->getTimestamp();
    }

    /**
     * An item with a window.
     *
     * @param string|null $from
     * @param string|null $until
     * @param int $visible
     * @return \stdClass
     */
    protected function item(?string $from, ?string $until, int $visible = 1): \stdClass {
        return (object) ['datefrom' => $from, 'dateuntil' => $until, 'days' => null, 'times' => null, 'everyweeks' => 0,
            'timecreated' => 0, 'visible' => $visible];
    }

    /**
     * The window of an item said in the list, and the group it goes in.
     */
    public function test_when_said_in_the_list(): void {
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        force_current_language('en');
        // Monday 2 November 2026.
        $today = '2026-11-02';
        $cases = [
            [null, null, 'Always', '', 'now'],
            [null, '2026-11-02', 'Today only', 'ends today', 'now'],
            [null, '2026-11-06', 'Until friday 6', '4 days left', 'now'],
            ['2026-10-26', '2026-11-08', 'Until sunday 8', '6 days left', 'now'],
            ['2026-10-26', '2026-11-20', 'From 26/10 to 20/11', '18 days left', 'now'],
            ['2026-11-09', '2026-11-12', 'From 9/11 to 12/11', 'starts in 7 days', 'later'],
            ['2026-11-03', '2026-11-03', 'On tuesday 3', 'starts tomorrow', 'later'],
            [null, '2026-10-30', 'Ended on friday 30', '', 'done'],
            ['2026-10-01', null, 'From 1/10', '', 'now'],
        ];
        foreach ($cases as [$from, $until, $when, $small, $moment]) {
            $said = phrases::when($this->item($from, $until), $today);
            $this->assertSame([$when, $small], [$said['when'], $said['small']], "{$from}–{$until}");
            $this->assertSame($moment, phrases::moment($this->item($from, $until), $today));
        }
        $this->assertTrue(phrases::when($this->item(null, '2026-11-05'), $today)['soon']);
        $this->assertFalse(phrases::when($this->item(null, '2026-11-08'), $today)['soon']);
        // Taken off the screens: no longer on, whatever its dates.
        $this->assertSame('done', phrases::moment($this->item(null, null, 0), $today));
        // Its days and hours under it.
        $item = $this->item(null, null);
        $item->days = '1,3';
        $item->times = json_encode([['10:30', '11:30']]);
        $this->assertSame('M W · 10:30–11:30', phrases::when($item, $today)['small']);
    }

    /**
     * When a screen off by its hours comes on again, and lists said as people say them.
     */
    public function test_next_on_and_lists(): void {
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        force_current_language('en');
        $power = [['days' => [4], 'on' => '16:00', 'off' => '20:00']];
        $this->assertSame('comes on on thursday 5 at 16:00', phrases::next_on($power, $this->moment('2026-11-02 10:00')));
        $this->assertSame('comes on today at 16:00', phrases::next_on($power, $this->moment('2026-11-05 09:00')));
        $this->assertSame('comes on tomorrow at 16:00', phrases::next_on($power, $this->moment('2026-11-04 21:00')));
        $this->assertSame('', phrases::next_on([], $this->moment('2026-11-04 21:00')));
        $this->assertSame('Hall', phrases::join(['Hall']));
        $this->assertSame('Hall and Library', phrases::join(['Hall', 'Library']));
        $this->assertSame('Hall, Library and Office', phrases::join(['Hall', '', 'Library', 'Office']));
        $this->assertSame('a moment', phrases::ago(10));
        $this->assertSame('4 min', phrases::ago(4 * MINSECS));
        $this->assertSame('2 h', phrases::ago(2 * HOURSECS + 50));
    }

    /**
     * The state of a screen: never seen, running, its clock off, off by its hours, without signal.
     */
    public function test_state_of_a_screen(): void {
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        force_current_language('en');
        $now = $this->moment('2026-11-02 10:45');
        $screen = function (int $lastseen, ?array $power = null) {
            return (object) ['lastseen' => $lastseen, 'power' => $power ? json_encode($power) : null];
        };
        $this->assertSame('new', home::state($screen(0), [], $now)['key']);
        $on = home::state($screen($now - 60), ['time' => $now - 60], $now);
        $this->assertSame(['on', 'Running', 'signal 1 min ago'], [$on['key'], $on['label'], $on['meta']]);
        $late = home::state($screen($now - 60), ['time' => $now - 60 - 360], $now);
        $this->assertSame(['warn', '6 min late', 6], [$late['key'], $late['meta'], $late['drift']]);
        $off = home::state($screen($now - DAYSECS, [['days' => [4], 'on' => '16:00', 'off' => '20:00']]), [], $now);
        $this->assertSame(['off', 'comes on on thursday 5 at 16:00'], [$off['key'], $off['meta']]);
        $down = home::state($screen($this->moment('2026-11-02 10:12')), [], $now);
        $this->assertSame(['down', 'since 10:12'], [$down['key'], $down['meta']]);

        $cards = [
            ['id' => 1, 'name' => 'Hall', 'state' => 'on', 'lastseen' => $now - 60, 'meta' => '', 'drift' => 0],
            ['id' => 2, 'name' => 'Dining hall', 'state' => 'down', 'lastseen' => $now - 2000, 'meta' => 'since 10:12',
                'drift' => 0],
            ['id' => 3, 'name' => 'Office', 'state' => 'warn', 'lastseen' => $now - 60, 'meta' => '', 'drift' => 6],
        ];
        $health = home::health($cards, $now, true);
        $this->assertFalse($health['ok']);
        $this->assertSame('Dining hall has given no signal since 10:12.', $health['bold']);
        $this->assertSame('The clock of Office is 6 minutes off. The others are running.', $health['detail']);
        $this->assertStringContainsString('screen.php?id=2', $health['see']);
        $fine = home::health([$cards[0], ['state' => 'off'] + $cards[0]], $now, true);
        $this->assertSame(['All 2 screens fine', 'one off by its hours · last signal 1 min ago'], [$fine['title'],
            $fine['detail']]);
    }
}
