// Curated business types a tenant can choose on first run. `key` is stored on
// tenants.business_type; the label comes from the `business_type.<key>` i18n
// namespace. (The choice is informational — it does not filter the library.)
export const BUSINESS_TYPES = [
  { key: 'restaurant' },
  { key: 'cafe' },
  { key: 'coffee' },
  { key: 'fast_food' },
  { key: 'pizzeria' },
  { key: 'bakery' },
  { key: 'pastry' },
  { key: 'bar' },
  { key: 'kebab' },
  { key: 'teahouse' },
  { key: 'other' },
] as const

export type BusinessTypeKey = (typeof BUSINESS_TYPES)[number]['key']

export const BUSINESS_TYPE_KEYS: string[] = BUSINESS_TYPES.map((b) => b.key)
