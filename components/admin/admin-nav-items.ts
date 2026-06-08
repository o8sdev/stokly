import {
  LayoutDashboard,
  Inbox,
  Bell,
  Building2,
  Rocket,
  Ticket,
  Wallet,
  Layers,
  ToggleRight,
  ScrollText,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavItem {
  href: string
  labelKey: string // admin.nav.<key>
  icon: LucideIcon
}

export interface AdminNavSection {
  labelKey: string // admin.nav.section.<key>
  items: AdminNavItem[]
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    labelKey: 'main',
    items: [
      { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
      { href: '/admin/leads', labelKey: 'leads', icon: Inbox },
      { href: '/admin/notifications', labelKey: 'notifications', icon: Bell },
    ],
  },
  {
    labelKey: 'tenants',
    items: [
      { href: '/admin/tenants', labelKey: 'tenants', icon: Building2 },
      { href: '/admin/onboarding', labelKey: 'onboarding', icon: Rocket },
      { href: '/admin/invitations', labelKey: 'invitations', icon: Ticket },
    ],
  },
  {
    labelKey: 'finance',
    items: [
      { href: '/admin/revenue', labelKey: 'revenue', icon: Wallet },
      { href: '/admin/plans', labelKey: 'plans', icon: Layers },
    ],
  },
  {
    labelKey: 'system',
    items: [
      { href: '/admin/feature-flags', labelKey: 'flags', icon: ToggleRight },
      { href: '/admin/logs', labelKey: 'logs', icon: ScrollText },
      { href: '/admin/library', labelKey: 'library', icon: BookOpen },
    ],
  },
]

export const ADMIN_NAV_HREFS = ADMIN_NAV_SECTIONS.flatMap((s) =>
  s.items.map((i) => i.href)
)
