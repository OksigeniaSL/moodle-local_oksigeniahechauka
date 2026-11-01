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

use local_oksigeniahechauka\local\centre;
use local_oksigeniahechauka\local\claimpage;
use local_oksigeniahechauka\local\compose;
use local_oksigeniahechauka\local\groupspage;
use local_oksigeniahechauka\local\home;
use local_oksigeniahechauka\local\screens;
use local_oksigeniahechauka\local\sheet;

/**
 * Every form of the panel builds, for every kind of content: a form that fails only shows on the page that opens it.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\home
 * @covers     \local_oksigeniahechauka\local\compose
 * @covers     \local_oksigeniahechauka\local\sheet
 * @covers     \local_oksigeniahechauka\local\groupspage
 * @covers     \local_oksigeniahechauka\local\centre
 * @covers     \local_oksigeniahechauka\local\claimpage
 */
#[\PHPUnit\Framework\Attributes\CoversClass(home::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(compose::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(sheet::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(groupspage::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(centre::class)]
#[\PHPUnit\Framework\Attributes\CoversClass(claimpage::class)]
final class forms_test extends \advanced_testcase {
    /**
     * Every page of the panel renders with real data, as each person sees it: a value missing in a context (Mustache
     * then looks it up in the page's own) or a string that is not there fails here, not on a school's site.
     */
    public function test_pages_render(): void {
        global $DB, $OUTPUT, $PAGE;
        $this->resetAfterTest();
        $this->setAdminUser();
        $PAGE->set_url(new \moodle_url('/local/oksigeniahechauka/index.php'));
        $PAGE->set_context(\context_system::instance());
        $now = time();
        $group = (int) $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => 'Infantil', 'sortorder' => 0,
            'timecreated' => $now, 'timemodified' => $now]);
        $id = (int) $DB->insert_record('local_oksigeniahechauka_screen', (object) ['name' => 'Hall', 'template' => 'zones',
            'theme' => 'site', 'keyhash' => 'x', 'lastseen' => $now - 60, 'sortorder' => 0, 'timecreated' => $now,
            'timemodified' => $now, 'power' => json_encode([['days' => [1, 2, 3, 4, 5], 'on' => '07:30', 'off' => '18:30']]),
            'lastinfo' => json_encode(['display' => ['width' => 1080, 'height' => 1920], 'time' => $now - 500])]);
        screens::set_groups($id, [$group]);
        $item = $DB->get_record('local_oksigeniahechauka_item', ['id' => $DB->insert_record(
            'local_oksigeniahechauka_item',
            (object) ['type' => 'notice', 'title' => 'Fotos de grupo', 'body' => '', 'data' => '{}', 'visible' => 1,
            'targetall' => 1,
            'everyweeks' => 0,
            'createdby' => 2,
            'timecreated' => $now,
            'timemodified' => $now]
        )]);
        $DB->insert_record('local_oksigeniahechauka_item', (object) ['type' => 'urgent', 'title' => 'Simulacro', 'body' => '',
            'data' => '{}', 'visible' => 1, 'targetall' => 1, 'everyweeks' => 0, 'createdby' => 2, 'timecreated' => $now,
            'timemodified' => $now]);
        $screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $id]);
        $render = function (string $template, array $context): string {
            global $OUTPUT;
            return $OUTPUT->render_from_template('local_oksigeniahechauka/' . $template, $context);
        };

        $html = $render('home', home::context($now));
        $this->assertStringContainsString('hkp-wall', $html);
        $this->assertStringContainsString('hkp-urgent-on', $html);
        $this->assertStringContainsString('hkp-urgent-dialog', $html);
        foreach (['notice', 'media', 'album', 'event', 'ticker', 'agenda'] as $type) {
            $this->assertStringContainsString('hkp-compose', $render('compose', compose::context(null, $type, $now)), $type);
        }
        $this->assertStringContainsString('Fotos de grupo', $render('compose', compose::context($item, 'notice', $now)));
        $html = $render('sheet', sheet::context($screen, $now));
        $this->assertStringContainsString('hkp-sheet', $html);
        $this->assertStringContainsString('1080 × 1920', $html);
        $this->assertStringContainsString('hkp-group-' . $group, $render('groups', groupspage::context($now)));
        $this->assertStringContainsString('hkp-colours', $render('centre', centre::context('', $now)));
        $code = screens::start_pairing(['width' => 1920, 'height' => 1080], $now)['code'];
        $pair = screens::pairing($code, $now);
        $this->assertStringContainsString('hkp-found', $render('claim', claimpage::form($pair, $code, $now, [])));
        $this->assertStringContainsString('hkp-done-screen', $render('claim', claimpage::done($screen)));
        $this->assertStringContainsString('alert-warning', $render('claim', claimpage::notfound('ABC123')));
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
