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
 * The short link of each web a screen shows as a QR, and the QR the shortener draws. Example data, no network: the
 * answers of the shortener are mocked (Moodle's mock gives the last one pushed first).
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\links
 */
#[\PHPUnit\Framework\Attributes\CoversClass(links::class)]
final class links_test extends \advanced_testcase {
    /** @var string A QR as the shortener draws it. */
    const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33"><rect width="33" height="33" fill="#fff"/></svg>';

    /**
     * The site's shortener, set in this plugin.
     */
    protected function shortener(): void {
        set_config('shortenerapi', 'https://short.example/yourls-api.php', 'local_oksigeniahechauka');
        set_config('shortenerkey', 'k3y', 'local_oksigeniahechauka');
    }

    /**
     * Without a shortener nothing changes and nothing is written down.
     */
    public function test_without_a_shortener_the_long_address(): void {
        global $DB;
        $this->resetAfterTest();
        $m = ['items' => [['id' => 'i1', 'web' => 'https://example.org/campus']]];
        $this->assertSame($m, links::apply($m, time()));
        $this->assertSame(0, $DB->count_records(links::TABLE));
        $this->assertSame(['url' => 'https://example.org/claim', 'qrsvg' => ''], links::now('https://example.org/claim', time()));
        $this->assertSame('no shortener', links::refresh(time()));
    }

    /**
     * A web seen for the first time goes long and is written down; the task asks for it and brings its QR; the next manifest
     * has the short address and the QR beside it, also in an album and a book; and nobody asks the shortener twice.
     */
    public function test_a_web_is_shortened_by_the_task_with_its_qr(): void {
        global $CFG, $DB;
        require_once($CFG->libdir . '/filelib.php');
        $this->resetAfterTest();
        $this->shortener();
        $now = time();
        $m = [
            'items' => [
                ['id' => 'i0', 'web' => 'https://short.example/telegram'],
                ['id' => 'i1', 'web' => 'https://example.org/campus'],
                ['id' => 'p1', 'album' => ['id' => 'a1', 'web' => 'https://example.org/album']],
                ['id' => 'b', 'books' => [['title' => 'Uno', 'web' => 'https://example.org/libro/1']]],
            ],
            'idle' => ['qr' => 'https://example.org/start'],
        ];
        $first = links::apply($m, $now);
        $this->assertSame($m, $first);
        $this->assertSame(4, $DB->count_records(links::TABLE));

        // The task: four links, each with the address of its QR and then the QR itself (the last pushed comes first).
        foreach (['campus', 'album', 'libro/1', 'start'] as $n => $name) {
            \curl::mock_response(self::SVG);
            \curl::mock_response(json_encode(['status' => 'success', 'shorturl' => 'https://short.example/k' . $n,
                'url' => ['keyword' => 'k' . $n], 'qrsvg' => 'https://short.example/svg/k' . $n]));
        }
        $this->assertSame('4 asked, 4 made, 0 forgotten', links::refresh($now));

        $second = links::apply($m, $now);
        // One already short stays as it is, and is not asked for.
        $this->assertSame('https://short.example/telegram', $second['items'][0]['web']);
        array_shift($second['items']);
        $webs = [$second['items'][0]['web'], $second['items'][1]['album']['web'], $second['items'][2]['books'][0]['web'],
            $second['idle']['qr']];
        foreach ($webs as $web) {
            $this->assertMatchesRegularExpression('#^https://short\.example/k[0-3]$#', $web);
        }
        $this->assertSame(4, count(array_unique($webs)));
        $this->assertSame('image/svg+xml', $second['items'][0]['webqr']['mime']);
        $this->assertArrayHasKey('webqr', $second['items'][1]['album']);
        $this->assertArrayHasKey('webqr', $second['items'][2]['books'][0]);
        $this->assertSame('image/svg+xml', $second['idle']['qrimage']['mime']);
        // Its file is one a screen may read.
        $file = get_file_storage()->get_file_by_id($second['items'][0]['webqr']['id']);
        $this->assertTrue(files::readable($file));
        $this->assertTrue(files::is_logo($file));
        // Nothing left to ask.
        $this->assertSame('0 asked, 0 made, 0 forgotten', links::refresh($now));
    }

    /**
     * A shortener that draws no QR (a plain YOURLS): the short address only, and the screen draws its own. One that does
     * not answer is asked again an hour later, not on every run.
     */
    public function test_a_plain_shortener_and_one_that_fails(): void {
        global $CFG, $DB;
        require_once($CFG->libdir . '/filelib.php');
        $this->resetAfterTest();
        $this->shortener();
        $now = time();
        $m = ['items' => [['id' => 'i1', 'web' => 'https://example.org/a'], ['id' => 'i2', 'web' => 'https://example.org/b']]];
        links::apply($m, $now);
        \curl::mock_response('');
        \curl::mock_response(json_encode(['status' => 'success', 'shorturl' => 'https://short.example/plain']));
        $this->assertSame('2 asked, 1 made, 0 forgotten', links::refresh($now));
        $after = links::apply($m, $now);
        $shorts = array_column($after['items'], 'web');
        $this->assertContains('https://short.example/plain', $shorts);
        $this->assertArrayNotHasKey('webqr', $after['items'][0]);
        $this->assertArrayNotHasKey('webqr', $after['items'][1]);
        $this->assertSame('0 asked, 0 made, 0 forgotten', links::refresh($now + 60));
        \curl::mock_response(json_encode(['status' => 'success', 'shorturl' => 'https://short.example/late']));
        $this->assertSame('1 asked, 1 made, 0 forgotten', links::refresh($now + links::RETRY + 1));
    }

    /**
     * A link nobody shows for two months is forgotten, with its QR.
     */
    public function test_an_old_link_is_forgotten(): void {
        global $CFG, $DB;
        require_once($CFG->libdir . '/filelib.php');
        $this->resetAfterTest();
        $this->shortener();
        $then = time() - links::FORGET - DAYSECS;
        links::apply(['items' => [['id' => 'i1', 'web' => 'https://example.org/old']]], $then);
        \curl::mock_response(self::SVG);
        \curl::mock_response(json_encode(['status' => 'success', 'shorturl' => 'https://short.example/old',
            'qrsvg' => 'https://short.example/svg/old']));
        links::refresh($then);
        $this->assertSame(1, $DB->count_records('files', ['component' => files::COMPONENT, 'filearea' => links::QR,
            'filename' => 'qr.svg']));
        $this->assertSame('0 asked, 0 made, 1 forgotten', links::refresh(time()));
        $this->assertSame(0, $DB->count_records(links::TABLE));
        $this->assertSame(0, $DB->count_records('files', ['component' => files::COMPONENT, 'filearea' => links::QR,
            'filename' => 'qr.svg']));
    }

    /**
     * Only an SVG of a reasonable size is taken as a QR.
     */
    public function test_only_an_svg_is_a_qr(): void {
        $this->assertTrue(links::is_svg(self::SVG));
        $this->assertTrue(links::is_svg('<?xml version="1.0"?>' . self::SVG));
        $this->assertFalse(links::is_svg('<html><body><svg></svg></body></html>'));
        $this->assertFalse(links::is_svg(''));
        $this->assertFalse(links::is_svg('<svg>' . str_repeat('a', links::QR_MOST) . '</svg>'));
    }

    /**
     * A screen waiting to be named keeps its code while it asks again with its token, with the same short link and the QR
     * the shortener drew (one link, not one every quarter of an hour); after half a day, or with no token, a new code.
     */
    public function test_a_waiting_screen_keeps_its_code_and_its_short_link(): void {
        global $CFG, $DB;
        require_once($CFG->libdir . '/filelib.php');
        $this->resetAfterTest();
        $this->shortener();
        $now = time();
        \curl::mock_response(self::SVG);
        \curl::mock_response(json_encode(['status' => 'success', 'shorturl' => 'https://short.example/tele1',
            'qrsvg' => 'https://short.example/svg/tele1']));
        $first = screens::start_pairing(['ua' => 'test'], $now);
        $this->assertSame('https://short.example/tele1', $first['claim_url']);
        $this->assertSame('data:image/svg+xml;base64,' . base64_encode(self::SVG), $first['qr_image']);

        // Expired, it asks again with its token: the same code and link, and the shortener is not called (nothing mocked).
        $later = $now + screens::PAIR_MINUTES * MINSECS + 30;
        $this->assertSame(['status' => 'expired'], screens::poll($first['token'], $later));
        $again = screens::start_pairing(['ua' => 'test'], $later, $first['token']);
        $this->assertSame($first['code'], $again['code']);
        $this->assertSame($first['token'], $again['token']);
        $this->assertSame('https://short.example/tele1', $again['claim_url']);
        $this->assertNotNull(screens::pairing($again['code'], $later));
        $this->assertSame(1, $DB->count_records(links::TABLE));

        // Without its token, or too late, another code (without the shortener now: nothing to mock).
        unset_config('shortenerapi', 'local_oksigeniahechauka');
        $this->assertNotSame($first['code'], screens::start_pairing([], $later)['code'] ?? '');
        $gone = $later + screens::PAIR_MINUTES * MINSECS + screens::PAIR_GRACE + 1;
        $this->assertNotSame($first['code'], screens::start_pairing([], $gone, $first['token'])['code']);
    }
}
