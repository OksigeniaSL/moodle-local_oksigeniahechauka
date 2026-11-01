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
 * The weather of the centre, from MET Norway.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * The server asks MET Norway (api.met.no, free for any use under NLOD 2.0 and CC BY 4.0) every half hour at most,
 * keeps the hours it answers and gives every screen the same summary: now, today and tomorrow. Its terms: identify
 * with a User-Agent of our own, keep each answer until its Expires, coordinates with four decimals, and the credit on
 * the screen.
 */
class weather {
    /** The forecast. */
    const URL = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';

    /** Who asks, as MET Norway wants to know. */
    const AGENT = 'OksigeniaHechauka/1 (+https://oksigenia.com; dev@oksigenia.cc)';

    /** Hours kept: today's past ones too, so its high and low hold all day. */
    const KEEP_HOURS = 72;

    /**
     * The place a centre means: «latitude, longitude» as it is, or its town looked up once in Nominatim
     * (OpenStreetMap), whose policy allows a search like this one with an identifying User-Agent.
     *
     * @param string $text
     * @return array|null ['lat' => float, 'lon' => float, 'name' => string]
     */
    public static function find(string $text): ?array {
        if (preg_match('/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/', $text, $m)) {
            $lat = (float) $m[1];
            $lon = (float) $m[2];
            if (abs($lat) > 90 || abs($lon) > 180) {
                return null;
            }
            return ['lat' => round($lat, 4), 'lon' => round($lon, 4), 'name' => trim($text)];
        }
        global $CFG;
        require_once($CFG->libdir . '/filelib.php'); // The curl class, which a task does not have loaded.
        $curl = new \curl(['ignoresecurity' => false]);
        $curl->setHeader(['User-Agent: ' . self::AGENT, 'Accept: application/json']);
        $body = $curl->get('https://nominatim.openstreetmap.org/search', ['q' => $text, 'format' => 'jsonv2',
            'limit' => 1, 'accept-language' => current_language()], ['CURLOPT_TIMEOUT' => 15]);
        $list = json_decode((string) $body, true);
        if (!is_array($list) || empty($list[0]['lat'])) {
            return null;
        }
        $parts = array_slice(array_map('trim', explode(',', (string) ($list[0]['display_name'] ?? $text))), 0, 3);
        return ['lat' => round((float) $list[0]['lat'], 4), 'lon' => round((float) $list[0]['lon'], 4),
            'name' => implode(', ', $parts)];
    }

    /**
     * Asks for the forecast if the last answer has expired, and keeps it.
     *
     * @param int $now
     * @return string what happened: off, nowhere, fresh, kept, failed
     */
    public static function fetch(int $now): string {
        $c = 'local_oksigeniahechauka';
        if (!get_config($c, 'sourceweather')) {
            return 'off';
        }
        $lat = get_config($c, 'lat');
        $lon = get_config($c, 'lon');
        if ($lat === false || $lat === '' || $lon === false || $lon === '') {
            return 'nowhere';
        }
        if ((int) get_config($c, 'weatherexpires') > $now) {
            return 'fresh';
        }
        global $CFG;
        require_once($CFG->libdir . '/filelib.php'); // The curl class, which a task does not have loaded.
        $curl = new \curl(['ignoresecurity' => false]);
        $curl->setHeader(['User-Agent: ' . self::AGENT, 'Accept: application/json']);
        $modified = (string) get_config($c, 'weathermodified');
        if ($modified !== '') {
            $curl->setHeader(['If-Modified-Since: ' . $modified]);
        }
        $body = $curl->get(
            self::URL,
            ['lat' => sprintf('%.4f', $lat), 'lon' => sprintf('%.4f', $lon)],
            ['CURLOPT_TIMEOUT' => 20, 'CURLOPT_CONNECTTIMEOUT' => 10]
        );
        $info = $curl->get_info();
        $code = (int) ($info['http_code'] ?? 0);
        $headers = self::headers((array) $curl->getResponse());
        $expires = isset($headers['expires']) ? strtotime($headers['expires']) : false;
        set_config('weatherexpires', $expires && $expires > $now ? $expires : $now + 1800, $c);
        if ($code === 304) {
            return 'kept';
        }
        $json = $code === 200 ? json_decode((string) $body, true) : null;
        if (!is_array($json)) {
            set_config('weatherexpires', $now + 600, $c);
            return 'failed';
        }
        $hours = self::merge(self::parse($json), self::hours(), $now);
        set_config('weatherdata', json_encode(['hours' => $hours, 'updated' => $now]), $c);
        set_config('weathermodified', $headers['last-modified'] ?? '', $c);
        return 'fresh';
    }

    /**
     * The headers of an answer, by their lower-case name.
     *
     * @param array $response what curl::getResponse() gives
     * @return array
     */
    protected static function headers(array $response): array {
        $out = [];
        foreach ($response as $name => $value) {
            $out[strtolower(trim((string) $name))] = is_array($value) ? end($value) : (string) $value;
        }
        return $out;
    }

    /**
     * The hours of a MET Norway answer: time, temperature, the sky of the next hour (or of the next six), and the
     * chance of rain when it comes (not everywhere).
     *
     * @param array $json
     * @return array [['t' => unix, 'temp' => float, 'sky' => string, 'rain' => ?int], …]
     */
    public static function parse(array $json): array {
        $out = [];
        foreach ($json['properties']['timeseries'] ?? [] as $entry) {
            $t = strtotime((string) ($entry['time'] ?? ''));
            $d = $entry['data'] ?? [];
            $temp = $d['instant']['details']['air_temperature'] ?? null;
            if (!$t || $temp === null) {
                continue;
            }
            $next = $d['next_1_hours'] ?? ($d['next_6_hours'] ?? ($d['next_12_hours'] ?? []));
            $sky = $next['summary']['symbol_code'] ?? '';
            $rain = $next['details']['probability_of_precipitation'] ?? null;
            $out[] = ['t' => $t, 'temp' => (float) $temp, 'sky' => (string) $sky,
                'rain' => $rain === null ? null : (int) round($rain)];
        }
        return $out;
    }

    /**
     * New hours over the ones kept: the kept ones go only where the new answer says nothing (today's past hours).
     *
     * @param array $fresh
     * @param array $kept
     * @param int $now
     * @return array
     */
    protected static function merge(array $fresh, array $kept, int $now): array {
        $byhour = [];
        foreach ($kept as $h) {
            if ($h['t'] >= $now - self::KEEP_HOURS * HOURSECS) {
                $byhour[$h['t']] = $h;
            }
        }
        foreach ($fresh as $h) {
            $byhour[$h['t']] = $h;
        }
        ksort($byhour);
        return array_values($byhour);
    }

    /**
     * The hours kept.
     *
     * @return array
     */
    public static function hours(): array {
        $data = json_decode((string) get_config('local_oksigeniahechauka', 'weatherdata'), true);
        return is_array($data) && is_array($data['hours'] ?? null) ? $data['hours'] : [];
    }

    /**
     * What the screens get: now, today and tomorrow on the site's calendar; null when there is nothing recent.
     *
     * @param array $hours
     * @param int $now
     * @return array|null
     */
    public static function summary(array $hours, int $now): ?array {
        $nowhour = null;
        foreach ($hours as $h) {
            if ($h['t'] <= $now && $now - $h['t'] < 3 * HOURSECS) {
                $nowhour = $h;
            }
        }
        if (!$nowhour) {
            foreach ($hours as $h) {
                if ($h['t'] > $now && $h['t'] - $now < HOURSECS) {
                    $nowhour = $h;
                    break;
                }
            }
        }
        $today = self::day($hours, schedule::day($now));
        if (!$nowhour || !$today) {
            return null;
        }
        $out = [
            'now' => ['symbol' => $nowhour['sky'], 'temp' => (int) round($nowhour['temp'])],
            'today' => $today,
            'credit' => get_string('weather_credit', 'local_oksigeniahechauka'),
        ];
        $tomorrow = self::day($hours, schedule::day($now, 1));
        if ($tomorrow) {
            $out['tomorrow'] = $tomorrow;
        }
        // The next three days, for the weather in a third of the screen: each with its date.
        $days = [];
        for ($i = 1; $i <= 3; $i++) {
            $date = schedule::day($now, $i);
            $day = self::day($hours, $date);
            if ($day) {
                $days[] = ['date' => $date] + $day;
            }
        }
        if ($days) {
            $out['days'] = $days;
        }
        return $out;
    }

    /**
     * A day: its high and low, the sky most hours of its daytime have, in words, and the highest chance of rain if
     * the answer gives it.
     *
     * @param array $hours
     * @param string $date «YYYY-MM-DD»
     * @return array|null
     */
    protected static function day(array $hours, string $date): ?array {
        $temps = [];
        $skies = [];
        $rain = null;
        foreach ($hours as $h) {
            if (schedule::day((int) $h['t']) !== $date) {
                continue;
            }
            $temps[] = $h['temp'];
            $hour = (int) substr(schedule::stamp((int) $h['t']), 11, 2);
            if ($h['sky'] !== '' && $hour >= 8 && $hour <= 20) {
                $sky = preg_replace('/_(night|polartwilight)$/', '_day', $h['sky']);
                $skies[$sky] = ($skies[$sky] ?? 0) + 1;
            }
            if ($h['rain'] !== null) {
                $rain = max((int) $rain, (int) $h['rain']);
            }
        }
        if (!$temps) {
            return null;
        }
        if (!$skies) {
            foreach ($hours as $h) {
                if (schedule::day((int) $h['t']) === $date && $h['sky'] !== '') {
                    $skies[$h['sky']] = 1;
                    break;
                }
            }
        }
        arsort($skies);
        $symbol = (string) (array_key_first($skies) ?? 'cloudy');
        $day = ['symbol' => $symbol, 'max' => (int) round(max($temps)), 'min' => (int) round(min($temps)),
            'text' => self::sky($symbol)];
        if ($rain !== null) {
            $day['rain'] = $rain;
        }
        return $day;
    }

    /**
     * The sky in words, in the language of the site, from a symbol of MET Norway (by its words, as the icons do).
     *
     * @param string $symbol
     * @return string
     */
    public static function sky(string $symbol): string {
        $base = preg_replace('/_(day|night|polartwilight)$/', '', $symbol);
        $kinds = [
            'thunder' => 'thunder', 'sleet' => 'sleet', 'snow' => 'snow', 'showers' => 'showers',
            'lightrain' => 'lightrain', 'rain' => 'rain', 'fog' => 'fog', 'partlycloudy' => 'partlycloudy',
            'fair' => 'fair', 'clearsky' => 'clearsky', 'cloudy' => 'cloudy',
        ];
        foreach ($kinds as $word => $kind) {
            if (strpos($base, $word) !== false) {
                return get_string('sky_' . $kind, 'local_oksigeniahechauka');
            }
        }
        return get_string('sky_cloudy', 'local_oksigeniahechauka');
    }
}
