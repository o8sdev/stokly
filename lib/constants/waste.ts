// Seeded waste categories are stored with English base names; this maps them to
// the `waste_category.<key>` i18n keys so both the form and the log localize
// consistently. Unknown names fall back to their raw value.
export const WASTE_CATEGORY_KEY: Record<string, string> = {
  Spoilage: 'spoilage',
  'Over-prep': 'over_prep',
  Dropped: 'dropped',
  Expired: 'expired',
  Other: 'other',
}
