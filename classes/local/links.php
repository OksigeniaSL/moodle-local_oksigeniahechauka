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
 * The short link of each web a screen shows as a QR code (a picture's, an album's, a book's, where to start, the page that
 * names a new screen), from the site's link shortener when it has one, and the QR the shortener draws for it when it draws
 * them (nur.click, in the centre's colours and with its logo). Without a shortener, or until it answers, the long address
 * and the player's own QR.
 *
 * A screen never waits for the shortener: the manifest only reads what is kept. An address seen for the first time is
 * written down, the task of every five minutes asks for it, and the next manifest has it.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class links {
    /** @var string The table. */
    const TABLE = 'local_oksigeniahechauka_link';

    /** @var string The file area of the QR codes the shortener draws: any screen may read them. */
    const QR = 'qr';

    /** @var int How many links one run of the task asks for. */
    const MOST = 20;

    /** @var int Seconds before asking again for a link or a QR the shortener did not give. */
    const RETRY = HOURSECS;

    /** @var int Seconds a link nobody shows is kept. */
    const FORGET = 60 * DAYSECS;

    /** @var int Seconds between two marks of a link as seen: not a write on every manifest. */
    const SEEN = DAYSECS;

    /** @var int The largest QR accepted, in bytes. */
    const QR_MOST = 300 * 1024;

    /**
     * How the QR of a screen is drawn, the same as the player draws its own (qr.js, qrSvg): round dots, square corners, in
     * black, with nothing in the middle, on white (a phone does not read one on a dark skin's ground), with no frame. It is
     * what every decoder read as well as the plain code in the art direction's bench (8 November 2026); rounded corners or
     * colours cost readings. The short address goes under it, written by the player.
     */
    const STYLE = ['puntos' => 'circulos', 'esquinas' => 'cuadradas', 'color' => 'oscuro', 'centro' => 'nada',
        'fondo' => 'blanco', 'marco' => 'no'];

    /**
     * The manifest with its webs short, and the QR of each one when there is one: «web» becomes the short address and
     * «webqr» the picture of its QR (a media reference), and the same for where to start («idle»: «qr» and «qrimage»).
     * What is new is written down for the task.
     *
     * @param array $m the manifest
     * @param int $now
     * @return array
     */
    public static function apply(array $m, int $now): array {
        $shortener = shortener::of_site();
        if (!$shortener) {
            return $m;
        }
        $urls = [];
        self::collect($m, $urls);
        if (!empty($m['idle']['qr']) && is_string($m['idle']['qr'])) {
            $urls[$m['idle']['qr']] = true;
        }
        // An address that is already short (nur.click/telegram) stays as it is.
        foreach (array_keys($urls) as $url) {
            if ($shortener->owns($url)) {
                unset($urls[$url]);
            }
        }
        if (!$urls) {
            return $m;
        }
        $known = self::known(array_keys($urls), $now);
        self::replace($m, $known);
        if (!empty($m['idle']['qr']) && isset($known[$m['idle']['qr']])) {
            $link = $known[$m['idle']['qr']];
            $m['idle']['qr'] = $link['short'];
            if ($link['qr']) {
                $m['idle']['qrimage'] = $link['qr'];
            }
        }
        return $m;
    }

    /**
     * The short address of one address now, asking the shortener if it has to (the page that names a new screen: the
     * screen is waiting for its code anyway). The long one when there is no shortener or it does not answer.
     *
     * @param string $url
     * @param int $now
     * @param string $title what it is, for whoever looks at the links of the shortener
     * @return array ['url' => the address to show, 'qrsvg' => the QR the shortener drew, as SVG markup, or '']
     */
    public static function now(string $url, int $now, string $title = ''): array {
        global $DB;
        $out = ['url' => $url, 'qrsvg' => ''];
        $shortener = shortener::of_site();
        if (!$shortener) {
            return $out;
        }
        $record = self::record($url, $now);
        if (!$record->short && $record->timetried < $now - self::RETRY) {
            self::ask($shortener, $record, $now, $title);
        }
        if ($record->short) {
            $out['url'] = $record->short;
            $file = self::file((int) $record->id);
            if ($file) {
                $out['qrsvg'] = $file->get_content();
            }
        }
        return $out;
    }

    /**
     * Ask the shortener for what is missing (from the task of every five minutes): the links seen and not yet short, then
     * the QR codes not yet brought; and forget the links nobody has shown for two months.
     *
     * @param int $now
     * @return string what it did, for the log
     */
    public static function refresh(int $now): string {
        global $DB;
        $old = $DB->get_records_select(self::TABLE, 'timeseen < :old', ['old' => $now - self::FORGET], '', 'id');
        foreach ($old as $record) {
            self::forget((int) $record->id);
        }
        $shortener = shortener::of_site();
        if (!$shortener) {
            return 'no shortener';
        }
        $due = $DB->get_records_select(
            self::TABLE,
            'timetried < :retry AND (short IS NULL OR (qrsvg IS NOT NULL AND qrdone = 0))',
            ['retry' => $now - self::RETRY],
            'timeseen DESC',
            '*',
            0,
            self::MOST
        );
        $made = 0;
        foreach ($due as $record) {
            if (self::ask($shortener, $record, $now)) {
                $made++;
            }
        }
        return count($due) . ' asked, ' . $made . ' made, ' . count($old) . ' forgotten';
    }

    /**
     * Ask the shortener for a link and bring its QR, if it draws them.
     *
     * @param shortener $shortener
     * @param \stdClass $record kept up to date
     * @param int $now
     * @param string $title
     * @return bool whether it has its short address now
     */
    protected static function ask(shortener $shortener, \stdClass $record, int $now, string $title = ''): bool {
        global $DB;
        $record->timetried = $now;
        if (!$record->short) {
            $link = $shortener->link($record->url, $title !== '' ? $title : get_string('pluginname', 'local_oksigeniahechauka'));
            if ($link) {
                $record->short = $link['short'];
                $record->qrsvg = $link['qrsvg'] !== '' ? $link['qrsvg'] : null;
                $record->qrdone = 0;
            }
        }
        if ($record->short && $record->qrsvg && !$record->qrdone) {
            $record->qrdone = self::bring((int) $record->id, $record->qrsvg) ? 1 : 0;
        }
        $DB->update_record(self::TABLE, $record);
        return (bool) $record->short;
    }

    /**
     * Bring the QR the shortener drew, in the screens' style, and keep it as a file of the plugin.
     *
     * @param int $id the link
     * @param string $address where the shortener draws it
     * @return bool whether it is kept
     */
    protected static function bring(int $id, string $address): bool {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $url = $address . (strpos($address, '?') === false ? '?' : '&') . http_build_query(self::STYLE, '', '&');
        $curl = new \curl(['ignoresecurity' => false]);
        $curl->setopt(['CURLOPT_TIMEOUT' => shortener::TIMEOUT * 2, 'CURLOPT_CONNECTTIMEOUT' => shortener::TIMEOUT,
            'CURLOPT_MAXREDIRS' => 0, 'CURLOPT_FOLLOWLOCATION' => false]);
        try {
            $svg = (string) $curl->get($url);
        } catch (\Throwable $error) {
            debugging('Hechauka: the QR of a link: ' . $error->getMessage(), DEBUG_DEVELOPER);
            return false;
        }
        $info = $curl->get_info();
        $code = is_array($info) && isset($info['http_code']) ? (int) $info['http_code'] : 200;
        if ($code !== 200 || $curl->get_errno() || !self::is_svg($svg)) {
            return false;
        }
        $fs = get_file_storage();
        $context = files::context();
        $fs->delete_area_files($context->id, files::COMPONENT, self::QR, $id);
        $fs->create_file_from_string(['contextid' => $context->id, 'component' => files::COMPONENT, 'filearea' => self::QR,
            'itemid' => $id, 'filepath' => '/', 'filename' => 'qr.svg', 'mimetype' => 'image/svg+xml'], $svg);
        return true;
    }

    /**
     * Whether some markup is a picture of a QR the screens can take: an SVG of a reasonable size. It is shown as a picture
     * (an «img»), where nothing in it runs, never put in the page.
     *
     * @param string $svg
     * @return bool
     */
    public static function is_svg(string $svg): bool {
        $start = ltrim(substr($svg, 0, 512));
        return strlen($svg) > 0 && strlen($svg) <= self::QR_MOST && strpos($svg, '<svg') !== false &&
            (strpos($start, '<svg') === 0 || strpos($start, '<?xml') === 0);
    }

    /**
     * The record of an address, written down if it is new.
     *
     * @param string $url
     * @param int $now
     * @return \stdClass
     */
    protected static function record(string $url, int $now): \stdClass {
        global $DB;
        $hash = sha1($url);
        $record = $DB->get_record(self::TABLE, ['urlhash' => $hash]);
        if ($record) {
            return $record;
        }
        $record = (object) ['urlhash' => $hash, 'url' => $url, 'short' => null, 'qrsvg' => null, 'qrdone' => 0,
            'timeseen' => $now, 'timetried' => 0, 'timecreated' => $now];
        try {
            $record->id = $DB->insert_record(self::TABLE, $record);
        } catch (\dml_write_exception $e) {
            // Another request wrote it down at the same time.
            return $DB->get_record(self::TABLE, ['urlhash' => $hash], '*', MUST_EXIST);
        }
        return $record;
    }

    /**
     * What is known of some addresses: the short ones and their QR, by long address. Those not known are written down, and
     * those known marked as seen.
     *
     * @param string[] $urls
     * @param int $now
     * @return array [url => ['short' => string, 'qr' => array|null]]
     */
    protected static function known(array $urls, int $now): array {
        global $DB;
        $hashes = [];
        foreach ($urls as $url) {
            $hashes[sha1($url)] = $url;
        }
        $records = $DB->get_records_list(self::TABLE, 'urlhash', array_keys($hashes));
        $out = [];
        $seen = [];
        foreach ($records as $record) {
            unset($hashes[$record->urlhash]);
            if ($record->timeseen < $now - self::SEEN) {
                $seen[] = (int) $record->id;
            }
            if ($record->short) {
                $file = $record->qrdone ? self::file((int) $record->id) : null;
                $out[$record->url] = ['short' => $record->short, 'qr' => $file ? files::media($file) : null];
            }
        }
        if ($seen) {
            [$in, $params] = $DB->get_in_or_equal($seen, SQL_PARAMS_NAMED);
            $DB->set_field_select(self::TABLE, 'timeseen', $now, 'id ' . $in, $params);
        }
        foreach ($hashes as $url) {
            self::record($url, $now);
        }
        return $out;
    }

    /**
     * Every «web» in the manifest that is an address, by its value.
     *
     * @param array $node
     * @param array $urls collected as keys
     */
    protected static function collect(array $node, array &$urls): void {
        foreach ($node as $key => $value) {
            if ($key === 'web' && is_string($value) && preg_match('#^https?://#i', $value)) {
                $urls[$value] = true;
            } else if (is_array($value)) {
                self::collect($value, $urls);
            }
        }
    }

    /**
     * Every «web» in the manifest with its short address, and its QR beside it («webqr»).
     *
     * @param array $node
     * @param array $known
     */
    protected static function replace(array &$node, array $known): void {
        $qr = null;
        foreach ($node as $key => &$value) {
            if ($key === 'web' && is_string($value) && isset($known[$value])) {
                $qr = $known[$value]['qr'];
                $value = $known[$value]['short'];
            } else if (is_array($value)) {
                self::replace($value, $known);
            }
        }
        unset($value);
        if ($qr) {
            $node['webqr'] = $qr;
        }
    }

    /**
     * The QR kept for a link, or null.
     *
     * @param int $id
     * @return \stored_file|null
     */
    protected static function file(int $id): ?\stored_file {
        $files = get_file_storage()->get_area_files(files::context()->id, files::COMPONENT, self::QR, $id, 'id', false);
        return $files ? reset($files) : null;
    }

    /**
     * Forget a link and its QR.
     *
     * @param int $id
     */
    protected static function forget(int $id): void {
        global $DB;
        get_file_storage()->delete_area_files(files::context()->id, files::COMPONENT, self::QR, $id);
        $DB->delete_records(self::TABLE, ['id' => $id]);
    }
}
