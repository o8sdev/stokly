import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// GET /api/templates/ingredients — a downloadable Excel template for the bulk
// ingredient import. Columns A–F match lib/import/parse-ingredients. (Cell
// fill/font styling is a SheetJS Pro feature; the community build still writes
// a clean, correctly-structured workbook with sized columns + an example row.)
export function GET() {
  const headers = [
    'Ad *',
    'Ad (Rus)',
    'Ölçü vahidi *',
    'Vahid dəyəri (AZN)',
    'Təchizatçı',
    'Az stok həddi',
  ]
  const example = [
    'Toyuq döşü',
    'Куриная грудка',
    'kq',
    '4.20',
    'Lider Ət',
    '5',
  ]
  const blanks = Array.from({ length: 30 }, () => ['', '', '', '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet([headers, example, ...blanks])
  ws['!cols'] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'İnqrediyentlər')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  const body = new Uint8Array(out)

  return new NextResponse(body, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="stokly-ingredient-import-az.xlsx"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
