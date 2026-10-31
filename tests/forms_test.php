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

use local_oksigeniahechauka\form\claim_form;
use local_oksigeniahechauka\form\item_form;
use local_oksigeniahechauka\form\screen_form;

/**
 * Every form of the panel builds, for every kind of content: a form that fails only shows on the page that opens it.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\form\item_form
 * @covers     \local_oksigeniahechauka\form\screen_form
 * @covers     \local_oksigeniahechauka\form\claim_form
 */
#[\PHPUnit\Framework\Attributes\CoversClass(item_form::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(screen_form::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(claim_form::class)]
final class forms_test extends \advanced_testcase {
    /**
     * The forms build and render, with only what each one loads itself.
     */
    public function test_forms_build(): void {
        global $PAGE;
        $this->resetAfterTest();
        $this->setAdminUser();
        $PAGE->set_url(new \moodle_url('/local/oksigeniahechauka/edit.php'));
        $PAGE->set_context(\context_system::instance());
        foreach (['media', 'notice', 'event', 'ticker'] as $type) {
            $form = new item_form(null, ['type' => $type]);
            $this->assertStringContainsString('id_dates', $form->render(), $type);
        }
        $this->assertStringContainsString('id_powermode', (new screen_form())->render());
        $this->assertStringContainsString('id_name', (new claim_form())->render());
    }

    /**
     * A file that uses the file constants of the repositories, or Moodle's curl class, loads their library itself: a
     * page or a task does not always have them, and the tests always do, so running the code here would not catch it
     * (it broke «Picture or video» on a real site, and the weather task).
     */
    public function test_libraries_loaded(): void {
        $root = dirname(__DIR__);
        $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS));
        $missing = [];
        foreach ($files as $file) {
            $path = $file->getPathname();
            if ($file->getExtension() !== 'php' || preg_match('#/(tests|node_modules|vendor)/#', $path)) {
                continue;
            }
            $code = file_get_contents($path);
            if (
                preg_match('/\bFILE_(INTERNAL|EXTERNAL|REFERENCE|CONTROLLED_LINK)\b/', $code)
                    && strpos($code, "/repository/lib.php'") === false
            ) {
                $missing[] = substr($path, strlen($root) + 1);
            }
            if (strpos($code, 'new \curl(') !== false && strpos($code, "/filelib.php'") === false) {
                $missing[] = substr($path, strlen($root) + 1) . ' (curl)';
            }
        }
        $this->assertSame([], $missing);
    }

    /**
     * No test names a method of its own «at»: PHPUnit 9 (Moodle 4.5) has a static one with that name, and the whole run
     * stops with a fatal error.
     */
    public function test_no_helper_named_at(): void {
        $clash = [];
        foreach (glob(__DIR__ . '/*_test.php') as $path) {
            if (preg_match('/function\s+at\s*\(/', file_get_contents($path))) {
                $clash[] = basename($path);
            }
        }
        $this->assertSame([], $clash);
    }
}
