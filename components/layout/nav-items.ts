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
  Coins,
  LineChart,
  History,
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

// Compact two-section sidebar. Everything related lives under ONE collapsible
// group: entry pages first, their journals/explorers right beneath them, and
// all reports (incl. finances) under a single Hesabatlar group — instead of
// the former 11 flat rows across two extra sections.
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
      // Stock on hand + the journals. Each journal page carries a "+ qeyd et"
      // button to its entry form, so the entry isn't a separate sidebar row.
      {
        labelKey: 'stock',
        icon: Boxes,
        children: [
          { href: '/app/inventory', labelKey: 'inventory', icon: Boxes },
          { href: '/app/data/counts', labelKey: 'data_counts', icon: ClipboardList },
          { href: '/app/data/waste', labelKey: 'data_waste', icon: Trash2 },
        ],
      },
      // Money in / money out — the journals are home; entry is a button on each.
      {
        labelKey: 'trade',
        icon: ShoppingBag,
        children: [
          { href: '/app/data/sales', labelKey: 'data_sales', icon: Receipt },
          {
            href: '/app/data/purchases',
            labelKey: 'data_purchases',
            icon: ShoppingCart,
          },
          {
            href: '/app/purchases/shopping-list',
            labelKey: 'shopping_list',
            icon: ListChecks,
          },
        ],
      },
      // Money: P&L summary, food-cost margins, stock value, supplier pricing.
      {
        labelKey: 'finances',
        icon: Coins,
        children: [
          { href: '/app/data/finances', labelKey: 'data_finances', icon: Coins },
          { href: '/app/reports/food-cost', labelKey: 'food_cost', icon: TrendingUp },
          {
            href: '/app/reports/inventory-value',
            labelKey: 'inventory_value',
            icon: Wallet,
          },
          {
            href: '/app/reports/supplier-pricing',
            labelKey: 'supplier_pricing',
            icon: LineChart,
          },
        ],
      },
      // Operational analytics — counts, stock, menu, locations, activity.
      {
        labelKey: 'reports',
        icon: TrendingUp,
        children: [
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
          {
            href: '/app/data/activity',
            labelKey: 'data_activity',
            icon: History,
          },
        ],
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

// Entry pages reached via a journal's "+ qeyd et" button / dashboard quick
// actions (not sidebar rows) still need a correct top-bar title. Maps the
// href to an existing `nav` label key.
export const TITLE_ALIASES: Record<string, string> = {
  '/app/sales': 'sales',
  '/app/purchases': 'purchases',
  '/app/inventory/waste': 'waste_log',
  '/app/inventory/count': 'data_counts',
  '/app/onboarding': 'onboarding',
}

// Flat list used by the mobile bottom tab bar (icons only, primary routes).
// Sales replaces the food-cost report: entering today's sales IS the daily loop.
export const MOBILE_NAV: NavItem[] = [
  { href: '/app/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/app/sales', labelKey: 'sales', icon: Receipt },
  { href: '/app/ingredients', labelKey: 'ingredients', icon: Carrot },
  { href: '/app/recipes', labelKey: 'recipes', icon: ChefHat },
  { href: '/app/inventory', labelKey: 'inventory', icon: Boxes },
]
