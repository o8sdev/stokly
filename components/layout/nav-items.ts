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
  ShoppingBag,
  ShoppingCart,
  ListChecks,
  ClipboardList,
  Hourglass,
  Grid2x2,
  Warehouse,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  // Key into the `nav` translation namespace.
  labelKey: string
  icon: LucideIcon
}

// A collapsible parent with child links (e.g. "Satış / Alış" → Satışlar, Alışlar).
export interface NavGroup {
  labelKey: string
  icon: LucideIcon
  children: NavItem[]
}

export type NavEntry = NavItem | NavGroup

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).children !== undefined
}

export interface NavSection {
  // Key into the `nav.section` translation namespace.
  labelKey: string
  items: NavEntry[]
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
      { href: '/app/inventory/waste', labelKey: 'waste_log', icon: Trash2 },
      // Sales + Purchases live under one collapsible "Satış / Alış" group.
      {
        labelKey: 'trade',
        icon: ShoppingBag,
        children: [
          { href: '/app/sales', labelKey: 'sales', icon: Receipt },
          { href: '/app/purchases', labelKey: 'purchases', icon: ShoppingCart },
          {
            href: '/app/purchases/shopping-list',
            labelKey: 'shopping_list',
            icon: ListChecks,
          },
        ],
      },
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
      {
        href: '/app/reports/stock-aging',
        labelKey: 'stock_aging',
        icon: Hourglass,
      },
      {
        href: '/app/reports/menu-engineering',
        labelKey: 'menu_engineering',
        icon: Grid2x2,
      },
      {
        href: '/app/reports/by-location',
        labelKey: 'by_location',
        icon: Warehouse,
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
