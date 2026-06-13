import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Trash2, Star } from 'lucide-react'
import { getGlobalLibrary } from '@/lib/data/queries'
import { ConfirmButton } from '@/components/admin/confirm-button'
import { LibraryAddForm } from './library-add-form'
import { deleteLibraryItem, toggleLibraryCommon } from './actions'

export default async function AdminLibraryPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('admin.library')
  const tc = await getTranslations('admin.confirm')
  const items = await getGlobalLibrary()

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-400">{t('subtitle')}</p>

      <div className="mt-6">
        <LibraryAddForm locale={locale} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        {items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            {t('empty')}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 text-left font-semibold">
                  {t('col_name')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('col_category')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('col_unit')}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t('yield')}
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  {t('common')}
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-white/[0.06] last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{g.name_az}</span>
                    {g.name_ru && (
                      <span className="ml-2 text-xs text-slate-500">
                        {g.name_ru}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{g.category}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">
                    {g.default_unit}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                    {Math.round((g.default_yield_percent ?? 1) * 100)}%
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <form
                      action={toggleLibraryCommon.bind(
                        null,
                        locale,
                        g.id,
                        !g.is_common
                      )}
                    >
                      <button
                        type="submit"
                        aria-label="common"
                        className={
                          'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/10 ' +
                          (g.is_common
                            ? 'text-brand'
                            : 'text-slate-500 hover:text-white')
                        }
                      >
                        <Star
                          className={
                            'h-4 w-4' + (g.is_common ? ' fill-current' : '')
                          }
                        />
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ConfirmButton
                      action={deleteLibraryItem.bind(null, locale, g.id)}
                      title={tc('delete_title')}
                      description={tc('irreversible')}
                      confirmLabel={tc('delete')}
                      triggerLabel={tc('delete')}
                      triggerClassName="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-[#F08C8C]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
