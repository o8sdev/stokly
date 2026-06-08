'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  UserPlus,
  Wallet,
  ArrowUpCircle,
  LogIn,
  FileBarChart,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { formatRelativeTime } from '@/lib/utils'
import type { FeedItem } from '@/lib/admin/metrics'

const ICON: Record<string, LucideIcon> = {
  signup: UserPlus,
  payment_received: Wallet,
  plan_changed: ArrowUpCircle,
  login: LogIn,
  report_viewed: FileBarChart,
}
const KNOWN = Object.keys(ICON)

export function ActivityFeed({
  items,
  locale,
  intervalMs = 60000,
}: {
  items: FeedItem[]
  locale: string
  intervalMs?: number
}) {
  const t = useTranslations('admin.activity')
  const router = useRouter()

  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">{t('empty')}</p>
    )
  }

  return (
    <div className="divide-y divide-white/5">
      {items.map((it) => {
        const Icon = ICON[it.type] ?? Activity
        const label = KNOWN.includes(it.type) ? t(`event.${it.type}`) : it.type
        return (
          <div key={it.id} className="flex items-center gap-3 py-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <Link
              href={`/admin/tenants/${it.tenantId}`}
              className="font-medium text-white hover:text-brand"
            >
              {it.tenantName ?? '—'}
            </Link>
            <span className="flex-1 truncate text-sm text-slate-400">{label}</span>
            <span className="shrink-0 text-xs text-slate-500">
              {formatRelativeTime(it.createdAt, locale)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
