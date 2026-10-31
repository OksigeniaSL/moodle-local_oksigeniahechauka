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
 * The location of the centre, for the weather.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\admin;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/adminlib.php');

/**
 * The centre writes its town (or «latitude, longitude»); when it changes, the server looks it up once and keeps the
 * coordinates and the name of the place found, which the description shows to confirm it, and asks for its weather at
 * once.
 */
class setting_location extends \admin_setting_configtext {
    /**
     * Saves the text and, when it changed, the place it means.
     *
     * @param mixed $data
     * @return string empty when saved, or the error
     */
    public function write_setting($data) {
        $c = 'local_oksigeniahechauka';
        $data = trim((string) $data);
        if ($data === trim((string) $this->get_setting())) {
            return parent::write_setting($data);
        }
        foreach (['lat', 'lon', 'place', 'weatherdata', 'weathermodified'] as $name) {
            unset_config($name, $c);
        }
        set_config('weatherexpires', 0, $c);
        if ($data !== '') {
            $found = \local_oksigeniahechauka\local\weather::find($data);
            if (!$found) {
                return get_string('location_notfound', $c);
            }
            set_config('lat', $found['lat'], $c);
            set_config('lon', $found['lon'], $c);
            set_config('place', $found['name'], $c);
            // Its weather now, not at the next quarter of an hour.
            \core\task\manager::queue_adhoc_task(new \local_oksigeniahechauka\task\fetch_weather_now(), true);
        }
        return parent::write_setting($data);
    }
}
