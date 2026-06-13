import {
  Boxes,
  Activity,
  ChefHat,
  ShoppingCart,
  Trash2,
  ClipboardList,
  ArrowLeftRight,
  TrendingUp,
  History,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

// The product feature list shown in the nav "Product" dropdown and the footer
// Product column. `key` indexes into the `landing.features` i18n namespace;
// `href` is a path suffix appended after `/${locale}` (an anchor on the landing
// for now — we have no per-feature pages yet). `soon` items are non-linking.
export interface ProductFeature {
  key: string
  href: string
  icon: LucideIcon
  soon?: boolean
}

export const PRODUCT_FEATURES: ProductFeature[] = [
  { key: 'inventory', href: '#product', icon: Boxes },
  { key: 'stock_visibility', href: '#product', icon: Activity },
  { key: 'recipes', href: '#product', icon: ChefHat },
  { key: 'purchasing', href: '#product', icon: ShoppingCart },
  { key: 'waste', href: '#product', icon: Trash2 },
  { key: 'counting', href: '#product', icon: ClipboardList },
  { key: 'transfers', href: '#product', icon: ArrowLeftRight },
  { key: 'analytics', href: '#product', icon: TrendingUp },
  { key: 'audit', href: '#product', icon: History },
  { key: 'ai_soon', href: '#product', icon: Sparkles, soon: true },
]
