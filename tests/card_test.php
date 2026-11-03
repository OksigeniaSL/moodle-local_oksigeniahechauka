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

namespace local_oksigeniahechauka;

use local_oksigeniahechauka\local\card;

/**
 * The file that tells a Raspberry Pi card which Moodle it belongs to: what the panel writes is what the device reads
 * (device/instala.sh, device/.../ajuste.py), and nothing a person pastes gets in as something else.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\card
 */
#[\PHPUnit\Framework\Attributes\CoversClass(card::class)]
final class card_test extends \advanced_testcase {
    /**
     * A name typed in the panel becomes a name on the network.
     */
    public function test_hostname(): void {
        $this->assertSame('hechauka-recepcion-2', card::hostname('Recepción 2'));
        $this->assertSame('hechauka-sala-de-profesores', card::hostname('  Sala de profesores!! '));
        $this->assertSame('hechauka-comedor', card::hostname('hechauka-comedor'));
        $this->assertSame('', card::hostname('¡¡ !!'));
        $this->assertLessThanOrEqual(50, strlen(card::hostname(str_repeat('pantalla ', 20))));
    }

    /**
     * Only whole SSH public keys get in; anything else is said, never written.
     */
    public function test_keys(): void {
        $key = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample tecnico@example';
        $this->assertSame([[$key], false], card::keys("\r\n" . $key . "\r\n\r\n" . $key));
        [$keys, $bad] = card::keys("my password\n" . $key);
        $this->assertSame([$key], $keys);
        $this->assertTrue($bad);
        $this->assertSame([[], true], card::keys("URL=https://elsewhere.example.org\nNOMBRE=x"));
        $this->assertSame([[], false], card::keys(''));
    }

    /**
     * The file: this Moodle's player, the name, the time zone and the keys, one per line, with nothing that breaks a line.
     */
    public function test_conf(): void {
        global $CFG;
        $this->resetAfterTest();
        set_config('timezone', 'Atlantic/Canary');
        $key = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample tecnico@example';
        $conf = card::conf('Recepción', [$key]);
        $lines = explode("\r\n", rtrim($conf, "\r\n"));
        $this->assertStringStartsWith('# ', $lines[0]);
        $this->assertSame('URL=' . $CFG->wwwroot . '/local/oksigeniahechauka/player/', $lines[1]);
        $this->assertContains('NOMBRE=hechauka-recepcion', $lines);
        $this->assertContains('ZONA=Atlantic/Canary', $lines);
        $this->assertContains('LLAVE=' . $key, $lines);
        $this->assertCount(5, $lines);
        $this->assertStringNotContainsString('NOMBRE=', card::conf('', []));
    }
}
