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
 * The screen people touch, at the door of a centre: from afar it shows what every screen shows, with an invitation to
 * touch; close up, its doors. Two kinds of people stop by it: the centre's families, in a hurry and knowing what they
 * want, and visitors waiting for whoever receives them, who do not know the centre. Here: which doors a screen opens,
 * what the centre tells of itself («How to get here», «Get to know the centre» with «A day here») and today's visits of
 * the centre's admissions, with who receives them.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class touch {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /** @var string[] Every door, in the order they come unless the screen says another; the families' first. */
    const DOORS = ['menu', 'agenda', 'photos', 'notices', 'library', 'networks', 'about', 'visit', 'openacts', 'centre'];

    /** @var string[] The doors for those who visit; the others are the families'. */
    const VISITORS = ['about', 'visit', 'openacts', 'centre'];

    /** @var string[] The colour of the skin each door wears on the screen (the same as player/src/tactil.js, DOORS). */
    const COLOURS = [
        'menu' => 'menu', 'agenda' => 'evento', 'photos' => 'marca-1', 'notices' => 'marca-4', 'library' => 'marca-2',
        'networks' => 'marca-3', 'about' => 'marca-1', 'visit' => 'marca-4', 'openacts' => 'evento', 'centre' => 'marca-2',
    ];

    /** @var int Seconds without a touch before the screen goes back to what it shows from afar. */
    const IDLE = 60;

    /** @var string Where the pictures of who receives a visit and the drawn plans are kept (item 0, named by content). */
    const VISIT = 'visit';

    /** @var string Where the pictures of «A day here» are kept: the item is the moment's number. */
    const DAY = 'day';

    /** @var string Where the centre's own map for «How to get here» is kept (item 0). */
    const MAP = 'contactmap';

    /** @var int The moments of «A day here». */
    const DAY_MOST = 8;

    /** @var int[] What fits of each piece of «How to get here», in characters. */
    const CONTACT = ['address' => 120, 'hours' => 120, 'phone' => 40, 'email' => 100, 'web' => 255];

    /** @var int What fits of the centre's words about itself. */
    const WORDS = 280;

    /** @var int What fits of the line of a stage («3 to 5 years»). */
    const LINE = 60;

    /** @var int What fits of a moment's title. */
    const TITLE = 40;

    /** @var int What fits of a moment's words. */
    const SAYS = 140;

    /** @var int The biggest picture kept, in bytes. */
    const MOST = 8 * 1024 * 1024;

    /**
     * A screen's doors, in its order: the ones it keeps that exist, or every one when it keeps none.
     *
     * @param string|null $kept comma separated
     * @return string[]
     */
    public static function doors(?string $kept): array {
        $list = array_values(array_unique(array_intersect(explode(',', (string) $kept), self::DOORS)));
        return $list ?: self::DOORS;
    }

    /**
     * What the manifest says of a screen people touch: its doors and how long it waits; nothing for any other screen.
     *
     * @param \stdClass $screen
     * @return array
     */
    public static function contract(\stdClass $screen): array {
        if (empty($screen->touch)) {
            return [];
        }
        return ['doors' => self::doors($screen->doors ?? null), 'idle' => self::IDLE];
    }

    /**
     * «How to get here»: each piece the centre wrote, its map if it put one, and where it is on a map of the web, for the QR.
     *
     * @param \stdClass $config
     * @param string $suffix a site of the centre (sites::suffix()), or '' for the centre
     * @return array the piece of the contract, or [] when there is nothing
     */
    public static function contact(\stdClass $config, string $suffix = ''): array {
        $out = [];
        foreach (array_keys(self::CONTACT) as $key) {
            $value = trim((string) ($config->{'contact' . $key} ?? ''));
            if ($value !== '') {
                $out[$key] = $value;
            }
        }
        $map = files::first(self::MAP, 0);
        if ($map) {
            $out['map'] = files::media($map);
        }
        $lat = $config->{'lat' . $suffix} ?? '';
        $lon = $config->{'lon' . $suffix} ?? '';
        if (is_numeric($lat) && is_numeric($lon)) {
            $out['geo'] = self::geo((float) $lat, (float) $lon);
        }
        return $out;
    }

    /**
     * Where a place is on OpenStreetMap: no key, and any phone opens it.
     *
     * @param float $lat
     * @param float $lon
     * @return string
     */
    public static function geo(float $lat, float $lon): string {
        $la = sprintf('%.5f', $lat);
        $lo = sprintf('%.5f', $lon);
        return "https://www.openstreetmap.org/?mlat=$la&mlon=$lo#map=17/$la/$lo";
    }

    /**
     * «Get to know the centre»: its words, its stages (the centre's categories, each with the line it wrote) and «A day
     * here», the moments with their picture.
     *
     * @param \stdClass $config
     * @return array the piece of the contract, or [] when the centre has told nothing of itself
     */
    public static function about(\stdClass $config): array {
        $words = trim((string) ($config->aboutwords ?? ''));
        $lines = json_decode((string) ($config->aboutstages ?? ''), true) ?: [];
        $stages = [];
        foreach (categories::all() as $i => $cat) {
            $stages[] = ['name' => $cat['name'], 'line' => (string) ($lines[$cat['id']] ?? ''), 'color' => $i + 1];
        }
        $day = [];
        foreach (self::moments($config) as $n => $moment) {
            $file = files::first(self::DAY, $n);
            if (!$file) {
                continue;
            }
            $day[] = ['time' => $moment['time'], 'title' => $moment['title'], 'words' => $moment['words'],
                'media' => files::media($file)];
        }
        if ($words === '' && !$day) {
            return [];
        }
        return ['words' => $words, 'stages' => $stages, 'day' => $day];
    }

    /**
     * The moments of «A day here» as the centre keeps them, by their number, in their order.
     *
     * @param \stdClass $config
     * @return array number => [time, title, words]
     */
    public static function moments(\stdClass $config): array {
        $out = [];
        foreach (json_decode((string) ($config->aboutday ?? ''), true) ?: [] as $moment) {
            $n = (int) ($moment['n'] ?? 0);
            if ($n < 1 || isset($out[$n]) || count($out) >= self::DAY_MOST) {
                continue;
            }
            $out[$n] = ['time' => self::time((string) ($moment['time'] ?? '')),
                'title' => (string) ($moment['title'] ?? ''), 'words' => (string) ($moment['words'] ?? '')];
        }
        return $out;
    }

    /**
     * An hour as «08:45», or '' when it is none.
     *
     * @param string $text
     * @return string
     */
    protected static function time(string $text): string {
        if (!preg_match('/^([01]?\d|2[0-3])[:.h]([0-5]\d)$/', trim($text), $m)) {
            return '';
        }
        return sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
    }

    /**
     * Whether the site has the admissions that know today's visits (Oksigenia Eguahe 0.85.2 or later).
     *
     * @return bool
     */
    public static function has_visits(): bool {
        return class_exists('\local_oksigeniaeguahe\api') && method_exists('\local_oksigeniaeguahe\api', 'visits_today');
    }

    /**
     * Today's visits as an item of the contract: those still to come or under way, each with who receives it and the drawn
     * plan of its way, both kept among the screens' files. Never anything of the family.
     *
     * @param int $now
     * @return array items of the contract
     */
    public static function visits(int $now): array {
        if (!self::has_visits()) {
            return [];
        }
        try {
            $list = \local_oksigeniaeguahe\api::visits_today(null, $now);
        } catch (\Throwable $e) {
            debugging('Hechauka: the visits of Eguahe could not be read: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return [];
        }
        $visits = self::visits_of($list, $now, function ($file) {
            return $file instanceof \stored_file ? self::keep($file) : null;
        });
        if (!$visits) {
            return [];
        }
        return [['id' => 'visit-' . schedule::day($now), 'type' => 'visit', 'zone' => 'extra', 'visits' => $visits]];
    }

    /**
     * The visits for the screens, from what Eguahe gives: those that have not ended, with what a screen shows of them.
     * Pure but for the keeping of the pictures, which comes as a function.
     *
     * @param array $list what api::visits_today() gives
     * @param int $now
     * @param callable $keep a stored_file (or null) to the one the screens may download, or null
     * @return array
     */
    public static function visits_of(array $list, int $now, callable $keep): array {
        $out = [];
        $text = function ($v): string {
            return trim((string) (is_scalar($v) ? $v : ''));
        };
        foreach ($list as $visit) {
            $start = (int) ($visit['timestart'] ?? 0);
            $end = (int) ($visit['timeend'] ?? 0);
            if (!$start || $end <= $start || $end <= $now) {
                continue;
            }
            $hosts = [];
            foreach ((array) ($visit['hosts'] ?? []) as $host) {
                $name = $text($host['name'] ?? '');
                if ($name === '') {
                    continue;
                }
                $one = ['first' => $text($host['first'] ?? '') ?: $name, 'name' => $name, 'role' => $text($host['role'] ?? ''),
                    'says' => $text($host['says'] ?? '')];
                $picture = $keep($host['photofile'] ?? null);
                if ($picture) {
                    $one['img'] = files::media($picture);
                }
                $hosts[] = $one;
            }
            $turns = [];
            foreach ((array) ($visit['turns'] ?? []) as $turn) {
                $from = (int) ($turn['timestart'] ?? 0);
                $to = (int) ($turn['timeend'] ?? 0);
                if ($from && $to > $from) {
                    $turns[] = ['timestart' => $from, 'timeend' => $to, 'minutes' => (int) round(($to - $from) / MINSECS)];
                }
            }
            $one = [
                'id' => (int) ($visit['id'] ?? 0),
                'kind' => ($visit['kind'] ?? '') === 'openday' ? 'openday' : 'visit',
                'name' => $text($visit['name'] ?? ''),
                'place' => $text($visit['place'] ?? ''),
                'timestart' => $start,
                'timeend' => $end,
                'minutes' => (int) round(($end - $start) / MINSECS),
                'turns' => $turns,
                'hosts' => $hosts,
                'where' => $text($visit['where'] ?? ''),
            ];
            $plan = $keep($visit['miniaturefile'] ?? null);
            if ($plan) {
                $one['plan'] = files::media($plan);
            }
            $out[] = $one;
        }
        usort($out, function ($a, $b) {
            return $a['timestart'] <=> $b['timestart'] ?: $a['id'] <=> $b['id'];
        });
        return $out;
    }

    /**
     * A picture of another plugin, kept among the screens' own files (they never ask another plugin), named by its
     * content: the same picture is kept once, whoever it is of.
     *
     * @param \stored_file $source
     * @return \stored_file|null
     */
    public static function keep(\stored_file $source): ?\stored_file {
        $ext = [
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/svg+xml' => 'svg', 'image/gif' => 'gif',
        ][$source->get_mimetype()] ?? null;
        if ($source->is_directory() || !$ext || $source->get_filesize() > self::MOST) {
            return null;
        }
        $fs = get_file_storage();
        $context = files::context();
        $name = $source->get_contenthash() . '.' . $ext;
        $kept = $fs->get_file($context->id, files::COMPONENT, self::VISIT, 0, '/', $name);
        if ($kept) {
            return $kept;
        }
        try {
            return $fs->create_file_from_storedfile(['contextid' => $context->id, 'component' => files::COMPONENT,
                'filearea' => self::VISIT, 'itemid' => 0, 'filepath' => '/', 'filename' => $name], $source);
        } catch (\Throwable $e) {
            debugging('Hechauka: a picture of a visit could not be kept: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return null;
        }
    }

    /**
     * The pictures of visits that are no longer today's go: from the scheduled task.
     *
     * @param int $now
     * @return int how many went
     */
    public static function prune(int $now): int {
        $wanted = [];
        foreach (self::visits($now) as $item) {
            foreach ($item['visits'] as $visit) {
                foreach ($visit['hosts'] as $host) {
                    if (isset($host['img'])) {
                        $wanted[$host['img']['id']] = true;
                    }
                }
                if (isset($visit['plan'])) {
                    $wanted[$visit['plan']['id']] = true;
                }
            }
        }
        $gone = 0;
        $fs = get_file_storage();
        foreach ($fs->get_area_files(files::context()->id, files::COMPONENT, self::VISIT, 0, 'id', false) as $file) {
            if (!isset($wanted[$file->get_id()])) {
                $file->delete();
                $gone++;
            }
        }
        return $gone;
    }

    /**
     * What the screen's sheet shows: whether people touch it, and its doors as they come, each on or off, with its group.
     *
     * @param \stdClass $screen
     * @return array
     */
    public static function sheet_context(\stdClass $screen): array {
        $info = json_decode((string) ($screen->lastinfo ?? ''), true) ?: [];
        $on = self::doors($screen->doors ?? null);
        $order = array_merge($on, array_diff(self::DOORS, $on));
        // Each door in the colour it wears on the screen (the centre's skin: player/src/tactil.js, DOORS), so that whoever
        // sets them recognises it.
        $config = get_config(self::C);
        $skin = skins::get(skins::chosen($config) ?: skins::first());
        $tones = $skin['light'] ?? [];
        $doors = [];
        foreach ($order as $door) {
            $doors[] = ['key' => $door, 'label' => get_string('door_' . $door, self::C), 'on' => in_array($door, $on),
                'visitors' => in_array($door, self::VISITORS), 'colour' => (string) ($tones[self::COLOURS[$door]] ?? '')];
        }
        return [
            'on' => !empty($screen->touch),
            // The device says it has a touch screen: the sheet suggests it.
            'suggest' => empty($screen->touch) && (int) ($info['touch']['points'] ?? 0) > 0,
            'doors' => $doors,
        ];
    }

    /**
     * The doors a sheet sent, as they are kept: in their order, only real ones; '' for all of them in theirs.
     *
     * @param string[] $sent
     * @return string
     */
    public static function doors_param(array $sent): string {
        $list = array_values(array_unique(array_intersect($sent, self::DOORS)));
        return $list === self::DOORS ? '' : implode(',', $list);
    }

    /**
     * What «Your centre» shows of «How to get here» and «Get to know the centre», for its blocks.
     *
     * @return array
     */
    public static function panel(): array {
        $config = get_config(self::C);
        $contact = [];
        foreach (self::CONTACT as $key => $most) {
            $contact[] = ['key' => $key, 'value' => (string) ($config->{'contact' . $key} ?? ''), 'most' => $most,
                'label' => get_string('contact_' . $key, self::C)];
        }
        $map = files::first(self::MAP, 0);
        $lines = json_decode((string) ($config->aboutstages ?? ''), true) ?: [];
        $stages = [];
        foreach (categories::all() as $i => $cat) {
            $stages[] = ['id' => $cat['id'], 'name' => $cat['name'], 'colour' => $cat['colour'], 'n' => $i + 1,
                'line' => (string) ($lines[$cat['id']] ?? ''), 'most' => self::LINE];
        }
        $day = [];
        foreach (self::moments($config) as $n => $moment) {
            $file = files::first(self::DAY, $n);
            $day[] = $moment + ['n' => $n, 'picture' => $file ? self::url($file) : ''];
        }
        return [
            'contact' => $contact,
            'map' => $map ? self::url($map) : '',
            'words' => (string) ($config->aboutwords ?? ''),
            'wordsmost' => self::WORDS,
            'stages' => $stages,
            'day' => $day,
            'daymost' => self::DAY_MOST,
            'dayfull' => count($day) >= self::DAY_MOST,
            'titlemost' => self::TITLE,
            'saysmost' => self::SAYS,
            'action' => (new \moodle_url('/local/oksigeniahechauka/reception.php'))->out(false),
        ];
    }

    /**
     * Where the panel sees one of these pictures.
     *
     * @param \stored_file $file
     * @return string
     */
    protected static function url(\stored_file $file): string {
        $url = \moodle_url::make_pluginfile_url(
            $file->get_contextid(),
            $file->get_component(),
            $file->get_filearea(),
            $file->get_itemid(),
            $file->get_filepath(),
            $file->get_filename()
        );
        return $url->out(false);
    }

    /**
     * One gesture of the blocks of «Your centre» (reception.php): a piece written, a picture put or taken out, a moment
     * added, moved or taken out. Each is kept on its own.
     *
     * @param string $what contact, map, mapdrop, words, stage, day, dayphoto, daymove, daydrop
     * @param array $in key, value, n, to; file (a path of an uploaded file) and filename
     * @return array what the blocks show now (panel())
     */
    public static function change(string $what, array $in): array {
        $c = self::C;
        $clip = function (string $text, int $most): string {
            return \core_text::substr(trim(preg_replace('/\s+/u', ' ', $text)), 0, $most);
        };
        $value = (string) ($in['value'] ?? '');
        $config = get_config($c);
        $moments = self::moments($config);
        $n = (int) ($in['n'] ?? 0);
        switch ($what) {
            case 'contact':
                $key = (string) ($in['key'] ?? '');
                if (isset(self::CONTACT[$key])) {
                    $value = $clip($value, self::CONTACT[$key]);
                    if ($key === 'web' && $value !== '' && !preg_match('~^https?://~i', $value)) {
                        $value = 'https://' . $value;
                    }
                    if ($key === 'web' && $value !== '' && clean_param($value, PARAM_URL) === '') {
                        $value = '';
                    }
                    if ($key === 'email' && $value !== '' && !validate_email($value)) {
                        $value = '';
                    }
                    set_config('contact' . $key, $value, $c);
                }
                break;
            case 'words':
                set_config('aboutwords', $clip($value, self::WORDS), $c);
                break;
            case 'stage':
                $lines = json_decode((string) ($config->aboutstages ?? ''), true) ?: [];
                $ids = array_column(categories::all(), 'id');
                $id = (string) ($in['key'] ?? '');
                if (in_array($id, $ids)) {
                    $lines[$id] = $clip($value, self::LINE);
                }
                set_config('aboutstages', json_encode(array_filter(array_intersect_key($lines, array_flip($ids)))), $c);
                break;
            case 'map':
                self::picture(self::MAP, 0, $in);
                break;
            case 'mapdrop':
                get_file_storage()->delete_area_files(files::context()->id, files::COMPONENT, self::MAP, 0);
                break;
            case 'day':
                // A new moment takes the first free number; a known one changes what it says.
                if (!isset($moments[$n])) {
                    if (count($moments) >= self::DAY_MOST) {
                        break;
                    }
                    $n = 1;
                    while (isset($moments[$n])) {
                        $n++;
                    }
                    $moments[$n] = ['time' => '', 'title' => '', 'words' => ''];
                }
                foreach (['time' => 0, 'title' => self::TITLE, 'words' => self::SAYS] as $field => $most) {
                    if (array_key_exists($field, $in)) {
                        $moments[$n][$field] = $field === 'time' ? self::time((string) $in[$field]) :
                            $clip((string) $in[$field], $most);
                    }
                }
                if (!empty($in['file'])) {
                    self::picture(self::DAY, $n, $in);
                }
                self::save_moments($moments);
                break;
            case 'dayphoto':
                if (isset($moments[$n])) {
                    self::picture(self::DAY, $n, $in);
                }
                break;
            case 'daymove':
                $to = (int) ($in['to'] ?? 0);
                $keys = array_keys($moments);
                $at = array_search($n, $keys, true);
                if ($at !== false && $to >= 0 && $to < count($keys)) {
                    array_splice($keys, $at, 1);
                    array_splice($keys, $to, 0, [$n]);
                    $moved = [];
                    foreach ($keys as $key) {
                        $moved[$key] = $moments[$key];
                    }
                    self::save_moments($moved);
                }
                break;
            case 'daydrop':
                if (isset($moments[$n])) {
                    unset($moments[$n]);
                    get_file_storage()->delete_area_files(files::context()->id, files::COMPONENT, self::DAY, $n);
                    self::save_moments($moments);
                }
                break;
        }
        return self::panel();
    }

    /**
     * Keeps the moments, in their order.
     *
     * @param array $moments number => [time, title, words]
     * @return void
     */
    protected static function save_moments(array $moments): void {
        $list = [];
        foreach ($moments as $n => $moment) {
            $list[] = ['n' => $n] + $moment;
        }
        set_config('aboutday', json_encode($list), self::C);
    }

    /**
     * Puts the picture uploaded in one of these areas, in place of the one there was: a picture only, and not too big.
     *
     * @param string $area
     * @param int $itemid
     * @param array $in file (the uploaded file's path) and filename
     * @return bool whether it was kept
     */
    protected static function picture(string $area, int $itemid, array $in): bool {
        $path = (string) ($in['file'] ?? '');
        $name = clean_filename((string) ($in['filename'] ?? ''));
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if ($path === '' || !is_file($path) || filesize($path) > self::MOST || !in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
            return false;
        }
        if (!@getimagesize($path)) {
            return false;
        }
        $fs = get_file_storage();
        $context = files::context();
        $fs->delete_area_files($context->id, files::COMPONENT, $area, $itemid);
        $fs->create_file_from_pathname(['contextid' => $context->id, 'component' => files::COMPONENT, 'filearea' => $area,
            'itemid' => $itemid, 'filepath' => '/', 'filename' => $name], $path);
        return true;
    }
}
