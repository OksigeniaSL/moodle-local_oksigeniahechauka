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
 * Adding or changing a piece of content («Añadir a las pantallas»): what it is, «Cuándo» with shortcuts said as a
 * sentence, «Dónde» as chips, and the screen beside it, changing as one types. Defaults that publish and end by
 * themselves: a notice and a ticker line until Friday, a photo for two weeks, an event until it is over.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class compose {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /** @var array The shortcuts of «Cuándo» for each kind of content. */
    const SHORTCUTS = [
        'normal' => ['today', 'friday', 'twoweeks', 'always', 'dates'],
        'event' => ['untilover', 'thatday', 'fromnow', 'dates'],
    ];

    /** @var int The longest a title reads well from afar (characters). */
    const SHORT = 44;

    /**
     * The shortcut a new piece starts with: a notice and a ticker line until Friday (today only, on a Friday), a photo
     * or video for two weeks, an event until it is over.
     *
     * @param string $type
     * @param string $today «YYYY-MM-DD»
     * @return string
     */
    public static function default_when(string $type, string $today): string {
        if ($type === 'event') {
            return 'untilover';
        }
        if ($type === 'media') {
            return 'twoweeks';
        }
        return (int) date('N', phrases::noon($today)) === 5 ? 'today' : 'friday';
    }

    /**
     * The next Friday from a day (the day itself, if it is one).
     *
     * @param string $today
     * @return string
     */
    public static function friday(string $today): string {
        $dow = (int) (new \DateTime($today . ' 12:00', \core_date::get_server_timezone_object()))->format('N');
        return self::add($today, (5 - $dow + 7) % 7);
    }

    /**
     * A day plus some days.
     *
     * @param string $day
     * @param int $days
     * @return string
     */
    public static function add(string $day, int $days): string {
        return (new \DateTime($day . ' 12:00', \core_date::get_server_timezone_object()))
            ->modify(($days >= 0 ? '+' : '') . $days . ' days')->format('Y-m-d');
    }

    /**
     * The dates a shortcut of «Cuándo» means, on the day it is saved.
     *
     * @param string $when a shortcut
     * @param string $today
     * @param string $from «Desde» of «Otras fechas», maybe empty
     * @param string $to «Hasta» of «Otras fechas», maybe empty (no end)
     * @param string $eventfrom the first day of an event, maybe empty
     * @param string $eventto its last day, maybe empty
     * @return array [from or null, until or null]
     */
    public static function window(
        string $when,
        string $today,
        string $from = '',
        string $to = '',
        string $eventfrom = '',
        string $eventto = ''
    ): array {
        $eventto = $eventto !== '' ? $eventto : $eventfrom;
        switch ($when) {
            case 'today':
                return [$today, $today];
            case 'friday':
                return [$today, self::friday($today)];
            case 'twoweeks':
                return [$today, self::add($today, 13)];
            case 'always':
                return [null, null];
            case 'fromnow':
                return [$today, null];
            case 'untilover':
                if ($eventto === '') {
                    return [$today, null];
                }
                return [min($today, $eventfrom), $eventto];
            case 'thatday':
                return [$eventfrom !== '' ? $eventfrom : $today, $eventto !== '' ? $eventto : $today];
        }
        $from = schedule::is_date($from) ? $from : null;
        $to = schedule::is_date($to) ? $to : null;
        return [$from, $to];
    }

    /**
     * Everything the page needs.
     *
     * @param \stdClass|null $item the item being changed, or null for a new one
     * @param string $type
     * @param int $now
     * @param array $posted what came in a form that did not save, to show again
     * @param array $errors field => message
     * @return array
     */
    public static function context(?\stdClass $item, string $type, int $now, array $posted = [], array $errors = []): array {
        global $DB;
        $c = self::C;
        $today = schedule::day($now);
        $data = $item ? items::data($item) : [];
        $kind = $type === 'event' ? 'event' : 'normal';

        // The values: what came in a form that did not save, else the item, else the defaults.
        $v = function (string $key, $default) use ($posted) {
            return array_key_exists($key, $posted) ? $posted[$key] : $default;
        };
        $title = (string) $v('title', $item ? $item->title : '');
        $body = (string) $v('body', $item ? $item->body : '');
        $start = (int) ($data['start'] ?? 0);
        $end = (int) ($data['end'] ?? 0);
        $eventday = $start ? schedule::day($start) : $today;
        $values = [
            'title' => $title,
            'body' => $body,
            'important' => (bool) $v('important', !empty($data['important'])),
            'caption' => (bool) $v('caption', $item ? !empty($data['caption']) : true),
            'url' => (string) $v('url', $data['url'] ?? ''),
            'eventday' => (string) $v('eventday', $eventday),
            'eventfrom' => (string) $v('eventfrom', $start ? phrases::hour($start) : '10:00'),
            'eventto' => (string) $v('eventto', $end ? phrases::hour($end) : ''),
        ];
        $colour = (int) $v('colour', $data['color'] ?? 0);

        // When.
        $from = schedule::is_date($item->datefrom ?? '') ? $item->datefrom : '';
        $until = schedule::is_date($item->dateuntil ?? '') ? $item->dateuntil : '';
        $when = (string) $v('when', $item ? ($from === '' && $until === '' ? ($kind === 'event' ? 'dates' : 'always') :
            'dates') : self::default_when($type, $today));
        $days = $item ? schedule::days($item->days) : [];
        $days = $v('days', $days ?: [1, 2, 3, 4, 5, 6, 7]);
        $times = $item ? schedule::times($item->times) : [];
        $hours = (bool) $v('hours', (bool) $times);
        $ranges = [];
        for ($r = 0; $r < 2; $r++) {
            $ranges[] = ['n' => $r, 'from' => (string) $v('hf' . $r, $times[$r][0] ?? ($r ? '' : '08:00')),
                'to' => (string) $v('ht' . $r, $times[$r][1] ?? ($r ? '' : '10:30')), 'hidden' => $r > 0 && empty($times[1])];
        }
        $every = (int) $v('every', max(1, (int) ($item->everyweeks ?? 1)));
        $letters = explode(',', get_string('days_letters', $c));
        $names = self::day_names();
        $daybuttons = [];
        for ($d = 1; $d <= 7; $d++) {
            $daybuttons[] = ['n' => $d, 'letter' => $letters[$d - 1], 'name' => $names[$d - 1],
                'on' => in_array($d, array_map('intval', (array) $days))];
        }
        $shortcuts = [];
        foreach (self::SHORTCUTS[$kind] as $s) {
            $shortcuts[] = ['value' => $s, 'label' => get_string('when_' . $s, $c), 'checked' => $s === $when];
        }

        // Where: only where the person may publish.
        $destinations = access::destinations();
        $targets = $item ? items::targets($item) : ['all' => $destinations['all'], 'groups' => [], 'screens' => []];
        if (!$item && !$destinations['all'] && count($destinations['groups']) === 1) {
            $targets['groups'] = array_keys($destinations['groups']);
        }
        $postedall = $v('whereall', $targets['all']);
        $postedgroups = array_map('intval', (array) $v('groups', $targets['groups']));
        $postedscreens = array_map('intval', (array) $v('screens', $targets['screens']));
        $members = [];
        foreach ($DB->get_records('local_oksigeniahechauka_member') as $m) {
            $members[(int) $m->groupid][] = (int) $m->screenid;
        }
        $allscreens = $DB->get_records('local_oksigeniahechauka_screen', null, 'sortorder, name', 'id, name, lastinfo');
        $shape = function ($s) {
            $info = json_decode((string) $s->lastinfo, true) ?: [];
            return ($info['display']['height'] ?? 0) > ($info['display']['width'] ?? 1) ? 'v' : 'h';
        };
        $groupchips = [];
        foreach ($destinations['groups'] as $id => $name) {
            $groupchips[] = ['id' => $id, 'name' => format_string($name), 'count' => count($members[$id] ?? []),
                'checked' => !$postedall && in_array($id, $postedgroups)];
        }
        $screenchips = [];
        foreach ($destinations['screens'] as $id => $name) {
            $screenchips[] = ['id' => $id, 'name' => format_string($name), 'checked' => !$postedall && in_array(
                $id,
                $postedscreens
            ), 'icon' => icons::svg($shape($allscreens[$id]) === 'v' ? 'tvv' : 'tv')];
        }
        $screensmap = [];
        foreach ($allscreens as $s) {
            $screensmap[] = ['id' => (int) $s->id, 'name' => format_string($s->name), 'shape' => $shape($s)];
        }

        // The file of a photo or video.
        $file = null;
        if ($type === 'media' && $item) {
            $media = files::first(files::MEDIA, (int) $item->id);
            if ($media) {
                $image = files::first(files::POSTER, (int) $item->id) ?: ($media->is_valid_image() ? $media : null);
                $size = $image ? $image->get_imageinfo() : null;
                $width = (int) ($data['videowidth'] ?? ($size['width'] ?? 0));
                $height = (int) ($data['videoheight'] ?? ($size['height'] ?? 0));
                $file = [
                    'name' => $media->get_filename(),
                    'about' => self::file_about($width, $height, !$media->is_valid_image(), (float) ($data['videoduration'] ?? 0)),
                    'thumb' => $image ? \moodle_url::make_pluginfile_url(
                        $image->get_contextid(),
                        $c,
                        $image->get_filearea(),
                        $item->id,
                        '/',
                        $image->get_filename()
                    )->out(false) : '',
                    'url' => \moodle_url::make_pluginfile_url(
                        $media->get_contextid(),
                        $c,
                        $media->get_filearea(),
                        $item->id,
                        '/',
                        $media->get_filename()
                    )->out(false),
                    'video' => !$media->is_valid_image(),
                    'vertical' => $height > $width,
                    'width' => $width,
                    'height' => $height,
                ];
            }
        }

        $types = [];
        foreach (
            ['notice' => 'notice', 'media' => 'photo', 'event' => 'event', 'ticker' => 'ticker',
            'agenda' => 'agenda'] as $t => $icon
        ) {
            if ($t === 'agenda' && !access::can('publishall')) {
                continue;
            }
            $types[] = ['type' => $t, 'label' => get_string('add_' . $t, $c), 'icon' => icons::svg($icon),
                'checked' => $t === $type,
                'url' => (new \moodle_url('/local/oksigeniahechauka/edit.php', ['type' => $t]))->out(false)];
        }
        $stages = [];
        foreach ([0, 1, 2, 3, 4] as $n) {
            $stages[] = ['n' => $n, 'label' => get_string($type === 'agenda' && !$n ? 'compose_colour_bystage' : 'stage_' . $n, $c),
                'checked' => $colour === $n];
        }
        $first = $screensmap[0] ?? null;

        return [
            'style' => home::stages(),
            'id' => $item ? (int) $item->id : 0,
            'type' => $type,
            'is' . $type => true,
            'editing' => (bool) $item,
            'title' => get_string($item ? 'compose_edit' : 'compose_add', $c),
            'back' => (new \moodle_url('/local/oksigeniahechauka/index.php'))->out(false),
            'backicon' => icons::svg('back'),
            'action' => (new \moodle_url('/local/oksigeniahechauka/edit.php'))->out(false),
            'sesskey' => sesskey(),
            'types' => $item ? [] : $types,
            'hastypes' => !$item,
            'values' => $values,
            'stages' => $stages,
            'file' => $file,
            'maxbytes' => display_size(get_max_upload_file_size()),
            'shortcuts' => $shortcuts,
            'datesopen' => $when === 'dates',
            'from' => (string) $v('from', $from),
            'to' => (string) $v('to', $until),
            'days' => $daybuttons,
            'hours' => $hours,
            'ranges' => $ranges,
            'every' => array_map(function ($n) use ($every, $c) {
                return ['n' => $n, 'label' => get_string($n === 1 ? 'everyweeks_1' : 'everyweeks_n', $c, $n),
                    'selected' => $n === $every];
            }, [1, 2, 3, 4]),
            'fineopen' => count((array) $days) < 7 || $hours || $every > 1,
            'whereall' => $destinations['all'],
            'allchecked' => $destinations['all'] && $postedall,
            'allcount' => count($allscreens),
            'groups' => $groupchips,
            'screens' => $screenchips,
            'hasscreens' => (bool) $screenchips,
            'screensopen' => (bool) array_filter($screenchips, function ($s) {
                return $s['checked'];
            }),
            'errors' => $errors,
            'haserrors' => (bool) $errors,
            'icons' => ['clock' => icons::svg('clock'), 'event' => icons::svg('event'), 'chev' => icons::svg('chev'),
                'screens' => icons::svg('screens'), 'tv' => icons::svg('tv')],
            'frame' => (new \moodle_url('/local/oksigeniahechauka/preview.php', ['frame' => 1,
                'screen' => $first ? $first['id'] : 0]))->out(false),
            'vertical' => $first && $first['shape'] === 'v',
            'moment' => get_string('preview_moment', $c, phrases::weekday($today) . ', ' . phrases::hour($now)),
            'config' => json_encode([
                'type' => $type,
                'id' => $item ? (int) $item->id : 0,
                'today' => $today,
                'friday' => self::friday($today),
                'screens' => $screensmap,
                'members' => (object) $members,
                'preview' => (new \moodle_url('/local/oksigeniahechauka/preview.php', ['frame' => 1]))->out(false),
                'file' => $file,
                'short' => self::SHORT,
                'strings' => self::strings(),
            ], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP),
        ];
    }

    /**
     * The days of the week by name, Monday first, from Moodle's calendar.
     *
     * @return string[]
     */
    protected static function day_names(): array {
        $out = [];
        foreach (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as $d) {
            $out[] = \core_text::strtolower(get_string($d, 'calendar'));
        }
        return $out;
    }

    /**
     * «Apaisada · 1600 × 1067», «Vídeo vertical · 1080 × 1920 · 0:08».
     *
     * @param int $width
     * @param int $height
     * @param bool $video
     * @param float $seconds
     * @return string
     */
    public static function file_about(int $width, int $height, bool $video, float $seconds = 0): string {
        $c = self::C;
        $shape = $height > $width ? 'vertical' : 'landscape';
        $parts = [get_string(($video ? 'file_video_' : 'file_photo_') . $shape, $c)];
        if ($width && $height) {
            $parts[] = $width . ' × ' . $height;
        }
        if ($video && $seconds > 0) {
            $s = (int) round($seconds);
            $parts[] = floor($s / 60) . ':' . sprintf('%02d', $s % 60);
        }
        return implode(' · ', $parts);
    }

    /**
     * The words the page says as one types: the «Cuándo» sentence, «Dónde», the button and the notes of the preview.
     *
     * @return array
     */
    protected static function strings(): array {
        $c = self::C;
        $keys = ['s_today', 's_always', 's_until', 's_range', 's_from', 's_one', 's_untilover', 's_weekdays', 's_only',
            's_hours', 's_hours2', 's_allday', 's_every', 's_more', 'where_all_n', 'where_some', 'where_one_screen',
            'where_none', 'publish_n', 'publish_one', 'publish_agenda', 'len_ok', 'len_long', 'note_notice',
            'note_important', 'note_landscape', 'note_vertical', 'note_video', 'note_full', 'note_ticker', 'note_event',
            'note_agenda', 'and', 'draft_title', 'draft_ticker', 'longday', 'mode_photo', 'mode_today', 'mode_withtoday',
            'mode_full'];
        $out = [];
        foreach ($keys as $k) {
            $out[$k] = get_string('compose_' . $k, $c);
        }
        $out['days'] = self::day_names();
        $out['plural'] = [];
        foreach (['saturday', 'sunday'] as $d) {
            $out['plural'][$d] = get_string('compose_plural_' . $d, $c);
        }
        $out['months'] = array_map(function ($m) {
            return \core_text::strtolower(userdate(mktime(12, 0, 0, $m, 15, 2026), '%B', 99, false));
        }, range(1, 12));
        $out['letters'] = explode(',', get_string('days_letters', $c));
        return $out;
    }

    /**
     * Reads, checks and saves what the form sent.
     *
     * @param \stdClass|null $item the item being changed
     * @param string $type
     * @param int $now
     * @return array [the id saved or 0, what came in (to show again), field => error]
     */
    public static function save(?\stdClass $item, string $type, int $now): array {
        global $DB, $USER;
        $c = self::C;
        $today = schedule::day($now);
        $in = [
            'title' => trim(optional_param('title', '', PARAM_TEXT)),
            'body' => trim(optional_param('body', '', PARAM_TEXT)),
            'important' => optional_param('important', 0, PARAM_BOOL),
            'caption' => optional_param('caption', 0, PARAM_BOOL),
            'url' => trim(optional_param('url', '', PARAM_RAW_TRIMMED)),
            'colour' => optional_param('colour', 0, PARAM_INT),
            'eventday' => optional_param('eventday', '', PARAM_RAW_TRIMMED),
            'eventfrom' => optional_param('eventfrom', '', PARAM_RAW_TRIMMED),
            'eventto' => optional_param('eventto', '', PARAM_RAW_TRIMMED),
            'when' => optional_param('when', self::default_when($type, $today), PARAM_ALPHA),
            'from' => optional_param('from', '', PARAM_RAW_TRIMMED),
            'to' => optional_param('to', '', PARAM_RAW_TRIMMED),
            'days' => optional_param_array('days', [], PARAM_INT),
            'hours' => optional_param('hours', 0, PARAM_BOOL),
            'every' => optional_param('every', 1, PARAM_INT),
            'whereall' => optional_param('whereall', 0, PARAM_BOOL),
            'groups' => optional_param_array('groups', [], PARAM_INT),
            'screens' => optional_param_array('screens', [], PARAM_INT),
            'publish' => optional_param('publish', 1, PARAM_BOOL),
        ];
        for ($r = 0; $r < 2; $r++) {
            $in['hf' . $r] = optional_param('hf' . $r, '', PARAM_RAW_TRIMMED);
            $in['ht' . $r] = optional_param('ht' . $r, '', PARAM_RAW_TRIMMED);
        }
        $errors = [];
        if ($type !== 'media' && $in['title'] === '') {
            $errors['title'] = get_string('compose_needtitle', $c);
        }
        if ($type === 'agenda' && !preg_match('#^(https?|webcal)://#i', $in['url'])) {
            $errors['url'] = get_string('agenda_bad_url', $c);
        }
        $eventstart = 0;
        $eventend = 0;
        if ($type === 'event') {
            if (!schedule::is_date($in['eventday']) || !schedule::is_hour($in['eventfrom'])) {
                $errors['eventday'] = get_string('compose_needday', $c);
            } else {
                $tz = \core_date::get_server_timezone_object();
                $eventstart = (new \DateTime($in['eventday'] . ' ' . $in['eventfrom'], $tz))->getTimestamp();
                if (schedule::is_hour($in['eventto']) && $in['eventto'] > $in['eventfrom']) {
                    $eventend = (new \DateTime($in['eventday'] . ' ' . $in['eventto'], $tz))->getTimestamp();
                }
            }
        }
        $shortcuts = self::SHORTCUTS[$type === 'event' ? 'event' : 'normal'];
        if (!in_array($in['when'], $shortcuts)) {
            $in['when'] = self::default_when($type, $today);
        }
        if ($in['when'] === 'dates' && schedule::is_date($in['from']) && schedule::is_date($in['to']) && $in['to'] < $in['from']) {
            $errors['to'] = get_string('wrongdates', $c);
        }
        $days = array_values(array_unique(array_filter(array_map('intval', $in['days']), function ($d) {
            return $d >= 1 && $d <= 7;
        })));
        if ($type !== 'agenda' && !$days) {
            $errors['days'] = get_string('power_nodays', $c);
        }
        $times = [];
        if ($in['hours']) {
            for ($r = 0; $r < 2; $r++) {
                $from = $in['hf' . $r];
                $to = $in['ht' . $r];
                if ($from === '' && $to === '') {
                    continue;
                }
                if (!schedule::is_hour($from) || !schedule::is_hour($to)) {
                    $errors['hours'] = get_string('wronghour', $c);
                } else {
                    $times[] = [$from, $to];
                }
            }
            if (!$times && !isset($errors['hours'])) {
                $errors['hours'] = get_string('notimes', $c);
            }
        }

        // Where, only where the person may publish.
        $destinations = access::destinations();
        $all = $destinations['all'] && $in['whereall'];
        $groups = $all ? [] : array_values(array_intersect(
            array_map('intval', $in['groups']),
            array_keys($destinations['groups'])
        ));
        $screens = $all ? [] : array_values(array_intersect(
            array_map('intval', $in['screens']),
            array_keys($destinations['screens'])
        ));
        if (!$all && !$groups && !$screens) {
            $errors['where'] = get_string($destinations['all'] ? 'compose_needwhere' : 'publish_choosegroup', $c);
        } else if (!access::may_target($all, $groups, $screens)) {
            throw new \required_capability_exception(
                \context_system::instance(),
                'local/oksigeniahechauka:publishall',
                'nopermissions',
                ''
            );
        }

        // The file of a photo or video: one, an image or a video, no larger than the site allows.
        $upload = $type === 'media' && !empty($_FILES['file']['name']) ? $_FILES['file'] : null;
        if ($type === 'media' && !$upload && !($item && files::first(files::MEDIA, (int) $item->id))) {
            $errors['file'] = get_string('compose_needfile', $c);
        }
        if ($upload) {
            $mime = mimeinfo('type', $upload['name']);
            if (!empty($upload['error']) || !is_uploaded_file($upload['tmp_name'])) {
                $errors['file'] = get_string('compose_filefailed', $c);
            } else if (strpos($mime, 'image/') !== 0 && strpos($mime, 'video/') !== 0) {
                $errors['file'] = get_string('compose_filetype', $c);
            } else if ($upload['size'] > get_max_upload_file_size()) {
                $errors['file'] = get_string('compose_filesize', $c, display_size(get_max_upload_file_size()));
            }
        }
        if ($errors) {
            return [0, $in, $errors];
        }

        [$datefrom, $dateuntil] = self::window(
            $in['when'],
            $today,
            $in['from'],
            $in['to'],
            $eventstart ? schedule::day($eventstart) : '',
            $eventstart ? schedule::day($eventend ?: $eventstart) : ''
        );
        $record = $item ?: (object) ['type' => $type, 'timecreated' => $now, 'createdby' => $USER->id,
            'sortorder' => (int) $DB->get_field_sql('SELECT COALESCE(MAX(sortorder), 0) + 1
                                                       FROM {local_oksigeniahechauka_item}')];
        $extra = $item ? items::data($item) : [];
        $record->title = $in['title'];
        $record->body = $type === 'ticker' ? '' : $in['body'];
        $record->duration = $item->duration ?? 0;
        $record->visible = $in['publish'] ? 1 : 0;
        $record->targetall = $all ? 1 : 0;
        $record->datefrom = $type === 'agenda' ? null : $datefrom;
        $record->dateuntil = $type === 'agenda' ? null : $dateuntil;
        $single = $datefrom !== null && $datefrom === $dateuntil;
        $record->days = $type !== 'agenda' && !$single && count($days) < 7 ? implode(',', $days) : null;
        $record->times = $type !== 'agenda' && $times ? json_encode($times) : null;
        $record->everyweeks = $type !== 'agenda' && !$single && $in['every'] > 1 ? min(4, $in['every']) : 0;
        if ($type === 'notice') {
            $extra['important'] = (bool) $in['important'];
        } else if ($type === 'media') {
            $extra['caption'] = (bool) $in['caption'];
            $extra['fit'] = $extra['fit'] ?? 'cover';
        } else if ($type === 'event') {
            $extra['start'] = $eventstart;
            $extra['end'] = $eventend;
            $extra['color'] = max(0, min(4, $in['colour']));
        } else if ($type === 'agenda') {
            $extra['url'] = $in['url'];
            $extra['color'] = max(0, min(4, $in['colour']));
        }
        $record->data = json_encode($extra);
        $record->usermodified = $USER->id;
        $record->timemodified = $now;
        if ($item) {
            $DB->update_record('local_oksigeniahechauka_item', $record);
        } else {
            $record->id = $DB->insert_record('local_oksigeniahechauka_item', $record);
        }
        if ($upload) {
            $fs = get_file_storage();
            $context = \context_system::instance();
            $fs->delete_area_files($context->id, $c, files::MEDIA, $record->id);
            foreach ([files::VIDEO, files::POSTER, files::BACKDROP] as $area) {
                $fs->delete_area_files($context->id, $c, $area, $record->id);
            }
            $fs->create_file_from_pathname(
                ['contextid' => $context->id, 'component' => $c, 'filearea' => files::MEDIA,
                'itemid' => $record->id, 'filepath' => '/', 'filename' => clean_filename($upload['name'])],
                $upload['tmp_name']
            );
            if ($record->title === '') {
                // A picture without a title keeps the name of its file in the panel, never on the screen.
                $DB->set_field('local_oksigeniahechauka_item', 'title', clean_filename($upload['name']), ['id' => $record->id]);
                $extra['caption'] = false;
                $DB->set_field('local_oksigeniahechauka_item', 'data', json_encode($extra), ['id' => $record->id]);
            }
            video::queue((int) $record->id);
        }
        items::set_targets((int) $record->id, $groups, $screens);
        return [(int) $record->id, $in, []];
    }
}
