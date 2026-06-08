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
  Receipt,
  ClipboardList,
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
      { href: '/app/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
      { href: '/app/ingredients', labelKey: 'ingredients', icon: Carrot },
      { href: '/app/recipes', labelKey: 'recipes', icon: ChefHat },
      { href: '/app/inventory', labelKey: 'inventory', icon: Boxes },
      { href: '/app/sales', labelKey: 'sales', icon: Receipt },
      { href: '/app/production', labelKey: 'production', icon: Factory },
    ],
  },
  {
    labelKey: 'reports',
    items: [
      { href: '/app/reports/food-cost', labelKey: 'food_cost', icon: TrendingUp },
      {
        href: '/app/reports/inventory-value',
        labelKey: 'inventory_value',
        icon: Wallet,
      },
      {
        href: '/app/reports/period',
        labelKey: 'period_reports',
        icon: ClipboardList,
      },
    ],
  },
  {
    labelKey: 'settings',
    items: [
      { href: '/app/settings/suppliers', labelKey: 'suppliers', icon: Users },
      { href: '/app/settings', labelKey: 'settings', icon: Settings },
    ],
  },
]

// Flat list used by the mobile bottom tab bar (icons only, primary routes).
export const MOBILE_NAV: NavItem[] = [
  { href: '/app/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/app/ingredients', labelKey: 'ingredients', icon: Carrot },
  { href: '/app/recipes', labelKey: 'recipes', icon: ChefHat },
  { href: '/app/inventory', labelKey: 'inventory', icon: Boxes },
  { href: '/app/reports/food-cost', labelKey: 'food_cost', icon: TrendingUp },
]
