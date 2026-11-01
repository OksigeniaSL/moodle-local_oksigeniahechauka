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
 * The page «Tu centro»: what it shows and what it saves.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class centre {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /** @var array The colours the screens use when the centre has not chosen its own. */
    const DEFAULTS = [
        'colourprimary' => '#1f5f8b',
        'colouraccent' => '#e8a33a',
    ];

    /**
     * Everything the page needs.
     *
     * @param string $query what was searched, if anything
     * @param int $now
     * @return array
     */
    public static function context(string $query, int $now): array {
        global $DB;
        $c = self::C;
        $config = get_config($c);

        // Where the school is.
        $results = $query !== '' ? place::search($query) : [];
        $options = [];
        foreach ($results as $i => $r) {
            $pos = \core_text::strpos(\core_text::strtolower($r['name']), \core_text::strtolower(trim($query)));
            $options[] = ['i' => $i, 'before' => $pos !== false && $pos > 0 ? \core_text::substr($r['name'], 0, $pos) : '',
                'mark' => $pos !== false ? \core_text::substr($r['name'], $pos, \core_text::strlen(trim($query))) : '',
                'after' => $pos !== false ? \core_text::substr($r['name'], $pos + \core_text::strlen(trim($query))) : $r['name'],
                'detail' => $r['detail']];
        }
        $place = null;
        if (!empty($config->lat) && !empty($config->lon) && $query === '') {
            $lat = (float) $config->lat;
            $lon = (float) $config->lon;
            $map = json_decode((string) ($config->placemap ?? ''), true);
            if (!is_array($map) || empty($map['grid'])) {
                $map = place::map($lat, $lon);
                set_config('placemap', json_encode($map), $c);
            }
            $parts = array_map('trim', explode(',', (string) ($config->place ?? $config->location ?? '')));
            $name = array_shift($parts);
            $weather = weather::summary(weather::hours(), $now);
            $place = [
                'name' => $name,
                'where' => implode(', ', $parts),
                'coords' => place::degrees($lat, $lon),
                'map' => $map,
                'osm' => 'https://www.openstreetmap.org/?mlat=' . $lat . '&mlon=' . $lon . '#map=11/' . $lat . '/' . $lon,
                'weather' => $weather ? [
                    'symbol' => $weather['now']['symbol'] ?? '',
                    'temp' => $weather['now']['temp'] ?? '',
                    'max' => $weather['today']['max'] ?? '',
                    'min' => $weather['today']['min'] ?? '',
                    'text' => $weather['today']['text'] ?? '',
                ] : null,
            ];
        }

        // The two colours, each with the text that will go on it; «de serie» while the centre has not chosen its own.
        $tiles = [];
        $uses = ['colourprimary' => ['centre_primary', 'centre_primary_use'], 'colouraccent' => ['centre_accent',
            'centre_accent_use']];
        $chosen = false;
        foreach (self::DEFAULTS as $setting => $default) {
            $mine = colours::valid($config->$setting ?? '');
            $chosen = $chosen || $mine;
            $value = $mine ? strtolower($config->$setting) : $default;
            $tiles[] = [
                'setting' => $setting,
                'value' => $value,
                'name' => get_string($uses[$setting][0], $c),
                'use' => get_string($uses[$setting][1], $c),
                'hex' => strtoupper($value),
                'on' => get_string(colours::on($value) === '#ffffff' ? 'centre_text_white' : 'centre_text_dark', $c),
            ];
        }

        // The centre's categories: what it calls its parts, each with its colour and the words that mark it.
        $coursecats = $DB->get_records_menu('course_categories', null, '', 'id, name');
        $counts = categories::week_counts($now);
        $cats = [];
        foreach (categories::all() as $i => $cat) {
            $count = $counts[$i + 1] ?? 0;
            $linkedto = $cat['coursecat'] && isset($coursecats[$cat['coursecat']]) ?
                format_string($coursecats[$cat['coursecat']]) : '';
            $cats[] = [
                'n' => $i + 1,
                'id' => $cat['id'],
                'name' => $cat['name'],
                'colour' => $cat['colour'],
                'words' => implode(', ', $cat['words']),
                'wordlist' => array_map(function ($w) use ($c) {
                    return ['word' => $w, 'remove' => get_string('centre_word_remove', $c, $w)];
                }, $cat['words']),
                'coursecat' => $cat['coursecat'],
                'linked' => $linkedto !== '' ? get_string('centre_category_linked', $c, $linkedto) : '',
                'count' => $count === 1 ? get_string('centre_category_count_one', $c) :
                    get_string('centre_category_count', $c, $count),
                'remove' => get_string('centre_category_remove', $c, $cat['name']),
                'unlink' => get_string('centre_category_unlink', $c, $cat['name']),
            ];
        }
        $linked = array_column(categories::all(), 'coursecat');
        $importable = count(array_filter(categories::from_moodle(), function ($cat) use ($linked) {
            return !in_array($cat['coursecat'], $linked);
        }));

        // The logos.
        $logos = [];
        foreach ([files::LOGO => false, files::LOGODARK => true] as $area => $dark) {
            $file = files::first($area, 0);
            $logos[] = [
                'area' => $area,
                'dark' => $dark,
                'label' => get_string($dark ? 'centre_logo_dark' : 'centre_logo_light', $c),
                'url' => $file ? \moodle_url::make_pluginfile_url(
                    $file->get_contextid(),
                    $c,
                    $area,
                    0,
                    '/',
                    $file->get_filename()
                )->out(false) : '',
                'alt' => get_string($dark ? 'centre_logo_dark_alt' : 'centre_logo_light_alt', $c),
            ];
        }

        $first = $DB->get_records('local_oksigeniahechauka_screen', null, 'sortorder, name', 'id', 0, 1);
        $first = $first ? (int) reset($first)->id : 0;
        return [
            'style' => home::stages(),
            'title' => get_string('panel_title', $c),
            'tabs' => home::tabs('centre', true),
            'hastabs' => true,
            'action' => (new \moodle_url('/local/oksigeniahechauka/centre.php'))->out(false),
            'sesskey' => sesskey(),
            'query' => $query !== '' ? $query : (string) ($config->location ?? ''),
            'searched' => $query !== '',
            'results' => $options,
            'hasresults' => (bool) $options,
            'resultsjson' => json_encode($results),
            'place' => $place,
            'tiles' => $tiles,
            'defaults' => !$chosen,
            'categories' => $cats,
            'hascategories' => (bool) $cats,
            'canadd' => count($cats) < categories::MAX,
            'canimport' => $importable > 0 && count($cats) < categories::MAX,
            'palette' => json_encode(categories::PALETTE),
            'max' => categories::MAX,
            'logos' => $logos,
            'frame' => (new \moodle_url('/local/oksigeniahechauka/preview.php', ['frame' => 1, 'screen' => $first]))->out(false),
            'placename' => $place['name'] ?? '',
            'admin' => has_capability('moodle/site:config', \context_system::instance()) ?
                (new \moodle_url('/admin/settings.php', ['section' => 'local_oksigeniahechauka_settings']))->out(false) : '',
            'icons' => ['search' => icons::svg('search'), 'pin' => icons::svg('pin'), 'out' => icons::svg('out'),
                'check' => icons::svg('check'), 'link' => icons::svg('link'), 'x' => icons::svg('x'),
                'plus' => icons::svg('plus')],
            'strings' => json_encode(['white' => get_string('centre_text_white', $c),
                'dark' => get_string('centre_text_dark', $c), 'today' => schedule::day($now),
                'samples' => self::samples()], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP),
        ];
    }

    /**
     * What the preview shows while the colours are chosen, so each one is seen in its place: a notice (the label in
     * the second colour), three events of three stages, and a line of the ticker (the main colour). Only in this
     * preview, never on a screen.
     *
     * @return array
     */
    protected static function samples(): array {
        $c = self::C;
        $out = ['notice' => ['title' => get_string('centre_sample_notice', $c), 'body' => get_string('centre_sample_body', $c)],
            'ticker' => get_string('centre_sample_ticker', $c), 'events' => []];
        // An event in each category of the centre (or one without colour, if it has none).
        $cats = categories::all();
        $hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00'];
        foreach ($cats ?: [null] as $i => $cat) {
            $out['events'][] = ['title' => get_string('centre_sample_title' . ($i + 1), $c), 'detail' => $cat ? $cat['name'] : '',
                'hour' => $hours[$i], 'color' => $cat ? $i + 1 : 0];
        }
        return $out;
    }

    /**
     * Saves the colours and the logos sent.
     *
     * @return void
     */
    public static function save(): void {
        global $USER;
        $c = self::C;
        foreach (array_keys(self::DEFAULTS) as $setting) {
            $value = optional_param($setting, '', PARAM_RAW_TRIMMED);
            if (colours::valid($value)) {
                set_config($setting, strtolower($value), $c);
            }
        }
        // The categories as they came, in their order (one without a name is taken out); then, if asked, the top
        // course categories of the site not linked yet.
        $ids = optional_param_array('cat_id', [], PARAM_ALPHANUM);
        $names = optional_param_array('cat_name', [], PARAM_TEXT);
        $colours = optional_param_array('cat_colour', [], PARAM_RAW_TRIMMED);
        $words = optional_param_array('cat_words', [], PARAM_TEXT);
        $links = optional_param_array('cat_coursecat', [], PARAM_INT);
        $list = [];
        foreach ($names as $i => $name) {
            $list[] = ['id' => $ids[$i] ?? '', 'name' => $name, 'colour' => $colours[$i] ?? '', 'words' => $words[$i] ?? '',
                'coursecat' => $links[$i] ?? 0];
        }
        if (optional_param('import', 0, PARAM_BOOL)) {
            $linked = array_column($list, 'coursecat');
            foreach (categories::from_moodle() as $cat) {
                if (!in_array($cat['coursecat'], $linked)) {
                    $cat['colour'] = categories::PALETTE[count($list) % categories::MAX];
                    $list[] = $cat;
                }
            }
        }
        categories::save($list);
        $fs = get_file_storage();
        $context = \context_system::instance();
        foreach ([files::LOGO => 'logo', files::LOGODARK => 'logodark'] as $area => $setting) {
            $upload = $_FILES[$setting] ?? null;
            if (empty($upload['name']) || !empty($upload['error']) || !is_uploaded_file($upload['tmp_name'])) {
                continue;
            }
            $ext = strtolower(pathinfo($upload['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['svg', 'png', 'jpg', 'jpeg', 'webp']) || $upload['size'] > 2 * 1024 * 1024) {
                continue;
            }
            $name = clean_filename($upload['name']);
            $fs->delete_area_files($context->id, $c, $area, 0);
            $fs->create_file_from_pathname(['contextid' => $context->id, 'component' => $c, 'filearea' => $area,
                'itemid' => 0, 'filepath' => '/', 'filename' => $name, 'userid' => $USER->id], $upload['tmp_name']);
            // The setting the administration keeps for the same file.
            set_config($setting, '/' . $name, $c);
        }
    }
}
