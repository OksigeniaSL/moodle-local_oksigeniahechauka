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
 * The letters of the notices in the common mail: what each one says, its button, the last picture of a screen that
 * stopped, and the notice untouched where Oksigenia Marandu is not. Example data.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\commonmail
 */
#[\PHPUnit\Framework\Attributes\CoversClass(commonmail::class)]
final class commonmail_test extends \advanced_testcase {
    /**
     * The keys of the pieces of a letter, in order.
     *
     * @param array $pieces
     * @return string[]
     */
    protected function kinds(array $pieces): array {
        return array_map(fn($block) => array_key_first($block), $pieces['blocks']);
    }

    /**
     * A text of the pages, as the mail takes it.
     */
    public function test_plain(): void {
        $this->assertSame('Sol & Mar «Leo»', commonmail::plain('Sol &amp; Mar &laquo;Leo&raquo;'));
    }

    /**
     * Every letter: the subject as its title, the greeting by the first name, who writes, the line before opening it
     * and why it arrives.
     */
    public function test_letter(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Lucas', 'lang' => 'en']);
        $pieces = commonmail::letter($user, 'The subject', 'Because.', [['paragraph' => "First\n  line."]], 'en');
        $this->assertSame('The subject', $pieces['subject']);
        $this->assertSame('The subject', $pieces['heading']);
        $this->assertSame('Hello Lucas,', $pieces['hello']);
        $this->assertSame('Screens', $pieces['unit']);
        $this->assertSame('First line.', $pieces['preheader']);
        $this->assertSame('Because.', $pieces['reason']);
    }

    /**
     * A screen that stopped: what may be going on, its name and since when, the hint about its hours and a button to its
     * page; with the last picture it sent, when there is one, made light enough for the mail.
     */
    public function test_screen_down(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Lucas', 'lang' => 'en']);
        $screen = (object) ['id' => 77];
        $a = (object) ['name' => 'Library', 'since' => 'Thursday', 'url' => 'https://example.com/screen.php?id=77'];
        $pieces = alerts::letter($user, $screen, 'down', 'The screen «Library» is not answering', $a, 'en');
        $this->assertSame(['paragraph', 'data', 'note', 'action', 'small'], $this->kinds($pieces));
        $this->assertSame('Library', $pieces['blocks'][1]['data'][0]['value']);
        $this->assertSame('Open its page', $pieces['blocks'][3]['action']['actiontext']);
        $this->assertSame($a->url, $pieces['blocks'][3]['action']['actionurl']);
        $this->assertStringContainsString('you run the screens', $pieces['reason']);

        if (!function_exists('imagecreatetruecolor')) {
            return;
        }
        // A wide picture with noise, so it does not shrink to nothing.
        $image = imagecreatetruecolor(1920, 1080);
        for ($i = 0; $i < 6000; $i++) {
            $colour = imagecolorallocate($image, random_int(0, 255), random_int(0, 255), random_int(0, 255));
            [$x, $y] = [random_int(0, 1900), random_int(0, 1060)];
            imagefilledrectangle($image, $x, $y, $x + random_int(4, 300), $y + random_int(4, 200), $colour);
        }
        ob_start();
        imagepng($image);
        $png = (string) ob_get_clean();
        get_file_storage()->create_file_from_string([
            'contextid' => files::context()->id,
            'component' => files::COMPONENT,
            'filearea' => files::SHOT,
            'itemid' => 77,
            'filepath' => '/',
            'filename' => 'shot-1.png',
        ], $png);
        $pieces = alerts::letter($user, $screen, 'down', 'The screen «Library» is not answering', $a, 'en');
        $this->assertSame(['paragraph', 'data', 'picture', 'note', 'action', 'small'], $this->kinds($pieces));
        $picture = $pieces['blocks'][2]['picture'];
        $size = getimagesizefromstring($picture['picturebytes']);
        $this->assertSame('image/jpeg', $size['mime']);
        $this->assertSame(1040, $size[0]);
        $this->assertLessThanOrEqual(200000, strlen($picture['picturebytes']));
        $this->assertStringContainsString('Library', $picture['picturealt']);
        $this->assertStringStartsWith('The last picture it sent', $picture['picturecaption']);
    }

    /**
     * A screen that came back, and several at once: their names one under the other and a button to the panel.
     */
    public function test_screen_back_and_many(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Lucas', 'lang' => 'en']);
        $a = (object) ['name' => 'Library', 'since' => '', 'url' => 'https://example.com/screen.php?id=77'];
        $pieces = alerts::letter($user, (object) ['id' => 77], 'back', 'Back', $a, 'en');
        $this->assertSame(['paragraph', 'data', 'action', 'small'], $this->kinds($pieces));
        $this->assertSame('«Library» is giving signs of life again.', $pieces['blocks'][0]['paragraph']);

        $pieces = alerts::letter_many($user, ['Library', 'Hall'], 'down', 'Two', 'https://example.com/', 'en');
        $this->assertSame(['paragraph', 'items', 'paragraph', 'action', 'small'], $this->kinds($pieces));
        $this->assertSame(['Library', 'Hall'], $pieces['blocks'][1]['items']);
        $this->assertSame('Open the screens panel', $pieces['blocks'][3]['action']['actiontext']);
        $pieces = alerts::letter_many($user, ['Library', 'Hall'], 'back', 'Two', 'https://example.com/', 'en');
        $this->assertSame(['paragraph', 'items', 'action'], $this->kinds($pieces));
    }

    /**
     * The month: a row for each screen, what counts as a cut and a button to the whole report.
     */
    public function test_report(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Lucas', 'lang' => 'en']);
        $a = (object) ['month' => 'November 2026', 'percent' => '97', 'url' => 'https://example.com/report.php'];
        $rows = [['label' => 'Library', 'value' => '97 % of its hours · No cuts']];
        $pieces = report::letter($user, 'The screens in November 2026', $a, $rows, 'en');
        $this->assertSame(['paragraph', 'data', 'small', 'action'], $this->kinds($pieces));
        $this->assertSame('How the screens did in November 2026, each within its hours:', $pieces['blocks'][0]['paragraph']);
        $this->assertSame($rows, $pieces['blocks'][1]['data']);
        $this->assertSame('See the full report', $pieces['blocks'][3]['action']['actiontext']);
    }

    /**
     * A permission: what one can do now, the panel, the guide and, when somebody gave it, their name.
     */
    public function test_permission(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Lucas', 'lang' => 'en']);
        $a = (object) ['group' => 'Hall', 'panel' => 'https://example.com/index.php', 'guide' => 'https://example.com/guide.php'];
        $pieces = access::letter($user, 'group', 'You can now publish', $a, 'Marta Ruiz', 'en');
        $this->assertSame(['paragraph', 'paragraph', 'action', 'link'], $this->kinds($pieces));
        $says = 'You can now publish notices, photos and events on the screens of «Hall».';
        $this->assertSame($says, $pieces['blocks'][0]['paragraph']);
        $this->assertSame($a->guide, $pieces['blocks'][3]['link']['linkurl']);
        $this->assertSame(['signer' => 'Marta Ruiz'], $pieces['signature']);
        $this->assertArrayNotHasKey('signature', access::letter($user, 'manager', 'S', $a, '', 'en'));
    }

    /**
     * The birthday: its words and a button to the card, without a greeting the subject already makes.
     */
    public function test_greeting(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Lucas', 'lang' => 'en']);
        $message = new \core\message\message();
        $message->subject = 'Happy birthday, Lucas!';
        $message->fullmessage = 'Today is your day.';
        $message->contexturl = 'https://example.com/my/';
        $message->contexturlname = 'See your card';
        $pieces = greeting::letter($user, $message);
        $this->assertSame(['paragraph', 'action'], $this->kinds($pieces));
        $this->assertArrayNotHasKey('hello', $pieces);
        $this->assertSame('See your card', $pieces['blocks'][1]['action']['actiontext']);
    }

    /**
     * Without Oksigenia Marandu the notice goes as it always did: nothing of it changes.
     */
    public function test_without_marandu(): void {
        if (commonmail::available()) {
            $this->markTestSkipped('Oksigenia Marandu is here: the notice gets its mail.');
        }
        $message = new \core\message\message();
        $message->userfrom = \core_user::get_noreply_user();
        $before = clone $message;
        commonmail::notice($message, ['heading' => 'Anything']);
        $this->assertEquals($before, $message);
    }
}
