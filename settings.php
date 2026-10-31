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

/**
 * The panel and the settings of the screens, in the site administration.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig || has_capability('local/oksigeniahechauka:manage', context_system::instance())) {
    $ADMIN->add('localplugins', new admin_category(
        'local_oksigeniahechauka',
        get_string('pluginname', 'local_oksigeniahechauka')
    ));
    $ADMIN->add('local_oksigeniahechauka', new admin_externalpage(
        'local_oksigeniahechauka_panel',
        get_string('manage', 'local_oksigeniahechauka'),
        new moodle_url('/local/oksigeniahechauka/index.php'),
        'local/oksigeniahechauka:manage'
    ));
}

if ($hassiteconfig) {
    $settings = new admin_settingpage(
        'local_oksigeniahechauka_settings',
        get_string('settings', 'local_oksigeniahechauka')
    );
    if ($ADMIN->fulltree) {
        $p = 'local_oksigeniahechauka';

        // The look of the screens: the identity of the site, never ours.
        $settings->add(new admin_setting_configselect("$p/thememode", get_string('thememode', $p), '', 'light', [
            'light' => get_string('thememode_light', $p),
            'dark' => get_string('thememode_dark', $p),
            'auto' => get_string('thememode_auto', $p),
        ]));
        $settings->add(new admin_setting_configtext(
            "$p/darkfrom",
            get_string('darkfrom', $p),
            '',
            '19:00',
            '/^([01]\d|2[0-3]):[0-5]\d$/',
            6
        ));
        $settings->add(new admin_setting_configtext(
            "$p/darkuntil",
            get_string('darkuntil', $p),
            '',
            '07:30',
            '/^([01]\d|2[0-3]):[0-5]\d$/',
            6
        ));
        $settings->add(new admin_setting_configstoredfile(
            "$p/logo",
            get_string('logo', $p),
            '',
            'logo',
            0,
            ['maxfiles' => 1, 'accepted_types' => ['.svg', '.png', '.jpg', '.webp']]
        ));
        $settings->add(new admin_setting_configstoredfile(
            "$p/logodark",
            get_string('logodark', $p),
            '',
            'logodark',
            0,
            ['maxfiles' => 1, 'accepted_types' => ['.svg', '.png', '.jpg', '.webp']]
        ));
        $settings->add(new admin_setting_configcolourpicker(
            "$p/colourprimary",
            get_string('colourprimary', $p),
            get_string('colourprimary_desc', $p),
            ''
        ));
        $settings->add(new admin_setting_configcolourpicker(
            "$p/colouraccent",
            get_string('colouraccent', $p),
            get_string('colouraccent_desc', $p),
            ''
        ));
        for ($i = 1; $i <= 4; $i++) {
            $settings->add(new admin_setting_configcolourpicker(
                "$p/colour$i",
                get_string('colour_n', $p, $i),
                $i === 1 ? get_string('colours_desc', $p) : '',
                ''
            ));
        }

        // What reaches the screens by itself.
        $settings->add(new admin_setting_heading("$p/sources", get_string('sources', $p), ''));
        $hasmeals = \local_oksigeniahechauka\local\sources::has_meals();
        $settings->add(new admin_setting_configcheckbox(
            "$p/sourcemenu",
            get_string('sourcemenu', $p),
            $hasmeals ? '' : get_string('sourcemenu_missing', $p),
            $hasmeals ? 1 : 0
        ));
        $settings->add(new admin_setting_configtext(
            "$p/menucentre",
            get_string('menucentre', $p),
            get_string('menucentre_desc', $p),
            0,
            PARAM_INT,
            6
        ));
        $settings->add(new admin_setting_configcheckbox("$p/sourcecalendar", get_string('sourcecalendar', $p), '', 1));
        $settings->add(new admin_setting_configcheckbox("$p/sourcenews", get_string('sourcenews', $p), '', 1));
        $settings->add(new admin_setting_configtext("$p/newsdays", get_string('newsdays', $p), '', 7, PARAM_INT, 4));
        $settings->add(new admin_setting_configcheckbox(
            "$p/sourceweather",
            get_string('sourceweather', $p),
            get_string('sourceweather_desc', $p),
            1
        ));
        $place = get_config($p, 'place');
        $settings->add(new \local_oksigeniahechauka\admin\setting_location(
            "$p/location",
            get_string('location', $p),
            get_string('location_desc', $p) . ($place ? ' ' . get_string('location_found', $p, (object) [
                'place' => s($place), 'lat' => round((float) get_config($p, 'lat'), 4),
                'lon' => round((float) get_config($p, 'lon'), 4)]) : ''),
            '',
            PARAM_TEXT,
            40
        ));

        // Videos.
        $settings->add(new admin_setting_configexecutable(
            "$p/ffmpeg",
            get_string('ffmpeg', $p),
            get_string('ffmpeg_desc', $p),
            ''
        ));
    }
    $ADMIN->add('local_oksigeniahechauka', $settings);
}
