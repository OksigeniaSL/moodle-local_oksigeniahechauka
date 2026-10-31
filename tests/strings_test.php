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

/**
 * Every string the plugin asks for exists: a missing one only shows as a debugging notice, on the page that needs it.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @coversNothing
 */
#[\PHPUnit\Framework\Attributes\CoversNothing]
final class strings_test extends \advanced_testcase {
    /**
     * Each get_string() with a written identifier, in the plugin's component or in Moodle's.
     */
    public function test_strings_exist(): void {
        $root = dirname(__DIR__);
        $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS));
        $manager = get_string_manager();
        $missing = [];
        $checked = 0;
        foreach ($files as $file) {
            $path = $file->getPathname();
            if ($file->getExtension() !== 'php' || preg_match('#/(lang|tests|node_modules|vendor)/#', $path)) {
                continue;
            }
            preg_match_all(
                "/get_string\(\s*'([^']+)'\s*(?:,\s*(?:'([^']+)'|(\\\$\w+)))?/",
                file_get_contents($path),
                $calls,
                PREG_SET_ORDER
            );
            foreach ($calls as $call) {
                if (substr($call[1], -1) === '_') {
                    // Built from a type or a state: those are checked by the pages and tests that use them.
                    continue;
                }
                $component = !empty($call[2]) ? $call[2] : (!empty($call[3]) ? 'local_oksigeniahechauka' : 'moodle');
                $checked++;
                if (!$manager->string_exists($call[1], $component)) {
                    $missing[] = $call[1] . ' / ' . $component . ' in ' . substr($path, strlen($root) + 1);
                }
            }
        }
        $this->assertGreaterThan(100, $checked);
        $this->assertSame([], $missing);
    }
}
