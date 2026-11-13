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
 * «The picture of the day»: something curious or beautiful (a galaxy, a bug under the microscope, a painting) from a
 * collection chosen by hand, so that it is always right for children, and served by Oksigenia: an index with each
 * picture's title, caption, credit and theme in two languages, and the pictures beside it. Every centre gets the same
 * one each day among the themes it has chosen; the server asks for the index once an hour and keeps today's picture,
 * so the screens never ask anyone outside.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class photoday {
    /** @var string Where the collection is, unless the site says another place. */
    const BASE = 'https://recursos.oksigenia.com/hechauka/foto-del-dia/';

    /** @var string The index of the collection. */
    const INDEX = 'indice.json';

    /** @var string[] The themes a centre chooses from, as the index names them. */
    const THEMES = ['universo', 'tierra', 'vida', 'cerca', 'arte'];

    /** @var string The file area of the index and of the picture of the day. */
    const AREA = 'photoday';

    /** @var int The item of the area the index is kept in; the picture of the day, in 0. */
    const INDEX_ITEM = 1;

    /** @var int Seconds between two asks for the index. */
    const EVERY = HOURSECS;

    /** @var int The most bytes of a picture: they come at some 300 KB. */
    const MOST = 4 * 1024 * 1024;

    /**
     * Where the collection is.
     *
     * @return string with its final slash
     */
    public static function base(): string {
        $base = trim((string) get_config('local_oksigeniahechauka', 'photodaybase'));
        return preg_match('#^https://\S+$#', $base) ? rtrim($base, '/') . '/' : self::BASE;
    }

    /**
     * The themes the centre has chosen: all of them until it says.
     *
     * @return string[]
     */
    public static function themes(): array {
        $chosen = get_config('local_oksigeniahechauka', 'photodaythemes');
        if ($chosen === false) {
            return self::THEMES;
        }
        return array_values(array_intersect(self::THEMES, explode(',', (string) $chosen)));
    }

    /**
     * Which picture is today's: of those of the chosen themes, in the order of the index (already shuffled, so that ten
     * galaxies never come in a row), one a weekday; a weekend keeps Friday's.
     *
     * @param array[] $entries of the index
     * @param string[] $themes
     * @param string $date «YYYY-MM-DD»
     * @return array|null
     */
    public static function of_day(array $entries, array $themes, string $date): ?array {
        $entries = array_values(array_filter($entries, function ($e) use ($themes) {
            return is_array($e) && in_array((string) ($e['categoria'] ?? ''), $themes, true) && self::file_of($e) !== '';
        }));
        if (!$entries) {
            return null;
        }
        $days = intdiv((int) (strtotime($date . ' 12:00 UTC') - strtotime('2024-01-01 12:00 UTC')), DAYSECS);
        $weekday = intdiv($days, 7) * 5 + min($days % 7, 4);
        return $entries[$weekday % count($entries)];
    }

    /**
     * The file name of an entry: only a plain name, never a path.
     *
     * @param array $entry
     * @return string
     */
    protected static function file_of(array $entry): string {
        $file = (string) ($entry['fichero'] ?? $entry['file'] ?? '');
        return preg_match('/^[A-Za-z0-9._-]+\.(jpe?g|webp|png)$/', $file) ? $file : '';
    }

    /**
     * A text of an entry in the language of the screens, or in Spanish, or in English: the index can say it as
     * {"titulo": {"es": …, "en": …}} or as "titulo_es", "titulo_en".
     *
     * @param array $entry
     * @param string $key titulo, pie or credito
     * @return string
     */
    public static function text(array $entry, string $key): string {
        $lang = substr(current_language(), 0, 2);
        foreach ([$lang, 'es', 'en'] as $l) {
            $value = is_array($entry[$key] ?? null) ? ($entry[$key][$l] ?? '') : ($entry[$key . '_' . $l] ?? '');
            if (trim((string) $value) !== '') {
                return items::plain((string) $value);
            }
        }
        return is_string($entry[$key] ?? null) ? items::plain($entry[$key]) : '';
    }

    /**
     * Asks for the index, at most once an hour, and keeps today's picture: from the scheduled task of every five minutes.
     *
     * @param int $now
     * @return string what happened, for the log of the task
     */
    public static function refresh(int $now): string {
        $c = 'local_oksigeniahechauka';
        if (!get_config($c, 'sourcephotoday')) {
            return 'off';
        }
        if ((int) get_config($c, 'photodaytried') > $now - self::EVERY) {
            return 'waiting';
        }
        set_config('photodaytried', $now, $c);
        $answer = self::fetch(self::base() . self::INDEX);
        $index = $answer === null ? null : json_decode($answer, true);
        if (!is_array($index)) {
            return 'no index';
        }
        $entries = array_values(isset($index['imagenes']) && is_array($index['imagenes']) ? $index['imagenes'] : $index);
        $fs = get_file_storage();
        $context = \context_system::instance();
        // The index as a file of its own (item 1): with hundreds of pictures it is too big for a setting.
        $fs->delete_area_files($context->id, files::COMPONENT, self::AREA, self::INDEX_ITEM);
        $fs->create_file_from_string(['contextid' => $context->id, 'component' => files::COMPONENT, 'filearea' => self::AREA,
            'itemid' => self::INDEX_ITEM, 'filepath' => '/', 'filename' => self::INDEX], json_encode($entries));
        $entry = self::of_day($entries, self::themes(), schedule::day($now));
        if (!$entry) {
            return 'none for the chosen themes';
        }
        $name = self::file_of($entry);
        if (!$fs->file_exists($context->id, files::COMPONENT, self::AREA, 0, '/', $name)) {
            $image = self::fetch(self::base() . rawurlencode($name));
            if ($image === null || strlen($image) > self::MOST || !@getimagesizefromstring($image)) {
                return 'no picture: ' . $name;
            }
            $fs->create_file_from_string(['contextid' => $context->id, 'component' => files::COMPONENT,
                'filearea' => self::AREA, 'itemid' => 0, 'filepath' => '/', 'filename' => $name], $image);
        }
        // Only today's is kept.
        foreach ($fs->get_area_files($context->id, files::COMPONENT, self::AREA, 0, 'id', false) as $file) {
            if ($file->get_filename() !== $name) {
                $file->delete();
            }
        }
        return 'today: ' . $name;
    }

    /**
     * One answer of the collection, or null.
     *
     * @param string $url
     * @return string|null
     */
    protected static function fetch(string $url): ?string {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl(['ignoresecurity' => false]);
        $curl->setopt(['CURLOPT_TIMEOUT' => 20, 'CURLOPT_CONNECTTIMEOUT' => 8, 'CURLOPT_MAXREDIRS' => 2,
            'CURLOPT_FOLLOWLOCATION' => true]);
        $body = $curl->get($url);
        $info = $curl->get_info();
        if ($curl->get_errno() || (int) ($info['http_code'] ?? 0) !== 200 || !is_string($body) || $body === '') {
            return null;
        }
        return $body;
    }

    /**
     * Today's picture as an item of the contract, when the source is on and the picture is on the server.
     *
     * @param int $now
     * @return array items of the contract
     */
    public static function items(int $now): array {
        $kept = get_file_storage()->get_file(
            \context_system::instance()->id,
            files::COMPONENT,
            self::AREA,
            self::INDEX_ITEM,
            '/',
            self::INDEX
        );
        $index = $kept ? json_decode($kept->get_content(), true) : null;
        if (!is_array($index)) {
            return [];
        }
        $entry = self::of_day($index, self::themes(), schedule::day($now));
        if (!$entry) {
            return [];
        }
        $file = get_file_storage()->get_file(
            \context_system::instance()->id,
            files::COMPONENT,
            self::AREA,
            0,
            '/',
            self::file_of($entry)
        );
        if (!$file) {
            return [];
        }
        $size = $file->get_imageinfo() ?: [];
        $item = ['id' => 'photoday-' . schedule::day($now), 'type' => 'photoday', 'zone' => 'extra',
            'label' => get_string('label_photoday', 'local_oksigeniahechauka'), 'image' => files::media($file),
            'title' => self::text($entry, 'titulo'), 'caption' => self::text($entry, 'pie'),
            'credit' => self::text($entry, 'credito'), 'category' => (string) $entry['categoria']];
        if (!empty($size['width']) && !empty($size['height'])) {
            $item['orientation'] = $size['width'] >= $size['height'] ? 'h' : 'v';
        }
        return [$item];
    }
}
