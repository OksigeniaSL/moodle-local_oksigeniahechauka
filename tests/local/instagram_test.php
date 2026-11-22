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
        $day = fn($n) => gmdate('Y-m-d\TH:i:sO', time() - $n * DAYSECS);
        return [
            ['id' => '11', 'media_type' => 'CAROUSEL_ALBUM', 'caption' => 'Una salida', 'timestamp' => $day(2),
                'children' => ['data' => [
                    ['media_type' => 'IMAGE', 'media_url' => 'https://cdn.example.com/a.jpg'],
                    ['media_type' => 'VIDEO', 'media_url' => 'https://cdn.example.com/b.mp4',
                        'thumbnail_url' => 'https://cdn.example.com/b.jpg'],
                ]]],
            ['id' => '12', 'media_type' => 'VIDEO', 'caption' => 'Un reel', 'timestamp' => $day(1),
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
     * Every account of the key, the one named in «Our networks» first; none twice, none without an Instagram.
     */
    public function test_accounts_of(): void {
        $pages = [['id' => '1', 'name' => 'Sin Instagram'],
            ['id' => '2', 'name' => 'Centro uno', 'instagram_business_account' => ['id' => '901', 'username' => 'centro.uno']],
            ['id' => '3', 'name' => 'Club', 'instagram_business_account' => ['id' => '902', 'username' => 'Centro.Dos',
                'media_count' => 7, 'profile_picture_url' => 'https://cdn.example.com/p.jpg']],
            ['id' => '4', 'name' => 'Repetida', 'instagram_business_account' => ['id' => '902', 'username' => 'Centro.Dos']]];
        $this->assertSame(['902', '901'], array_column(instagram::accounts_of($pages, 'centro.dos'), 'id'));
        $this->assertSame(['901', '902'], array_column(instagram::accounts_of($pages, ''), 'id'));
        $club = instagram::accounts_of($pages, 'otro')[1];
        $this->assertSame(['Club', 7, 'https://cdn.example.com/p.jpg'], [$club['title'], $club['count'], $club['picture']]);
        $this->assertSame([], instagram::accounts_of([['id' => '1']], ''));
    }

    /**
     * What speaks of the centre: any of its words, without minding capitals or accents; a post still news, from the last
     * 90 days or without a date; the words as a person writes them.
     */
    public function test_speaks_of_fresh_and_split(): void {
        $this->assertTrue(instagram::speaks_of('Campamento de 6º Primaria del NURYANA', ['Nuryana']));
        $this->assertTrue(instagram::speaks_of('Con @colegio.nuryana en la feria', ['Otro', '@colegio.nuryana']));
        $this->assertTrue(instagram::speaks_of('La excursión a Güímar', ['guimar']));
        $this->assertFalse(instagram::speaks_of('La terraza de las bicis', ['Nuryana']));
        $this->assertFalse(instagram::speaks_of('Nuryana', [' ', '']));
        $now = time();
        $this->assertTrue(instagram::fresh(gmdate('Y-m-d\TH:i:sO', $now - 89 * DAYSECS), $now));
        $this->assertFalse(instagram::fresh('2020-11-18T10:00:00+0000', $now));
        $this->assertTrue(instagram::fresh('', $now));
        $this->assertSame(['Nuryana', '#campa'], instagram::split(' Nuryana ,, #campa, nuryana '));
    }

    /**
     * Several accounts: the centre's own shows all, another nothing until switched on; one shows only what speaks of the
     * centre, and only on the screens of its groups; what is no longer news, never; a collaboration, once.
     */
    public function test_several_accounts(): void {
        global $CFG, $DB;
        require_once($CFG->libdir . '/filelib.php');
        $this->resetAfterTest();
        $c = 'local_oksigeniahechauka';
        set_config('sourceinstagram', 1, $c);
        set_config('instagramtoken', \core\encryption::encrypt('clave-de-ejemplo'), $c);
        $day = fn($n) => gmdate('Y-m-d\TH:i:sO', time() - $n * DAYSECS);
        $pages = ['data' => [
            ['id' => '1', 'name' => 'Centro', 'instagram_business_account' => ['id' => '901', 'username' => 'centro.ejemplo']],
            ['id' => '2', 'name' => 'Campamento', 'instagram_business_account' => ['id' => '902', 'username' => 'campa.ejemplo']],
            ['id' => '3', 'name' => 'Galería', 'instagram_business_account' => ['id' => '903', 'username' => 'galeria.ejemplo']],
        ]];
        $own = ['data' => [
            ['id' => '21', 'media_type' => 'IMAGE', 'caption' => 'Hoy', 'timestamp' => $day(1),
                'media_url' => 'https://cdn.example.com/21.jpg'],
            ['id' => '22', 'media_type' => 'IMAGE', 'caption' => 'Juntos', 'timestamp' => $day(2),
                'media_url' => 'https://cdn.example.com/22.jpg'],
        ]];
        $camp = ['data' => [
            ['id' => '22', 'media_type' => 'IMAGE', 'caption' => 'Juntos con el Centro', 'timestamp' => $day(2),
                'media_url' => 'https://cdn.example.com/22.jpg'],
            ['id' => '31', 'media_type' => 'IMAGE', 'caption' => 'La terraza', 'timestamp' => $day(3),
                'media_url' => 'https://cdn.example.com/31.jpg'],
            ['id' => '32', 'media_type' => 'IMAGE', 'caption' => 'Los de 4.º del CENTRO', 'timestamp' => $day(4),
                'media_url' => 'https://cdn.example.com/32.jpg'],
            ['id' => '33', 'media_type' => 'IMAGE', 'caption' => 'Centro, hace años', 'timestamp' => $day(400),
                'media_url' => 'https://cdn.example.com/33.jpg'],
        ]];
        $gallery = ['data' => [['id' => '41', 'media_type' => 'IMAGE', 'timestamp' => '2020-11-18T10:00:00+0000',
            'media_url' => 'https://cdn.example.com/41.jpg']]];
        $read = function (array $answers) {
            // The answers come last first.
            foreach (array_reverse($answers) as $answer) {
                \curl::mock_response(is_array($answer) ? json_encode($answer) : $answer);
            }
        };
        // First: the centre's own, all; the others, not shown (only their last post is asked).
        $read([$pages, $own, $this->png(), $this->png(), ['data' => [$camp['data'][0]]], $gallery]);
        $this->assertSame('@centro.ejemplo: 2 posts', instagram::refresh(time()));
        $items = instagram::items([]);
        $this->assertSame(['instagram'], array_column($items, 'id'));
        $this->assertSame(['21', '22'], array_column($items[0]['posts'], 'id'));
        // The camp, only what speaks of the centre and only on the screens of «Pabellón»; the gallery, all of it.
        $pabellon = $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => 'Pabellón', 'timecreated' => time(),
            'timemodified' => time()]);
        $this->assertTrue(instagram::change('902', 'centre', 'Centro', [$pabellon]));
        $this->assertTrue(instagram::change('903', 'all', '', []));
        $this->assertFalse(instagram::change('999', 'all', '', []), 'not an account of the key');
        $this->assertFalse(instagram::change('903', 'some', '', []), 'not a way');
        $read([$pages, $own, $camp, $this->png(), $gallery]);
        $this->assertStringContainsString('@campa.ejemplo: 1 posts', instagram::refresh(time()));
        $everywhere = instagram::items([]);
        $this->assertSame(['instagram'], array_column($everywhere, 'id'), 'the camp only in «Pabellón»; the gallery, nothing new');
        $there = instagram::items([$pabellon]);
        $this->assertSame(['instagram', 'instagram-902'], array_column($there, 'id'));
        $this->assertSame(['32'], array_column($there[1]['posts'], 'id'), 'the shared post once; the terrace, the old one, never');
        $this->assertSame('Campamento', $there[1]['title']);
        $this->assertSame('@campa.ejemplo', $there[1]['name']);
        $this->assertSame('https://www.instagram.com/campa.ejemplo/', $there[1]['web']);
        // The panel: each account with its way, its words and its screens; the gallery, said to be old.
        $panel = instagram::panel(time());
        $this->assertSame(['all', 'centre', 'all'], array_column($panel['accounts'], 'show'));
        $this->assertSame('Centro', $panel['accounts'][1]['words']);
        $this->assertFalse($panel['accounts'][1]['all']);
        $this->assertTrue($panel['accounts'][2]['stale']);
        $this->assertSame('@centro.ejemplo', $panel['accounts'][1]['always']);
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
        // The key stops working: said from the first time, and the screens keep what came last, for a week.
        $this->assertNull(instagram::failing());
        \curl::mock_response(json_encode(['error' => ['message' => 'Error validating access token']]));
        $later = time() + 2 * HOURSECS;
        $this->assertStringContainsString('Error validating access token', instagram::refresh($later));
        $this->assertSame($later, instagram::failing()['time']);
        $this->assertNotEmpty(instagram::items());
        set_config('instagramgood', time() - 8 * DAYSECS, $c);
        $this->assertSame([], instagram::items(), 'a week without a good reading');
        set_config('sourceinstagram', 0, $c);
        $this->assertNull(instagram::failing(), 'switched off, nothing to say');
        $this->assertSame('off', instagram::refresh(time() + 4 * HOURSECS));
    }
}
