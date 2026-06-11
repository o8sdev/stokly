// Canonical measurement units, shared by the ingredient form and the recipe
// ingredients editor (and the same set the bulk import normalises to) so the
// stored `unit` value stays consistent everywhere. `value` is the Azerbaijani
// unit actually stored; `key` maps to the `ingredients.units.<key>` label.
export const UNIT_OPTIONS = [
  { value: 'kq', key: 'kq' },
  { value: 'q', key: 'q' },
  { value: 'l', key: 'l' },
  { value: 'ml', key: 'ml' },
  { value: 'ədəd', key: 'piece' },
  { value: 'yığım', key: 'bunch' },
  { value: 'bağlama', key: 'pack' },
  { value: 'şüşə', key: 'bottle' },
  { value: 'qutu', key: 'box' },
] as const

export const UNIT_VALUES: string[] = UNIT_OPTIONS.map((o) => o.value)

// ── Metric unit conversions ───────────────────────────────────────────────
// Recipes are often written in a different unit than the ingredient is bought/
// stocked in (e.g. a `q` (gram) line for a `kq` (kg) ingredient). We convert
// within a metric family (mass: kq↔q, volume: l↔ml) using factors to the
// family's smallest unit. Count/pack units (piece, pack, …) have no fixed
// conversion — per-ingredient custom factors are a later (Tier B) addition.
const TO_CANONICAL: Record<string, number> = { kq: 1000, q: 1, l: 1000, ml: 1 }
const UNIT_FAMILY: Record<string, 'mass' | 'volume'> = {
  kq: 'mass',
  q: 'mass',
  l: 'volume',
  ml: 'volume',
}

export function unitFamily(unit: string): 'mass' | 'volume' | null {
  return UNIT_FAMILY[unit] ?? null
}

// Convert a quantity between two units of the same metric family. Returns null
// when the units aren't convertible (different family or an unknown/count unit).
export function convertUnit(
  qty: number,
  from: string,
  to: string
): number | null {
  if (from === to) return qty
  const f = UNIT_FAMILY[from]
  if (f && f === UNIT_FAMILY[to]) {
    return qty * (TO_CANONICAL[from] / TO_CANONICAL[to])
  }
  return null
}

// Convert a recipe-line quantity into an ingredient's base (stock) unit. Tries
// the metric families, then the ingredient's own custom factors (B4), e.g.
// { 'şüşə': 750, 'qutu': 4500 } for an ml-based ingredient. Falls back to the
// quantity unchanged only for legacy/undefined units (recipe save now rejects
// unconvertible units, so this last resort is rarely hit).
export function toBaseUnit(
  qty: number,
  lineUnit: string,
  baseUnit: string,
  factors?: Record<string, number> | null
): number {
  if (lineUnit === baseUnit) return qty
  const c = convertUnit(qty, lineUnit, baseUnit)
  if (c != null) return c
  const f = factors?.[lineUnit]
  if (f != null && f > 0) return qty * f
  return qty
}

// Whether a line unit has a defined path to the base (same unit, metric family,
// or a per-ingredient factor). Used to reject unconvertible lines at save time.
export function isConvertible(
  lineUnit: string,
  baseUnit: string,
  factors?: Record<string, number> | null
): boolean {
  if (lineUnit === baseUnit) return true
  if (convertUnit(1, lineUnit, baseUnit) != null) return true
  const f = factors?.[lineUnit]
  return f != null && f > 0
}
