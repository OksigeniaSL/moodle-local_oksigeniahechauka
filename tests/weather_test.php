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

use local_oksigeniahechauka\local\weather;

/**
 * The weather: what MET Norway answers, turned into now, today and tomorrow on the site's calendar.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\weather
 */
#[\PHPUnit\Framework\Attributes\CoversClass(weather::class)]
final class weather_test extends \advanced_testcase {
    /**
     * An answer shaped like MET Norway's: two days of hours, with the chance of rain or without it.
     *
     * @param bool $rain
     * @return array
     */
    protected function answer(bool $rain): array {
        $series = [];
        $start = (new \DateTime('2026-11-02 00:00', new \DateTimeZone('UTC')))->getTimestamp();
        for ($h = 0; $h < 48; $h++) {
            $t = $start + $h * HOURSECS;
            $hour = $h % 24;
            $next = ['summary' => ['symbol_code' => $h < 24 ? ($hour < 7 ? 'clearsky_night' : 'fair_day') : 'rain'],
                'details' => ['precipitation_amount' => 0.0]];
            if ($rain) {
                $next['details']['probability_of_precipitation'] = $h < 24 ? 10.0 : 70.0;
            }
            $series[] = ['time' => gmdate('Y-m-d\TH:i:s\Z', $t), 'data' => [
                'instant' => ['details' => ['air_temperature' => 15 + ($hour > 12 ? 24 - $hour : $hour) / 2]],
                'next_1_hours' => $next,
            ]];
        }
        return ['properties' => ['timeseries' => $series]];
    }

    /**
     * Now, today and tomorrow: the temperature of this hour, each day's high and low, the sky of most of its daytime
     * in words; no chance of rain where the answer does not give it.
     */
    public function test_summary(): void {
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        $now = (new \DateTime('2026-11-02 10:30', new \DateTimeZone('Atlantic/Canary')))->getTimestamp();
        $w = weather::summary(weather::parse($this->answer(false)), $now);
        $this->assertSame(['symbol' => 'fair_day', 'temp' => 20], $w['now']);
        $this->assertSame('fair_day', $w['today']['symbol']);
        $this->assertSame(21, $w['today']['max']);
        $this->assertSame(15, $w['today']['min']);
        $this->assertSame('Fair', $w['today']['text']);
        $this->assertArrayNotHasKey('rain', $w['today']);
        $this->assertSame('rain', $w['tomorrow']['symbol']);
        $this->assertSame('Data from MET Norway', $w['credit']);

        $w = weather::summary(weather::parse($this->answer(true)), $now);
        $this->assertSame(10, $w['today']['rain']);
        $this->assertSame(70, $w['tomorrow']['rain']);
    }

    /**
     * Nothing recent, nothing on the screens.
     */
    public function test_nothing_recent(): void {
        $this->resetAfterTest();
        $this->setTimezone('Atlantic/Canary');
        $later = (new \DateTime('2026-11-20 10:30', new \DateTimeZone('Atlantic/Canary')))->getTimestamp();
        $this->assertNull(weather::summary(weather::parse($this->answer(false)), $later));
        $this->assertNull(weather::summary([], $later));
    }

    /**
     * Coordinates are taken as they are written; nonsense is not.
     */
    public function test_find_coordinates(): void {
        $this->assertSame(['lat' => 28.1248, 'lon' => -15.43, 'name' => '28.12481, -15.43'], weather::find('28.12481, -15.43'));
        $this->assertNull(weather::find('95, 10'));
    }

    /**
     * The sky in words, by the words of the symbol.
     */
    public function test_sky(): void {
        $this->assertSame('Thunder', weather::sky('heavyrainshowersandthunder_night'));
        $this->assertSame('Showers', weather::sky('lightrainshowers_day'));
        $this->assertSame('Light rain', weather::sky('lightrain'));
        $this->assertSame('Partly cloudy', weather::sky('partlycloudy_polartwilight'));
        $this->assertSame('Cloudy', weather::sky('something_new'));
    }

    /**
     * Saving a new location asks for its weather at once, in an ad hoc task.
     */
    public function test_new_location_asks_at_once(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        $setting = new \local_oksigeniahechauka\admin\setting_location('local_oksigeniahechauka/location', 'Location', '', '');
        $this->assertSame('', $setting->write_setting('28.4858, -16.3159'));
        $this->assertEquals('28.4858', get_config('local_oksigeniahechauka', 'lat'));
        $tasks = \core\task\manager::get_adhoc_tasks('\\local_oksigeniahechauka\\task\\fetch_weather_now');
        $this->assertCount(1, $tasks);
        // The same text again asks nothing new.
        $setting->write_setting('28.4858, -16.3159');
        $this->assertCount(1, \core\task\manager::get_adhoc_tasks('\\local_oksigeniahechauka\\task\\fetch_weather_now'));
    }
}
