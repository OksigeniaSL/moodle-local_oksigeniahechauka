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
 * A screen's sheet («Ficha»): the screen on the left, as the preview draws it or as it really is, with its facts; on the
 * right, a card per topic: name and groups, power hours (with the week in bars and said as a sentence), the warning if
 * it stops answering, sound, light or dark, changing the device, removing it.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class sheet {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /** @var array The themes a screen can take. */
    const THEMES = ['site', 'light', 'dark', 'auto'];

    /**
     * Everything the page needs.
     *
     * @param \stdClass $screen
     * @param int $now
     * @param array $errors field => message
     * @return array
     */
    public static function context(\stdClass $screen, int $now, array $errors = []): array {
        global $DB;
        $c = self::C;
        $card = home::screen($screen, $now, [], true);
        $info = json_decode((string) $screen->lastinfo, true) ?: [];
        $width = (int) ($info['display']['width'] ?? 0);
        $height = (int) ($info['display']['height'] ?? 0);
        $mine = screens::groups_of((int) $screen->id);
        $groups = [];
        foreach ($DB->get_records_menu('local_oksigeniahechauka_group', null, 'sortorder, name', 'id, name') as $id => $name) {
            $groups[] = ['id' => $id, 'name' => format_string($name), 'checked' => in_array((int) $id, $mine)];
        }

        // Power: the first window is the one this page changes (the rare second one is kept as it is).
        $power = schedule::power($screen->power);
        $window = $power[0] ?? ['days' => [1, 2, 3, 4, 5], 'on' => '07:30', 'off' => '18:30'];
        $days = $window['days'] ?: [1, 2, 3, 4, 5, 6, 7];
        $letters = explode(',', get_string('days_letters', $c));
        $names = [];
        foreach (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as $d) {
            $names[] = \core_text::strtolower(get_string($d, 'calendar'));
        }
        $daybuttons = [];
        $bars = [];
        for ($d = 1; $d <= 7; $d++) {
            $daybuttons[] = ['n' => $d, 'letter' => $letters[$d - 1], 'name' => $names[$d - 1], 'on' => in_array($d, $days)];
            $segments = [];
            foreach ($power ?: [['days' => [], 'on' => '00:00', 'off' => '00:00']] as $w) {
                if ($w['days'] && !in_array($d, $w['days'])) {
                    continue;
                }
                $on = self::minutes($w['on']);
                $off = self::minutes($w['off']);
                if ($on === $off) {
                    $segments[] = [0, 1440];
                } else if ($on < $off) {
                    $segments[] = [$on, $off];
                } else {
                    $segments[] = [0, $off];
                    $segments[] = [$on, 1440];
                }
            }
            $bars[] = ['letter' => $letters[$d - 1], 'segments' => array_map(function ($s) {
                return ['left' => round($s[0] / 14.4, 2), 'right' => round(100 - $s[1] / 14.4, 2)];
            }, $segments)];
        }

        $shot = files::first(files::SHOT, (int) $screen->id);
        $theme = in_array($screen->theme, self::THEMES) ? $screen->theme : 'site';
        // The facts start with a capital, also when they are the state's own words («va 6 min tarde»).
        $first = function (string $text): string {
            return \core_text::strtoupper(\core_text::substr($text, 0, 1)) . \core_text::substr($text, 1);
        };
        return [
            'style' => home::stages(),
            'id' => (int) $screen->id,
            'name' => format_string($screen->name),
            'rawname' => $screen->name,
            'back' => (new \moodle_url('/local/oksigeniahechauka/screens.php'))->out(false),
            'backlabel' => get_string('tab_screens', $c),
            'backicon' => icons::svg('back'),
            'action' => (new \moodle_url('/local/oksigeniahechauka/screen.php', ['id' => $screen->id]))->out(false),
            'sesskey' => sesskey(),
            'card' => $card,
            'reload' => $card['reload'],
            // A clock that is off says what to do about it.
            'clockhint' => $card['state'] === 'warn' ? get_string('sheet_clock_hint', $c) : '',
            'reloadicon' => icons::svg('reload'),
            'clockicon' => icons::svg('clock'),
            'moment' => get_string('preview_moment', $c, phrases::weekday(schedule::day($now)) . ', ' . phrases::hour($now)),
            'frame' => (new \moodle_url('/local/oksigeniahechauka/preview.php', ['frame' => 1, 'screen' => $screen->id]))
                ->out(false),
            'vertical' => $card['vertical'],
            'shot' => $shot ? \moodle_url::make_pluginfile_url(
                $shot->get_contextid(),
                $c,
                files::SHOT,
                $screen->id,
                '/',
                $shot->get_filename()
            )->out(false) : '',
            'shotwhen' => $shot ? get_string('sheet_shot_when', $c, phrases::ago($now - $shot->get_timemodified())) : '',
            'facts' => [
                ['term' => get_string('sheet_signal', $c), 'value' => $first($screen->lastseen ? ($card['state'] === 'down' ?
                    $card['meta'] : get_string('sheet_ago', $c, phrases::ago($now - (int) $screen->lastseen))) :
                    get_string('meta_new', $c))],
                ['term' => get_string('sheet_clock', $c), 'value' => $first($card['drift'] ? $card['meta'] :
                    get_string('sheet_clock_ok', $c))],
                ['term' => get_string('sheet_display', $c), 'value' => $width && $height ? get_string(
                    $height > $width ? 'sheet_display_v' : 'sheet_display_h',
                    $c,
                    (object) ['w' => $width, 'h' => $height]
                ) : get_string('sheet_display_unknown', $c)],
                ['term' => get_string('sheet_since', $c), 'value' => get_string(
                    'sheet_since_day',
                    $c,
                    userdate((int) $screen->timecreated, get_string('strftimedaydate', 'langconfig'))
                )],
            ],
            'groups' => $groups,
            'hasgroups' => (bool) $groups,
            'always' => !$power,
            'days' => $daybuttons,
            'on' => $window['on'],
            'off' => $window['off'],
            'bars' => $bars,
            'sentence' => self::sentence($power, $names),
            'alerts' => !empty($screen->alerts),
            'sound' => !empty($screen->sound),
            'uses' => array_map(function ($u) use ($screen, $c) {
                return ['value' => $u, 'label' => get_string('use_' . $u, $c), 'help' => get_string('use_' . $u . '_help', $c),
                    'checked' => $u === uses::valid($screen->screenuse ?? null)];
            }, uses::USES),
            'plan' => self::plan_context($screen, $letters, $names),
            'themes' => array_map(function ($t) use ($theme, $c) {
                return ['value' => $t, 'label' => get_string('sheet_theme_' . $t, $c), 'checked' => $t === $theme];
            }, self::THEMES),
            'remove' => (new \moodle_url('/local/oksigeniahechauka/screens.php', ['action' => 'removescreen',
                'id' => $screen->id, 'sesskey' => sesskey()]))->out(false),
            'errors' => $errors,
            'haserrors' => (bool) $errors,
            'strings' => json_encode([
                'always' => get_string('sheet_power_always', $c),
                'on' => get_string('sheet_power_on', $c),
                'rest' => get_string('sheet_power_rest', $c),
                'every' => get_string('sheet_days_every', $c),
                'weekdays' => get_string('sheet_days_weekdays', $c),
                'some' => get_string('sheet_days_some', $c),
                'and' => get_string('compose_and', $c),
                'names' => $names,
                'plural' => [get_string('compose_plural_saturday', $c), get_string('compose_plural_sunday', $c)],
            ], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP),
        ];
    }

    /**
     * The other use at some hours, as this page shows it (the first window; the rare others are kept as they are).
     *
     * @param \stdClass $screen
     * @param string[] $letters
     * @param string[] $names
     * @return array
     */
    protected static function plan_context(\stdClass $screen, array $letters, array $names): array {
        $c = self::C;
        $plan = uses::plan($screen->useplan ?? null);
        $window = $plan[0] ?? ['days' => [6, 7], 'from' => '00:00', 'until' => '24:00', 'use' => 'showcase'];
        $days = $window['days'] ?: [1, 2, 3, 4, 5, 6, 7];
        $buttons = [];
        for ($d = 1; $d <= 7; $d++) {
            $buttons[] = ['n' => $d, 'letter' => $letters[$d - 1] ?? '', 'name' => $names[$d - 1] ?? '',
                'on' => in_array($d, $days)];
        }
        return [
            'on' => (bool) $plan,
            'days' => $buttons,
            'from' => $window['from'],
            'until' => $window['until'] === '24:00' ? '23:59' : $window['until'],
            'uses' => array_map(function ($u) use ($window, $c) {
                return ['value' => $u, 'label' => get_string('use_' . $u, $c), 'selected' => $u === $window['use']];
            }, uses::USES),
        ];
    }

    /**
     * «07:30» in minutes.
     *
     * @param string $hour
     * @return int
     */
    protected static function minutes(string $hour): int {
        [$h, $m] = array_map('intval', explode(':', $hour));
        return $h * 60 + $m;
    }

    /**
     * The power hours said as a sentence: «Encendida de lunes a viernes, de 07:30 a 18:30. Fuera de ese horario se
     * queda en negro y no avisa si deja de responder.»
     *
     * @param array $power
     * @param string[] $names
     * @return string
     */
    public static function sentence(array $power, array $names): string {
        $c = self::C;
        if (!$power) {
            return get_string('sheet_power_always', $c);
        }
        $w = $power[0];
        $days = $w['days'] ?: [1, 2, 3, 4, 5, 6, 7];
        if (count($days) === 7) {
            $said = get_string('sheet_days_every', $c);
        } else if ($days === [1, 2, 3, 4, 5]) {
            $said = get_string('sheet_days_weekdays', $c);
        } else {
            $plural = [6 => get_string('compose_plural_saturday', $c), 7 => get_string('compose_plural_sunday', $c)];
            $said = get_string('sheet_days_some', $c, phrases::join(array_map(function ($d) use ($names, $plural) {
                return $plural[$d] ?? $names[$d - 1];
            }, $days)));
        }
        return get_string('sheet_power_on', $c, (object) ['days' => $said, 'from' => $w['on'], 'to' => $w['off']]) . ' ' .
            get_string('sheet_power_rest', $c);
    }

    /**
     * Saves what the sheet sends.
     *
     * @param \stdClass $screen
     * @return array field => error, empty when saved
     */
    public static function save(\stdClass $screen): array {
        global $DB;
        $c = self::C;
        $errors = [];
        $name = trim(optional_param('name', '', PARAM_TEXT));
        if ($name === '') {
            $errors['name'] = get_string('sheet_needname', $c);
        } else if ($DB->record_exists_select('local_oksigeniahechauka_screen', 'name = ? AND id <> ?', [$name, $screen->id])) {
            $errors['name'] = get_string('sheet_samename', $c);
        }
        $always = optional_param('always', 0, PARAM_BOOL);
        $days = array_values(array_unique(array_filter(
            array_map('intval', optional_param_array('days', [], PARAM_INT)),
            function ($d) {
                return $d >= 1 && $d <= 7;
            }
        )));
        sort($days);
        $on = optional_param('on', '', PARAM_RAW_TRIMMED);
        $off = optional_param('off', '', PARAM_RAW_TRIMMED);
        if (!$always) {
            if (!$days) {
                $errors['power'] = get_string('power_nodays', $c);
            } else if (!schedule::is_hour($on) || !schedule::is_hour($off)) {
                $errors['power'] = get_string('wronghour', $c);
            }
        }
        if ($errors) {
            return $errors;
        }
        $power = null;
        if (!$always) {
            $windows = schedule::power($screen->power);
            $windows[0] = ['days' => count($days) === 7 ? [] : $days, 'on' => $on, 'off' => $off];
            $power = json_encode(array_values($windows));
        }
        $theme = optional_param('theme', 'site', PARAM_ALPHA);
        // What it is for, and another use at some hours (the first window; the others are kept).
        $use = uses::valid(optional_param('screenuse', 'info', PARAM_ALPHA));
        $plan = uses::plan($screen->useplan ?? null);
        if (optional_param('planon', 0, PARAM_BOOL)) {
            $from = optional_param('planfrom', '', PARAM_RAW_TRIMMED);
            $until = optional_param('planuntil', '', PARAM_RAW_TRIMMED);
            $until = $until === '23:59' ? '24:00' : $until;
            $plandays = array_map('intval', optional_param_array('plandays', [], PARAM_INT));
            $window = uses::plan(json_encode([['days' => $plandays, 'from' => $from, 'until' => $until,
                'use' => optional_param('planuse', '', PARAM_ALPHA)]]));
            if (!$window || !$plandays) {
                return ['useplan' => get_string('sheet_useplan_bad', $c)];
            }
            $plan[0] = $window[0];
        } else {
            $plan = [];
        }
        $DB->update_record('local_oksigeniahechauka_screen', (object) [
            'id' => $screen->id,
            'name' => $name,
            'power' => $power,
            'alerts' => optional_param('alerts', 0, PARAM_BOOL) ? 1 : 0,
            'sound' => optional_param('sound', 0, PARAM_BOOL) ? 1 : 0,
            'theme' => in_array($theme, self::THEMES) ? $theme : 'site',
            'screenuse' => $use,
            'useplan' => $plan ? json_encode(array_values($plan)) : null,
            'timemodified' => time(),
        ]);
        screens::set_groups((int) $screen->id, array_map('intval', optional_param_array('groups', [], PARAM_INT)));
        return [];
    }
}
