import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/lib/i18n/navigation'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import {
  MarketingAtmosphere,
  MarketingFooter,
} from '@/components/marketing/shell'
import { ScrollProgress } from '@/components/marketing/fx'
import { Reveal } from '@/components/marketing/reveal'
import { formatDate } from '@/lib/utils'
import type { BlogPost } from '@/types/database'

function pick(locale: string, az: string | null, ru: string | null): string {
  return (locale === 'ru' ? ru || az : az || ru) ?? ''
}

export const revalidate = 300

export default async function BlogPostPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('blog')

  const supabase = createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  const post = data as BlogPost | null
  if (!post) notFound()

  const title = pick(locale, post.title_az, post.title_ru)
  const body = pick(locale, post.body_az, post.body_ru)
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim().length > 0)

  return (
    <div className="mk-page relative min-h-screen overflow-clip font-sans">
      <MarketingAtmosphere />
      <ScrollProgress />
      <MarketingNav locale={locale} />

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-32 lg:px-8 lg:pt-40">
        <Reveal variant="blur">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-[#9fb2aa] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Link>

          <div className="mt-8 flex items-center gap-3 text-xs text-[#6c7e77]">
            {post.tag && (
              <span className="font-mono uppercase tracking-wider text-brand">
                {post.tag}
              </span>
            )}
            <span>{formatDate(post.published_at ?? post.created_at)}</span>
          </div>

          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-white lg:text-5xl">
            {title}
          </h1>
        </Reveal>

        {post.cover_url && (
          <Reveal variant="scale" delay={80}>
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover_url}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          </Reveal>
        )}

        <Reveal delay={120}>
          <article className="mt-10 space-y-5">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="whitespace-pre-line text-[17px] leading-[1.85] text-[#c3d0ca]"
              >
                {p}
              </p>
            ))}
          </article>
        </Reveal>

        <div className="mt-16 border-t border-white/[0.08] pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Link>
        </div>
      </main>

      <MarketingFooter locale={locale} />
    </div>
  )
}
