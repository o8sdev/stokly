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
