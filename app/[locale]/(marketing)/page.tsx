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
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { Reveal } from '@/components/marketing/reveal'
import { CountUp } from '@/components/marketing/count-up'
import { HeroPanel } from '@/components/marketing/hero-panel'
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

  const trustItems = t.raw('trust.items') as string[]
  const points = t.raw('problem.points') as { title: string; desc: string }[]
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

  return (
    <div className="min-h-screen bg-[#0D1B2A] font-sans text-white">
      {/* If JS is unavailable, reveal everything (the scroll animation is an
          enhancement, not a requirement for content to be visible). */}
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html: '.mk-reveal{opacity:1 !important;transform:none !important}',
          }}
        />
      </noscript>
      <MarketingNav locale={locale} />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="mk-grain relative overflow-hidden pt-28 lg:pt-36">
        <div className="mk-grid absolute inset-0" aria-hidden />
        <div
          className="absolute left-1/2 top-0 h-[520px] w-[920px] -translate-x-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, rgba(0,200,150,0.16), transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {t('hero.badge')}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,4.5rem)] font-bold leading-[1.02] tracking-tight">
                {t('hero.title_lead')}{' '}
                <span className="mk-gradient-text">{t('hero.title_accent')}</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
                {t('hero.subtitle')}
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-6 text-sm font-semibold text-[#04231A] shadow-[0_8px_30px_-8px_rgba(0,200,150,0.6)] transition-colors hover:bg-brand-hover"
                >
                  {t('hero.cta_primary')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#demo"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/15 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/5"
                >
                  {t('hero.cta_secondary')}
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="lg:pl-6">
            <HeroPanel
              labels={{
                live: t('hero.panel.live'),
                foodCost: t('hero.panel.food_cost'),
                inventory: t('hero.panel.inventory'),
                waste: t('hero.panel.waste'),
                margin: t('hero.panel.margin'),
              }}
            />
          </Reveal>
        </div>

        {/* Trust strip */}
        <div className="relative border-y border-white/8 bg-white/[0.02]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5 lg:px-8">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t('trust.label')}
            </span>
            {trustItems.map((item) => (
              <span
                key={item}
                className="font-display text-sm font-medium text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────── */}
      <section className="relative py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <Kicker>{t('problem.kicker')}</Kicker>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
                {t('problem.title')}
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-400">
                {t('problem.lead')}
              </p>
            </Reveal>
            <div className="space-y-4">
              {points.map((p, i) => (
                <Reveal key={p.title} delay={i * 90}>
                  <div className="flex gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-5">
                    <span className="mt-1 font-mono text-sm text-brand">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold">
                        {p.title}
                      </h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES (bento) ─────────────────────────────────────────── */}
      <section id="services" className="relative scroll-mt-24 py-12 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="max-w-2xl">
            <Kicker>{t('services.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              {t('services.title')}
            </h2>
            <p className="mt-5 text-lg text-slate-400">{t('services.lead')}</p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => {
              const Icon = SERVICE_ICONS[i] ?? Calculator
              const featured = i === 0
              return (
                <Reveal
                  key={s.title}
                  delay={(i % 3) * 80}
                  className={featured ? 'sm:col-span-2' : ''}
                >
                  <div className="group h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-colors hover:border-brand/40">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/12 text-brand transition-colors group-hover:bg-brand group-hover:text-[#04231A]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-semibold">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
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
      <section id="how" className="relative scroll-mt-24 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <Kicker>{t('how.kicker')}</Kicker>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
                {t('how.title')}
              </h2>
            </Reveal>
            <div className="space-y-px">
              {steps.map((step, i) => (
                <Reveal key={step.no} delay={i * 100}>
                  <div className="flex items-start gap-6 border-t border-white/10 py-8">
                    <span className="font-mono text-3xl font-medium text-brand/80">
                      {step.no}
                    </span>
                    <div>
                      <h3 className="font-display text-2xl font-semibold">
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-slate-400">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div
          className="absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, rgba(0,200,150,0.12), transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <Kicker>{t('mission.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
              {t('mission.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">
              {t('mission.body')}
            </p>
          </Reveal>
          <Reveal delay={120} className="lg:pl-10">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
              <div className="font-display text-7xl font-bold mk-gradient-text">
                {t('mission.stat_value')}
              </div>
              <p className="mt-4 text-lg leading-relaxed text-slate-300">
                {t('mission.stat_label')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── METRICS BAND ─────────────────────────────────────────────── */}
      <section className="border-y border-white/8 bg-white/[0.02] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {metrics.map((m, i) => (
              <Reveal key={m.label} delay={i * 80} className="text-center">
                <div className="font-display text-5xl font-bold text-white lg:text-6xl">
                  <CountUp to={m.value} suffix={m.suffix} />
                </div>
                <p className="mt-3 text-sm text-slate-400">{m.label}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-slate-600">
            {t('metrics.note')}
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS (light) ─────────────────────────────────────── */}
      <section
        id="testimonials"
        className="scroll-mt-24 bg-[#F8FAFB] py-24 text-[#1A2332] lg:py-32"
      >
        <div className="mx-auto mb-12 max-w-7xl px-5 lg:px-8">
          <Reveal className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              {t('testimonials.kicker')}
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-[#0D1B2A] lg:text-5xl">
              {t('testimonials.title')}
            </h2>
          </Reveal>
        </div>
        <Testimonials items={testimonials} />
      </section>

      {/* ── DEMO + CTA ───────────────────────────────────────────────── */}
      <section
        id="demo"
        className="mk-grain relative scroll-mt-24 overflow-hidden py-24 lg:py-32"
      >
        <div className="mk-grid absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <Kicker>{t('demo.kicker')}</Kicker>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              {t('demo.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-400">
              {t('demo.lead')}
            </p>
            <ul className="mt-8 space-y-3">
              {[
                services[0]?.title,
                services[1]?.title,
                services[5]?.title,
              ].map((line, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <Check className="h-3 w-3" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-2xl border border-white/10 bg-[#0E1C2D]/80 p-6 backdrop-blur-sm lg:p-8">
              <DemoForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ (light) ──────────────────────────────────────────────── */}
      <section
        id="faq"
        className="scroll-mt-24 bg-[#F8FAFB] py-24 text-[#1A2332] lg:py-32"
      >
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <Reveal className="mb-10 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              {t('faq.kicker')}
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-[#0D1B2A] lg:text-5xl">
              {t('faq.title')}
            </h2>
          </Reveal>
          <Reveal>
            <Faq items={faqItems} />
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 lg:py-28">
        <div className="mk-glow absolute left-1/2 top-1/2 h-72 w-[700px] -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-5 text-center lg:px-8">
          <Reveal>
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight lg:text-6xl">
              {t('cta.title')}
            </h2>
            <p className="mt-5 text-lg text-slate-300">{t('cta.subtitle')}</p>
            <div className="mt-9 flex justify-center">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-lg bg-brand px-8 py-4 text-base font-semibold text-[#04231A] shadow-[0_10px_40px_-10px_rgba(0,200,150,0.7)] transition-colors hover:bg-brand-hover"
              >
                {t('cta.button')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              <span className="font-display text-xl font-bold">Stokly</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {t('footer.tagline')}
            </p>
          </div>
          <div className="flex gap-16">
            <FooterCol title={t('footer.product')}>
              <FooterLink href="#services">
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
        <div className="mx-auto mt-10 max-w-7xl px-5 lg:px-8">
          <p className="border-t border-white/8 pt-6 text-xs text-slate-600">
            {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
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
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
      className="text-sm text-slate-400 transition-colors hover:text-white"
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
      className="text-sm text-slate-400 transition-colors hover:text-white"
    >
      {children}
    </Link>
  )
}
