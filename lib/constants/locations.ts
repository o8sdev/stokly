// Curated storage-location kinds. `value` is stored in storage_locations.kind;
// the label comes from the `locations.kind_<value>` i18n key. Consumption kinds
// default a new location to a consumption point (sales/waste/production deduct
// from it); frozen kinds default is_frozen on.
export const LOCATION_KINDS = [
  'kitchen',
  'bar',
  'prep',
  'storage',
  'cold_storage',
  'freezer',
  'receiving',
] as const

export type LocationKind = (typeof LOCATION_KINDS)[number]

// Kinds that are consumption points by default (a deduction draws from them).
export const CONSUMPTION_KINDS: readonly LocationKind[] = ['kitchen', 'bar', 'prep']
// Kinds that default to frozen (shelf life can be extended on transfer in).
export const FROZEN_KINDS: readonly LocationKind[] = ['cold_storage', 'freezer']

export function isLocationKind(k: string | null | undefined): k is LocationKind {
  return !!k && (LOCATION_KINDS as readonly string[]).includes(k)
}
export function isConsumptionKind(k: string | null | undefined): boolean {
  return !!k && (CONSUMPTION_KINDS as readonly string[]).includes(k)
}
export function isFrozenKind(k: string | null | undefined): boolean {
  return !!k && (FROZEN_KINDS as readonly string[]).includes(k)
}

// One-click presets for the "add location" form (name suggestion + kind).
export const LOCATION_PRESETS: { kind: LocationKind; nameKey: string }[] = [
  { kind: 'kitchen', nameKey: 'kind_kitchen' },
  { kind: 'bar', nameKey: 'kind_bar' },
  { kind: 'cold_storage', nameKey: 'kind_cold_storage' },
  { kind: 'storage', nameKey: 'kind_storage' },
]
