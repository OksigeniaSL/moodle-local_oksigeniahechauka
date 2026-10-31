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
 * The plumbing of the contract endpoints: JSON in and out, and the key of the screen.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * What every endpoint of docs/contract.md needs.
 */
class endpoint {
    /** The header that carries the key of the screen. */
    const KEY_HEADER = 'HTTP_X_HECHAUKA_KEY';

    /** The largest JSON body an endpoint reads. */
    const MAX_BODY = 65536;

    /**
     * The JSON body of a request.
     *
     * @return array
     */
    public static function body(): array {
        $raw = file_get_contents('php://input', false, null, 0, self::MAX_BODY + 1);
        if ($raw === false || strlen($raw) > self::MAX_BODY) {
            self::fail(413, 'toolarge');
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Sends a JSON answer and stops.
     *
     * @param array $data
     * @param int $status
     * @param array $headers more headers, name => value
     * @return void
     */
    public static function send(array $data, int $status = 200, array $headers = []): void {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        foreach ($headers as $name => $value) {
            header($name . ': ' . $value);
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        die();
    }

    /**
     * Answers with an error of the contract and stops.
     *
     * @param int $status
     * @param string $code
     * @param string $message for a log, never shown on a screen
     * @return void
     */
    public static function fail(int $status, string $code, string $message = ''): void {
        self::send(['error' => $code, 'message' => $message], $status);
    }

    /**
     * Only this method, or a 405.
     *
     * @param string $method
     * @return void
     */
    public static function method(string $method): void {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
            self::fail(405, 'method');
        }
    }

    /**
     * The key the request came with, if any.
     *
     * @return string
     */
    public static function key(): string {
        $key = $_SERVER[self::KEY_HEADER] ?? '';
        return is_string($key) && preg_match('/^[A-Za-z0-9_-]{20,100}$/', $key) ? $key : '';
    }

    /**
     * The screen the key of the request belongs to; a 401 «revoked» otherwise, which makes the screen pair again.
     *
     * @return \stdClass
     */
    public static function screen(): \stdClass {
        global $DB;
        $key = self::key();
        if ($key === '') {
            self::fail(401, 'nokey');
        }
        $screen = $DB->get_record('local_oksigeniahechauka_screen', ['keyhash' => keys::hash($key)]);
        if (!$screen) {
            self::fail(401, 'revoked');
        }
        return $screen;
    }
}
