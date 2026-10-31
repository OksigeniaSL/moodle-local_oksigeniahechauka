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
 * The warning when a screen stops giving signs of life.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * A screen that should be on and has sent no heartbeat for a while: the people who run the screens hear about it,
 * once, and again when it comes back.
 */
class alerts {
    /** Seconds without a heartbeat before a screen counts as down. */
    const DOWN_AFTER = 900;

    /**
     * Looks at every screen and warns about the ones that went down or came back.
     *
     * @param int $now
     * @return array ['down' => int, 'back' => int] screens warned about
     */
    public static function check(int $now): array {
        global $DB;
        $done = ['down' => 0, 'back' => 0];
        $screens = $DB->get_records_select(
            'local_oksigeniahechauka_screen',
            'keyhash IS NOT NULL AND lastseen > 0'
        );
        foreach ($screens as $screen) {
            $down = $now - $screen->lastseen > self::DOWN_AFTER;
            if ($down && !$screen->alerted && $screen->alerts && self::expected($screen, $now)) {
                self::send($screen, 'down');
                $DB->set_field('local_oksigeniahechauka_screen', 'alerted', $now, ['id' => $screen->id]);
                $done['down']++;
            } else if (!$down && $screen->alerted) {
                if ($screen->alerts) {
                    self::send($screen, 'back');
                    $done['back']++;
                }
                $DB->set_field('local_oksigeniahechauka_screen', 'alerted', 0, ['id' => $screen->id]);
            }
        }
        return $done;
    }

    /**
     * Whether a screen should have been on for the whole of the last DOWN_AFTER seconds. A screen that has just
     * reached its hours has not had time to start yet.
     *
     * @param \stdClass $screen
     * @param int $now
     * @return bool
     */
    public static function expected(\stdClass $screen, int $now): bool {
        $power = schedule::power($screen->power);
        return schedule::power_on($power, $now) && schedule::power_on($power, $now - self::DOWN_AFTER);
    }

    /**
     * Who hears about the screens: the people with the permission to run them, or the site admins if nobody has it.
     *
     * @return \stdClass[]
     */
    public static function recipients(): array {
        $users = get_users_by_capability(files::context(), 'local/oksigeniahechauka:managescreens');
        return $users ?: get_admins();
    }

    /**
     * Sends a warning about a screen to everyone who runs the screens, each in their language.
     *
     * @param \stdClass $screen
     * @param string $kind down or back
     * @return void
     */
    protected static function send(\stdClass $screen, string $kind): void {
        $c = 'local_oksigeniahechauka';
        $strings = get_string_manager();
        $url = new \moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $screen->id]);
        foreach (self::recipients() as $user) {
            $user = \core_user::get_user($user->id);
            if (!$user || $user->deleted || $user->suspended) {
                continue;
            }
            $lang = $user->lang ?: null;
            $a = (object) [
                'name' => items::plain((string) $screen->name),
                'since' => userdate($screen->lastseen, $strings->get_string(
                    'strftimedaydatetime',
                    'langconfig',
                    null,
                    $lang
                ), $user->timezone),
                'url' => $url->out(false),
            ];
            $message = new \core\message\message();
            $message->component = $c;
            $message->name = 'screendown';
            $message->userfrom = \core_user::get_noreply_user();
            $message->userto = $user;
            $message->subject = $strings->get_string('alert_' . $kind . '_subject', $c, $a, $lang);
            $message->fullmessage = $strings->get_string('alert_' . $kind . '_body', $c, $a, $lang);
            $message->fullmessageformat = FORMAT_PLAIN;
            $message->fullmessagehtml = '';
            $message->smallmessage = $message->subject;
            $message->notification = 1;
            $message->contexturl = $url->out(false);
            $message->contexturlname = $a->name;
            message_send($message);
        }
    }
}
