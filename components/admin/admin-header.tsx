'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Menu, X } from 'lucide-react'
import { AdminNavLinks } from './admin-sidebar'
import { AdminCommandMenu } from './admin-command-menu'
import { AdminNotificationsBell } from './admin-notifications-bell'
import type { AdminNotification } from '@/types/database'
import type { SearchResult } from '@/lib/admin/search'
import { StoklyLogo } from '@/components/brand/logo'
import { SignOutButton } from '@/components/layout/sign-out'

export function AdminHeader({
  locale,
  email,
  roleLabel,
  unreadCount,
  notifications,
  onSignout,
  onMarkAllRead,
  onSearch,
}: {
  locale: string
  email: string | null
  roleLabel: string
  unreadCount: number
  notifications: AdminNotification[]
  onSignout: () => Promise<void>
  onMarkAllRead: () => Promise<void>
  onSearch: (q: string) => Promise<SearchResult[]>
}) {
  const t = useTranslations('admin')
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 md:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 md:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex items-center gap-2 md:hidden">
          <StoklyLogo tone="paper" size="sm" />
        </span>
      </div>

      <div className="flex items-center gap-2">
        <AdminCommandMenu onSearch={onSearch} />
        <AdminNotificationsBell
          locale={locale}
          unreadCount={unreadCount}
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sidebar p-4">
            <div className="mb-4 flex h-10 items-center justify-between">
              <span className="flex items-center gap-2">
                <StoklyLogo tone="paper" size="sm" />
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-6 overflow-y-auto scroll-thin">
              <AdminNavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white">
                  {email ?? '—'}
                </p>
                <p className="text-[11px] capitalize text-sidebar-muted">
                  {roleLabel}
                </p>
              </div>
              <SignOutButton
                action={onSignout}
                label={t('signout')}
                variant="admin"
                className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-white/5 hover:text-white disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
