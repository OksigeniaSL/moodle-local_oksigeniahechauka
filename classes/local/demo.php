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
 * The public demonstration screen (demo.php): what goes to every screen, for anyone, without signing in. Off by default; a
 * site turns it on to show its screens, such as a demonstration site. Never the birthdays: they are people's own.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class demo {
    /** How often the demonstration screen asks again: what is published in the panel is seen at once. */
    const REFRESH_MS = 30000;

    /**
     * Whether the site shows it.
     *
     * @return bool
     */
    public static function on(): bool {
        return (bool) get_config('local_oksigeniahechauka', 'publicdemo');
    }

    /**
     * The manifest of the demonstration screen, with its files through demo.php, and the ids of those files.
     *
     * @param int $now
     * @return array [manifest, file ids]
     */
    public static function manifest(int $now): array {
        $screen = (object) ['id' => 0, 'name' => get_string('demo_screen', 'local_oksigeniahechauka'), 'template' => 'zones',
            'theme' => 'site', 'power' => null, 'lastinfo' => null];
        $m = manifest::build($screen, $now);
        unset($m['power']);
        $m['screen']['sound'] = false;
        $m['items'] = array_values(array_filter($m['items'] ?? [], function ($item) {
            return ($item['type'] ?? '') !== 'birthdays';
        }));
        $ids = [];
        $rewrite = function (array &$node) use (&$rewrite, &$ids): void {
            foreach ($node as &$value) {
                if (!is_array($value)) {
                    continue;
                }
                if (isset($value['sha1'], $value['url'], $value['id']) && is_int($value['id'])) {
                    $ids[] = $value['id'];
                    $value['url'] = (new \moodle_url('/local/oksigeniahechauka/demo.php', ['media' => $value['id']]))->out(false);
                } else {
                    $rewrite($value);
                }
            }
        };
        $rewrite($m);
        return [$m, array_values(array_unique($ids))];
    }
}
