import { getTranslations, setRequestLocale } from 'next-intl/server'
import { revalidatePath } from 'next/cache'
import {
  UserPlus,
  Clock,
  PauseCircle,
  Moon,
  AlertTriangle,
  ArrowUpCircle,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import {
  getNotifications,
  markAllNotificationsRead,
} from '@/lib/admin/notifications'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { NotificationType } from '@/types/database'

type SP = Record<string, string | string[] | undefined>
const str = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' ? v : undefined

const ICON: Record<NotificationType, LucideIcon> = {
  new_signup: UserPlus,
  trial_expiring: Clock,
  onboarding_stuck: PauseCircle,
  no_login: Moon,
  payment_overdue: AlertTriangle,
  plan_upgraded: ArrowUpCircle,
}
const TYPES: NotificationType[] = [
  'new_signup',
  'trial_expiring',
  'onboarding_stuck',
  'no_login',
  'payment_overdue',
  'plan_upgraded',
]

export default async function AdminNotificationsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: SP
}) {
  setRequestLocale(locale)
  await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.notifications')

  const filter = str(searchParams.filter)
  const type = str(searchParams.type)
  const items = await getNotifications(100, {
    unreadOnly: filter === 'unread',
    type,
  })

  async function markAll() {
    'use server'
    await requirePlatformAdmin(locale)
    await markAllNotificationsRead()
    revalidatePath(`/${locale}/admin`, 'layout')
  }

  function tabHref(f: string | null, ty: string | null): string {
    const sp = new URLSearchParams()
    if (f) sp.set('filter', f)
    if (ty) sp.set('type', ty)
    const q = sp.toString()
    return q ? `/admin/notifications?${q}` : '/admin/notifications'
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <form action={markAll}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-sm text-slate-300 hover:bg-white/10"
          >
            <CheckCheck className="h-4 w-4" /> {t('mark_all_read')}
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Link
          href={tabHref(null, type ?? null)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm',
            !filter ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
          )}
        >
          {t('all')}
        </Link>
        <Link
          href={tabHref('unread', type ?? null)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm',
            filter === 'unread' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
          )}
        >
          {t('unread')}
        </Link>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <Link
          href={tabHref(filter ?? null, null)}
          className={cn(
            'rounded-lg px-2.5 py-1.5 text-xs',
            !type ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
          )}
        >
          {t('all_types')}
        </Link>
        {TYPES.map((ty) => (
          <Link
            key={ty}
            href={tabHref(filter ?? null, ty)}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs',
              type === ty ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            {t(`type.${ty}`)}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {items.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">{t('empty')}</p>
        ) : (
          items.map((n) => {
            const Icon = ICON[n.type]
            const unread = !n.read_at
            return (
              <Link
                key={n.id}
                href={
                  n.tenant_id ? `/admin/tenants/${n.tenant_id}` : '/admin/notifications'
                }
                className={cn(
                  'flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 transition-colors last:border-0 hover:bg-white/[0.03]',
                  unread && 'bg-brand/[0.04]'
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">
                    {n.title}
                    {unread && (
                      <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-brand align-middle" />
                    )}
                  </p>
                  {n.body && <p className="text-sm text-slate-400">{n.body}</p>}
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  {formatRelativeTime(n.created_at, locale)}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
