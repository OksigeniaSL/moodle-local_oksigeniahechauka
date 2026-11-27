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
 * The mails of the notices in the common look of the organization (its name, its colour and its logo, the pictures
 * inside the mail and a text version), by the way of Oksigenia Marandu when it is there (0.70 and later): to an address
 * of home, by the mail of the site; to the rest, by Mailjet if the site chose it. Without Marandu, or before Moodle 5.3,
 * Moodle sends the notices as it always did, so the plugin works in any Moodle.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class commonmail {
    /** @var string The API of Oksigenia Marandu. */
    private const API = '\local_oksigeniamarandu\api';

    /** @var string This plugin. */
    private const COMPONENT = 'local_oksigeniahechauka';

    /** @var int The widest a picture goes inside the letter: twice the 520 px it is shown at. */
    private const PICTURE_WIDTH = 1040;

    /** @var int The heaviest a picture may be, so the mail stays clear of the spam filters. */
    private const PICTURE_BYTES = 200000;

    /**
     * Whether Oksigenia Marandu sends the mails of the tools.
     *
     * @return bool
     */
    public static function available(): bool {
        return class_exists(self::API) && method_exists(self::API, 'mail_notice');
    }

    /**
     * Gives a notice of Moodle its mail in the common look, just before message_send(). What the notice shows in the
     * bell and in the app does not change; without Marandu, nothing does.
     *
     * @param \core\message\message $message The notice.
     * @param array $pieces As Marandu's api::mail_html() takes them, in the language of the reader.
     * @param bool $routine Repeated every month: by the mail of the site once the month is near its quota.
     * @return void
     */
    public static function notice(\core\message\message $message, array $pieces, bool $routine = false): void {
        if (!self::available()) {
            return;
        }
        $api = self::API;
        try {
            $api::mail_notice($message, $pieces, $routine);
        } catch (\Throwable $e) {
            debugging('The common mail of a notice: ' . $e->getMessage(), DEBUG_DEVELOPER);
        }
    }

    /**
     * The pieces every letter of the plugin shares: the subject as its title, the greeting, who writes («Screens») and
     * why it arrives.
     *
     * @param \stdClass $user Who reads it.
     * @param string $subject The subject of the notice.
     * @param string $reason Why it arrives, already in the reader's language.
     * @param array $blocks The pieces of the letter, in order.
     * @param string|null $lang The reader's language.
     * @return array
     */
    public static function letter(\stdClass $user, string $subject, string $reason, array $blocks, ?string $lang): array {
        $strings = get_string_manager();
        $pieces = [
            'subject' => $subject,
            'heading' => $subject,
            'unit' => $strings->get_string('mail_unit', self::COMPONENT, null, $lang),
            'blocks' => $blocks,
            'reason' => $reason,
        ];
        $first = trim((string) ($user->firstname ?? ''));
        if ($first !== '') {
            $pieces['hello'] = $strings->get_string('mail_hello', self::COMPONENT, $first, $lang);
        }
        // The line a mail program shows before opening it: the first paragraph, which adds to the subject.
        foreach ($blocks as $block) {
            if (isset($block['paragraph'])) {
                $pieces['preheader'] = \core_text::substr(preg_replace('/\s+/u', ' ', $block['paragraph']), 0, 140);
                break;
            }
        }
        return $pieces;
    }

    /**
     * The name of the site, as a piece of the mail takes it.
     *
     * @return string
     */
    public static function site(): string {
        return self::plain(format_string(get_site()->fullname, true, ['context' => \context_system::instance()]));
    }

    /**
     * A text of the plugin's pages as a piece of the mail takes it: the mail escapes what it shows, so what
     * format_string() already escaped («&amp;») would show twice.
     *
     * @param string $text The text, as the pages show it.
     * @return string
     */
    public static function plain(string $text): string {
        return html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * A picture for the letter: a JPEG no wider than the letter shows it twice over and light enough for the filters.
     *
     * @param \stored_file|null $file A PNG or JPEG.
     * @return string|null The bytes; null if there is none, or it cannot be made light enough.
     */
    public static function picture(?\stored_file $file): ?string {
        if (!$file || !function_exists('imagecreatefromstring')) {
            return null;
        }
        $source = @imagecreatefromstring($file->get_content());
        if (!$source) {
            return null;
        }
        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min(1, self::PICTURE_WIDTH / max(1, $width));
        $w = max(1, (int) round($width * $scale));
        $h = max(1, (int) round($height * $scale));
        $canvas = imagecreatetruecolor($w, $h);
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $w, $h, $width, $height);
        $bytes = null;
        foreach ([82, 70, 58] as $quality) {
            ob_start();
            imagejpeg($canvas, null, $quality);
            $out = (string) ob_get_clean();
            if (strlen($out) <= self::PICTURE_BYTES) {
                $bytes = $out;
                break;
            }
        }
        return $bytes;
    }
}
