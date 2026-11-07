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

use local_oksigeniahechauka\local\playerlink;
use local_oksigeniahechauka\local\shortener;

/**
 * The short address of the player, to type it with the remote of a television: made by the task through the shortener
 * of the site (this plugin's or another Oksigenia plugin's), kept, and only read by the pages.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\playerlink
 * @covers     \local_oksigeniahechauka\local\shortener
 */
#[\PHPUnit\Framework\Attributes\CoversClass(playerlink::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(shortener::class)]
final class playerlink_test extends \advanced_testcase {
    /**
     * Without a shortener, the long address; with one, the short address the task made, kept until the word changes.
     */
    public function test_the_short_address_is_made_once_and_kept(): void {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $this->resetAfterTest();
        $c = 'local_oksigeniahechauka';
        $long = $CFG->wwwroot . '/local/oksigeniahechauka/player/';

        // No shortener anywhere: the long address, and the task has nothing to do.
        $this->assertSame($long, playerlink::long());
        $this->assertSame($long, playerlink::shown());
        $this->assertSame('no shortener', playerlink::refresh(1000));

        // The one another Oksigenia plugin has set is used: the word «player» is asked for and kept.
        set_config('shortenerapi', 'https://short.example/yourls-api.php', 'local_oksigeniameals');
        set_config('shortenerkey', 'k3y', 'local_oksigeniameals');
        \curl::mock_response(json_encode(['status' => 'success', 'shorturl' => 'https://short.example/player',
            'url' => ['keyword' => 'player', 'url' => $long]]));
        $this->assertSame('made https://short.example/player', playerlink::refresh(1000));
        $this->assertSame('https://short.example/player', playerlink::short());
        $this->assertSame('short.example/player', playerlink::shown());
        // Kept: the task does not call the shortener again (nothing more is mocked).
        $this->assertSame('kept', playerlink::refresh(2000));

        // Another word in the settings: the kept one no longer counts, and it is made again with the new word.
        set_config('shortkeyword', 'tele', $c);
        $this->assertSame('', playerlink::short());
        $this->assertSame($long, playerlink::shown());
        \curl::mock_response(json_encode(['status' => 'success', 'shorturl' => 'https://short.example/tele']));
        $this->assertSame('made https://short.example/tele', playerlink::refresh(3000));
        $this->assertSame('short.example/tele', playerlink::shown());

        // A word that cannot go in an address falls back to «player».
        set_config('shortkeyword', 'mi tele', $c);
        $this->assertSame(playerlink::KEYWORD, playerlink::keyword());
    }

    /**
     * When the shortener gives nothing, the task waits an hour before asking again, and the pages show the long address.
     */
    public function test_a_shortener_that_gives_nothing_is_asked_again_an_hour_later(): void {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $this->resetAfterTest();
        set_config('shortenerapi', 'https://short.example/yourls-api.php', 'local_oksigeniahechauka');
        set_config('shortenerkey', 'k3y', 'local_oksigeniahechauka');
        $long = playerlink::long();

        // The word is taken and the shortener refuses the address too (another domain): none. The mocks are a stack.
        \curl::mock_response(json_encode(['status' => 'fail', 'code' => 'error:nourl']));
        \curl::mock_response(json_encode(['status' => 'fail', 'code' => 'error:keyword']));
        $this->assertSame('the shortener gave none', playerlink::refresh(10000));
        $this->assertSame($long, playerlink::shown());
        $this->assertSame('waiting to try again', playerlink::refresh(10000 + HOURSECS - 1));

        // An hour later it asks again; the word is taken, so it keeps the one the shortener gives.
        \curl::mock_response(json_encode(['status' => 'success', 'shorturl' => 'https://short.example/4k7']));
        \curl::mock_response(json_encode(['status' => 'fail', 'code' => 'error:keyword']));
        $this->assertSame('made https://short.example/4k7', playerlink::refresh(10000 + HOURSECS + 1));
        $this->assertSame('short.example/4k7', playerlink::shown());

        // Saving the settings forgets it, and the task makes it again.
        playerlink::forget();
        $this->assertSame($long, playerlink::shown());
    }
}
