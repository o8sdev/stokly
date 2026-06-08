import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  Calculator,
  Layers,
  ChefHat,
  Smartphone,
  BarChart3,
  Languages,
  ArrowRight,
  Check,
  Star,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { Reveal } from '@/components/marketing/reveal'
import { CountUp } from '@/components/marketing/count-up'
import { ScrollProgress, Magnetic, HeroTilt, Gauge } from '@/components/marketing/fx'
import {
  HeroMock,
  MockDashboard,
  MockRecipe,
  MockInventory,
  type DashboardLabels,
} from '@/components/marketing/mockups'
import {
  Testimonials,
  type Testimonial,
} from '@/components/marketing/testimonials'
import { Faq, type FaqItem } from '@/components/marketing/faq'
import { DemoForm } from '@/components/marketing/demo-form'

const SERVICE_ICONS: LucideIcon[] = [
  Calculator,
  Layers,
  ChefHat,
  Smartphone,
  BarChart3,
  Languages,
]

export default async function LandingPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('landing')

  const logos = t.raw('trust.logos') as string[]
  const points = t.raw('problem.points') as { title: string; desc: string }[]
  const showcase = t.raw('showcase.items') as {
    kicker: string
    title: string
    desc: string
    bullets: string[]
  }[]
  const services = t.raw('services.items') as { title: string; desc: string }[]
  const steps = t.raw('how.steps') as {
    no: string
    title: string
    desc: string
  }[]
  const metrics = t.raw('metrics.items') as {
    value: number
    suffix: string
    label: string
  }[]
  const testimonials = t.raw('testimonials.items') as Testimonial[]
  const faqItems = t.raw('faq.items') as FaqItem[]

  const dashboardLabels: DashboardLabels = {
    title: t('mock.dashboard_title'),
    foodCost: t('hero.panel.food_cost'),
    inventory: t('hero.panel.inventory'),
    waste: t('hero.panel.waste'),
    trend: t('mock.trend'),
    expiring: t('mock.expiring'),
    fifo: t('mock.fifo'),
    days: t('mock.days'),
  }
  const recipeLabels = {
    title: t('mock.recipe_title'),
    recipeName: t('mock.recipe_name'),
    total: t('mock.total'),
    perServing: t('mock.per_serving'),
    foodCost: t('mock.food_cost'),
    suggested: t('mock.suggested'),
  }
  const inventoryLabels = {
    title: t('mock.inv_title'),
    name: t('mock.name'),
    stock: t('mock.stock'),
    status: t('mock.status'),
    batchReceived: t('mock.received'),
    batchExpiry: t('mock.expiry'),
  }

  return (
    <div className="mk-page relative min-h-screen overflow-clip font-sans">
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html:
              '.mk-reveal{opacity:1 !important;transform:none !important;filter:none !important}',
          }}
        />
      </noscript>

      {/* ── Atmosphere (fixed, drifting aurora + grain + blueprint) ───── */}
      <div className="mk-atmos mk-noise" aria-hidden>
        <div className="mk-blueprint absolute inset-0" />
        <div className="mk-aurora mk-aurora--teal mk-drift-a absolute -top-44 left-[6%] h-[640px] w-[640px]" />
        <div className="mk-aurora mk-aurora--cyan mk-drift-b absolute -top-10 right-[2%] h-[460px] w-[460px]" />
        <div className="mk-aurora mk-aurora--amber mk-drift-c absolute bottom-[-12%] left-[24%] h-[520px] w-[520px]" />
      </div>

      <ScrollProgress />
      <MarketingNav locale={locale} />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative px-5 pt-32 lg:px-8 lg:pt-44">
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal variant="blur">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-[#cdd9d3] backdrop-blur-sm">
              <span className="animate-mk-pulse h-1.5 w-1.5 rounded-full bg-brand" />
              {t('hero.badge')}
            </span>
          </Reveal>

          <Reveal variant="blur" delay={90}>
            <h1 className="mt-7 font-display text-[clamp(2.8rem,6.4vw,5rem)] font-bold leading-[1.02] tracking-[-0.025em] text-white">
              {t('hero.title_lead')}{' '}
              <span className="font-editorial italic font-medium mk-shimmer">
                {t('hero.title_accent')}
              </span>
            </h1>
          </Reveal>

          <Reveal variant="blur" delay={170}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#9fb2aa]">
              {t('hero.subtitle')}
            </p>
          </Reveal>

          <Reveal delay={250}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Magnetic>
                <a
                  href="#demo"
                  className="group inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-[#04231A] shadow-[0_16px_44px_-12px_rgba(0,200,150,0.65)] transition-colors hover:bg-brand-hover"
                >
                  {t('hero.cta_primary')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </Magnetic>
              <a
                href="#product"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-white transition-colors hover:bg-white/[0.07]"
              >
                {t('hero.cta_features')}
              </a>
            </div>
          </Reveal>

          <Reveal delay={330}>
            <div className="mt-7 flex items-center justify-center gap-3 text-sm text-[#9fb2aa]">
              <span className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-[#F5B301] text-[#F5B301]" />
                ))}
              </span>
              <span className="font-semibold text-white">{t('trust.rating')}</span>
              <span className="text-[#3a4a44]">·</span>
              <span>{t('trust.count')}</span>
            </div>
          </Reveal>
        </div>

        {/* Hero product frame */}
        <div className="relative mx-auto mt-16 max-w-4xl lg:mt-20">
          <div
            className="mk-glow absolute -inset-x-20 -bottom-16 top-10 -z-10"
            aria-hidden
          />
          <div className="animate-mk-rise">
            <HeroTilt>
              <div className="mk-ring rounded-[26px]">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-2.5 backdrop-blur-sm sm:p-3">
                  <HeroMock labels={dashboardLabels} />
                </div>
              </div>

              {/* Floating food-cost gauge */}
              <div className="mk-chip animate-mk-float absolute -left-6 -top-10 hidden items-center gap-3 p-3 lg:flex">
                <Gauge value={28.4} label={t('hero.panel.food_cost')} />
              </div>
            </HeroTilt>
          </div>
        </div>

        {/* Scroll cue */}
        <Reveal delay={500} className="mt-14 flex flex-col items-center gap-2">
          <div className="mk-scrollcue">
            <span />
          </div>
          <span className="flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-[#6c7e77]">
            {t('hero.scroll')}
            <ChevronDown className="h-3 w-3" />
          </span>
        </Reveal>
      </section>

      {/* ── LOGO MARQUEE ─────────────────────────────────────────────── */}
      <section className="relative mt-24 border-y border-white/[0.06] py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#6c7e77]">
          {t('trust.logos_label')}
        </p>
        <div className="mk-marquee-pause relative mt-7 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#070c0b] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#070c0b] to-transparent" />
          <div className="flex w-max animate-mk-marquee-slow items-center gap-16 pr-16">
            {[...logos, ...logos].map((name, i) => (
              <span
                key={i}
                className="font-display text-2xl font-semibold tracking-tight text-[#5d6f68] transition-colors hover:text-white"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────── */}
      <section className="relative py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker>{t('problem.kicker')}</Kicker>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-5xl">
              {t('problem.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#9fb2aa]">
              {t('problem.lead')}
            </p>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {points.map((p, i) => (
              <Reveal key={p.title} delay={i * 100} variant="scale">
                <div className="mk-card-d h-full p-7">
                  <span className="font-mono text-3xl font-medium text-brand/40">
                    0{i + 1}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-white">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#9fb2aa]">
                    {p.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASES ────────────────────────────────────────── */}
      <section id="product" className="scroll-mt-24 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-28 px-5 lg:px-8">
          {showcase.map((item, i) => {
            const reverse = i % 2 === 1
            const mock =
              i === 0 ? (
                <MockRecipe labels={recipeLabels} />
              ) : i === 1 ? (
                <MockInventory labels={inventoryLabels} />
              ) : (
                <MockDashboard labels={dashboardLabels} />
              )
            return (
              <div
                key={item.title}
                className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
              >
                <Reveal
                  variant={reverse ? 'right' : 'left'}
                  className={reverse ? 'lg:order-2' : ''}
                >
                  <Kicker>{item.kicker}</Kicker>
                  <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-[2.6rem]">
                    {item.title}
                  </h2>
                  <p className="mt-5 text-lg leading-relaxed text-[#9fb2aa]">
                    {item.desc}
                  </p>
                  <ul className="mt-7 space-y-3">
                    {item.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-center gap-3 text-[15px] font-medium text-[#dbe6e1]"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15 text-brand ring-1 ring-brand/25">
                          <Check className="h-3 w-3" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal
                  delay={120}
                  variant="scale"
                  className={reverse ? 'lg:order-1' : ''}
                >
                  <div className="relative">
                    <div
                      className="mk-glow absolute -inset-10 -z-10"
                      aria-hidden
                    />
                    {mock}
                  </div>
                </Reveal>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────────── */}
      <section className="relative py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker>{t('services.kicker')}</Kicker>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-5xl">
              {t('services.title')}
            </h2>
            <p className="mt-5 text-lg text-[#9fb2aa]">{t('services.lead')}</p>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => {
              const Icon = SERVICE_ICONS[i] ?? Calculator
              return (
                <Reveal key={s.title} delay={(i % 3) * 90} variant="scale">
                  <div className="mk-card-d h-full p-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 shadow-[0_0_30px_-8px_rgba(0,200,150,0.5)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-semibold text-white">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#9fb2aa]">
                      {s.desc}
                    </p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (stepper rail) ──────────────────────────────── */}
      <section id="how" className="scroll-mt-24 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker>{t('how.kicker')}</Kicker>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-5xl">
              {t('how.title')}
            </h2>
          </Reveal>
          <div className="relative mx-auto mt-16 max-w-2xl">
            <div
              className="absolute bottom-3 left-4 top-3 w-px bg-gradient-to-b from-brand/60 via-brand/20 to-transparent"
              aria-hidden
            />
            <div className="space-y-12">
              {steps.map((step, i) => (
                <Reveal key={step.no} delay={i * 120} variant="left">
                  <div className="relative pl-16">
                    <span className="absolute left-0 top-0 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-brand/40 bg-[#0a1311] font-mono text-sm font-medium text-brand shadow-[0_0_22px_-4px_rgba(0,200,150,0.6)]">
                      {step.no}
                    </span>
                    <h3 className="font-display text-2xl font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#9fb2aa]">
                      {step.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS ──────────────────────────────────────────────────── */}
      <section className="px-5 py-10 lg:px-8">
        <div className="mk-ring relative mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.025] px-6 py-16">
          <div className="mk-glow absolute -right-16 -top-16 h-72 w-72" aria-hidden />
          <div className="mk-glow absolute -bottom-16 -left-16 h-72 w-72" aria-hidden />
          <div className="relative grid grid-cols-2 gap-8 lg:grid-cols-4">
            {metrics.map((m, i) => (
              <Reveal key={m.label} delay={i * 90} className="text-center">
                <div className="font-display text-5xl font-bold text-white lg:text-6xl">
                  <CountUp to={m.value} suffix={m.suffix} />
                </div>
                <p className="mt-3 text-sm text-[#9fb2aa]">{m.label}</p>
              </Reveal>
            ))}
          </div>
          <p className="relative mt-10 text-center text-xs text-[#6c7e77]">
            {t('metrics.note')}
          </p>
        </div>
      </section>

      {/* ── MISSION ──────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal variant="left">
            <Kicker>{t('mission.kicker')}</Kicker>
            <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-4xl">
              {t('mission.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#9fb2aa]">
              {t('mission.body')}
            </p>
          </Reveal>
          <Reveal delay={120} variant="right">
            <div className="mk-card-d relative overflow-hidden p-10">
              <div className="mk-glow absolute -right-10 -top-10 h-52 w-52" aria-hidden />
              <div className="relative font-display text-7xl font-bold mk-shimmer">
                {t('mission.stat_value')}
              </div>
              <p className="relative mt-4 font-editorial text-xl italic leading-relaxed text-[#cdd9d3]">
                {t('mission.stat_label')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section id="testimonials" className="scroll-mt-24 py-24 lg:py-32">
        <div className="mx-auto mb-14 max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker>{t('testimonials.kicker')}</Kicker>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-5xl">
              {t('testimonials.title')}
            </h2>
          </Reveal>
        </div>
        <Testimonials items={testimonials} />
      </section>

      {/* ── DEMO ─────────────────────────────────────────────────────── */}
      <section id="demo" className="scroll-mt-24 py-24 lg:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal variant="left">
            <Kicker>{t('demo.kicker')}</Kicker>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-5xl">
              {t('demo.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#9fb2aa]">
              {t('demo.lead')}
            </p>
            <ul className="mt-8 space-y-3">
              {[services[0]?.title, services[1]?.title, services[5]?.title].map(
                (line, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-[15px] font-medium text-[#dbe6e1]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15 text-brand ring-1 ring-brand/25">
                      <Check className="h-3 w-3" />
                    </span>
                    {line}
                  </li>
                )
              )}
            </ul>
          </Reveal>
          <Reveal delay={120} variant="scale">
            <div className="relative">
              <div className="mk-glow absolute -inset-8 -z-10" aria-hidden />
              <div className="rounded-3xl border border-[#e2e8ee] bg-white p-7 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.85)] lg:p-8">
                <DemoForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-24 py-24 lg:py-32">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <Reveal className="mb-12 text-center">
            <Kicker>{t('faq.kicker')}</Kicker>
            <h2 className="mt-5 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-5xl">
              {t('faq.title')}
            </h2>
          </Reveal>
          <Reveal>
            <Faq items={faqItems} />
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="px-5 pb-16 lg:px-8">
        <div className="mk-ring relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0a1614] to-[#070c0b] px-6 py-24 text-center">
          <div className="mk-blueprint absolute inset-0" aria-hidden />
          <div
            className="mk-glow absolute left-1/2 top-0 h-72 w-[720px] -translate-x-1/2"
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl">
            <Reveal variant="scale">
              <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-white lg:text-6xl">
                {t('cta.title')}
              </h2>
              <p className="mt-5 text-lg text-[#9fb2aa]">{t('cta.subtitle')}</p>
              <div className="mt-9 flex justify-center">
                <Magnetic>
                  <a
                    href="#demo"
                    className="group inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-4 text-base font-semibold text-[#04231A] shadow-[0_18px_50px_-12px_rgba(0,200,150,0.7)] transition-colors hover:bg-brand-hover"
                  >
                    {t('cta.button')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </Magnetic>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              <span className="font-display text-xl font-bold text-white">
                Stokly
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#9fb2aa]">
              {t('footer.tagline')}
            </p>
          </div>
          <div className="flex gap-16">
            <FooterCol title={t('footer.product')}>
              <FooterLink href="#product">
                {t('footer.links.services')}
              </FooterLink>
              <FooterLink href="#how">{t('footer.links.how')}</FooterLink>
              <FooterLink href="#testimonials">
                {t('nav.testimonials')}
              </FooterLink>
              <FooterLink href="#demo">{t('footer.links.demo')}</FooterLink>
            </FooterCol>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl px-5 lg:px-8">
          <p className="border-t border-white/[0.06] pt-6 text-xs text-[#6c7e77]">
            {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[0.07] px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-brand">
      <span className="h-1 w-1 rounded-full bg-brand" />
      {children}
    </span>
  )
}

function FooterCol({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6c7e77]">
        {title}
      </p>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  )
}

function FooterLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="text-sm text-[#9fb2aa] transition-colors hover:text-white"
    >
      {children}
    </a>
  )
}
