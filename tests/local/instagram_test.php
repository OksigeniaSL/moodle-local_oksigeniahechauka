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
 * «On our Instagram»: the last posts read from Meta and kept for the screens. Example data, no network.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\instagram
 */
#[\PHPUnit\Framework\Attributes\CoversClass(instagram::class)]
final class instagram_test extends \advanced_testcase {
    /**
     * A tiny picture.
     *
     * @return string
     */
    protected function png(): string {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }

    /**
     * The media of an account as the Graph API answers: a carousel with a video in it, a reel, a picture and a post with
     * nothing to show.
     *
     * @return array
     */
    protected function media(): array {
        return [
            ['id' => '11', 'media_type' => 'CAROUSEL_ALBUM', 'caption' => 'Una salida', 'timestamp' => '2026-11-12T11:00:00+0000',
                'children' => ['data' => [
                    ['media_type' => 'IMAGE', 'media_url' => 'https://cdn.example.com/a.jpg'],
                    ['media_type' => 'VIDEO', 'media_url' => 'https://cdn.example.com/b.mp4',
                        'thumbnail_url' => 'https://cdn.example.com/b.jpg'],
                ]]],
            ['id' => '12', 'media_type' => 'VIDEO', 'caption' => 'Un reel', 'timestamp' => '2026-11-13T11:00:00+0000',
                'thumbnail_url' => 'https://cdn.example.com/c.jpg'],
            ['id' => '13', 'media_type' => 'IMAGE', 'caption' => 'Una foto', 'media_url' => 'https://cdn.example.com/d.jpg'],
            ['id' => '14', 'media_type' => 'VIDEO', 'caption' => 'Sin portada'],
            ['id' => 'x', 'media_type' => 'IMAGE', 'media_url' => 'https://cdn.example.com/e.jpg'],
        ];
    }

    /**
     * Each post with the pictures a screen shows: a carousel's (a video's cover among them), a video's cover, a picture;
     * nothing for a post without any, or with an id that is not Meta's.
     */
    public function test_posts_of(): void {
        $posts = instagram::posts_of($this->media());
        $this->assertSame(['11', '12', '13'], array_column($posts, 'id'));
        $this->assertSame(['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'], $posts[0]['pictures']);
        $this->assertSame(['https://cdn.example.com/c.jpg'], $posts[1]['pictures']);
        $this->assertSame('VIDEO', $posts[1]['media_type']);
        $this->assertSame('', $posts[2]['timestamp']);
    }

    /**
     * The account named in «Our networks» among those of the key, else the first.
     */
    public function test_account_of(): void {
        $pages = [['id' => '1', 'name' => 'Sin Instagram'],
            ['id' => '2', 'instagram_business_account' => ['id' => '901', 'username' => 'centro.uno']],
            ['id' => '3', 'instagram_business_account' => ['id' => '902', 'username' => 'Centro.Dos']]];
        $this->assertSame('902', instagram::account_of($pages, 'centro.dos')['id']);
        $this->assertSame('901', instagram::account_of($pages, '')['id']);
        $this->assertSame('901', instagram::account_of($pages, 'otro')['id']);
        $this->assertNull(instagram::account_of([['id' => '1']], ''));
    }

    /**
     * The task reads the account and its posts once an hour and keeps their pictures; the manifest gets them as media of
     * the screens, with the QR to follow the account; nothing without a key or with the source off.
     */
    public function test_refresh_and_item(): void {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $this->resetAfterTest();
        $c = 'local_oksigeniahechauka';
        set_config('sourceinstagram', 1, $c);
        $this->assertSame('off', instagram::refresh(time()));
        set_config('instagramtoken', \core\encryption::encrypt('clave-de-ejemplo'), $c);
        $this->assertSame('clave-de-ejemplo', instagram::token());
        // The answers come last first: the accounts, the media, then each picture.
        foreach (array_fill(0, 4, $this->png()) as $picture) {
            \curl::mock_response($picture);
        }
        \curl::mock_response(json_encode(['data' => $this->media()]));
        \curl::mock_response(json_encode(['data' => [['id' => '2', 'instagram_business_account' =>
            ['id' => '901', 'username' => 'centro.ejemplo']]]]));
        $this->assertSame('@centro.ejemplo: 3 posts', instagram::refresh(time()));
        $this->assertSame('waiting', instagram::refresh(time() + 60));
        $item = instagram::items()[0];
        $this->assertSame('instagram', $item['type']);
        $this->assertSame('@centro.ejemplo', $item['name']);
        $this->assertSame('https://www.instagram.com/centro.ejemplo/', $item['web']);
        $this->assertSame([2, 1, 1], array_map(fn($post) => count($post['media']), $item['posts']));
        $file = get_file_storage()->get_file_by_id($item['posts'][0]['media'][0]['id']);
        $this->assertTrue(files::readable($file));
        $this->assertTrue(files::from_source($file));
        set_config('sourceinstagram', 0, $c);
        $this->assertSame('off', instagram::refresh(time() + 2 * HOURSECS));
    }
}
