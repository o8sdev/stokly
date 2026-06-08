import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Plus, Pencil } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/lib/i18n/navigation'
import { formatDate } from '@/lib/utils'
import type { BlogPost } from '@/types/database'

export default async function AdminBlogPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.blog')

  const supabase = createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })
  const posts = (data as BlogPost[] | null) ?? []

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-400">{t('subtitle')}</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-[#04231A] transition-colors hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" />
          {t('new')}
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        {posts.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            {t('empty')}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 text-left font-semibold">
                  {t('col_title')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('col_status')}
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  {t('col_date')}
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-white/[0.06] last:border-0"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.title_az}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">
                      /{p.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ' +
                        (p.status === 'published'
                          ? 'bg-brand/15 text-brand'
                          : 'bg-white/10 text-slate-400')
                      }
                    >
                      {p.status === 'published' ? t('published') : t('draft')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(p.published_at ?? p.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/blog/${p.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
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
