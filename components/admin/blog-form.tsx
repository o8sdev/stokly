'use client'

import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { SubmitButton } from '@/components/ui/submit-button'
import type { BlogResult } from '@/app/[locale]/admin/(console)/blog/actions'
import type { BlogPost } from '@/types/database'

const field =
  'h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none'
const area =
  'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none'

export function BlogForm({
  action,
  post,
}: {
  action: (prev: BlogResult, formData: FormData) => Promise<BlogResult>
  post?: BlogPost
}) {
  const t = useTranslations('admin.blog')
  const [state, formAction] = useFormState<BlogResult, FormData>(action, {})

  const err =
    state.error === 'slug'
      ? t('slug_taken')
      : state.error === 'validation'
        ? t('required')
        : state.error
          ? t('error')
          : null

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {/* Meta row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            {t('status')}
          </label>
          <select
            name="status"
            defaultValue={post?.status ?? 'draft'}
            className={field}
          >
            <option value="draft">{t('draft')}</option>
            <option value="published">{t('published')}</option>
            <option value="archived">{t('archived')}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            {t('tag')}
          </label>
          <input name="tag" defaultValue={post?.tag ?? ''} className={field} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            {t('slug')}
          </label>
          <input
            name="slug"
            defaultValue={post?.slug ?? ''}
            placeholder={t('slug_hint')}
            className={field + ' font-mono'}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">
          {t('cover')}
        </label>
        <input
          name="cover_url"
          defaultValue={post?.cover_url ?? ''}
          placeholder="https://…"
          className={field}
        />
      </div>

      {/* Bilingual columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            AZ
          </p>
          <input
            name="title_az"
            required
            defaultValue={post?.title_az ?? ''}
            placeholder={t('title_field')}
            className={field}
          />
          <textarea
            name="excerpt_az"
            rows={2}
            defaultValue={post?.excerpt_az ?? ''}
            placeholder={t('excerpt')}
            className={area}
          />
          <textarea
            name="body_az"
            rows={12}
            required
            defaultValue={post?.body_az ?? ''}
            placeholder={t('body')}
            className={area}
          />
        </div>
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            RU
          </p>
          <input
            name="title_ru"
            defaultValue={post?.title_ru ?? ''}
            placeholder={t('title_field')}
            className={field}
          />
          <textarea
            name="excerpt_ru"
            rows={2}
            defaultValue={post?.excerpt_ru ?? ''}
            placeholder={t('excerpt')}
            className={area}
          />
          <textarea
            name="body_ru"
            rows={12}
            defaultValue={post?.body_ru ?? ''}
            placeholder={t('body')}
            className={area}
          />
        </div>
      </div>

      {err && <p className="text-sm text-[#F08C8C]">{err}</p>}

      <SubmitButton className="h-11 px-6">{t('save')}</SubmitButton>
    </form>
  )
}
