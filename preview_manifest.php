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

/**
 * The manifest for the preview of the panel: as a screen would get it, with the files through the session.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\endpoint;
use local_oksigeniahechauka\local\files;
use local_oksigeniahechauka\local\manifest;

require_login(null, false);
$context = context_system::instance();
require_capability('local/oksigeniahechauka:view', $context);
// Only read from here on: the previews of a panel with many screens go side by side, not one after the other.
\core\session\manager::write_close();
$PAGE->set_context($context);

$screenid = optional_param('screen', 0, PARAM_INT);
// Whoever publishes only in their groups looks at their screens, or at the general one.
$seen = access::screens_seen();
if ($screenid && $seen !== null && !in_array($screenid, $seen, true)) {
    $screenid = 0;
}
$screen = $screenid ? $DB->get_record('local_oksigeniahechauka_screen', ['id' => $screenid], '*', MUST_EXIST) : (object) [
    'id' => 0,
    'name' => get_string('preview_general', 'local_oksigeniahechauka'),
    'template' => 'zones',
    'theme' => 'site',
    'power' => null,
    'lastinfo' => null,
];
$m = manifest::build($screen, time());
// A screen of theirs shows what reaches it, all of it; the general one, only what reaches them: nothing of the other groups'.
if (!$screenid) {
    $m['items'] = access::seen_items($m['items'] ?? []);
}
// The preview shows everything, whatever the power hours say, and never sounds: the panel can have several screens
// open at once.
unset($m['power']);
if (isset($m['screen'])) {
    $m['screen']['sound'] = false;
}

// Every media object gets the address of the panel, which goes with the session, instead of the screens' one.
$fs = get_file_storage();
$rewrite = function (array &$node) use (&$rewrite, $fs): void {
    foreach ($node as &$value) {
        if (is_array($value)) {
            if (isset($value['sha1'], $value['url'], $value['id']) && is_int($value['id'])) {
                $file = $fs->get_file_by_id($value['id']);
                if ($file && files::readable($file)) {
                    $value['url'] = moodle_url::make_pluginfile_url(
                        $file->get_contextid(),
                        $file->get_component(),
                        $file->get_filearea(),
                        $file->get_itemid(),
                        $file->get_filepath(),
                        $file->get_filename()
                    )->out(false);
                }
            } else {
                $rewrite($value);
            }
        }
    }
};
$rewrite($m);
endpoint::send($m);
