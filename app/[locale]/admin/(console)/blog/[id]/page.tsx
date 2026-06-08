import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/lib/i18n/navigation'
import { BlogForm } from '@/components/admin/blog-form'
import { updateBlogPost, deleteBlogPost, togglePublish } from '../actions'
import type { BlogPost } from '@/types/database'

export default async function EditBlogPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  setRequestLocale(locale)
  await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.blog')

  const supabase = createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  const post = data as BlogPost | null
  if (!post) notFound()

  const action = updateBlogPost.bind(null, locale, post.id)
  const isPublished = post.status === 'published'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Link>
        <div className="flex items-center gap-2">
          {isPublished && (
            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('view_live')}
            </Link>
          )}
          <form action={togglePublish.bind(null, locale, post.id, !isPublished)}>
            <button
              type="submit"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {isPublished ? t('unpublish') : t('publish')}
            </button>
          </form>
          <form action={deleteBlogPost.bind(null, locale, post.id)}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F08C8C]/30 px-3 py-1.5 text-xs font-medium text-[#F08C8C] transition-colors hover:bg-[#F08C8C]/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('delete')}
            </button>
          </form>
        </div>
      </div>

      <h1 className="mt-4 font-display text-2xl font-bold">{t('edit_title')}</h1>
      <div className="mt-6">
        <BlogForm action={action} post={post} />
      </div>
    </div>
  )
}
