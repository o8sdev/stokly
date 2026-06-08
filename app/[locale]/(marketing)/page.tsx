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
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { Reveal } from '@/components/marketing/reveal'
import { CountUp } from '@/components/marketing/count-up'
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
  const services = t.raw('services.items') as {
    title: string
    desc: string
  }[]
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
    <div className="min-h-screen bg-white font-sans text-[#0d1b2a]">
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html: '.mk-reveal{opacity:1 !important;transform:none !important}',
          }}
        />
      </noscript>
      <MarketingNav locale={locale} />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pt-32 lg:px-8 lg:pt-40">
        <div className="mk-grid-light absolute inset-0" aria-hidden />
        <div
          className="mk-bloom-mint absolute -top-20 left-1/2 h-[560px] w-[860px] -translate-x-1/2 blur-2xl"
          aria-hidden
        />
        <div
          className="mk-bloom-cool absolute right-0 top-40 h-[420px] w-[420px] blur-2xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e2ebe8] bg-white px-3.5 py-1.5 text-xs font-medium text-[#46586b] mk-shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {t('hero.badge')}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-7 font-display text-[clamp(2.7rem,6.2vw,4.7rem)] font-bold leading-[1.03] tracking-[-0.02em] text-[#0d1b2a]">
              {t('hero.title_lead')}{' '}
              <span className="mk-teal-grad">{t('hero.title_accent')}</span>
            </h1>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#46586b]">
              {t('hero.subtitle')}
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-[#04231A] shadow-[0_12px_30px_-10px_rgba(0,200,150,0.55)] transition-colors hover:bg-brand-hover"
              >
                {t('hero.cta_primary')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#demo"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#dde5ea] bg-white px-6 text-sm font-semibold text-[#0d1b2a] transition-colors hover:bg-[#f6f9f8]"
              >
                {t('hero.cta_secondary')}
              </a>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-7 flex items-center justify-center gap-3 text-sm text-[#46586b]">
              <span className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-[#F5B301] text-[#F5B301]"
                  />
                ))}
              </span>
              <span className="font-semibold text-[#0d1b2a]">
                {t('trust.rating')}
              </span>
              <span className="text-[#c2cdd6]">·</span>
              <span>{t('trust.count')}</span>
            </div>
          </Reveal>
        </div>

        {/* Hero product mockup */}
        <div className="relative mx-auto mt-16 max-w-4xl animate-mk-rise lg:mt-20">
          <HeroMock labels={dashboardLabels} />
        </div>
      </section>

      {/* ── LOGO WALL ────────────────────────────────────────────────── */}
      <section className="border-y border-[#eef2f5] bg-white py-12">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#9aa7b4]">
            {t('trust.logos_label')}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {logos.map((name) => (
              <span key={name} className="mk-wordmark text-xl md:text-2xl">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────── */}
      <section className="bg-[#fbfdfc] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker>{t('problem.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-[#0d1b2a] lg:text-5xl">
              {t('problem.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#46586b]">
              {t('problem.lead')}
            </p>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {points.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div className="mk-card mk-shadow-card h-full p-7">
                  <span className="font-mono text-sm font-medium text-[#00936c]">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-[#0d1b2a]">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#5b6b7d]">
                    {p.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASES ────────────────────────────────────────── */}
      <section id="product" className="scroll-mt-20 py-24 lg:py-32">
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
                <Reveal className={reverse ? 'lg:order-2' : ''}>
                  <Kicker>{item.kicker}</Kicker>
                  <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-[#0d1b2a] lg:text-[2.6rem]">
                    {item.title}
                  </h2>
                  <p className="mt-5 text-lg leading-relaxed text-[#46586b]">
                    {item.desc}
                  </p>
                  <ul className="mt-7 space-y-3">
                    {item.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-center gap-3 text-[15px] font-medium text-[#0d1b2a]"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/12 text-[#00936c]">
                          <Check className="h-3 w-3" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal
                  delay={120}
                  className={reverse ? 'lg:order-1' : ''}
                >
                  {mock}
                </Reveal>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── SERVICES (feature grid) ──────────────────────────────────── */}
      <section className="bg-[#fbfdfc] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker>{t('services.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-[#0d1b2a] lg:text-5xl">
              {t('services.title')}
            </h2>
            <p className="mt-5 text-lg text-[#46586b]">{t('services.lead')}</p>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => {
              const Icon = SERVICE_ICONS[i] ?? Calculator
              return (
                <Reveal key={s.title} delay={(i % 3) * 80}>
                  <div className="mk-card mk-shadow-card mk-lift h-full p-7 hover:border-brand/40">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d1b2a] text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-semibold text-[#0d1b2a]">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#5b6b7d]">
                      {s.desc}
                    </p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how" className="scroll-mt-20 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker>{t('how.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-[#0d1b2a] lg:text-5xl">
              {t('how.title')}
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.no} delay={i * 110}>
                <div className="relative">
                  <span className="font-mono text-5xl font-medium text-brand/30">
                    {step.no}
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-semibold text-[#0d1b2a]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#5b6b7d]">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── METRICS (dark band) ──────────────────────────────────────── */}
      <section className="px-5 py-10 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#0d1b2a] px-6 py-16 mk-shadow-deep">
          <div
            className="mk-bloom-teal absolute -right-20 -top-20 h-80 w-80 blur-2xl"
            aria-hidden
          />
          <div className="relative grid grid-cols-2 gap-8 lg:grid-cols-4">
            {metrics.map((m, i) => (
              <Reveal key={m.label} delay={i * 80} className="text-center">
                <div className="font-display text-5xl font-bold text-white lg:text-6xl">
                  <CountUp to={m.value} suffix={m.suffix} />
                </div>
                <p className="mt-3 text-sm text-slate-400">{m.label}</p>
              </Reveal>
            ))}
          </div>
          <p className="relative mt-10 text-center text-xs text-slate-500">
            {t('metrics.note')}
          </p>
        </div>
      </section>

      {/* ── MISSION ──────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <Kicker>{t('mission.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-[#0d1b2a] lg:text-4xl">
              {t('mission.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#46586b]">
              {t('mission.body')}
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mk-card mk-shadow-float relative overflow-hidden p-9">
              <div
                className="mk-bloom-mint absolute -right-10 -top-10 h-48 w-48 blur-xl"
                aria-hidden
              />
              <div className="relative font-display text-7xl font-bold mk-teal-grad">
                {t('mission.stat_value')}
              </div>
              <p className="relative mt-4 text-lg leading-relaxed text-[#46586b]">
                {t('mission.stat_label')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section id="testimonials" className="scroll-mt-20 bg-[#fbfdfc] py-24 lg:py-32">
        <div className="mx-auto mb-14 max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Kicker>{t('testimonials.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-[#0d1b2a] lg:text-5xl">
              {t('testimonials.title')}
            </h2>
          </Reveal>
        </div>
        <Testimonials items={testimonials} />
      </section>

      {/* ── DEMO ─────────────────────────────────────────────────────── */}
      <section id="demo" className="scroll-mt-20 py-24 lg:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <Kicker>{t('demo.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-[#0d1b2a] lg:text-5xl">
              {t('demo.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#46586b]">
              {t('demo.lead')}
            </p>
            <ul className="mt-8 space-y-3">
              {[services[0]?.title, services[1]?.title, services[5]?.title].map(
                (line, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-[15px] font-medium text-[#0d1b2a]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/12 text-[#00936c]">
                      <Check className="h-3 w-3" />
                    </span>
                    {line}
                  </li>
                )
              )}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="mk-card mk-shadow-float p-7 lg:p-8">
              <DemoForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 bg-[#fbfdfc] py-24 lg:py-32">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <Reveal className="mb-12 text-center">
            <Kicker>{t('faq.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-[#0d1b2a] lg:text-5xl">
              {t('faq.title')}
            </h2>
          </Reveal>
          <Reveal>
            <Faq items={faqItems} />
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA (dark) ─────────────────────────────────────────── */}
      <section className="px-5 pb-12 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0f2032] to-[#0a1422] px-6 py-24 text-center mk-shadow-deep">
          <div className="mk-grid absolute inset-0" aria-hidden />
          <div
            className="mk-bloom-teal absolute left-1/2 top-0 h-72 w-[680px] -translate-x-1/2 blur-2xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl">
            <Reveal>
              <h2 className="font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-white lg:text-6xl">
                {t('cta.title')}
              </h2>
              <p className="mt-5 text-lg text-slate-300">{t('cta.subtitle')}</p>
              <div className="mt-9 flex justify-center">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-4 text-base font-semibold text-[#04231A] shadow-[0_14px_40px_-12px_rgba(0,200,150,0.7)] transition-colors hover:bg-brand-hover"
                >
                  {t('cta.button')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[#eef2f5] py-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              <span className="font-display text-xl font-bold text-[#0d1b2a]">
                Stokly
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#6b7a8d]">
              {t('footer.tagline')}
            </p>
          </div>
          <div className="flex gap-16">
            <FooterCol title={t('footer.product')}>
              <FooterLink href="#product">
                {t('footer.links.services')}
              </FooterLink>
              <FooterLink href="#how">{t('footer.links.how')}</FooterLink>
              <FooterLink href="#demo">{t('footer.links.demo')}</FooterLink>
            </FooterCol>
            <FooterCol title={t('footer.company')}>
              <FooterNavLink href="/login">
                {t('footer.links.login')}
              </FooterNavLink>
              <FooterNavLink href="/signup">
                {t('footer.links.signup')}
              </FooterNavLink>
            </FooterCol>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl px-5 lg:px-8">
          <p className="border-t border-[#eef2f5] pt-6 text-xs text-[#9aa7b4]">
            {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#00936c]">
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
      <p className="text-xs font-semibold uppercase tracking-wider text-[#9aa7b4]">
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
      className="text-sm text-[#5b6b7d] transition-colors hover:text-[#0d1b2a]"
    >
      {children}
    </a>
  )
}

function FooterNavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-sm text-[#5b6b7d] transition-colors hover:text-[#0d1b2a]"
    >
      {children}
    </Link>
  )
}
