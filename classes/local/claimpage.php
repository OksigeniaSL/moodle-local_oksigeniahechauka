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
 * A new screen from the phone, in three steps: the TV shows its code (step 1), this page names it or makes it replace
 * another (step 2), and says it is running (step 3). There is no «Diseño» to choose: the composition is the player's.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class claimpage {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /**
     * The code with a space in the middle, as the TV shows it: «KM7 Q4X».
     *
     * @param string $code
     * @return string
     */
    public static function spaced(string $code): string {
        return trim(implode(' ', str_split($code, 3)));
    }

    /**
     * Step 2: the screen found, new or replacing, its name and groups.
     *
     * @param \stdClass $pair
     * @param string $code
     * @param int $now
     * @param array $errors
     * @return array
     */
    public static function form(\stdClass $pair, string $code, int $now, array $errors): array {
        global $DB;
        $c = self::C;
        $device = json_decode((string) $pair->device, true) ?: [];
        $width = (int) ($device['width'] ?? 0);
        $height = (int) ($device['height'] ?? 0);
        $about = [get_string('claim_code', $c, self::spaced($code))];
        if ($width && $height) {
            $about[] = get_string($height > $width ? 'sheet_display_v' : 'sheet_display_h', $c, (object) ['w' => $width,
                'h' => $height]);
        }
        $replace = optional_param('kind', 'new', PARAM_ALPHA) === 'replace';
        $chosen = array_map('intval', optional_param_array('groups', [], PARAM_INT));
        $groups = [];
        foreach ($DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name') as $id => $name) {
            $groups[] = ['id' => $id, 'name' => format_string($name), 'checked' => in_array((int) $id, $chosen)];
        }
        // To replace: the screens, the ones without signal first (most likely the one being changed).
        $screens = [];
        foreach ($DB->get_records('local_oksigeniahechauka_screen', null, 'sortorder, name') as $s) {
            $card = home::screen($s, $now, [], false);
            $screens[] = ['id' => (int) $s->id, 'name' => $card['name'], 'state' => $card['state'], 'label' => $card['label'],
                'meta' => $card['meta'], 'down' => $card['state'] === 'down' || $card['state'] === 'new'];
        }
        usort($screens, function ($a, $b) {
            return (int) $b['down'] - (int) $a['down'];
        });
        if ($screens) {
            $screens[0]['checked'] = true;
        }
        return [
            'style' => home::stages(),
            'isform' => true,
            'title' => get_string('claim_title', $c),
            'action' => (new \moodle_url('/local/oksigeniahechauka/claim.php', ['code' => $code]))->out(false),
            'sesskey' => sesskey(),
            'code' => self::spaced($code),
            'about' => implode(' · ', $about),
            'vertical' => $height > $width,
            'replace' => $replace,
            'name' => optional_param('name', '', PARAM_TEXT),
            'groups' => $groups,
            'screens' => $screens,
            'hasscreens' => (bool) $screens,
            'errors' => $errors,
            'icons' => ['plus' => icons::svg('plus')],
            'strings' => json_encode(
                ['start' => get_string('claim_start', $c), 'change' => get_string('claim_change', $c)],
                JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP
            ),
        ];
    }

    /**
     * Saves step 2: a new screen with its name and groups (and a new group, if written), or the device of another.
     *
     * @param \stdClass $pair
     * @param int $now
     * @return array [the screen id or 0, field => error]
     */
    public static function save(\stdClass $pair, int $now): array {
        global $DB;
        $c = self::C;
        $data = (object) ['groups' => array_map('intval', optional_param_array('groups', [], PARAM_INT))];
        if (optional_param('kind', 'new', PARAM_ALPHA) === 'replace') {
            $data->screenid = optional_param('screenid', 0, PARAM_INT);
            if (!$DB->record_exists('local_oksigeniahechauka_screen', ['id' => $data->screenid])) {
                return [0, ['screenid' => get_string('claim_choose', $c)]];
            }
            return [screens::claim($pair, $data, $now), []];
        }
        $data->name = trim(optional_param('name', '', PARAM_TEXT));
        if ($data->name === '') {
            return [0, ['name' => get_string('sheet_needname', $c)]];
        }
        if ($DB->record_exists('local_oksigeniahechauka_screen', ['name' => $data->name])) {
            return [0, ['name' => get_string('sheet_samename', $c)]];
        }
        $newgroup = trim(optional_param('newgroup', '', PARAM_TEXT));
        if ($newgroup !== '') {
            $data->groups[] = (int) $DB->insert_record('local_oksigeniahechauka_group', (object) ['name' => $newgroup,
                'sortorder' => 0, 'timecreated' => $now, 'timemodified' => $now]);
        }
        $data->groups = array_values(array_intersect($data->groups, array_map(
            'intval',
            $DB->get_fieldset_select('local_oksigeniahechauka_group', 'id', '1 = 1')
        )));
        return [screens::claim($pair, $data, $now), []];
    }

    /**
     * Step 3: it is running.
     *
     * @param \stdClass $screen
     * @return array
     */
    public static function done(\stdClass $screen): array {
        $c = self::C;
        $name = format_string($screen->name);
        $groups = screens::groups_of((int) $screen->id);
        return [
            'style' => home::stages(),
            'isdone' => true,
            'title' => get_string('claim_title', $c),
            'name' => $name,
            'running' => get_string('claim_running', $c, $name),
            'shows' => get_string($groups ? 'claim_shows_groups' : 'claim_shows_all', $c),
            'frame' => (new \moodle_url('/local/oksigeniahechauka/preview.php', ['frame' => 1, 'screen' => $screen->id]))
                ->out(false),
            'alt' => get_string('picture_alt', $c, $name),
            'home' => (new \moodle_url('/local/oksigeniahechauka/index.php'))->out(false),
            'sheet' => (new \moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $screen->id]))->out(false),
        ];
    }

    /**
     * A code that is not waiting (written wrong, or older than its few minutes).
     *
     * @param string $code
     * @return array
     */
    public static function notfound(string $code): array {
        $c = self::C;
        return [
            'style' => home::stages(),
            'isnotfound' => true,
            'title' => get_string('claim_title', $c),
            'code' => self::spaced($code),
            'action' => (new \moodle_url('/local/oksigeniahechauka/claim.php'))->out(false),
            'home' => (new \moodle_url('/local/oksigeniahechauka/index.php'))->out(false),
        ];
    }
}
