import {
  LayoutDashboard,
  Carrot,
  ChefHat,
  Boxes,
  Factory,
  TrendingUp,
  Wallet,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  // Key into the `nav` translation namespace.
  labelKey: string
  icon: LucideIcon
}

export interface NavSection {
  // Key into the `nav.section` translation namespace.
  labelKey: string
  items: NavItem[]
}

// Grouped sidebar navigation: ƏSAS · HESABATLAR · TƏNZİMLƏMƏLƏR.
export const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: 'main',
    items: [
      { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
      { href: '/ingredients', labelKey: 'ingredients', icon: Carrot },
      { href: '/recipes', labelKey: 'recipes', icon: ChefHat },
      { href: '/inventory', labelKey: 'inventory', icon: Boxes },
      { href: '/production', labelKey: 'production', icon: Factory },
    ],
  },
  {
    labelKey: 'reports',
    items: [
      { href: '/reports/food-cost', labelKey: 'food_cost', icon: TrendingUp },
      {
        href: '/reports/inventory-value',
        labelKey: 'inventory_value',
        icon: Wallet,
      },
    ],
  },
  {
    labelKey: 'settings',
    items: [
      { href: '/settings/suppliers', labelKey: 'suppliers', icon: Users },
      { href: '/settings', labelKey: 'settings', icon: Settings },
    ],
  },
]

// Flat list used by the mobile bottom tab bar (icons only, primary routes).
export const MOBILE_NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/ingredients', labelKey: 'ingredients', icon: Carrot },
  { href: '/recipes', labelKey: 'recipes', icon: ChefHat },
  { href: '/inventory', labelKey: 'inventory', icon: Boxes },
  { href: '/reports/food-cost', labelKey: 'food_cost', icon: TrendingUp },
]
