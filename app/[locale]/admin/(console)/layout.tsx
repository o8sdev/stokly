import { getTranslations, setRequestLocale } from 'next-intl/server'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { signout } from '@/lib/auth/actions'
import { globalSearch, type SearchResult } from '@/lib/admin/search'
import {
  getUnreadNotificationCount,
  getNotifications,
  markAllNotificationsRead,
} from '@/lib/admin/notifications'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function AdminConsoleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const ctx = await requirePlatformAdmin(locale)
  const t = await getTranslations('admin')

  const [unread, notifications] = await Promise.all([
    getUnreadNotificationCount(),
    getNotifications(5),
  ])

  const roleLabel = ctx.role === 'super' ? t('role_super') : t('role_readonly')

  async function onSignout() {
    'use server'
    await signout(locale, `/${locale}/admin/login`)
  }

  async function onMarkAllRead() {
    'use server'
    await requirePlatformAdmin(locale)
    await markAllNotificationsRead()
    revalidatePath(`/${locale}/admin`, 'layout')
  }

  async function onSearch(q: string): Promise<SearchResult[]> {
    'use server'
    await requirePlatformAdmin(locale)
    return globalSearch(q, locale)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a1622] text-white">
      <AdminSidebar
        email={ctx.email}
        roleLabel={roleLabel}
        onSignout={onSignout}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader
          locale={locale}
          email={ctx.email}
          roleLabel={roleLabel}
          unreadCount={unread}
          notifications={notifications}
          onSignout={onSignout}
          onMarkAllRead={onMarkAllRead}
          onSearch={onSearch}
        />
        <main className="flex-1 overflow-y-auto scroll-thin p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
