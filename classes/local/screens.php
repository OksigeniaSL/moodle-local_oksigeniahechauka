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

    /**
     * Codes waiting at once from one place (an address, or its /64 in IPv6): a centre names its screens a few at a time,
     * and renewing them does not add any.
     */
    const PAIR_FROM_ONE_PLACE = 10;

    /** Seconds an expired code that nobody claimed is kept, so that its screen, asking again, keeps it. */
    const PAIR_GRACE = 600;

    /**
     * Seconds a screen keeps the same code while it waits: its short link and its QR stay the same, and the shortener does
     * not get a new link every quarter of an hour from a screen left waiting for a weekend.
     */
    const PAIR_KEEP = 12 * HOURSECS;

    /** A screen without a heartbeat for longer than this is off. */
    const OFFLINE_AFTER = 180;

    /**
     * A pairing for a screen that asks for a code: a new one, or the one it had, renewed, while it keeps waiting.
     *
     * @param array $device what the screen says about itself
     * @param int $now
     * @param string $token the token of the code the screen had, which it asks to keep
     * @return array the answer of the contract
     */
    public static function start_pairing(array $device, int $now, string $token = ''): array {
        global $DB;
        self::purge_pairings($now);
        $expires = $now + self::PAIR_MINUTES * MINSECS;
        $pair = $token !== '' ? $DB->get_record('local_oksigeniahechauka_pair', ['tokenhash' => keys::hash($token)]) : null;
        if ($pair && !$pair->screenid && $pair->timecreated >= $now - self::PAIR_KEEP) {
            $DB->set_field('local_oksigeniahechauka_pair', 'timeexpires', $expires, ['id' => $pair->id]);
            $code = $pair->code;
        } else {
            // Nobody without an account may keep the centre from naming its new screens: few codes waiting from one place,
            // and when too many wait in all, the oldest of the place with most goes, instead of nobody getting one.
            $from = hash('sha256', self::place(getremoteaddr()) . '|' . get_site_identifier());
            $waiting = 'screenid IS NULL AND timeexpires > :now';
            $mine = $DB->count_records_select(
                'local_oksigeniahechauka_pair',
                $waiting . ' AND fromhash = :from',
                ['now' => $now, 'from' => $from]
            );
            if ($mine >= self::PAIR_FROM_ONE_PLACE) {
                endpoint::fail(429, 'busy', 'Too many codes waiting from here: try again in a few minutes');
            }
            if ($DB->count_records_select('local_oksigeniahechauka_pair', $waiting, ['now' => $now]) >= self::PAIR_MAX) {
                $fullest = $DB->get_records_sql("SELECT fromhash, COUNT(1) AS n
                                                   FROM {local_oksigeniahechauka_pair}
                                                  WHERE $waiting
                                               GROUP BY fromhash
                                               ORDER BY COUNT(1) DESC", ['now' => $now], 0, 1);
                $oldest = $DB->get_records_select(
                    'local_oksigeniahechauka_pair',
                    $waiting . ' AND fromhash = :from',
                    ['now' => $now, 'from' => reset($fullest)->fromhash],
                    'timecreated ASC',
                    'id',
                    0,
                    1
                );
                $DB->delete_records_list('local_oksigeniahechauka_pair', 'id', array_keys($oldest));
            }
            self::note_proxy($now);
            do {
                $code = keys::new_code();
            } while ($DB->record_exists('local_oksigeniahechauka_pair', ['code' => $code]));
            $token = keys::new_key();
            $DB->insert_record('local_oksigeniahechauka_pair', (object) [
                'code' => $code,
                'tokenhash' => keys::hash($token),
                'device' => substr(json_encode($device), 0, 2000),
                'timecreated' => $now,
                'timeexpires' => $expires,
                'fromhash' => $from,
            ]);
        }
        // Short, when the site has a shortener and it is ready: the phone that reads it opens it, and a person can type it.
        // It is asked for by the task of every five minutes, never here, where anybody may ask for a code.
        $link = links::now(links::claim_url($code), $now, get_string('claim_title', 'local_oksigeniahechauka'));
        $answer = [
            'code' => $code,
            'token' => $token,
            'claim_url' => $link['url'],
            'qr_svg' => self::qr($link['url']),
            'expires' => $expires,
            'expires_in' => $expires - $now,
            'poll' => 5,
        ];
        if ($link['qrsvg'] !== '') {
            // The QR the shortener draws, as a picture: the screen shows it in an «img», never in the page.
            $answer['qr_image'] = 'data:image/svg+xml;base64,' . base64_encode($link['qrsvg']);
        }
        return $answer;
    }

    /**
     * The place a request comes from, for the codes waiting from it: its address, or the /64 of an IPv6 one (a single
     * connection usually has a whole /64).
     *
     * @param string $address
     * @return string
     */
    public static function place(string $address): string {
        if (strpos($address, ':') === false) {
            return $address;
        }
        $packed = @inet_pton($address);
        return $packed === false ? $address : bin2hex(substr($packed, 0, 8)) . '::/64';
    }

    /**
     * Behind a reverse proxy that Moodle has not been told of, every request seems to come from the proxy, and the codes
     * waiting from one place are those of the whole Internet: noted once a day, for «Get started» to say so.
     *
     * @param int $now
     * @return void
     */
    protected static function note_proxy(int $now): void {
        $address = getremoteaddr();
        $forwarded = !empty($_SERVER['HTTP_X_FORWARDED_FOR']) || !empty($_SERVER['HTTP_X_REAL_IP']);
        $public = filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
        $private = $address !== '' && !$public;
        $noted = (int) get_config('local_oksigeniahechauka', 'proxyseen');
        if ($forwarded && $private && $now - $noted > DAYSECS) {
            set_config('proxyseen', $now, 'local_oksigeniahechauka');
        }
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
        if (!$pair) {
            return ['status' => 'expired'];
        }
        $claimed = $pair->screenid && $pair->screenkey;
        if ($pair->timeexpires < $now && !$claimed) {
            return ['status' => 'expired'];
        }
        if (!$claimed) {
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
        // The screen may ask a little after its code expired: the claimed key waits for it.
        $pair->timeexpires = max((int) $pair->timeexpires, $now + self::PAIR_MINUTES * MINSECS);
        $DB->update_record('local_oksigeniahechauka_pair', $pair);
        $transaction->allow_commit();
        return $id;
    }

    /**
     * Whether a screen that still talks has its picture frozen: its agent says so or, with no agent, nothing has been painted for
     * five minutes.
     *
     * @param array $info what its last heartbeat said
     * @return bool
     */
    public static function frozen(array $info): bool {
        return !empty($info['device']['frozen']) || (!empty($info['on']) && (int) ($info['stalled'] ?? 0) >= 300);
    }

    /**
     * Drops the codes that expired. A key that was claimed and never collected must not stay in the clear: that screen asks
     * for a code again.
     *
     * @param int $now
     * @return void
     */
    public static function purge_pairings(int $now): void {
        global $DB;
        $left = $DB->get_records_select(
            'local_oksigeniahechauka_pair',
            'timeexpires < :now AND screenid > 0 AND screenkey IS NOT NULL',
            ['now' => $now],
            '',
            'id, screenid, screenkey'
        );
        foreach ($left as $pair) {
            $DB->set_field(
                'local_oksigeniahechauka_screen',
                'keyhash',
                null,
                ['id' => $pair->screenid, 'keyhash' => keys::hash($pair->screenkey)]
            );
        }
        // A code nobody claimed stays a little after it expires, so that its screen, asking again, keeps it. Its short link
        // goes with it.
        $gone = 'timeexpires < :now AND (screenid > 0 OR timeexpires < :grace)';
        $params = ['now' => $now, 'grace' => $now - self::PAIR_GRACE];
        links::forget_claims($DB->get_fieldset_select('local_oksigeniahechauka_pair', 'code', $gone, $params));
        $DB->delete_records_select('local_oksigeniahechauka_pair', $gone, $params);
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
     * The course categories a screen shows, through the groups it is in, each with those under it. Empty: all of the site.
     *
     * @param int $screenid
     * @return int[]
     */
    public static function scope(int $screenid): array {
        global $DB;
        if (!$screenid) {
            return [];
        }
        $linked = $DB->get_fieldset_sql(
            "SELECT DISTINCT g.coursecat
               FROM {local_oksigeniahechauka_group} g
               JOIN {local_oksigeniahechauka_member} m ON m.groupid = g.id
              WHERE m.screenid = :screen AND g.coursecat > 0",
            ['screen' => $screenid]
        );
        $out = [];
        foreach ($linked as $id) {
            $path = $DB->get_field('course_categories', 'path', ['id' => $id]);
            if ($path === false) {
                continue;
            }
            $out[] = (int) $id;
            $like = $DB->sql_like('path', ':path');
            $under = $DB->get_fieldset_select('course_categories', 'id', $like, ['path' => $path . '/%']);
            $out = array_merge($out, array_map('intval', $under));
        }
        return array_values(array_unique($out));
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
        $json = json_encode(self::clean_beat($beat));
        $DB->update_record('local_oksigeniahechauka_screen', (object) [
            'id' => $screen->id,
            'lastseen' => $now,
            'lastinfo' => strlen($json) <= 8000 ? $json : '{}',
            'lastip' => substr(getremoteaddr(''), 0, 45),
        ]);
    }

    /**
     * Asks screens to do something at their next heartbeat.
     *
     * @param int $screenid a screen, or 0 for every screen
     * @param string $command reload or surprise
     * @return void
     */
    public static function ask(int $screenid, string $command): void {
        global $DB;
        if ($screenid) {
            $DB->set_field('local_oksigeniahechauka_screen', 'command', $command, ['id' => $screenid]);
        } else {
            $DB->set_field_select('local_oksigeniahechauka_screen', 'command', $command, 'keyhash IS NOT NULL');
        }
    }

    /**
     * What a screen has been asked to do, once: it is forgotten as it is handed out.
     *
     * @param int $screenid
     * @return string[]
     */
    public static function take_commands(int $screenid): array {
        global $DB;
        $command = (string) $DB->get_field('local_oksigeniahechauka_screen', 'command', ['id' => $screenid]);
        if ($command === '') {
            return [];
        }
        $DB->set_field('local_oksigeniahechauka_screen', 'command', null, ['id' => $screenid]);
        return [$command];
    }

    /**
     * What is kept of a heartbeat: only the fields of the contract, each of its kind, short. What a screen sends is
     * not trusted: the panel shows it.
     *
     * @param array $beat
     * @return array
     */
    public static function clean_beat(array $beat): array {
        $text = function ($v, int $max): ?string {
            return is_scalar($v) ? \core_text::substr((string) $v, 0, $max) : null;
        };
        $int = function ($v): ?int {
            return is_numeric($v) ? (int) $v : null;
        };
        $keep = [
            'time' => $int($beat['time'] ?? null),
            'tz_offset' => $int($beat['tz_offset'] ?? null),
            'tz_shown' => $int($beat['tz_shown'] ?? null),
            'skew' => $int($beat['skew'] ?? null),
            'version' => $text($beat['version'] ?? null, 32),
            'uptime' => $int($beat['uptime'] ?? null),
            'manifest' => $text($beat['manifest'] ?? null, 64),
            'stale' => isset($beat['stale']) ? !empty($beat['stale']) : null,
            'on' => isset($beat['on']) ? !empty($beat['on']) : null,
            'stalled' => $int($beat['stalled'] ?? null),
        ];
        $device = $beat['device'] ?? null;
        if (is_array($device)) {
            $keep['device'] = array_filter([
                'frozen' => !empty($device['frozen']) ?: null,
                'stuck' => !empty($device['stuck']) ?: null,
                'disk_ro' => !empty($device['disk_ro']) ?: null,
                'tv' => $text($device['tv'] ?? null, 10),
                'temp' => is_numeric($device['temp'] ?? null) ? (float) $device['temp'] : null,
                'throttled' => $text($device['throttled'] ?? null, 12),
                'restarts_24h' => $int($device['restarts_24h'] ?? null),
                'last_reboot' => $text($device['last_reboot'] ?? null, 80),
                'software' => $text($device['software'] ?? null, 16),
            ], function ($v) {
                return $v !== null;
            });
        }
        $display = $beat['display'] ?? null;
        if (is_array($display)) {
            $keep['display'] = ['width' => $int($display['width'] ?? null), 'height' => $int($display['height'] ?? null)];
        }
        // What the device says about touch and the touches that reached the page (player/src/touch.js).
        $touch = $beat['touch'] ?? null;
        if (is_array($touch)) {
            $keep['touch'] = [
                'points' => $int($touch['points'] ?? null),
                'pointer' => !empty($touch['pointer']),
                'ratio' => is_numeric($touch['ratio'] ?? null) ? round((float) $touch['ratio'], 2) : null,
            ];
            if (is_array($touch['events'] ?? null)) {
                foreach (['pointerdown', 'touchstart', 'mousedown'] as $type) {
                    $keep['touch']['events'][$type] = (int) $int($touch['events'][$type] ?? 0);
                }
            }
            $last = $touch['last'] ?? null;
            if (is_array($last)) {
                $share = function ($v): float {
                    return is_numeric($v) ? round(max(0, min(1, (float) $v)), 2) : 0.0;
                };
                $keep['touch']['last'] = ['type' => (string) $text($last['type'] ?? '', 12),
                    'kind' => (string) $text($last['kind'] ?? '', 8), 'x' => $share($last['x'] ?? null),
                    'y' => $share($last['y'] ?? null)];
            }
        }
        $cache = $beat['cache'] ?? null;
        if (is_array($cache)) {
            $keep['cache'] = ['files' => $int($cache['files'] ?? null), 'bytes' => $int($cache['bytes'] ?? null)];
        }
        $keep['showing'] = [];
        foreach (array_slice(is_array($beat['showing'] ?? null) ? $beat['showing'] : [], 0, 10) as $s) {
            if (is_array($s)) {
                $keep['showing'][] = ['zone' => $text($s['zone'] ?? '', 20), 'item' => $text($s['item'] ?? '', 40)];
            }
        }
        $keep['errors'] = [];
        foreach (array_slice(is_array($beat['errors'] ?? null) ? $beat['errors'] : [], 0, 5) as $e) {
            if (is_scalar($e)) {
                $keep['errors'][] = $text($e, 200);
            }
        }
        return array_filter($keep, function ($v) {
            return $v !== null;
        });
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
        report::forget($screenid);
        manifest::note_broken($screenid, time(), null);
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
