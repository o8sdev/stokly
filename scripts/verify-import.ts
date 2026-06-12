/* Import pipeline round-trip: build a workbook shaped exactly like the
   downloadable template, run it through the REAL parser (xlsx → matrix →
   drafts → validation), and assert the mapped values — including the messy
   inputs restaurants actually type (comma decimals, % signs, unit synonyms,
   bad rows). Run: npx -y tsx scripts/verify-import.ts                       */
import * as XLSX from 'xlsx'
import {
  rowsFromMatrix,
  validateDraft,
  toParseResult,
} from '../lib/import/parse-ingredients'

let failed = 0
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`${ok ? '✓' : '✗ FAIL'}  ${name} → ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`)
  if (!ok) failed++
}

// Template columns: Ad* | Ad(Rus) | Vahid* | Dəyər | Çıxım% | Təchizatçı | Az stok
const matrix = [
  ['Ad *', 'Ad (Rus)', 'Ölçü vahidi *', 'Vahid dəyəri (AZN)', 'Çıxım faizi (%)', 'Təchizatçı', 'Az stok həddi'],
  ['Toyuq döşü', 'Куриная грудка', 'kq', '4,20', '90%', 'Lider Ət', '5'],
  ['Zeytun yağı', '', 'Litr (l)', 12.5, 100, '', ''],
  ['Pis sətir', '', 'yanlışvahid', 'abc', '101', '', '-1'],
  ['', '', '', '', '', '', ''],
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrix), 'Test')
const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

// Re-read like the import page does (file → workbook → matrix)
const wb2 = XLSX.read(buf, { type: 'array' })
const sheet = wb2.Sheets[wb2.SheetNames[0]]
const matrix2 = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][]

const drafts = rowsFromMatrix(matrix2)
const validated = drafts.map(validateDraft)
const result = toParseResult(validated)

check('rows parsed (blank dropped)', drafts.length, 3)
check('valid rows', result.valid.length, 2)
const r1 = result.valid[0]
check('comma decimal cost 4,20 → 4.2', r1.cost_per_unit, 4.2)
check('percent sign 90% → 0.9 fraction', r1.yield_percent, 0.9)
check('unit kept kq', r1.unit, 'kq')
check('supplier mapped', r1.supplier_name, 'Lider Ət')
check('low stock 5', r1.low_stock_threshold, 5)
const r2 = result.valid[1]
check('unit label "Litr (l)" normalized → l', r2.unit, 'l')
check('numeric cell 12.5 kept', r2.cost_per_unit, 12.5)
const badErrors = result.errors.filter((e) => e.row_number === drafts[2].row_number)
check('bad row rejected (has errors)', badErrors.length > 0, true)

console.log(failed === 0 ? '\nIMPORT ROUND-TRIP PASSED' : `\n${failed} FAILURE(S)`)
process.exit(failed === 0 ? 0 : 1)
