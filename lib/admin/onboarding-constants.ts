// Pure onboarding constants — safe to import from client components (no server
// deps). The derivation logic lives in ./onboarding (server-only).

export const MILESTONE_KEYS = [
  'signed_up',
  'first_ingredient',
  'ten_ingredients',
  'first_recipe',
  'first_count',
  'first_delivery',
  'first_waste',
  'report_viewed',
  'active_7_days',
  'converted',
] as const

export type MilestoneKey = (typeof MILESTONE_KEYS)[number]

export const MILESTONE_COUNT = MILESTONE_KEYS.length
