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
 * The home of the panel («Lo que sale»): first the screens, each drawn as a television with its light and what it
 * shows now, and a line that says whether one needs someone; then what is on them, in three groups (on the screens
 * now, later, no longer). Each person sees what is theirs: who publishes only in some groups sees «Lo tuyo» and the
 * screens of their groups. From the art direction's design (DESIGN.md).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class home {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /** @var int A clock this far from the server's is said to be off (seconds). */
    const DRIFT = 120;

    /** @var int A screenshot this recent stands for what the screen shows (seconds). */
    const FRESH = 30 * MINSECS;

    /**
     * Everything the home template needs.
     *
     * @param int $now
     * @return array
     */
    public static function context(int $now): array {
        global $DB, $USER;
        $c = self::C;
        $userid = (int) $USER->id;
        $limited = access::limited();
        $managescreens = access::can('managescreens');
        $publishall = access::can('publishall');
        $today = schedule::day($now);

        $screens = $DB->get_records('local_oksigeniahechauka_screen', null, 'sortorder, name');
        $groups = $DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name');
        $mygroups = $limited ? access::groups_of($userid) : [];
        if ($limited) {
            // Who publishes only in some groups sees the screens of those groups.
            $screens = array_filter($screens, function ($s) use ($mygroups) {
                return (bool) array_intersect(screens::groups_of((int) $s->id), $mygroups);
            });
        }
        $items = $DB->get_records('local_oksigeniahechauka_item', $limited ? ['createdby' => $userid] : null, 'sortorder, id');
        $titles = [];
        foreach ($items as $item) {
            $titles['i' . $item->id] = format_string($item->title);
        }

        $cards = [];
        $states = [];
        foreach ($screens as $s) {
            $card = self::screen($s, $now, $titles, $managescreens);
            $states[] = $card;
            $cards[] = $card;
        }

        $actions = [];
        $destinations = access::destinations();
        $canadd = access::publishes() && ($destinations['all'] || $destinations['groups']);
        if ($canadd) {
            $actions[] = ['url' => (new \moodle_url('/local/oksigeniahechauka/edit.php', ['type' => 'notice']))->out(false),
                'label' => get_string('add', $c), 'icon' => icons::svg('plus'), 'primary' => true];
        }

        $groupnames = array_map('format_string', array_intersect_key($groups, array_flip($mygroups)));
        $context = [
            'title' => get_string('panel_title', $c),
            'sub' => $limited ? ($groupnames ? get_string('panel_sub_groups', $c, phrases::join($groupnames)) :
                get_string('publish_nogroups', $c)) : '',
            'actions' => $actions,
            'hasactions' => (bool) $actions,
            'tabs' => self::tabs('home', $managescreens),
            'hastabs' => $managescreens,
            'style' => self::stages(),
            'health' => self::health($states, $now, $managescreens),
            'wall' => [
                'title' => get_string($limited ? 'wall_mine' : 'wall_title', $c),
                'count' => count($cards),
                'screens' => $cards,
                'reloadall' => $managescreens && count($cards) > 1 ? (new \moodle_url(
                    '/local/oksigeniahechauka/index.php',
                    ['action' => 'reloadall', 'sesskey' => sesskey()]
                ))->out(false) : '',
                'reloadicon' => icons::svg('reload'),
                'add' => $managescreens ? (new \moodle_url('/local/oksigeniahechauka/screens.php'))->out(false) . '#add' : '',
                'addicon' => icons::svg('qr'),
            ],
            'content' => self::content($items, $screens, $groups, $today, $limited, $publishall, $userid, $canadd),
        ];
        // A screen of one's groups first, for who only publishes: their content comes before the wall.
        $context['minefirst'] = $limited;
        return $context;
    }

    /**
     * The colours of the four stages of the centre, as the panel's variables (they mark, never carry text).
     *
     * @return string an inline style, maybe empty
     */
    public static function stages(): string {
        $out = [];
        for ($i = 1; $i <= 4; $i++) {
            $colour = (string) get_config(self::C, 'colour' . $i);
            if (preg_match('/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/', $colour)) {
                $out[] = '--hkp-stage-' . $i . ': ' . $colour;
            }
        }
        return implode('; ', $out);
    }

    /**
     * The tabs of the panel, for who runs the screens.
     *
     * @param string $active
     * @param bool $managescreens
     * @return array
     */
    public static function tabs(string $active, bool $managescreens): array {
        if (!$managescreens) {
            return [];
        }
        $tabs = [];
        foreach ([['home', 'index.php', 'tab_home', 'tv'], ['screens', 'screens.php', 'tab_screens', 'screens']] as $t) {
            $tabs[] = ['url' => (new \moodle_url('/local/oksigeniahechauka/' . $t[1]))->out(false),
                'label' => get_string($t[2], self::C), 'icon' => icons::svg($t[3]), 'current' => $t[0] === $active];
        }
        return $tabs;
    }

    /**
     * A screen on the wall: its picture in its bezel, its state and what it shows now.
     *
     * @param \stdClass $s
     * @param int $now
     * @param array $titles item id in the contract => title
     * @param bool $managescreens
     * @return array
     */
    public static function screen(\stdClass $s, int $now, array $titles, bool $managescreens): array {
        $c = self::C;
        $info = json_decode((string) $s->lastinfo, true) ?: [];
        $width = (int) ($info['display']['width'] ?? 0);
        $height = (int) ($info['display']['height'] ?? 0);
        $vertical = $width && $height > $width;
        $state = self::state($s, $info, $now);
        $name = format_string($s->name);

        // The picture: what the screen sent when it is recent (or the last one, when it is off or silent); otherwise
        // the player itself, as the preview draws it.
        $picture = '';
        $shot = files::first(files::SHOT, (int) $s->id);
        if ($shot && ($state['key'] !== 'on' && $state['key'] !== 'warn' || $now - $shot->get_timemodified() < self::FRESH)) {
            $picture = \moodle_url::make_pluginfile_url(
                $shot->get_contextid(),
                $c,
                files::SHOT,
                $s->id,
                '/',
                $shot->get_filename()
            )->out(false);
        }
        $over = '';
        if ($state['key'] === 'off') {
            $over = icons::svg('moon') . s(get_string('over_off', $c));
        } else if ($state['key'] === 'down') {
            // The words «Última imagen, 10:11» go only on a real picture; the preview is not one.
            $over = icons::svg('plugoff') . s($picture !== '' ? get_string('over_down', $c, phrases::hour((int) $s->lastseen)) :
                get_string('state_down', $c));
        }

        // What it shows now, from what the screen said in its last beat.
        $showing = '';
        foreach ($info['showing'] ?? [] as $shown) {
            $item = $shown['item'] ?? '';
            if (($shown['zone'] ?? '') === 'composition' && in_array($item, ['solo-hoy', 'semana'])) {
                $showing = get_string($item === 'semana' ? 'now_week' : 'now_today', $c);
                break;
            }
            if (($shown['zone'] ?? '') === 'main' && isset($titles[$item])) {
                $showing = $titles[$item];
            }
        }

        return [
            'id' => (int) $s->id,
            'name' => $name,
            'url' => $managescreens ? (new \moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $s->id]))->out(false) : '',
            'vertical' => $vertical,
            'shape' => $vertical ? 'v' : 'h',
            'state' => $state['key'],
            'label' => $state['label'],
            'meta' => $state['meta'],
            'image' => $picture,
            'frame' => $picture === '' ? (new \moodle_url(
                '/local/oksigeniahechauka/preview.php',
                ['frame' => 1, 'screen' => $s->id]
            ))->out(false) : '',
            'alt' => get_string('picture_alt', $c, $name),
            'over' => $over,
            'now' => $state['key'] !== 'off' && $showing !== '' ? $showing : '',
            'preview' => (new \moodle_url('/local/oksigeniahechauka/preview.php', ['screen' => $s->id]))->out(false),
            'previewicon' => icons::svg('eye'),
            'reload' => $managescreens && $state['key'] !== 'off' ? (new \moodle_url(
                '/local/oksigeniahechauka/index.php',
                ['action' => 'reload', 'id' => $s->id, 'sesskey' => sesskey()]
            ))->out(false) : '',
            'reloadicon' => icons::svg('reload'),
            'previewlabel' => get_string('preview_of', $c, $name),
            'reloadlabel' => get_string('reload_of', $c, $name),
            'lastseen' => (int) $s->lastseen,
            'drift' => $state['drift'],
        ];
    }

    /**
     * The state of a screen: on, off by its hours, without signal, with its clock off, or never seen.
     *
     * @param \stdClass $s
     * @param array $info its last beat
     * @param int $now
     * @return array key, label, meta, drift (minutes, signed: more than zero is late)
     */
    public static function state(\stdClass $s, array $info, int $now): array {
        $c = self::C;
        $out = ['key' => 'on', 'label' => '', 'meta' => '', 'drift' => 0];
        if (empty($s->lastseen)) {
            return ['key' => 'new', 'label' => get_string('state_new', $c), 'meta' => get_string('meta_new', $c),
                'drift' => 0];
        }
        if (screens::online($s, $now)) {
            $drift = !empty($info['time']) ? (int) $s->lastseen - (int) $info['time'] : 0;
            if (abs($drift) > self::DRIFT) {
                $minutes = (int) round(abs($drift) / MINSECS);
                return ['key' => 'warn', 'label' => get_string('state_clock', $c), 'meta' => get_string(
                    $drift > 0 ? 'meta_late' : 'meta_ahead',
                    $c,
                    $minutes
                ), 'drift' => $drift > 0 ? $minutes : -$minutes];
            }
            $out['label'] = get_string('state_on', $c);
            $out['meta'] = get_string('meta_seen', $c, phrases::ago($now - (int) $s->lastseen));
            return $out;
        }
        $power = schedule::power($s->power);
        if (!schedule::power_on($power, $now)) {
            return ['key' => 'off', 'label' => get_string('state_off', $c), 'meta' => phrases::next_on($power, $now),
                'drift' => 0];
        }
        return ['key' => 'down', 'label' => get_string('state_down', $c),
            'meta' => phrases::since((int) $s->lastseen, $now), 'drift' => 0];
    }

    /**
     * The line over the wall: all well in one quiet line, or who needs someone first.
     *
     * @param array $cards from screen()
     * @param int $now
     * @param bool $managescreens
     * @return array
     */
    public static function health(array $cards, int $now, bool $managescreens): array {
        $c = self::C;
        if (!$cards) {
            return [];
        }
        $down = array_values(array_filter($cards, function ($x) {
            return $x['state'] === 'down';
        }));
        $warn = array_values(array_filter($cards, function ($x) {
            return $x['state'] === 'warn';
        }));
        $off = count(array_filter($cards, function ($x) {
            return $x['state'] === 'off';
        }));
        if (!$down && !$warn) {
            $last = max(array_column($cards, 'lastseen'));
            $parts = [];
            if ($off) {
                $parts[] = $off === 1 ? get_string('health_off_one', $c) : get_string('health_off', $c, $off);
            }
            if ($last) {
                $parts[] = get_string('health_last', $c, phrases::ago($now - $last));
            }
            return ['ok' => true, 'title' => count($cards) === 1 ? get_string('health_one', $c) :
                get_string('health_all', $c, count($cards)), 'detail' => implode(' · ', $parts)];
        }
        $sentences = [];
        if ($down) {
            $first = $down[0];
            $sentences[] = count($down) === 1 ? get_string('health_down', $c, (object) ['name' => $first['name'],
                'since' => $first['meta']]) : get_string('health_downs', $c, phrases::join(array_column($down, 'name')));
        }
        $extra = [];
        foreach ($warn as $w) {
            $extra[] = get_string('health_clock', $c, (object) ['name' => $w['name'], 'min' => abs($w['drift'])]);
        }
        if (count($cards) > count($down) + count($warn)) {
            $extra[] = get_string('health_rest', $c);
        }
        if (!$managescreens) {
            $who = self::who_runs();
            if ($who !== '') {
                $extra[] = get_string('health_who', $c, $who);
            }
        }
        $target = $down[0] ?? $warn[0];
        return ['ok' => false, 'bold' => $sentences ? implode(' ', $sentences) : array_shift($extra),
            'detail' => implode(' ', $extra), 'icon' => icons::svg($down ? 'plugoff' : 'clock'),
            'see' => $managescreens ? (new \moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $target['id']]))
                ->out(false) : ''];
    }

    /**
     * Who runs the screens, by name, for who cannot act: «Ya lo sabe Javier Santana».
     *
     * @return string
     */
    protected static function who_runs(): string {
        global $DB;
        $roleid = (int) $DB->get_field('role', 'id', ['shortname' => access::MANAGER]);
        if (!$roleid) {
            return '';
        }
        $users = get_role_users(
            $roleid,
            \context_system::instance(),
            false,
            'u.id, ' .
            \core_user\fields::for_name()->get_sql('u', false, '', '', false)->selects,
            'u.lastname, u.firstname',
            false,
            '',
            0,
            2
        );
        return phrases::join(array_map('fullname', $users));
    }

    /**
     * What is on the screens, in three groups, with its filters.
     *
     * @param array $items
     * @param array $screens
     * @param array $groups id => name
     * @param string $today
     * @param bool $limited
     * @param bool $publishall
     * @param int $userid
     * @param bool $canadd
     * @return array
     */
    protected static function content(
        array $items,
        array $screens,
        array $groups,
        string $today,
        bool $limited,
        bool $publishall,
        int $userid,
        bool $canadd
    ): array {
        global $DB;
        $c = self::C;
        $members = [];
        foreach ($DB->get_records('local_oksigeniahechauka_member') as $m) {
            $members[(int) $m->groupid][] = (int) $m->screenid;
        }
        $allscreens = $DB->get_records_menu('local_oksigeniahechauka_screen', null, 'sortorder, name', 'id, name');
        $authors = [];
        $ids = array_unique(array_filter(array_map(function ($i) {
            return (int) ($i->createdby ?? 0);
        }, $items)));
        if ($ids && !$limited) {
            $authors = $DB->get_records_list('user', 'id', $ids, '', 'id, ' .
                \core_user\fields::for_name()->get_sql('', false, '', '', false)->selects);
        }
        $out = ['now' => [], 'later' => [], 'done' => []];
        $counts = ['all' => 0, 'notice' => 0, 'media' => 0, 'event' => 0, 'ticker' => 0, 'agenda' => 0];
        $mine = 0;
        foreach ($items as $item) {
            $moment = phrases::moment($item, $today);
            $row = self::row(
                $item,
                $moment,
                $today,
                $members,
                $allscreens,
                $groups,
                $authors,
                $limited,
                $publishall,
                $userid
            );
            $out[$moment][] = $row;
            if ($moment !== 'done') {
                $counts['all']++;
                $counts[$item->type] = ($counts[$item->type] ?? 0) + 1;
                $mine += $row['mine'] ? 1 : 0;
            }
        }
        if (!$items) {
            return ['empty' => self::empty_state($limited, $groups, $canadd)];
        }
        $filters = [];
        foreach (['all', 'notice', 'media', 'event', 'ticker', 'agenda'] as $type) {
            if ($type === 'all' || $counts[$type]) {
                $filters[] = ['type' => $type, 'label' => get_string('filter_' . $type, $c), 'count' => $counts[$type],
                    'pressed' => $type === 'all'];
            }
        }
        return [
            'title' => get_string($limited ? 'content_mine' : 'content_title', $c),
            'filters' => $filters,
            'hasfilters' => count($filters) > 2,
            'scope' => $publishall && $mine && $mine < $counts['all'],
            'now' => $out['now'],
            'nowcount' => count($out['now']),
            'later' => $out['later'],
            'latercount' => count($out['later']),
            'done' => $out['done'],
            'donecount' => count($out['done']),
            'clockicon' => icons::svg('clock'),
            'chevicon' => icons::svg('chev'),
        ];
    }

    /**
     * A row of the list: the piece drawn as on the screens, its title and meta, when, where and what one may do.
     *
     * @param \stdClass $item
     * @param string $moment now, later, done
     * @param string $today
     * @param array $members group => screen ids
     * @param array $allscreens id => name
     * @param array $groups id => name
     * @param array $authors id => user
     * @param bool $limited
     * @param bool $publishall
     * @param int $userid
     * @return array
     */
    protected static function row(
        \stdClass $item,
        string $moment,
        string $today,
        array $members,
        array $allscreens,
        array $groups,
        array $authors,
        bool $limited,
        bool $publishall,
        int $userid
    ): array {
        global $OUTPUT;
        $c = self::C;
        $data = items::data($item);
        $title = format_string($item->title);
        $thumb = self::thumb($item, $data);
        $kind = $item->type === 'media' ? ($thumb['video'] ? 'video' : 'photo') : $item->type;
        $meta = [];
        if ($item->type === 'notice' && !empty($data['important'])) {
            $meta[] = ['flag' => true, 'text' => get_string('flag_important', $c), 'icon' => icons::svg('urgent')];
        }
        if ($item->type === 'event' && !empty($data['start'])) {
            $start = (int) $data['start'];
            $meta[] = ['text' => trim(items::plain((string) $item->body) . ' · ' .
                phrases::weekday(schedule::day($start)) . ', ' . phrases::hour($start), ' ·')];
        }
        if ($item->type === 'agenda') {
            $meta[] = ['text' => ($data['result'] ?? '') === 'ok' ? get_string('agenda_meta', $c, (object) [
                'count' => (int) ($data['count'] ?? 0), 'ago' => phrases::ago(time() - (int) ($data['fetched'] ?? 0))]) :
                get_string('agenda_meta_failed', $c)];
        }
        $author = $authors[(int) ($item->createdby ?? 0)] ?? null;
        if ($author && (int) $author->id !== $userid) {
            $meta[] = ['text' => get_string('by', $c, fullname($author))];
        }

        $when = $item->type === 'agenda' ? ['when' => get_string('when_always', $c),
            'small' => get_string('when_agenda', $c), 'soon' => false] : phrases::when($item, $today);
        if (!$item->visible) {
            $when = ['when' => get_string('when_hidden', $c), 'small' => '', 'soon' => false];
        }
        $where = self::where($item, $members, $allscreens, $groups);

        $actions = [];
        $menu = '';
        if (access::may_edit($item)) {
            $panel = new \moodle_url('/local/oksigeniahechauka/index.php');
            $act = function (string $action) use ($panel, $item) {
                return new \moodle_url($panel, ['action' => $action, 'id' => $item->id, 'sesskey' => sesskey()]);
            };
            $edit = new \moodle_url('/local/oksigeniahechauka/edit.php', ['id' => $item->id]);
            if ($moment === 'done' && !$item->visible) {
                $actions[] = ['url' => $act('show')->out(false), 'label' => get_string('act_show', $c),
                    'icon' => icons::svg('reload')];
            } else if ($moment === 'done') {
                $actions[] = ['url' => $edit->out(false), 'label' => get_string('act_show', $c),
                    'icon' => icons::svg('reload')];
            } else {
                $actions[] = ['url' => $edit->out(false), 'label' => get_string('edit'), 'icon' => ''];
            }
            $am = new \action_menu();
            $am->set_menu_trigger(icons::svg('dots') . \html_writer::span(
                get_string('more_actions', $c, $title),
                'visually-hidden sr-only'
            ), 'btn btn-sm btn-outline-secondary btn-icon no-caret');
            // Also in the menu: on a phone the menu is the only button of the row.
            $am->add_secondary_action(new \action_link($edit, get_string('edit')));
            if ($moment !== 'done') {
                $am->add_secondary_action(new \action_link($act('hide'), get_string('act_hide', $c)));
            }
            if ($publishall && $item->type === 'media') {
                $am->add_secondary_action(new \action_link($act('up'), get_string('act_up', $c)));
                $am->add_secondary_action(new \action_link($act('down'), get_string('act_down', $c)));
            }
            $am->add_secondary_action(new \action_link($act('delete'), get_string('delete')));
            $menu = $OUTPUT->render($am);
        }

        return [
            'id' => (int) $item->id,
            'type' => $item->type,
            'mine' => (int) ($item->createdby ?? 0) === $userid,
            'title' => $title,
            'thumb' => $thumb,
            'kind' => get_string('kind_' . $kind, $c) . ($thumb['video'] ? ' · ' . $thumb['video'] : ''),
            'kindicon' => icons::svg(['photo' => 'photo', 'video' => 'video', 'notice' => 'notice', 'event' => 'event',
                'ticker' => 'ticker', 'agenda' => 'agenda'][$kind]),
            'meta' => $meta,
            'when' => $when['when'],
            'whensmall' => $when['small'],
            'soon' => $when['soon'],
            'where' => $where['where'],
            'wheresmall' => $where['small'],
            'clockicon' => icons::svg('clock'),
            'screensicon' => icons::svg('screens'),
            'actions' => $actions,
            'menu' => $menu,
        ];
    }

    /**
     * The thumb of a row, drawn with the screens' own pieces.
     *
     * @param \stdClass $item
     * @param array $data
     * @return array
     */
    protected static function thumb(\stdClass $item, array $data): array {
        $out = ['type' => $item->type, 'image' => '', 'vertical' => false, 'video' => '', 'important' => false,
            'stage' => 0, 'day' => '', 'num' => '', 'agenda' => []];
        if ($item->type === 'media') {
            $media = files::first(files::MEDIA, (int) $item->id);
            $poster = files::first(files::POSTER, (int) $item->id);
            $image = $poster ?: ($media && $media->is_valid_image() ? $media : null);
            if ($image) {
                $out['image'] = \moodle_url::make_pluginfile_url(
                    $image->get_contextid(),
                    self::C,
                    $image->get_filearea(),
                    $item->id,
                    '/',
                    $image->get_filename(),
                    false,
                    true
                )->out(false);
                $size = $image->get_imageinfo();
                $out['vertical'] = $size && $size['height'] > $size['width'];
            }
            if ($media && !$media->is_valid_image()) {
                $seconds = (int) round((float) ($data['videoduration'] ?? 0));
                $out['video'] = $seconds ? floor($seconds / 60) . ':' . sprintf('%02d', $seconds % 60) : '▶';
                if (!empty($data['videowidth']) && !empty($data['videoheight'])) {
                    $out['vertical'] = $data['videoheight'] > $data['videowidth'];
                }
            }
        } else if ($item->type === 'notice') {
            $out['important'] = !empty($data['important']);
        } else if ($item->type === 'event' && !empty($data['start'])) {
            $day = schedule::day((int) $data['start']);
            $words = explode(' ', phrases::weekday($day));
            $out['day'] = \core_text::substr($words[0], 0, 3);
            $out['num'] = $words[1] ?? '';
            $color = (int) ($data['color'] ?? 0);
            $out['stage'] = $color >= 1 && $color <= 4 ? $color : 0;
        } else if ($item->type === 'agenda') {
            foreach ([0, 0, 2, 0, 3, 0, 0, 0, 1, 0, 0, 4, 0, 0, 0, 2, 2, 0, 0, 0, 0] as $stage) {
                $out['agenda'][] = ['stage' => $stage ? 's' . $stage : ''];
            }
        }
        $out['is' . $item->type] = true;
        return $out;
    }

    /**
     * Where an item shows, said short: «Todas las pantallas», «Infantil» with «2 pantallas» under it, or the screens.
     *
     * @param \stdClass $item
     * @param array $members
     * @param array $allscreens
     * @param array $groups
     * @return array where, small
     */
    protected static function where(\stdClass $item, array $members, array $allscreens, array $groups): array {
        $c = self::C;
        $targets = items::targets($item);
        if ($targets['all']) {
            return ['where' => get_string('where_all', $c), 'small' => ''];
        }
        $names = [];
        $ids = [];
        foreach ($targets['groups'] as $g) {
            if (isset($groups[$g])) {
                $names[] = format_string($groups[$g]);
                $ids = array_merge($ids, $members[$g] ?? []);
            }
        }
        foreach ($targets['screens'] as $s) {
            if (isset($allscreens[$s])) {
                $names[] = format_string($allscreens[$s]);
                $ids[] = $s;
            }
        }
        if (!$names) {
            return ['where' => get_string('where_nowhere', $c), 'small' => ''];
        }
        $n = count(array_unique($ids));
        return ['where' => phrases::join($names), 'small' => $targets['groups'] ? ($n === 1 ?
            get_string('where_one', $c) : get_string('where_n', $c, $n)) : ''];
    }

    /**
     * Nothing yet: what already works, and the next step.
     *
     * @param bool $limited
     * @param array $groups
     * @param bool $canadd
     * @return array
     */
    protected static function empty_state(bool $limited, array $groups, bool $canadd): array {
        global $USER;
        $c = self::C;
        $config = get_config($c);
        $add = [];
        if ($canadd) {
            $add[] = ['url' => (new \moodle_url('/local/oksigeniahechauka/edit.php', ['type' => 'notice']))->out(false),
                'label' => get_string('add_notice_btn', $c), 'icon' => icons::svg('notice'), 'primary' => true];
            $add[] = ['url' => (new \moodle_url('/local/oksigeniahechauka/edit.php', ['type' => 'media']))->out(false),
                'label' => get_string('add_photo_btn', $c), 'icon' => icons::svg('photo'), 'primary' => false];
        }
        if ($limited) {
            $names = array_map('format_string', array_intersect_key($groups, array_flip(access::groups_of((int) $USER->id))));
            return ['title' => get_string('empty_mine_title', $c), 'text' => get_string(
                'empty_mine_text',
                $c,
                phrases::join($names)
            ), 'add' => $add, 'hasadd' => (bool) $add, 'section' => get_string('content_mine', $c)];
        }
        $alone = [];
        if (!empty($config->sourcemenu)) {
            $alone[] = get_string('alone_menu', $c);
        }
        if (!empty($config->sourcecalendar)) {
            $alone[] = get_string('alone_agenda', $c);
        }
        if (!empty($config->sourceweather) && !empty($config->lat)) {
            $alone[] = get_string('alone_weather', $c);
        }
        return ['title' => $alone ? get_string('empty_title', $c, phrases::join($alone)) :
            get_string('empty_title_none', $c), 'text' => get_string('empty_text', $c), 'add' => $add,
            'hasadd' => (bool) $add, 'section' => get_string('content_title', $c)];
    }
}
