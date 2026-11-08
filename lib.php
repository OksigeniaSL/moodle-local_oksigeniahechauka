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
 * Callbacks of local_oksigeniahechauka.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Files for the panel: thumbnails, the preview and the screenshots. Screens get theirs through api/media.php.
 *
 * @param stdClass $course
 * @param stdClass $cm
 * @param context $context
 * @param string $filearea
 * @param array $args
 * @param bool $forcedownload
 * @param array $options
 * @return bool false if the file is not found
 */
function local_oksigeniahechauka_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload, array $options = []) {
    if ($context->contextlevel != CONTEXT_SYSTEM) {
        return false;
    }
    if (!in_array($filearea, ['media', 'video', 'poster', 'backdrop', 'logo', 'logodark', 'shot', 'birthday'])) {
        return false;
    }
    require_login();
    require_capability('local/oksigeniahechauka:view', $context);
    $itemid = (int) array_shift($args);
    $filename = array_pop($args);
    $filepath = $args ? '/' . implode('/', $args) . '/' : '/';
    $file = get_file_storage()->get_file(
        $context->id,
        'local_oksigeniahechauka',
        $filearea,
        $itemid,
        $filepath,
        $filename
    );
    if (!$file || $file->is_directory()) {
        return false;
    }
    send_stored_file($file, 0, 0, $forcedownload, $options);
}

/**
 * The screens as a door of «Your work» (block_oksigeniatembiapo), the dashboard of whoever runs something: how many, the
 * ones that give no sign of life, an urgent notice left on. Nothing for whoever has no permission; without the block,
 * nobody calls it.
 *
 * @param int $userid
 * @return array[] the doors, as the block takes them
 */
function local_oksigeniahechauka_oksigenia_work(int $userid): array {
    try {
        return \local_oksigeniahechauka\local\work::cards($userid, time());
    } catch (\Throwable $e) {
        // A problem of the screens never breaks the dashboard.
        debugging('Hechauka, «Your work»: ' . $e->getMessage(), DEBUG_DEVELOPER);
        return [];
    }
}
