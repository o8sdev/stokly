// Pure parsing + validation for bulk ingredient import. No SheetJS import here,
// so it runs on both client (preview) and server (final insert). The client
// reads files with SheetJS and hands the resulting 2D array to rowsFromMatrix().

export type DraftRow = {
  row_number: number
  name: string
  name_ru: string
  unit: string
  cost: string
  yield: string
  supplier: string
  low_stock: string
}

export type ImportRow = {
  row_number: number
  name: string
  name_ru?: string
  unit: string
  cost_per_unit?: number
  yield_percent?: number // stored 0–1 fraction
  supplier_name?: string
  low_stock_threshold?: number
}

export type ImportError = {
  row_number: number
  field: string
  message: string
  value: string
}

export type ParseResult = {
  valid: ImportRow[]
  errors: ImportError[]
  total_rows: number
}

// A draft validated for the editable preview.
export type ValidatedRow = {
  row_number: number
  draft: DraftRow
  row: ImportRow | null // non-null ⇒ importable
  errors: Record<string, string> // field → message code
  warning: string | null
}

// Canonical Azerbaijani units we store.
export const ALLOWED_UNITS = [
  'kq',
  'q',
  'l',
  'ml',
  'ədəd',
  'yığım',
  'bağlama',
  'şüşə',
  'qutu',
] as const

// AZ + RU + EN → canonical AZ.
const UNIT_MAP: Record<string, string> = {
  kq: 'kq',
  q: 'q',
  l: 'l',
  ml: 'ml',
  ədəd: 'ədəd',
  yığım: 'yığım',
  bağlama: 'bağlama',
  şüşə: 'şüşə',
  qutu: 'qutu',
  // Russian
  кг: 'kq',
  г: 'q',
  л: 'l',
  мл: 'ml',
  шт: 'ədəd',
  // English
  kg: 'kq',
  g: 'q',
  pcs: 'ədəd',
  bunch: 'yığım',
  pack: 'bağlama',
  bottle: 'şüşə',
  box: 'qutu',
}

export function normalizeUnit(raw: string): string | null {
  const key = raw.trim().toLowerCase()
  return UNIT_MAP[key] ?? null
}

// Validate a single draft row. Error/warning values are message CODES that the
// UI translates (e.g. "required", "invalid_unit", "no_cost").
export function validateDraft(draft: DraftRow): ValidatedRow {
  const errors: Record<string, string> = {}

  const name = draft.name.trim()
  if (!name) errors.name = 'required'
  else if (name.length > 100) errors.name = 'too_long'

  let unit = ''
  if (!draft.unit.trim()) {
    errors.unit = 'required'
  } else {
    const n = normalizeUnit(draft.unit)
    if (!n) errors.unit = 'invalid_unit'
    else unit = n
  }

  let cost: number | undefined
  if (draft.cost.trim() !== '') {
    const v = Number(draft.cost.replace(',', '.'))
    if (!Number.isFinite(v) || v < 0) errors.cost = 'invalid'
    else cost = v
  }

  let yieldFraction: number | undefined
  if (draft.yield.trim() !== '') {
    const v = Number(draft.yield.replace(',', '.'))
    if (!Number.isFinite(v) || v < 1 || v > 100) errors.yield = 'invalid_yield'
    else yieldFraction = Math.round((v / 100) * 10000) / 10000
  }

  let lowStock: number | undefined
  if (draft.low_stock.trim() !== '') {
    const v = Number(draft.low_stock.replace(',', '.'))
    if (!Number.isFinite(v) || v < 0) errors.low_stock = 'invalid'
    else lowStock = v
  }

  const ok = Object.keys(errors).length === 0
  const warning = ok && cost === undefined ? 'no_cost' : null

  const row: ImportRow | null = ok
    ? {
        row_number: draft.row_number,
        name,
        name_ru: draft.name_ru.trim() || undefined,
        unit,
        cost_per_unit: cost,
        yield_percent: yieldFraction,
        supplier_name: draft.supplier.trim() || undefined,
        low_stock_threshold: lowStock,
      }
    : null

  return { row_number: draft.row_number, draft, row, errors, warning }
}

// Build the spec-shaped ParseResult from validated rows.
export function toParseResult(validated: ValidatedRow[]): ParseResult {
  const valid: ImportRow[] = []
  const errors: ImportError[] = []
  for (const v of validated) {
    if (v.row) valid.push(v.row)
    else {
      for (const [field, message] of Object.entries(v.errors)) {
        errors.push({
          row_number: v.row_number,
          field,
          message,
          value: String((v.draft as unknown as Record<string, string>)[field] ?? ''),
        })
      }
    }
  }
  return { valid, errors, total_rows: validated.length }
}

const HEADER_RE = /^(ad|name|название|ад)\b/i

// Convert a SheetJS 2D array (header:1) into draft rows. Columns A–G:
// name, name_ru, unit, cost, yield, supplier, low_stock. Skips the header row
// and fully-empty rows.
export function rowsFromMatrix(matrix: unknown[][]): DraftRow[] {
  const out: DraftRow[] = []
  matrix.forEach((cells, i) => {
    const c = (idx: number) => String(cells?.[idx] ?? '').trim()
    const name = c(0)
    if (i === 0 && HEADER_RE.test(name)) return
    if (!name && !c(2)) return // skip empty rows
    out.push({
      row_number: out.length + 1,
      name,
      name_ru: c(1),
      unit: c(2),
      cost: c(3),
      yield: c(4),
      supplier: c(5),
      low_stock: c(6),
    })
  })
  return out
}

// Clipboard paste: one ingredient per line, tab- or comma-separated.
// Columns: name, unit (default kq), cost.
export function rowsFromPaste(text: string): DraftRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',')
      const p = (idx: number) => String(parts[idx] ?? '').trim()
      return {
        row_number: i + 1,
        name: p(0),
        name_ru: '',
        unit: p(1) || 'kq',
        cost: p(2),
        yield: '',
        supplier: '',
        low_stock: '',
      }
    })
}
