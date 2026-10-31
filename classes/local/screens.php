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
 * The screens, their groups and their pairing.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * A new screen shows a code; someone with the permission claims it and the screen gets its key.
 */
class screens {
    /** Minutes a pairing code lasts. */
    const PAIR_MINUTES = 15;

    /** Pairings waiting at once, at most: a code is cheap to ask for, the table must not grow without end. */
    const PAIR_MAX = 100;

    /** A screen without a heartbeat for longer than this is off. */
    const OFFLINE_AFTER = 180;

    /**
     * A new pairing for a screen that asks for a code.
     *
     * @param array $device what the screen says about itself
     * @param int $now
     * @return array the answer of the contract
     */
    public static function start_pairing(array $device, int $now): array {
        global $DB;
        $DB->delete_records_select('local_oksigeniahechauka_pair', 'timeexpires < :now', ['now' => $now]);
        if ($DB->count_records('local_oksigeniahechauka_pair') >= self::PAIR_MAX) {
            endpoint::fail(429, 'busy', 'Too many screens waiting to be paired');
        }
        do {
            $code = keys::new_code();
        } while ($DB->record_exists('local_oksigeniahechauka_pair', ['code' => $code]));
        $token = keys::new_key();
        $expires = $now + self::PAIR_MINUTES * MINSECS;
        $DB->insert_record('local_oksigeniahechauka_pair', (object) [
            'code' => $code,
            'tokenhash' => keys::hash($token),
            'device' => substr(json_encode($device), 0, 2000),
            'timecreated' => $now,
            'timeexpires' => $expires,
        ]);
        $url = new \moodle_url('/local/oksigeniahechauka/claim.php', ['code' => $code]);
        return [
            'code' => $code,
            'token' => $token,
            'claim_url' => $url->out(false),
            'qr_svg' => self::qr($url->out(false)),
            'expires' => $expires,
            'poll' => 5,
        ];
    }

    /**
     * The QR code of an address, as SVG markup that scales to its box.
     *
     * @param string $text
     * @return string
     */
    public static function qr(string $text): string {
        global $CFG;
        require_once($CFG->libdir . '/tcpdf/tcpdf_barcodes_2d.php');
        $qr = new \core_qrcode($text);
        $svg = $qr->getBarcodeSVGcode(4, 4);
        // TCPDF gives a fixed size and no viewBox: add one, so the player can size it.
        if (preg_match('/<svg[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/', $svg, $m)) {
            $svg = preg_replace('/<svg /', '<svg viewBox="0 0 ' . $m[1] . ' ' . $m[2] . '" ', $svg, 1);
        }
        // Only the <svg> element: TCPDF puts an XML declaration and a doctype before it.
        $start = strpos($svg, '<svg');
        return $start === false ? '' : substr($svg, $start);
    }

    /**
     * What a screen asking for its key gets.
     *
     * @param string $token
     * @param int $now
     * @return array the answer of the contract
     */
    public static function poll(string $token, int $now): array {
        global $DB;
        $pair = $token !== '' ? $DB->get_record('local_oksigeniahechauka_pair', ['tokenhash' => keys::hash($token)]) : null;
        if (!$pair || $pair->timeexpires < $now) {
            return ['status' => 'expired'];
        }
        if (!$pair->screenid || !$pair->screenkey) {
            return ['status' => 'pending'];
        }
        $screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $pair->screenid]);
        // The key goes once: from now on only its hash exists.
        $DB->delete_records('local_oksigeniahechauka_pair', ['id' => $pair->id]);
        if (!$screen) {
            return ['status' => 'expired'];
        }
        return [
            'status' => 'paired',
            'key' => $pair->screenkey,
            'screen' => ['id' => (int) $screen->id, 'name' => $screen->name],
        ];
    }

    /**
     * The pairing of a code that has not expired, or null.
     *
     * @param string $code
     * @param int $now
     * @return \stdClass|null
     */
    public static function pairing(string $code, int $now): ?\stdClass {
        global $DB;
        $code = keys::clean_code($code);
        if ($code === '') {
            return null;
        }
        $pair = $DB->get_record('local_oksigeniahechauka_pair', ['code' => $code]);
        return $pair && $pair->timeexpires >= $now && !$pair->screenid ? $pair : null;
    }

    /**
     * Gives a waiting screen its name and its key: a new screen, or a screen that already existed (a device that
     * was replaced keeps the name, the groups and the history of the old one).
     *
     * @param \stdClass $pair
     * @param \stdClass $data name, template, groups (int[]), screenid (0 for a new one)
     * @param int $now
     * @return int the id of the screen
     */
    public static function claim(\stdClass $pair, \stdClass $data, int $now): int {
        global $DB;
        $key = keys::new_key();
        $transaction = $DB->start_delegated_transaction();
        if (!empty($data->screenid)) {
            $screen = $DB->get_record('local_oksigeniahechauka_screen', ['id' => $data->screenid], '*', MUST_EXIST);
            $screen->keyhash = keys::hash($key);
            $screen->timemodified = $now;
            $DB->update_record('local_oksigeniahechauka_screen', $screen);
            $id = (int) $screen->id;
        } else {
            $id = (int) $DB->insert_record('local_oksigeniahechauka_screen', (object) [
                'name' => $data->name,
                'template' => $data->template ?? 'zones',
                'theme' => 'site',
                'keyhash' => keys::hash($key),
                'sortorder' => (int) $DB->get_field_sql('SELECT COALESCE(MAX(sortorder), 0) + 1
                                                           FROM {local_oksigeniahechauka_screen}'),
                'timecreated' => $now,
                'timemodified' => $now,
            ]);
            self::set_groups($id, $data->groups ?? []);
        }
        $pair->screenid = $id;
        $pair->screenkey = $key;
        $DB->update_record('local_oksigeniahechauka_pair', $pair);
        $transaction->allow_commit();
        return $id;
    }

    /**
     * Sets the groups of a screen.
     *
     * @param int $screenid
     * @param int[] $groups
     * @return void
     */
    public static function set_groups(int $screenid, array $groups): void {
        global $DB;
        $DB->delete_records('local_oksigeniahechauka_member', ['screenid' => $screenid]);
        foreach (array_unique(array_map('intval', $groups)) as $g) {
            if ($g > 0) {
                $DB->insert_record('local_oksigeniahechauka_member', (object) ['screenid' => $screenid, 'groupid' => $g]);
            }
        }
    }

    /**
     * The groups of a screen.
     *
     * @param int $screenid
     * @return int[]
     */
    public static function groups_of(int $screenid): array {
        global $DB;
        return array_map('intval', $DB->get_fieldset_select(
            'local_oksigeniahechauka_member',
            'groupid',
            'screenid = :s',
            ['s' => $screenid]
        ));
    }

    /**
     * Keeps the heartbeat of a screen.
     *
     * @param \stdClass $screen
     * @param array $beat what the screen sent
     * @param int $now
     * @return void
     */
    public static function heartbeat(\stdClass $screen, array $beat, int $now): void {
        global $DB;
        $keep = [];
        foreach (
            ['time', 'tz_offset', 'version', 'uptime', 'manifest', 'stale', 'on', 'showing', 'display', 'cache',
                'errors', 'agent'] as $field
        ) {
            if (array_key_exists($field, $beat)) {
                $keep[$field] = $beat[$field];
            }
        }
        $json = json_encode($keep);
        $DB->update_record('local_oksigeniahechauka_screen', (object) [
            'id' => $screen->id,
            'lastseen' => $now,
            'lastinfo' => strlen($json) <= 8000 ? $json : json_encode(['version' => $keep['version'] ?? '']),
            'lastip' => substr(getremoteaddr(''), 0, 45),
        ]);
    }

    /**
     * Revokes the key of a screen: it goes back to showing a code.
     *
     * @param int $screenid
     * @return void
     */
    public static function revoke(int $screenid): void {
        global $DB;
        $DB->set_field('local_oksigeniahechauka_screen', 'keyhash', null, ['id' => $screenid]);
    }

    /**
     * Deletes a screen, its groups and its screenshot.
     *
     * @param int $screenid
     * @return void
     */
    public static function delete(int $screenid): void {
        global $DB;
        get_file_storage()->delete_area_files(files::context()->id, files::COMPONENT, files::SHOT, $screenid);
        $DB->delete_records('local_oksigeniahechauka_member', ['screenid' => $screenid]);
        $DB->delete_records('local_oksigeniahechauka_target', ['screenid' => $screenid]);
        $DB->delete_records('local_oksigeniahechauka_screen', ['id' => $screenid]);
    }

    /**
     * Whether a screen has given signs of life lately.
     *
     * @param \stdClass $screen
     * @param int $now
     * @return bool
     */
    public static function online(\stdClass $screen, int $now): bool {
        return $screen->lastseen > 0 && $now - $screen->lastseen <= self::OFFLINE_AFTER;
    }
}
