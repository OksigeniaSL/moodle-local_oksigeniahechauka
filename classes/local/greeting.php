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
 * The birthday in Moodle itself: on their day, whoever has one finds a card at the top of their dashboard, with their name
 * and their picture or their bichito, until they close it; and, if the centre wants, a notification that morning, which
 * reaches the phone through whatever the site sends notifications with.
 *
 * Who has a birthday is what the screens know (the field of the profile, the list), only for Moodle accounts. The card is on
 * until the centre turns it off; the notification, off until the centre turns it on.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class greeting {
    /** @var string The year someone closed their card: it does not come back until the next birthday. */
    const CLOSED = 'local_oksigeniahechauka_greetclosed';

    /** @var string The year someone got the notification: one a year. */
    const SENT = 'local_oksigeniahechauka_greetsent';

    /** @var int The hour of the centre from which the notification goes: nobody gets one at night. */
    const FROM_HOUR = 7;

    /** @var string[] The pages the card goes on: the dashboard, the front page and «My courses», where a site without
     * dashboard lands. */
    const PAGES = ['my-index', 'site-index', 'my-courses'];

    /**
     * Whether the card is on.
     *
     * @return bool
     */
    public static function card_on(): bool {
        return get_config('local_oksigeniahechauka', 'greetcard') !== '0';
    }

    /**
     * Whether the notification is on.
     *
     * @return bool
     */
    public static function notify_on(): bool {
        return !empty(get_config('local_oksigeniahechauka', 'greetnotify'));
    }

    /**
     * The day of the centre and its year.
     *
     * @param int $now
     * @return array [YYYY-MM-DD, year]
     */
    protected static function today(int $now): array {
        $date = schedule::day($now);
        return [$date, (int) substr($date, 0, 4)];
    }

    /**
     * Who is greeted today, if it is their day and they have not closed it.
     *
     * @param int $userid
     * @param int $now
     * @return array|null {firstname, name, group, photo, year}
     */
    public static function of(int $userid, int $now): ?array {
        if (!$userid || !self::card_on()) {
            return null;
        }
        [$date, $year] = self::today($now);
        if ((int) get_user_preferences(self::CLOSED, 0, $userid) === $year) {
            return null;
        }
        $person = birthdays::of_user(get_config('local_oksigeniahechauka'), $userid, $date);
        return $person ? $person + ['year' => $year] : null;
    }

    /**
     * The card, as its template takes it; null when there is none.
     *
     * @param int $userid
     * @param int $now
     * @return array|null
     */
    public static function card(int $userid, int $now): ?array {
        $person = self::of($userid, $now);
        if (!$person) {
            return null;
        }
        $url = new \moodle_url('/local/oksigeniahechauka/greeting.php');
        $photo = $person['photo'] ? new \moodle_url($url, ['photo' => $person['year'], 'v' => $person['photo']->get_id()]) : null;
        return [
            'firstname' => $person['firstname'],
            'name' => $person['name'],
            'group' => $person['group'],
            'hasgroup' => $person['group'] !== '',
            'photo' => $photo ? $photo->out(false) : '',
            'hasphoto' => (bool) $photo,
            'initial' => \core_text::strtoupper(\core_text::substr($person['firstname'] !== '' ? $person['firstname'] :
                $person['name'], 0, 1)),
            'action' => $url->out(false),
            'sesskey' => sesskey(),
            'back' => qualified_me() ?: '',
        ];
    }

    /**
     * Closes someone's card until their next birthday.
     *
     * @param int $userid
     * @param int $now
     * @return void
     */
    public static function close(int $userid, int $now): void {
        set_user_preference(self::CLOSED, self::today($now)[1], $userid);
    }

    /**
     * The picture of someone's card: only theirs, on their day.
     *
     * @param int $userid
     * @param int $now
     * @return \stored_file|null
     */
    public static function photo(int $userid, int $now): ?\stored_file {
        $person = self::of($userid, $now);
        return $person ? $person['photo'] : null;
    }

    /**
     * The notification of the morning, to who has a birthday today and has not had it this year. Called every hour, it
     * starts at FROM_HOUR, so a server that was off at seven still sends it when it comes back.
     *
     * @param int $now
     * @return string what was done, for the log of the task
     */
    public static function send(int $now): string {
        global $DB;
        if (!self::notify_on()) {
            return 'off';
        }
        $hour = (int) (new \DateTime('@' . $now))->setTimezone(\core_date::get_server_timezone_object())->format('G');
        if ($hour < self::FROM_HOUR) {
            return 'not yet';
        }
        [$date, $year] = self::today($now);
        $config = get_config('local_oksigeniahechauka');
        $sent = 0;
        foreach (birthdays::accounts_on($config, $date) as $userid) {
            if ((int) get_user_preferences(self::SENT, 0, $userid) === $year) {
                continue;
            }
            $user = $DB->get_record('user', ['id' => $userid]);
            $person = $user ? birthdays::of_user($config, $userid, $date) : null;
            if (!$person) {
                continue;
            }
            // Written first: a notification that fails is not sent again every hour of the day.
            set_user_preference(self::SENT, $year, $user);
            $old = force_current_language($user->lang);
            try {
                $message = self::message($user, $person['firstname'] !== '' ? $person['firstname'] : $person['name']);
            } finally {
                force_current_language($old);
            }
            if (message_send($message)) {
                $sent++;
            }
        }
        return $sent . ' sent';
    }

    /**
     * The notification for someone, in their language.
     *
     * @param \stdClass $user
     * @param string $firstname
     * @return \core\message\message
     */
    protected static function message(\stdClass $user, string $firstname): \core\message\message {
        $c = 'local_oksigeniahechauka';
        $subject = get_string('greeting_subject', $c, $firstname);
        $text = get_string('greeting_text', $c, $firstname);
        $message = new \core\message\message();
        $message->component = $c;
        $message->name = 'birthday';
        $message->userfrom = \core_user::get_noreply_user();
        $message->userto = $user;
        $message->subject = $subject;
        $message->fullmessage = $text;
        $message->fullmessageformat = FORMAT_PLAIN;
        $message->fullmessagehtml = \html_writer::tag('p', s($text));
        $message->smallmessage = $subject;
        $message->notification = 1;
        $message->contexturl = (new \moodle_url('/my/'))->out(false);
        $message->contexturlname = get_string('greeting_link', $c);
        return $message;
    }
}
