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

use local_oksigeniahechauka\local\networks;

/**
 * «Our networks»: what each box takes, what it saves, and the «Follow us» items the screens get.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\networks
 */
#[\PHPUnit\Framework\Attributes\CoversClass(networks::class)]
final class networks_test extends \advanced_testcase {
    /**
     * What a box takes: the account alone or its address, and the account as its network writes it.
     */
    public function test_read(): void {
        $this->assertSame(
            ['url' => 'https://www.instagram.com/centro.ejemplo/', 'account' => '@centro.ejemplo'],
            networks::read('instagram', '@centro.ejemplo')
        );
        $this->assertSame(
            ['url' => 'https://www.instagram.com/centro.ejemplo/', 'account' => '@centro.ejemplo'],
            networks::read('instagram', ' centro.ejemplo ')
        );
        $this->assertSame(
            ['url' => 'https://www.tiktok.com/@centro.ejemplo', 'account' => '@centro.ejemplo'],
            networks::read('tiktok', 'https://www.tiktok.com/@centro.ejemplo')
        );
        $this->assertSame(
            ['url' => 'https://tiktok.com/@centro.ejemplo', 'account' => '@centro.ejemplo'],
            networks::read('tiktok', 'tiktok.com/@centro.ejemplo')
        );
        // The networks go by https, and what follows «?» stays as it came.
        $this->assertSame(
            ['url' => 'https://instagram.com/centro.ejemplo?igsh=abc', 'account' => '@centro.ejemplo'],
            networks::read('instagram', 'http://instagram.com/centro.ejemplo?igsh=abc')
        );
        $this->assertSame('@CentroEjemplo', networks::read('youtube', 'https://m.youtube.com/@CentroEjemplo/videos')['account']);
        $this->assertSame('', networks::read('youtube', 'https://www.youtube.com/channel/UC123')['account']);
        $this->assertSame('', networks::read('facebook', 'https://www.facebook.com/groups/123')['account']);
        $this->assertSame('centroejemplo', networks::read('facebook', 'facebook.com/centroejemplo')['account']);
        $this->assertSame(
            'centro-ejemplo',
            networks::read('linkedin', 'https://www.linkedin.com/company/centro-ejemplo/')['account']
        );
        $this->assertSame('@centro.bsky.social', networks::read('bluesky', '@centro.bsky.social')['account']);
        $this->assertSame(
            ['url' => 'https://centro.example', 'account' => 'centro.example'],
            networks::read('web', 'centro.example')
        );
        // What does not fit its box.
        $this->assertNull(networks::read('instagram', 'https://www.tiktok.com/@centro.ejemplo'));
        $this->assertNull(networks::read('linkedin', 'centro-ejemplo'));
        $this->assertNull(networks::read('whatsapp', '@centro'));
        $this->assertNull(networks::read('web', 'https://www.instagram.com/centro.ejemplo/'));
        $this->assertNull(networks::read('web', 'no es una dirección'));
        $this->assertNull(networks::read('web', 'ftp://centro.example/'));
        $this->assertNull(networks::read('instagram', ''));
        $this->assertNull(networks::read('myspace', '@centro'));
    }

    /**
     * An address of a known network is recognised; an account alone, or the web, is not.
     */
    public function test_recognise(): void {
        $this->assertSame('tiktok', networks::recognise('https://www.tiktok.com/@centro.ejemplo'));
        $this->assertSame('x', networks::recognise('twitter.com/centro'));
        $this->assertNull(networks::recognise('@centro.ejemplo'));
        $this->assertNull(networks::recognise('centro.ejemplo'));
        $this->assertNull(networks::recognise('https://centro.example/'));
    }

    /**
     * Each box saves by itself: an empty one makes nothing, a filled one shows unless it says otherwise, and the screens get
     * a «Follow us» for each one switched on, in the order of the boxes.
     */
    public function test_save_and_items(): void {
        $this->resetAfterTest();
        $this->assertSame([], networks::items());
        $wrong = networks::save(['tiktok' => ['value' => 'https://www.tiktok.com/@centro.ejemplo', 'show' => false],
            'instagram' => ['value' => '@centro.ejemplo'], 'x' => ['value' => 'https://www.tiktok.com/@otra'],
            'web' => ['value' => '']]);
        $this->assertSame(['x'], $wrong);
        $boxes = array_column(networks::boxes(), null, 'network');
        $this->assertCount(count(networks::KNOWN), $boxes);
        $this->assertTrue($boxes['instagram']['show']);
        $this->assertTrue($boxes['tiktok']['filled']);
        $this->assertFalse($boxes['tiktok']['show']);
        $this->assertFalse($boxes['x']['filled']);
        $items = networks::items();
        $this->assertCount(1, $items);
        $this->assertSame(['id' => 'network-instagram', 'type' => 'channel', 'zone' => 'extra', 'network' => 'instagram',
            'title' => 'Follow us on Instagram', 'text' => 'What we do, on your phone', 'name' => '@centro.ejemplo',
            'web' => 'https://www.instagram.com/centro.ejemplo/?utm_source=pantallas'], $items[0]);
        // The switch alone keeps the account; the web, with its own words.
        networks::save(['tiktok' => ['show' => true], 'web' => ['value' => 'https://centro.example/?lang=es']]);
        $items = networks::items();
        $this->assertSame(['network-instagram', 'network-tiktok', 'network-web'], array_column($items, 'id'));
        $this->assertSame('https://centro.example/?lang=es&utm_source=pantallas', $items[2]['web']);
        $this->assertSame('Visit our website', $items[2]['title']);
        $this->assertSame('centro.example', $items[2]['name']);
        // A network already on the screens by another way does not come twice.
        $this->assertSame(['network-tiktok', 'network-web'], array_column(networks::items([['web' =>
            'https://instagram.com/centro.ejemplo?utm_source=pantallas']]), 'id'));
        // Emptied, it makes nothing again.
        networks::save(['instagram' => ['value' => ' ']]);
        $this->assertSame(['network-tiktok', 'network-web'], array_column(networks::items(), 'id'));
    }

    /**
     * A gesture of the panel: what the box has now, and an address of another network goes to its own box.
     */
    public function test_change(): void {
        $this->resetAfterTest();
        $this->assertSame(
            ['network' => 'instagram', 'value' => '@centro.ejemplo',
            'web' => 'https://www.instagram.com/centro.ejemplo/', 'show' => true, 'from' => '', 'wrong' => false],
            networks::change('instagram', ['value' => 'centro.ejemplo'])
        );
        $moved = networks::change('instagram', ['value' => 'https://www.tiktok.com/@centro.ejemplo']);
        $this->assertSame('tiktok', $moved['network']);
        $this->assertSame('@centro.ejemplo', $moved['value']);
        $boxes = array_column(networks::boxes(), null, 'network');
        $this->assertSame('https://www.instagram.com/centro.ejemplo/', $boxes['instagram']['url']);
        $off = networks::change('instagram', ['show' => false]);
        $this->assertFalse($off['show']);
        $this->assertSame('@centro.ejemplo', $off['value']);
        $this->assertTrue(networks::change('linkedin', ['value' => 'centro'])['wrong']);
        $web = networks::change('web', ['value' => 'centro.example']);
        $this->assertSame('https://centro.example', $web['value']);
    }
}
