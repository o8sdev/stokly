import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { Link } from '@/lib/i18n/navigation'
import { BlogForm } from '@/components/admin/blog-form'
import { createBlogPost } from '../actions'

export default async function NewBlogPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  await requirePlatformAdmin(locale)
  const t = await getTranslations('admin.blog')
  const action = createBlogPost.bind(null, locale)

  return (
    <div>
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">{t('new_title')}</h1>
      <div className="mt-6">
        <BlogForm action={action} />
      </div>
    </div>
  )
}
