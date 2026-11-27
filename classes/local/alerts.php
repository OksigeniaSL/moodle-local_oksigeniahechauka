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

    /** Screens that go (or come back) in the same pass, from which they are told together in one warning. */
    const TOGETHER = 3;

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
        $went = [];
        $came = [];
        foreach ($screens as $screen) {
            $info = json_decode((string) ($screen->lastinfo ?? ''), true) ?: [];
            $broken = manifest::broken_since((int) $screen->id);
            $down = $now - $screen->lastseen > self::DOWN_AFTER || screens::frozen($info) ||
                ($broken && $now - $broken > self::DOWN_AFTER);
            if ($down && !$screen->alerted && $screen->alerts && self::expected($screen, $now)) {
                $went[] = $screen;
                $done['down']++;
            } else if (!$down && $screen->alerted) {
                if ($screen->alerts) {
                    $came[] = $screen;
                    $done['back']++;
                }
                $DB->set_field('local_oksigeniahechauka_screen', 'alerted', 0, ['id' => $screen->id]);
            }
        }
        // A building without network is one thing to look at, not a warning for each of its screens.
        foreach (['down' => $went, 'back' => $came] as $kind => $list) {
            if (count($list) >= self::TOGETHER) {
                self::send_many($list, $kind);
            } else {
                foreach ($list as $screen) {
                    self::send($screen, $kind);
                }
            }
            // Marked once told: a warning that could not be sent is tried again on the next pass.
            if ($kind === 'down') {
                foreach ($list as $screen) {
                    $DB->set_field('local_oksigeniahechauka_screen', 'alerted', $now, ['id' => $screen->id]);
                }
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
            commonmail::notice($message, self::letter($user, $screen, $kind, (string) $message->subject, $a, $lang));
            message_send($message);
        }
    }

    /**
     * One warning for several screens that went, or came back, at the same time: a building without network, a cut in the
     * power. To everyone who runs the screens, each in their language.
     *
     * @param \stdClass[] $screens
     * @param string $kind down or back
     * @return void
     */
    protected static function send_many(array $screens, string $kind): void {
        $c = 'local_oksigeniahechauka';
        $strings = get_string_manager();
        $url = new \moodle_url('/local/oksigeniahechauka/index.php');
        $list = array_map(function ($screen) {
            return items::plain((string) $screen->name);
        }, $screens);
        $names = implode(', ', array_map(function ($name) {
            return '«' . $name . '»';
        }, $list));
        $a = (object) ['count' => count($screens), 'names' => $names, 'url' => $url->out(false)];
        foreach (self::recipients() as $user) {
            $user = \core_user::get_user($user->id);
            if (!$user || $user->deleted || $user->suspended) {
                continue;
            }
            $lang = $user->lang ?: null;
            $message = new \core\message\message();
            $message->component = $c;
            $message->name = 'screendown';
            $message->userfrom = \core_user::get_noreply_user();
            $message->userto = $user;
            $message->subject = $strings->get_string('alert_' . $kind . '_many_subject', $c, $a, $lang);
            $message->fullmessage = $strings->get_string('alert_' . $kind . '_many_body', $c, $a, $lang);
            $message->fullmessageformat = FORMAT_PLAIN;
            $message->fullmessagehtml = '';
            $message->smallmessage = $message->subject;
            $message->notification = 1;
            $message->contexturl = $url->out(false);
            $message->contexturlname = $strings->get_string('pluginname', $c, null, $lang);
            commonmail::notice($message, self::letter_many($user, $list, $kind, (string) $message->subject, $a->url, $lang));
            message_send($message);
        }
    }

    /**
     * The mail of a warning about one screen: when it was last heard of, what may be going on and, if the screen sends
     * pictures of itself, the last one, with a button to its page.
     *
     * @param \stdClass $user Who reads it.
     * @param \stdClass $screen
     * @param string $kind down or back
     * @param string $subject
     * @param \stdClass $a name, since and url
     * @param string|null $lang The reader's language.
     * @return array The pieces of the common mail.
     */
    public static function letter(
        \stdClass $user,
        \stdClass $screen,
        string $kind,
        string $subject,
        \stdClass $a,
        ?string $lang
    ): array {
        $c = 'local_oksigeniahechauka';
        $strings = get_string_manager();
        $say = fn(string $key, $b = null): string => $strings->get_string($key, $c, $b, $lang);
        if ($kind === 'down') {
            $blocks = [
                ['paragraph' => $say('alert_down_mail')],
                ['data' => [
                    ['label' => $say('mail_screen'), 'value' => $a->name],
                    ['label' => $say('mail_since'), 'value' => $a->since],
                ]],
            ];
            // What it showed last, when the screen sends pictures of itself: a frozen picture, a notice of the TV in
            // front, or a black screen tell at a glance what to do.
            $shot = files::first(files::SHOT, (int) $screen->id);
            $bytes = commonmail::picture($shot);
            if ($bytes !== null) {
                $blocks[] = ['picture' => [
                    'picturebytes' => $bytes,
                    'picturealt' => $say('alert_mail_shot_alt', $a->name),
                    'picturecaption' => $say('alert_mail_shot', userdate(
                        $shot->get_timemodified(),
                        $strings->get_string('strftimedaydatetime', 'langconfig', null, $lang),
                        $user->timezone
                    )),
                ]];
            }
            $blocks[] = ['note' => [
                'notetitle' => $say('alert_down_mail_hours_title'),
                'notetext' => $say('alert_down_mail_hours'),
            ]];
        } else {
            $blocks = [
                ['paragraph' => $say('alert_back_mail', $a->name)],
                ['data' => [
                    ['label' => $say('mail_screen'), 'value' => $a->name],
                    ['label' => $say('mail_back_since'), 'value' => $a->since],
                ]],
            ];
        }
        $blocks[] = ['action' => ['actionurl' => $a->url, 'actiontext' => $say('alert_mail_open')]];
        $blocks[] = ['small' => $say($kind === 'down' ? 'alert_down_mail_back' : 'alert_back_mail_report')];
        return commonmail::letter($user, $subject, $say('mail_reason_runs', commonmail::site()), $blocks, $lang);
    }

    /**
     * The mail of a warning about several screens at once: their names, one under the other, and a button to the panel.
     *
     * @param \stdClass $user Who reads it.
     * @param string[] $names The names of the screens.
     * @param string $kind down or back
     * @param string $subject
     * @param string $url The panel.
     * @param string|null $lang The reader's language.
     * @return array The pieces of the common mail.
     */
    public static function letter_many(
        \stdClass $user,
        array $names,
        string $kind,
        string $subject,
        string $url,
        ?string $lang
    ): array {
        $c = 'local_oksigeniahechauka';
        $strings = get_string_manager();
        $say = fn(string $key, $b = null): string => $strings->get_string($key, $c, $b, $lang);
        $blocks = [
            ['paragraph' => $say('alert_' . $kind . '_many_mail')],
            ['items' => array_values($names)],
        ];
        if ($kind === 'down') {
            $blocks[] = ['paragraph' => $say('alert_down_many_mail_why')];
        }
        $blocks[] = ['action' => ['actionurl' => $url, 'actiontext' => $say('mail_open_panel')]];
        if ($kind === 'down') {
            $blocks[] = ['small' => $say('alert_down_many_mail_back')];
        }
        return commonmail::letter($user, $subject, $say('mail_reason_runs', commonmail::site()), $blocks, $lang);
    }
}
