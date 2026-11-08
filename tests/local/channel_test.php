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
 * «Follow us»: the organisation's public channel on the screens, only when Marandu has one, with the address that says it
 * comes from the screens. Example data, with a stand-in for Marandu.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\sources
 */
#[\PHPUnit\Framework\Attributes\CoversClass(sources::class)]
final class channel_test extends \advanced_testcase {
    /**
     * Without a channel, nothing; with a public one, its item, its QR made from its short address afterwards.
     */
    public function test_channel(): void {
        if (class_exists('\local_oksigeniamarandu\api') && !property_exists('\local_oksigeniamarandu\api', 'channel')) {
            $this->markTestSkipped('Oksigenia Marandu is installed: its own tests cover its channel.');
        }
        require_once(__DIR__ . '/../fixtures/marandu_api.php');
        \local_oksigeniamarandu\api::$channel = null;
        $this->assertFalse(sources::has_channel());
        $this->assertSame([], sources::channel());

        \local_oksigeniamarandu\api::$channel = ['url' => 'https://t.me/colegio_ejemplo', 'title' => 'Colegio <b>de ejemplo</b>',
            'members' => 312];
        $this->assertTrue(sources::has_channel());
        $item = sources::channel()[0];
        $this->assertSame('channel', $item['type']);
        $this->assertSame('extra', $item['zone']);
        $this->assertSame('telegram', $item['network']);
        $this->assertSame('https://t.me/colegio_ejemplo?utm_source=pantallas', $item['web']);
        $this->assertSame('Colegio de ejemplo', $item['name']);
        $this->assertSame(312, $item['members']);
        $this->assertSame(get_string('label_channel_telegram', 'local_oksigeniahechauka'), $item['title']);

        // Not an address of the web: nothing.
        \local_oksigeniamarandu\api::$channel = ['url' => 'javascript:alert(1)', 'title' => 'x'];
        $this->assertSame([], sources::channel());
        \local_oksigeniamarandu\api::$channel = null;
    }
}
