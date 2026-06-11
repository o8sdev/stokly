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
  BookOpen,
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

// Grouped sidebar navigation: ƏSAS · HESABATLAR · TƏNZİMLƏMƏLƏR. Related pages
// sit under collapsible groups (Mətbəx, Anbar, Satış / Alış) to keep it tidy.
export const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: 'main',
    items: [
      { href: '/app/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
      // Menu building: ingredients → recipes → preps/production.
      {
        labelKey: 'kitchen',
        icon: ChefHat,
        children: [
          { href: '/app/ingredients', labelKey: 'ingredients', icon: Carrot },
          { href: '/app/recipes', labelKey: 'recipes', icon: ChefHat },
          { href: '/app/production', labelKey: 'production', icon: Factory },
        ],
      },
      // Stock on hand + what leaves it.
      {
        labelKey: 'stock',
        icon: Boxes,
        children: [
          { href: '/app/inventory', labelKey: 'inventory', icon: Boxes },
          { href: '/app/inventory/waste', labelKey: 'waste_log', icon: Trash2 },
        ],
      },
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
    // Owner data hub: full, filterable/sortable/paginated access to the raw logs.
    labelKey: 'data',
    items: [
      { href: '/app/data/sales', labelKey: 'data_sales', icon: Receipt },
      {
        href: '/app/data/purchases',
        labelKey: 'data_purchases',
        icon: ShoppingCart,
      },
      { href: '/app/data/waste', labelKey: 'data_waste', icon: Trash2 },
      {
        href: '/app/data/counts',
        labelKey: 'data_counts',
        icon: ClipboardList,
      },
    ],
  },
  {
    labelKey: 'settings',
    items: [
      { href: '/app/guide', labelKey: 'guide', icon: BookOpen },
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
