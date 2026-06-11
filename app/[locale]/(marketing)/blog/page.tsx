import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
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

// ISR: refresh the static list periodically so posts added directly in the DB
// appear without a redeploy. Publishing via /admin also revalidates instantly.
export const revalidate = 300

export default async function BlogIndexPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('blog')

  const supabase = createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  const posts = (data as BlogPost[] | null) ?? []

  return (
    <div className="mk-page relative min-h-screen overflow-clip font-sans">
      <MarketingAtmosphere />
      <ScrollProgress />
      <MarketingNav locale={locale} />

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-32 lg:px-8 lg:pt-44">
        <Reveal variant="blur" className="text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#00926e]">
            {t('eyebrow')}
          </span>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-[-0.025em] text-[#1c1a14] lg:text-6xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[#5b574a]">
            {t('subtitle')}
          </p>
        </Reveal>

        {posts.length === 0 ? (
          <p className="mt-24 text-center text-[#5b574a]">{t('empty')}</p>
        ) : (
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {posts.map((p, i) => {
              const title = pick(locale, p.title_az, p.title_ru)
              const excerpt = pick(locale, p.excerpt_az, p.excerpt_ru)
              return (
                <Reveal key={p.id} delay={(i % 2) * 90} variant="scale">
                  <Link
                    href={`/blog/${p.slug}`}
                    className="mk-card-d group block h-full overflow-hidden"
                  >
                    {p.cover_url && (
                      <div className="aspect-[16/9] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.cover_url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-7">
                      {p.tag && (
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[#00926e]">
                          {p.tag}
                        </span>
                      )}
                      <h2 className="mt-2 font-display text-2xl font-semibold leading-snug text-[#1c1a14]">
                        {title}
                      </h2>
                      {excerpt && (
                        <p className="mt-3 text-[15px] leading-relaxed text-[#5b574a]">
                          {excerpt}
                        </p>
                      )}
                      <div className="mt-6 flex items-center gap-2 text-xs text-[#8e8a7b]">
                        <span>{formatDate(p.published_at ?? p.created_at)}</span>
                        <span className="ml-auto inline-flex items-center gap-1 font-medium text-[#00926e]">
                          {t('read_more')}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        )}
      </main>

      <MarketingFooter locale={locale} />
    </div>
  )
}
