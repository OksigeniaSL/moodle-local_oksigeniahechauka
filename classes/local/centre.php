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

    /** @var int How long the centre's sentence can be: what fits in two lines of the ticker of any horizontal screen read
     * from 5 m, also behind glass. */
    const PHRASE = 90;

    /** @var int What fits of it in the ticker of an upright screen read from 5 m: a longer one is not said there. */
    const PHRASE_UPRIGHT = 30;

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
        $finder = place::view($query, $now);

        // The two colours, each with the text that will go on it; «de serie» while the centre has not chosen its own.
        $tiles = [];
        $uses = ['colourprimary' => ['centre_primary', 'centre_primary_use'], 'colouraccent' => ['centre_accent',
            'centre_accent_use']];
        $chosen = false;
        $auto = skins::colours($config);
        foreach (self::DEFAULTS as $setting => $default) {
            // The centre's own, or what the screens take without them: the skin's or, with none chosen, its Moodle's.
            $mine = skins::own($config, $setting);
            $chosen = $chosen || $mine;
            $value = $mine ?? $auto[$setting];
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
            'howto' => howto::button('centro'),
            'hastabs' => true,
            'action' => (new \moodle_url('/local/oksigeniahechauka/centre.php'))->out(false),
            'sesskey' => sesskey(),
            'query' => $finder['query'],
            'searched' => $finder['searched'],
            'results' => $finder['results'],
            'hasresults' => $finder['hasresults'],
            'resultsjson' => $finder['resultsjson'],
            'place' => $finder['place'],
            'tiles' => $tiles,
            'defaults' => !$chosen,
            'skins' => skins::gallery($config),
            'skinletters' => skins::gallery_letters(),
            'custom' => skins::editor($config),
            'birthdays' => ['on' => !empty($config->sourcebirthdays),
                'url' => (new \moodle_url('/local/oksigeniahechauka/birthdays.php'))->out(false)],
            'sitelogo' => !files::first(files::LOGO, 0) && files::site_logo(),
            'categories' => $cats,
            'hascategories' => (bool) $cats,
            'canadd' => count($cats) < categories::MAX,
            'canimport' => $importable > 0 && count($cats) < categories::MAX,
            'palette' => json_encode(categories::PALETTE),
            'max' => categories::MAX,
            'logos' => $logos,
            'dayend' => sources::day_end(),
            'meals' => sources::has_meals() ? sources::meal_hours() : false,
            'phrase' => ['value' => self::phrase($config), 'max' => self::PHRASE, 'upright' => self::PHRASE_UPRIGHT,
                'uprightscreens' => self::upright_far(), 'left' => get_string('centre_phrase_left', $c, '{$a}'),
                'leftone' => get_string('centre_phrase_left_one', $c)],
            'surprises' => surprises::centre_context($config),
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
            'important' => ['title' => get_string('centre_sample_important', $c),
                'body' => get_string('centre_sample_important_body', $c)],
            'second' => ['title' => get_string('centre_sample_second', $c), 'body' => get_string('centre_sample_second_body', $c)],
            'ticker' => get_string('centre_sample_ticker', $c), 'events' => []];
        // An event in each category of the centre; with none, two with the skin's colour, so that its column is not empty.
        $cats = categories::all();
        $hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00'];
        foreach ($cats ?: [null, null] as $i => $cat) {
            $titles = ['centre_sample_title1', 'centre_sample_title2', 'centre_sample_title3', 'centre_sample_title4',
                'centre_sample_title5', 'centre_sample_title6'];
            $out['events'][] = ['title' => get_string($titles[$i], $c), 'detail' => $cat ? $cat['name'] : '',
                'hour' => $hours[$i], 'color' => $cat ? $i + 1 : 0];
        }
        return $out;
    }

    /**
     * The centre's own sentence (its motto), said whole in the ticker every few sentences, and as a headline from 8 m.
     *
     * @param \stdClass $config
     * @return string
     */
    public static function phrase(\stdClass $config): string {
        return items::plain((string) ($config->centrephrase ?? ''));
    }

    /**
     * Whether the centre has an upright screen read from 5 m or more, where only a short sentence fits in the ticker.
     *
     * @return bool
     */
    protected static function upright_far(): bool {
        global $DB;
        foreach ($DB->get_records('local_oksigeniahechauka_screen', null, '', 'id, lastinfo, distance') as $screen) {
            $display = (json_decode((string) $screen->lastinfo, true) ?: [])['display'] ?? [];
            if ((int) ($display['height'] ?? 0) > (int) ($display['width'] ?? 0) && (int) $screen->distance >= 5) {
                return true;
            }
        }
        return false;
    }

    /**
     * Saves the colours and the logos sent.
     *
     * @return void
     */
    public static function save(): void {
        global $USER;
        $c = self::C;
        // The skin first: a colour is the centre's own only if it is not what the skin already gives.
        $skin = optional_param('skin', null, PARAM_ALPHANUMEXT);
        if ($skin !== null) {
            set_config('skin', skins::get($skin) ? $skin : '', $c);
        }
        // What the editor changes over the skin: each from its closed list, or nothing.
        $letter = optional_param('skinletter', null, PARAM_ALPHANUMEXT);
        if ($letter !== null) {
            set_config('skinletter', skins::letter($letter) ? $letter : '', $c);
        }
        $ground = optional_param('skinground', null, PARAM_ALPHANUMEXT);
        if ($ground !== null) {
            set_config('skinground', skins::ground($ground, '#000000') ? $ground : '', $c);
        }
        $corners = optional_param('skincorners', null, PARAM_ALPHANUMEXT);
        if ($corners !== null) {
            set_config('skincorners', isset(skins::CORNERS[$corners]) && $corners !== skins::ROUND ? $corners : '', $c);
        }
        $auto = skins::colours(get_config($c));
        foreach (array_keys(self::DEFAULTS) as $setting) {
            $value = strtolower(optional_param($setting, '', PARAM_RAW_TRIMMED));
            if (colours::valid($value)) {
                set_config($setting, $value === $auto[$setting] ? '' : $value, $c);
            }
        }
        // The centre's sentence, on one line and no longer than what fits.
        $phrase = optional_param('centrephrase', null, PARAM_TEXT);
        if ($phrase !== null) {
            set_config('centrephrase', \core_text::substr(trim(preg_replace('/\s+/u', ' ', $phrase)), 0, self::PHRASE), $c);
        }
        // When the day ends: from then «Today» shows tomorrow.
        $dayend = optional_param('dayend', '', PARAM_RAW_TRIMMED);
        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $dayend)) {
            set_config('dayend', $dayend, $c);
        }
        // When the canteen serves: only both, and the first before the second.
        $from = optional_param('mealfrom', '', PARAM_RAW_TRIMMED);
        $to = optional_param('mealto', '', PARAM_RAW_TRIMMED);
        $time = '/^([01]\d|2[0-3]):[0-5]\d$/';
        if (preg_match($time, $from) && preg_match($time, $to) && strcmp($from, $to) < 0) {
            set_config('mealfrom', $from, $c);
            set_config('mealto', $to, $c);
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
        surprises::save_centre();
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
                'itemid' => 0, 'filepath' => '/', 'filename' => $name], $upload['tmp_name']);
            // The setting the administration keeps for the same file.
            set_config($setting, '/' . $name, $c);
        }
    }
}
