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

use local_oksigeniahechauka\local\items;
use local_oksigeniahechauka\local\tables;

/**
 * A table: what is understood of a CSV or a JSON, what is not, how much is kept, and that what it says reaches a screen.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\tables
 */
#[\PHPUnit\Framework\Attributes\CoversClass(tables::class)]
final class tables_test extends \advanced_testcase {
    /**
     * A CSV with any separator, quotes, a BOM and an empty row.
     */
    public function test_csv(): void {
        $this->assertSame(
            ['head' => ['Aula', 'Hora'], 'rows' => [['A1', '9:00'], ['B, 2', '10:00']]],
            tables::parse("\xEF\xBB\xBFAula,Hora\nA1,9:00\n\"B, 2\",10:00\n,\n")
        );
        $this->assertSame(['Aula', 'Hora'], tables::parse("Aula;Hora\nA1;9:00")['head']);
        $this->assertSame(['Aula', 'Hora'], tables::parse("Aula\tHora\nA1\t9:00")['head']);
    }

    /**
     * A JSON as a list of objects or of lists.
     */
    public function test_json(): void {
        $table = ['head' => ['aula', 'hora'], 'rows' => [['A1', '9:00']]];
        $this->assertSame($table, tables::parse('[{"aula": "A1", "hora": "9:00"}]'));
        $this->assertSame($table, tables::parse('[["aula", "hora"], ["A1", "9:00"]]'));
    }

    /**
     * What is not a table is nothing: a page that asks to sign in, plain words, only titles.
     */
    public function test_not_a_table(): void {
        $this->assertNull(tables::parse('<!DOCTYPE html><html><body>Inicia sesión</body></html>'));
        $this->assertNull(tables::parse('Hola, qué tal'));
        $this->assertNull(tables::parse("Aula,Hora\n"));
        $this->assertNull(tables::parse(''));
        $this->assertNull(tables::parse('{"a": 1}'));
    }

    /**
     * No more than a screen can hold, and nothing but plain text.
     */
    public function test_limits(): void {
        $lines = [implode(',', range(1, 10))];
        for ($i = 0; $i < 300; $i++) {
            $lines[] = implode(',', array_fill(0, 10, '<b>x</b>'));
        }
        $table = tables::parse(implode("\n", $lines));
        $this->assertCount(tables::MAX_COLS, $table['head']);
        $this->assertCount(tables::MAX_ROWS, $table['rows']);
        $this->assertStringNotContainsString('<', $table['rows'][0][0]);
    }

    /**
     * It reaches a screen only once it has been read, with the last good one.
     */
    public function test_contract(): void {
        $item = (object) ['id' => 7, 'type' => 'table', 'title' => 'Aulas', 'body' => '', 'visible' => 1, 'datefrom' => null,
            'data' => json_encode(['url' => 'https://example.com/a.csv']), 'dateuntil' => null, 'days' => null, 'times' => null,
            'everyweeks' => 0, 'duration' => null, 'sortorder' => 0];
        $this->assertNull(items::to_contract($item));
        $item->data = json_encode(['table' => ['head' => ['Aula'], 'rows' => [['A1']]]]);
        $out = items::to_contract($item);
        $this->assertSame('table', $out['type']);
        $this->assertSame('extra', $out['zone']);
        $this->assertSame([['A1']], $out['rows']);
    }
}
