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

if ($hassiteconfig) {
    // The panel also has its own link in the main bar, for who runs the screens without being an administrator.
    $ADMIN->add('localplugins', new admin_category(
        'local_oksigeniahechauka',
        get_string('pluginname', 'local_oksigeniahechauka')
    ));
    $ADMIN->add('local_oksigeniahechauka', new admin_externalpage(
        'local_oksigeniahechauka_panel',
        get_string('manage', 'local_oksigeniahechauka'),
        new moodle_url('/local/oksigeniahechauka/index.php'),
        'local/oksigeniahechauka:view'
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
        // The categories of the centre (their names, colours and words) are set in the panel, «Tu centro».

        // The public demonstration screen.
        $settings->add(new admin_setting_heading("$p/demoheading", get_string('demo_title', $p), ''));
        $settings->add(new admin_setting_configcheckbox(
            "$p/publicdemo",
            get_string('publicdemo', $p),
            get_string('publicdemo_desc', $p, (new moodle_url('/local/oksigeniahechauka/demo.php'))->out(false)),
            0
        ));

        // The short address of the player, through a link shortener that speaks the API of YOURLS.
        $forget = '\local_oksigeniahechauka\local\playerlink::forget';
        $settings->add(new admin_setting_heading("$p/shortlinks", get_string('shortlinks', $p), get_string('shortlinks_desc', $p)));
        $setting = new admin_setting_configtext(
            "$p/shortenerapi",
            get_string('shortenerapi', $p),
            get_string('shortenerapi_desc', $p),
            '',
            PARAM_URL
        );
        $setting->set_updatedcallback($forget);
        $settings->add($setting);
        $settings->add(new admin_setting_configpasswordunmask(
            "$p/shortenerkey",
            get_string('shortenerkey', $p),
            get_string('shortenerkey_desc', $p),
            ''
        ));
        $setting = new admin_setting_configtext(
            "$p/shortkeyword",
            get_string('shortkeyword', $p),
            get_string('shortkeyword_desc', $p),
            \local_oksigeniahechauka\local\playerlink::KEYWORD,
            PARAM_ALPHANUMEXT,
            20
        );
        $setting->set_updatedcallback($forget);
        $settings->add($setting);

        // The connection with Cifra, a school management program: optional, and once for every Oksigenia plugin of the site.
        $settings->add(new admin_setting_heading("$p/cifra", get_string('cifra', $p), get_string('cifra_desc', $p)));
        $settings->add(new admin_setting_configselect("$p/ciframode", get_string('ciframode', $p), '', '', [
            '' => get_string('ciframode_auto', $p),
            'oauth' => get_string('ciframode_oauth', $p),
            'key' => get_string('ciframode_key', $p),
        ]));
        $settings->add(new admin_setting_configtext(
            "$p/cifraurl",
            get_string('cifraurl', $p),
            get_string('cifraurl_desc', $p),
            '',
            PARAM_URL
        ));
        $settings->add(new admin_setting_configtext("$p/cifraclientid", get_string('cifraclientid', $p), '', '', PARAM_TEXT));
        $settings->add(new admin_setting_encryptedpassword("$p/cifrasecret", get_string('cifrasecret', $p), ''));
        $settings->add(new admin_setting_encryptedpassword(
            "$p/cifrakey",
            get_string('cifrakey', $p),
            get_string('cifrakey_desc', $p)
        ));
        $settings->add(new admin_setting_configtext(
            "$p/cifrainternalhosts",
            get_string('cifrainternalhosts', $p),
            get_string('cifrainternalhosts_desc', $p),
            '',
            PARAM_TEXT
        ));

        // What reaches the screens by itself.
        $settings->add(new admin_setting_heading("$p/sources", get_string('sources', $p), ''));
        // What another Oksigenia plugin brings is offered only where it is installed, and nothing is said where it is not.
        if (\local_oksigeniahechauka\local\sources::has_meals()) {
            $settings->add(new admin_setting_configcheckbox("$p/sourcemenu", get_string('sourcemenu', $p), '', 1));
            $settings->add(new admin_setting_configtext(
                "$p/menucentre",
                get_string('menucentre', $p),
                get_string('menucentre_desc', $p),
                0,
                PARAM_INT,
                6
            ));
            $settings->add(new admin_setting_configcheckbox(
                "$p/menuallergens",
                get_string('menuallergens', $p),
                get_string('menuallergens_desc', $p),
                1
            ));
        }
        if (\local_oksigeniahechauka\local\sources::has_channel()) {
            $settings->add(new admin_setting_configcheckbox(
                "$p/sourcechannel",
                get_string('sourcechannel', $p),
                get_string('sourcechannel_desc', $p),
                1
            ));
        }
        if (\local_oksigeniahechauka\local\sources::has_books()) {
            $settings->add(new admin_setting_configcheckbox(
                "$p/sourcebooks",
                get_string('sourcebooks', $p),
                get_string('sourcebooks_desc', $p),
                1
            ));
            $settings->add(new admin_setting_configtext(
                "$p/booksdays",
                get_string('booksdays', $p),
                get_string('booksdays_desc', $p),
                14,
                PARAM_INT,
                4
            ));
        }
        $settings->add(new admin_setting_configcheckbox(
            "$p/sourcedeadlines",
            get_string('sourcedeadlines', $p),
            get_string('sourcedeadlines_desc', $p),
            0
        ));
        $settings->add(new admin_setting_configtext(
            "$p/deadlinesdays",
            get_string('deadlinesdays', $p),
            get_string('deadlinesdays_desc', $p),
            7,
            PARAM_INT,
            4
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
