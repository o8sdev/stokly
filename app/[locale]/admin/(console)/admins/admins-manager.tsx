'use client'

import { useState, useTransition } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { addAdmin, removeAdmin, type AdminsResult } from './actions'

interface AdminRow {
  user_id: string
  email: string | null
  role: string
  created_at: string
}

export function AdminsManager({
  locale,
  admins,
  selfId,
}: {
  locale: string
  admins: AdminRow[]
  selfId: string
}) {
  const t = useTranslations('admin.admins')
  const [addState, addAction] = useFormState<AdminsResult, FormData>(
    addAdmin.bind(null, locale),
    {}
  )
  const [removeErr, setRemoveErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onRemove(userId: string) {
    setRemoveErr(null)
    startTransition(async () => {
      const res = await removeAdmin(locale, userId)
      if (res?.error) setRemoveErr(t(`err_${res.error}`))
    })
  }

  const input =
    'mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none'

  return (
    <div className="space-y-5">
      <form
        action={addAction}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs font-medium text-slate-400">
            {t('email')}
          </label>
          <input name="email" type="email" required placeholder="ad@example.com" className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400">
            {t('role')}
          </label>
          <select name="role" className={input}>
            <option value="super">{t('role_super')}</option>
            <option value="readonly">{t('role_readonly')}</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t('add')}
        </button>
        {addState.error && (
          <p className="w-full text-sm text-[#F08C8C]">
            {t(`err_${addState.error}`)}
          </p>
        )}
        {addState.ok && (
          <p className="w-full text-sm text-emerald-400">{t('added')}</p>
        )}
      </form>
      <p className="-mt-2 text-xs text-slate-500">{t('add_hint')}</p>

      {removeErr && <p className="text-sm text-[#F08C8C]">{removeErr}</p>}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3 text-left font-semibold">{t('email')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('role')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('added_col')}</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr
                key={a.user_id}
                className="border-b border-white/[0.06] last:border-0"
              >
                <td className="px-4 py-2.5 font-medium">
                  {a.email ?? '—'}
                  {a.user_id === selfId && (
                    <span className="ml-2 text-xs text-slate-500">
                      ({t('you')})
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-300">
                  {a.role === 'super' ? t('role_super') : t('role_readonly')}
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-400">
                  {a.created_at.slice(0, 10)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    disabled={a.user_id === selfId || pending}
                    onClick={() => onRemove(a.user_id)}
                    title={t('remove')}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-[#F08C8C] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
