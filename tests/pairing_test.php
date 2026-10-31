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

use local_oksigeniahechauka\local\keys;
use local_oksigeniahechauka\local\screens;

/**
 * Pairing: a code, a claim in the panel and a key that is handed out once.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\screens
 * @covers     \local_oksigeniahechauka\local\keys
 */
#[\PHPUnit\Framework\Attributes\CoversClass(screens::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(keys::class)]
final class pairing_test extends \advanced_testcase {
    /**
     * The whole way: code, pending, claimed, the key once, and then only its hash.
     */
    public function test_pairing(): void {
        global $DB;
        $this->resetAfterTest();
        $now = time();
        $start = screens::start_pairing(['ua' => 'test'], $now);
        $this->assertMatchesRegularExpression('/^[' . keys::ALPHABET . ']{6}$/', $start['code']);
        $this->assertStringContainsString('<svg', $start['qr_svg']);
        $this->assertStringContainsString('viewBox', $start['qr_svg']);
        $this->assertSame(['status' => 'pending'], screens::poll($start['token'], $now));
        $this->assertSame(['status' => 'expired'], screens::poll('not-the-token', $now));

        $pair = screens::pairing(strtolower(substr($start['code'], 0, 3) . ' ' . substr($start['code'], 3)), $now);
        $this->assertNotNull($pair);
        $id = screens::claim($pair, (object) ['name' => 'Biblioteca', 'template' => 'zones', 'groups' => []], $now);
        $this->assertNull(screens::pairing($start['code'], $now), 'A claimed code cannot be claimed again');

        $answer = screens::poll($start['token'], $now);
        $this->assertSame('paired', $answer['status']);
        $this->assertSame($id, $answer['screen']['id']);
        $hash = $DB->get_field('local_oksigeniahechauka_screen', 'keyhash', ['id' => $id]);
        $this->assertSame(keys::hash($answer['key']), $hash);
        $this->assertFalse(
            $DB->record_exists_select('local_oksigeniahechauka_pair', 'screenkey IS NOT NULL'),
            'The key is not kept once handed out'
        );
        $this->assertSame(['status' => 'expired'], screens::poll($start['token'], $now));
    }

    /**
     * Claimed at the last minute and asked for just after the code expired: the screen still gets its key, even if
     * another screen asks for a code meanwhile; and it learns how long its code lasts by seconds, not by its clock.
     */
    public function test_claimed_at_the_last_minute(): void {
        $this->resetAfterTest();
        $now = time();
        $start = screens::start_pairing(['ua' => 'test'], $now);
        $this->assertSame(screens::PAIR_MINUTES * MINSECS, $start['expires_in']);
        $late = $now + screens::PAIR_MINUTES * MINSECS - 10;
        $id = screens::claim(screens::pairing($start['code'], $late), (object) ['name' => 'Hall', 'template' => 'zones',
            'groups' => []], $late);
        $after = $late + 60;
        screens::start_pairing(['ua' => 'another'], $after);
        $answer = screens::poll($start['token'], $after);
        $this->assertSame('paired', $answer['status']);
        $this->assertSame($id, $answer['screen']['id']);
    }

    /**
     * An expired code is no good, and a new device can take the place of an existing screen.
     */
    public function test_expired_and_replaced(): void {
        global $DB;
        $this->resetAfterTest();
        $now = time();
        $old = screens::start_pairing([], $now - 3600);
        $this->assertNull(screens::pairing($old['code'], $now));
        $this->assertSame(['status' => 'expired'], screens::poll($old['token'], $now));

        $first = screens::start_pairing([], $now);
        $id = screens::claim(screens::pairing($first['code'], $now), (object) ['name' => 'Bachillerato'], $now);
        $key1 = screens::poll($first['token'], $now)['key'];

        $second = screens::start_pairing([], $now);
        $same = screens::claim(screens::pairing($second['code'], $now), (object) ['screenid' => $id], $now);
        $key2 = screens::poll($second['token'], $now)['key'];
        $this->assertSame($id, $same);
        $this->assertNotSame($key1, $key2);
        $this->assertSame(1, $DB->count_records('local_oksigeniahechauka_screen'));
        $this->assertSame(keys::hash($key2), $DB->get_field('local_oksigeniahechauka_screen', 'keyhash', ['id' => $id]));
    }

    /**
     * Codes as people type them.
     */
    public function test_clean_code(): void {
        $this->assertSame('KM7Q4X', keys::clean_code(' km7-q4x '));
        $this->assertSame(43, strlen(keys::new_key()));
    }

    /**
     * A command from the panel reaches a screen once; «every screen» means the paired ones.
     */
    public function test_commands(): void {
        global $DB;
        $this->resetAfterTest();
        $one = (int) $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Hall', 'template' => 'zones',
            'theme' => 'site', 'keyhash' => sha1('a')]);
        $two = (int) $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Gym', 'template' => 'zones',
            'theme' => 'site', 'keyhash' => sha1('b')]);
        $old = (int) $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Old', 'template' => 'zones',
            'theme' => 'site', 'keyhash' => null]);
        $this->assertSame([], screens::take_commands($one));
        screens::ask($one, 'reload');
        $this->assertSame(['reload'], screens::take_commands($one));
        $this->assertSame([], screens::take_commands($one));
        $this->assertSame([], screens::take_commands($two));
        screens::ask(0, 'reload');
        $this->assertSame(['reload'], screens::take_commands($one));
        $this->assertSame(['reload'], screens::take_commands($two));
        $this->assertSame([], screens::take_commands($old));
    }
}
