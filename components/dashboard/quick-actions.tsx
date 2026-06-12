import { getTranslations } from 'next-intl/server'
import {
  Receipt,
  ClipboardList,
  Truck,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'

// The daily habit row: chunky tap targets for the four actions a restaurant
// does every day. "Enter today's sales" is THE loop, so it leads and is filled.
// Visible on every screen size (the old header buttons vanished on mobile).
export async function QuickActions() {
  const t = await getTranslations()

  const actions: {
    href: string
    label: string
    icon: LucideIcon
    primary?: boolean
  }[] = [
    { href: '/app/sales', label: t('dashboard.qa_sales'), icon: Receipt, primary: true },
    { href: '/app/inventory/count', label: t('inventory.count'), icon: ClipboardList },
    { href: '/app/purchases', label: t('purchases.title'), icon: Truck },
    { href: '/app/inventory/waste', label: t('inventory.waste'), icon: Trash2 },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {actions.map((a) => {
        const Icon = a.icon
        return (
          <Link
            key={a.href}
            href={a.href}
            className={cn(
              'group flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
              a.primary
                ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border bg-card text-foreground hover:border-primary/40'
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                !a.primary && 'text-primary'
              )}
            />
            <span className="truncate">{a.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
