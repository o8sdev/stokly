'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import {
  Bell,
  UserPlus,
  Clock,
  PauseCircle,
  Moon,
  AlertTriangle,
  ArrowUpCircle,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { formatRelativeTime } from '@/lib/utils'
import type { AdminNotification, NotificationType } from '@/types/database'

const ICON: Record<NotificationType, LucideIcon> = {
  new_signup: UserPlus,
  trial_expiring: Clock,
  onboarding_stuck: PauseCircle,
  no_login: Moon,
  payment_overdue: AlertTriangle,
  plan_upgraded: ArrowUpCircle,
}

export function AdminNotificationsBell({
  locale,
  unreadCount,
  notifications,
  onMarkAllRead,
}: {
  locale: string
  unreadCount: number
  notifications: AdminNotification[]
  onMarkAllRead: () => Promise<void>
}) {
  const t = useTranslations('admin.notifications')
  const [pending, startTransition] = React.useTransition()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={t('title')}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
          <span className="text-sm font-semibold text-white">{t('title')}</span>
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => onMarkAllRead())}
              className="text-xs text-brand transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {t('mark_all_read')}
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto scroll-thin">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              {t('empty')}
            </p>
          ) : (
            notifications.map((n) => {
              const Icon = ICON[n.type]
              const unread = !n.read_at
              return (
                <Link
                  key={n.id}
                  href={n.tenant_id ? `/admin/tenants/${n.tenant_id}` : '/admin/notifications'}
                  className="flex gap-3 border-b border-white/5 px-3 py-2.5 transition-colors last:border-0 hover:bg-white/5"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {n.title}
                      {unread && (
                        <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand align-middle" />
                      )}
                    </p>
                    {n.body && (
                      <p className="truncate text-xs text-slate-400">{n.body}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatRelativeTime(n.created_at, locale)}
                    </p>
                  </div>
                </Link>
              )
            })
          )}
        </div>

        <Link
          href="/admin/notifications"
          className="block border-t border-white/10 px-3 py-2.5 text-center text-xs font-medium text-brand transition-colors hover:bg-white/5"
        >
          {t('see_all')}
        </Link>
      </PopoverContent>
    </Popover>
  )
}
