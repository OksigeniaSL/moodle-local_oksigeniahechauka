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
 * The panel's icons: 24 × 24 line drawings in the colour of the text, from the art direction's design. Decorative:
 * the word beside each one says it.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class icons {
    /** @var array Name => the inside of the SVG. */
    const PATHS = [
        'tv' => '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>',
        'tvv' => '<rect x="7" y="2.5" width="10" height="16" rx="2"/><path d="M9.5 21.5h5M12 18.5v3"/>',
        'screens' => '<rect x="2.5" y="7" width="13" height="9" rx="1.6"/><path d="M8 3.5h11.5a2 2 0 0 1 2 2V13"/>' .
            '<path d="M6.5 19.5h5"/>',
        'eye' => '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/>' .
            '<circle cx="12" cy="12" r="2.8"/>',
        'reload' => '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 4.5v4.2h-4.2"/>',
        'sliders' => '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9"' .
            ' cy="17" r="2"/>',
        'plus' => '<path d="M12 5v14M5 12h14"/>',
        'notice' => '<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5' .
            ' 18V6A1.5 1.5 0 0 1 5 4.5z"/>' .
            '<path d="M7.5 9h9M7.5 12.5h9M7.5 16h5"/>',
        'photo' => '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.8" cy="10" r="1.8"/>' .
            '<path d="M20.5 16l-5-5-9 8.5"/>',
        'video' => '<rect x="2.5" y="5.5" width="14" height="13" rx="2"/><path d="M16.5 10.5l5-3v9l-5-3"/>',
        'event' => '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' .
            '<circle cx="15.5" cy="15" r="1.7" fill="currentColor" stroke="none"/>',
        'ticker' => '<rect x="2.5" y="8" width="19" height="8" rx="1.6"/><path d="M6 12h2.5M11 12h7"/>',
        'agenda' => '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' .
            '<path d="M8.6 15.6a3.4 3.4 0 0 0 6.2 1M15.4 14.4a3.4 3.4 0 0 0-6.2-1"/>',
        'urgent' => '<path d="M12 3.6 2.6 19.8h18.8L12 3.6z"/><path d="M12 10v4.4M12 17.1v.1"/>',
        'clock' => '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
        'check' => '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        'x' => '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
        'dots' => '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/>' .
            '<circle cx="12" cy="12" r="1.4" fill="currentColor"/>' .
            '<circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
        'back' => '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
        'chev' => '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
        'search' => '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
        'sound' => '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>' .
            '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
        'bell' => '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
        'moon' => '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
        'plugoff' => '<path d="M4 4l16 16"/>' .
            '<path d="M9 3.5v4M15 3.5v4M7 8h10v3.5a5 5 0 0 1-1.7 3.7M8.6 15.2A5 5 0 0 1 7 11.5V8"/>' .
            '<path d="M12 16.5v4"/>',
        'qr' => '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/>' .
            '<rect x="4" y="14" width="6" height="6" rx="1"/>' .
            '<path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/>',
        'phone' => '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
        'copy' => '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/>' .
            '<path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
        'contrast' => '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
        'person' => '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
        'pin' => '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/>' .
            '<circle cx="12" cy="10" r="2.3"/>',
        'out' => '<path d="M14 4.5h5.5V10M19.5 4.5 11 13"/>' .
            '<path d="M17.5 13.5v4.5a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8A1.5 1.5 0 0 1 6 6.5h4.5"/>',
        'palette' => '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.5-2.2-.6-1.4.3-2.8 1.8-2.8h1.9a3.3 3.3' .
            ' 0 0 0 3.3-3.3C20.5 7.3 16.7 3.5 12 3.5z"/>' .
            '<circle cx="7.8" cy="11" r="1.2" fill="currentColor"/>' .
            '<circle cx="10.5" cy="7.4" r="1.2" fill="currentColor"/>' .
            '<circle cx="15" cy="7.6" r="1.2" fill="currentColor"/>',
        'menu' => '<path d="M4 7h16M4 12h16M4 17h16"/>',
        'msg' => '<path d="M4.5 5h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17h-1A1.5 1.5' .
            ' 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5z"/>',
        'grip' => '<circle cx="9" cy="6.5" r="1.3" fill="currentColor"/>' .
            '<circle cx="15" cy="6.5" r="1.3" fill="currentColor"/>' .
            '<circle cx="9" cy="12" r="1.3" fill="currentColor"/>' .
            '<circle cx="15" cy="12" r="1.3" fill="currentColor"/>' .
            '<circle cx="9" cy="17.5" r="1.3" fill="currentColor"/>' .
            '<circle cx="15" cy="17.5" r="1.3" fill="currentColor"/>',
    ];

    /**
     * An icon, hidden from screen readers.
     *
     * @param string $name
     * @param string $class more classes
     * @return string HTML
     */
    public static function svg(string $name, string $class = ''): string {
        if (!isset(self::PATHS[$name])) {
            return '';
        }
        return '<svg class="hkp-i' . ($class !== '' ? ' ' . s($class) : '') . '" viewBox="0 0 24 24"' .
            ' aria-hidden="true" ' .
            'focusable="false">' . self::PATHS[$name] . '</svg>';
    }
}
