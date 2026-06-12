import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, Check } from 'lucide-react'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { Reveal } from '@/components/marketing/reveal'
import { CountUp } from '@/components/marketing/count-up'
import { ScrollProgress, Magnetic } from '@/components/marketing/fx'
import {
  MarketingAtmosphere,
  MarketingFooter,
} from '@/components/marketing/shell'
import {
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
import { StoklyLogo } from '@/components/brand/logo'

/* "Kitchen ledger" landing — warm paper, ink type, hairline rules, mono
   numerals. The hero artifact is a till receipt; steps hang as kitchen
   tickets; features read like a menu index. One teal stamp accent. */

const INK = '#1c1a14'
const INK2 = '#5b574a'
const INK3 = '#8e8a7b'
const LINE = '#ddd7c4'

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
  const pricingIncludes = t.raw('pricing.includes') as string[]

  const dashboardLabels: DashboardLabels = {
    title: t('mock.dashboard_title'),
    live: t('mock.live'),
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
    live: t('mock.live'),
    recipeName: t('mock.recipe_name'),
    total: t('mock.total'),
    perServing: t('mock.per_serving'),
    foodCost: t('mock.food_cost'),
    suggested: t('mock.suggested'),
  }
  const inventoryLabels = {
    title: t('mock.inv_title'),
    live: t('mock.live'),
    name: t('mock.name'),
    stock: t('mock.stock'),
    status: t('mock.status'),
    batchReceived: t('mock.received'),
    batchExpiry: t('mock.expiry'),
  }
  const figures = [
    t('receipt.fig_recipe'),
    t('receipt.fig_inventory'),
    t('receipt.fig_dashboard'),
  ]

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

      <MarketingAtmosphere />
      <ScrollProgress />
      <MarketingNav locale={locale} />

      {/* ── HERO — ledger spread: headline left, till receipt right ────── */}
      <section className="relative px-5 pt-28 lg:px-8 lg:pt-36">
        <div className="mx-auto grid max-w-6xl items-start gap-14 lg:grid-cols-[7fr_5fr] lg:gap-10">
          <div className="pt-2 lg:pt-10">
            <Reveal>
              <p
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: INK3 }}
              >
                ✳ {t('hero.badge')}
              </p>
            </Reveal>

            <Reveal delay={90}>
              <h1
                className="mt-6 font-display text-[clamp(2.9rem,6.5vw,5.2rem)] font-extrabold leading-[0.98] tracking-[-0.03em]"
                style={{ color: INK }}
              >
                {t('hero.title_lead')}
                <br />
                <span className="font-editorial relative inline-block font-medium italic tracking-normal">
                  {t('hero.title_accent')}
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 200 9"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path
                      d="M2 6.5 C 30 2.5, 60 6, 95 4 S 165 2.5, 198 6"
                      fill="none"
                      stroke="#00C896"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={170}>
              <p
                className="mt-7 max-w-md text-lg leading-relaxed"
                style={{ color: INK2 }}
              >
                {t('hero.subtitle')}
              </p>
            </Reveal>

            <Reveal delay={250}>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Magnetic>
                  <a
                    href="#demo"
                    className="group inline-flex h-12 items-center gap-2 rounded-md bg-[#1c1a14] px-6 text-sm font-semibold text-[#f4f1e8] transition-colors hover:bg-[#00926e]"
                  >
                    {t('hero.cta_primary')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </Magnetic>
                <a
                  href="#product"
                  className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] underline decoration-[#c9c2ab] decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#1c1a14]"
                  style={{ color: INK }}
                >
                  {t('hero.cta_features')}
                </a>
              </div>
            </Reveal>

            <Reveal delay={330}>
              <p
                className="mt-10 font-mono text-[12px] tracking-[0.06em]"
                style={{ color: INK2 }}
              >
                <span style={{ color: '#b98a00' }}>★★★★★</span>{' '}
                <span className="font-semibold" style={{ color: INK }}>
                  {t('trust.rating')}
                </span>{' '}
                — {t('trust.count')}
              </p>
            </Reveal>
          </div>

          {/* Till receipt artifact */}
          <Reveal delay={200} variant="scale" className="relative mx-auto w-full max-w-sm lg:mx-0">
            {/* Blank sheet behind, slightly fanned */}
            <div
              className="absolute inset-0 -rotate-2 rounded-sm border bg-[#f7f5ec]"
              style={{ borderColor: LINE }}
              aria-hidden
            />
            <div className="mk-receipt relative rotate-[1.25deg] px-6 pb-7 pt-6 sm:px-7">
              <div className="text-center">
                <span className="inline-flex justify-center">
                  <StoklyLogo tone="ink" size="sm" />
                </span>
                <p
                  className="mt-1 font-mono text-[10px] uppercase tracking-[0.28em]"
                  style={{ color: INK3 }}
                >
                  {t('receipt.title')}
                </p>
                <p className="mt-0.5 font-mono text-[10px] tabular-nums" style={{ color: INK3 }}>
                  №&nbsp;0027 · 21:58
                </p>
              </div>

              <div className="my-4 border-t border-dashed" style={{ borderColor: '#c9c2ab' }} />

              <div className="space-y-2.5 font-mono text-[12.5px]" style={{ color: INK }}>
                <ReceiptRow label={t('receipt.sales')} value="2 840 ₼" />
                <ReceiptRow label={t('receipt.cogs')} value="886 ₼" />
                <ReceiptRow label={t('receipt.food_cost')} value="31.2%" accent />
                <ReceiptRow label={t('receipt.waste')} value="38 ₼" />
                <ReceiptRow label={t('receipt.inventory')} value="9 850 ₼" />
              </div>

              <div className="my-4 border-t border-dashed" style={{ borderColor: '#c9c2ab' }} />

              <div className="mk-lead font-mono text-[14px] font-semibold" style={{ color: INK }}>
                <span>{t('receipt.profit')}</span>
                <span className="mk-lead-dots" aria-hidden />
                <span className="text-[17px] tabular-nums">1 954 ₼</span>
              </div>

              <div className="relative mt-6">
                <div className="mk-barcode" aria-hidden />
                <p
                  className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.26em]"
                  style={{ color: INK3 }}
                >
                  stokly · {t('receipt.note')}
                </p>
              </div>

              {/* Stamp overlay — pressed over the barcode, like a till slip */}
              <span className="mk-stamp absolute bottom-[44px] right-3 text-[12px]">
                ✓ {t('receipt.stamp')}
              </span>
            </div>
          </Reveal>
        </div>

        {/* Scroll note */}
        <Reveal delay={420}>
          <p
            className="mx-auto mt-16 max-w-6xl font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: INK3 }}
          >
            ↓ {t('hero.scroll')}
          </p>
        </Reveal>
      </section>

      {/* ── NAME TICKER ─────────────────────────────────────────────────── */}
      <section className="mt-14 border-y" style={{ borderColor: LINE }}>
        <p
          className="border-b py-2.5 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.26em]"
          style={{ borderColor: LINE, color: INK3 }}
        >
          {t('trust.logos_label')}
        </p>
        <div className="mk-marquee-pause relative overflow-hidden py-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#f4f1e8] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#f4f1e8] to-transparent" />
          <div className="flex w-max animate-mk-marquee-slow items-center gap-10 pr-10">
            {[...logos, ...logos].map((name, i) => (
              <span key={i} className="flex items-center gap-10">
                <span
                  className="font-display text-xl font-semibold tracking-tight transition-colors hover:text-[#1c1a14]"
                  style={{ color: INK3 }}
                >
                  {name}
                </span>
                <span aria-hidden style={{ color: '#c9c2ab' }}>
                  ✳
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── № 01 · PROBLEM (the leak ledger) ────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:px-8">
          <Reveal>
            <SectionIndex no="01">{t('problem.kicker')}</SectionIndex>
            <h2
              className="mt-5 font-display text-3xl font-bold leading-[1.08] tracking-[-0.02em] lg:text-[2.6rem]"
              style={{ color: INK }}
            >
              {t('problem.title')}
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed" style={{ color: INK2 }}>
              {t('problem.lead')}
            </p>
          </Reveal>

          {/* The rows live inside Reveal wrappers, so per-row `last:` tricks
              can't close the list — the container draws the bottom rule. */}
          <div className="border-b lg:pt-2" style={{ borderColor: LINE }}>
            {points.map((p, i) => (
              <Reveal key={p.title} delay={i * 110}>
                <div
                  className="group grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 border-t py-6 transition-colors hover:bg-[#efebe0]/60"
                  style={{ borderColor: LINE }}
                >
                  <span className="font-mono text-sm font-semibold" style={{ color: '#c2462e' }}>
                    ✗ 0{i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold" style={{ color: INK }}>
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: INK2 }}>
                      {p.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── № 02 · PRODUCT (framed exhibits) ────────────────────────────── */}
      <section id="product" className="scroll-mt-24 pb-20 lg:pb-28">
        <div className="mx-auto max-w-6xl space-y-24 px-5 lg:px-8">
          <Reveal>
            <SectionIndex no="02">{t('nav.services')}</SectionIndex>
          </Reveal>

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
                  <p
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: '#00926e' }}
                  >
                    {item.kicker}
                  </p>
                  <h2
                    className="mt-4 font-display text-3xl font-bold leading-[1.1] tracking-[-0.02em] lg:text-[2.4rem]"
                    style={{ color: INK }}
                  >
                    {item.title}
                  </h2>
                  <p className="mt-4 max-w-md text-lg leading-relaxed" style={{ color: INK2 }}>
                    {item.desc}
                  </p>
                  <ul className="mt-7 space-y-3">
                    {item.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-center gap-3 text-[15px] font-medium"
                        style={{ color: INK }}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-[3px] border"
                          style={{ borderColor: '#00926e', color: '#00926e' }}
                        >
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
                  <figure className="mk-corners relative">
                    {mock}
                    <figcaption
                      className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.2em]"
                      style={{ color: INK3 }}
                    >
                      {figures[i] ?? ''}
                    </figcaption>
                  </figure>
                </Reveal>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── № 03 · SERVICES (menu index with dot leaders) ───────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <Reveal>
            <SectionIndex no="03">{t('services.kicker')}</SectionIndex>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <h2
                className="max-w-xl font-display text-3xl font-bold leading-[1.08] tracking-[-0.02em] lg:text-[2.6rem]"
                style={{ color: INK }}
              >
                {t('services.title')}
              </h2>
              <p className="max-w-sm text-base leading-relaxed" style={{ color: INK2 }}>
                {t('services.lead')}
              </p>
            </div>
          </Reveal>

          <div
            className="mt-12 grid gap-x-14 border-b lg:grid-cols-2"
            style={{ borderColor: LINE }}
          >
            {services.map((s, i) => (
              <Reveal key={s.title} delay={(i % 2) * 90}>
                <div
                  className="border-t py-6 transition-colors hover:bg-[#efebe0]/60"
                  style={{ borderColor: LINE }}
                >
                  <div className="mk-lead">
                    <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: INK3 }}>
                      0{i + 1}.
                    </span>
                    <h3 className="font-display text-lg font-semibold" style={{ color: INK }}>
                      {s.title}
                    </h3>
                    <span className="mk-lead-dots" aria-hidden />
                    <span className="font-mono text-xs" style={{ color: '#00926e' }}>
                      ✓
                    </span>
                  </div>
                  <p className="mt-2 pl-9 text-[15px] leading-relaxed" style={{ color: INK2 }}>
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── № 04 · HOW IT WORKS (tickets on the kitchen rail) ───────────── */}
      <section id="how" className="scroll-mt-24 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <Reveal>
            <SectionIndex no="04">{t('how.kicker')}</SectionIndex>
            <h2
              className="mt-5 max-w-2xl font-display text-3xl font-bold leading-[1.08] tracking-[-0.02em] lg:text-[2.6rem]"
              style={{ color: INK }}
            >
              {t('how.title')}
            </h2>
          </Reveal>

          {/* The rail */}
          <div className="relative mt-16">
            <div
              className="absolute -top-4 left-2 right-2 hidden h-[3px] rounded-full md:block"
              style={{ background: INK }}
              aria-hidden
            />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {steps.map((step, i) => (
                <Reveal key={step.no} delay={i * 110}>
                  <div
                    className={`mk-ticket ${i % 2 === 0 ? 'mk-ticket--a' : 'mk-ticket--b'} px-6 pb-7 pt-8`}
                  >
                    <p
                      className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.24em]"
                      style={{ color: INK3 }}
                    >
                      {t('receipt.ticket')} № {step.no}
                    </p>
                    <div
                      className="my-4 border-t border-dashed"
                      style={{ borderColor: '#c9c2ab' }}
                    />
                    <h3 className="font-display text-xl font-semibold leading-snug" style={{ color: INK }}>
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed" style={{ color: INK2 }}>
                      {step.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS (counted in ink) ────────────────────────────────────── */}
      <section className="border-y" style={{ borderColor: LINE }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`px-6 py-12 text-center ${i > 0 ? 'border-l' : ''} ${i >= 2 ? 'max-lg:border-t' : ''}`}
              style={{ borderColor: LINE }}
            >
              <Reveal delay={i * 80}>
                <div
                  className="font-display text-5xl font-extrabold tracking-[-0.02em] lg:text-6xl"
                  style={{ color: INK }}
                >
                  <CountUp to={m.value} suffix={m.suffix} />
                </div>
                <p
                  className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em]"
                  style={{ color: INK3 }}
                >
                  {m.label}
                </p>
              </Reveal>
            </div>
          ))}
        </div>
        <p
          className="border-t py-3 text-center font-mono text-[10px] tracking-[0.14em]"
          style={{ borderColor: LINE, color: INK3 }}
        >
          {t('metrics.note')}
        </p>
      </section>

      {/* ── № 05 · MISSION (editorial pull-quote) ───────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[7fr_5fr] lg:px-8">
          <Reveal variant="left">
            <SectionIndex no="05">{t('mission.kicker')}</SectionIndex>
            <h2
              className="mt-6 font-display text-3xl font-bold leading-[1.1] tracking-[-0.02em] lg:text-4xl"
              style={{ color: INK }}
            >
              {t('mission.title')}
            </h2>
            <p
              className="font-editorial mt-6 max-w-lg text-xl italic leading-relaxed lg:text-2xl"
              style={{ color: INK2 }}
            >
              {t('mission.body')}
            </p>
          </Reveal>
          <Reveal delay={120} variant="scale">
            <div className="mk-card-d relative p-10 text-center">
              <div
                className="font-display text-7xl font-extrabold tracking-[-0.03em]"
                style={{ color: '#00926e' }}
              >
                {t('mission.stat_value')}
              </div>
              <p
                className="font-editorial mt-4 text-lg italic leading-relaxed"
                style={{ color: INK2 }}
              >
                {t('mission.stat_label')}
              </p>
              <span className="mk-stamp absolute -right-2 -top-3">stokly ✳ 2026</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── № 06 · TESTIMONIALS ─────────────────────────────────────────── */}
      <section id="testimonials" className="scroll-mt-24 pb-24 lg:pb-32">
        <div className="mx-auto mb-12 max-w-6xl px-5 lg:px-8">
          <Reveal>
            <SectionIndex no="06">{t('testimonials.kicker')}</SectionIndex>
            <h2
              className="mt-5 max-w-2xl font-display text-3xl font-bold leading-[1.08] tracking-[-0.02em] lg:text-[2.6rem]"
              style={{ color: INK }}
            >
              {t('testimonials.title')}
            </h2>
          </Reveal>
        </div>
        <Testimonials items={testimonials} />
      </section>

      {/* ── № 07 · PRICING (the menu card) ──────────────────────────────── */}
      <section id="pricing" className="scroll-mt-24 pb-24 lg:pb-32">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <Reveal>
            <SectionIndex no="07">{t('pricing.kicker')}</SectionIndex>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <h2
                className="max-w-xl font-display text-3xl font-bold leading-[1.08] tracking-[-0.02em] lg:text-[2.6rem]"
                style={{ color: INK }}
              >
                {t('pricing.title')}
              </h2>
              <p className="max-w-sm text-base leading-relaxed" style={{ color: INK2 }}>
                {t('pricing.lead')}
              </p>
            </div>
          </Reveal>

          {/* Printed menu card: double-rule frame, courses with dot leaders,
              ✳ ornament dividers — priced like a menu du jour. */}
          <Reveal delay={120} variant="scale" className="mx-auto mt-12 max-w-2xl">
            <div className="border p-1.5" style={{ borderColor: '#b5af9c' }}>
              <div
                className="relative border-[1.5px] bg-[#fbfaf5] px-6 py-9 sm:px-10"
                style={{ borderColor: INK }}
              >
                <div className="text-center">
                  <p
                    className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em]"
                    style={{ color: INK3 }}
                  >
                    stokly ✳ 2026
                  </p>
                  <p
                    className="mt-2 font-display text-2xl font-bold tracking-tight"
                    style={{ color: INK }}
                  >
                    {t('pricing.menu_label')}
                  </p>
                </div>

                <MenuDivider />

                {/* Course 1 — the tasting (trial) */}
                <div>
                  <div className="mk-lead">
                    <span
                      className="font-display text-xl font-semibold"
                      style={{ color: INK }}
                    >
                      {t('pricing.trial_name')}
                    </span>
                    <span className="mk-lead-dots" aria-hidden />
                    <span
                      className="font-mono text-xl font-semibold tabular-nums"
                      style={{ color: INK }}
                    >
                      {t('pricing.trial_price')}
                    </span>
                    <span
                      className="rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
                      style={{ borderColor: '#c9c2ab', color: INK2 }}
                    >
                      {t('pricing.trial_period')}
                    </span>
                  </div>
                  <p
                    className="mt-2 max-w-md text-[15px] leading-relaxed"
                    style={{ color: INK2 }}
                  >
                    {t('pricing.trial_desc')}
                  </p>
                </div>

                <MenuDivider />

                {/* Course 2 — the main (Standart), stamped */}
                <div className="relative">
                  <span className="mk-stamp absolute -top-5 right-0 text-[11px] sm:-right-4">
                    ✓ {t('pricing.stamp')}
                  </span>
                  <div className="mk-lead">
                    <span
                      className="font-display text-xl font-semibold"
                      style={{ color: INK }}
                    >
                      {t('pricing.normal_name')}
                    </span>
                    <span className="mk-lead-dots" aria-hidden />
                    <span className="flex items-baseline gap-1.5">
                      <span
                        className="font-mono text-3xl font-semibold tabular-nums"
                        style={{ color: INK }}
                      >
                        {t('pricing.normal_price')}
                      </span>
                      <span className="font-mono text-xs" style={{ color: INK3 }}>
                        {t('pricing.per_month')}
                      </span>
                    </span>
                  </div>
                  <p
                    className="mt-2 max-w-md text-[15px] leading-relaxed"
                    style={{ color: INK2 }}
                  >
                    {t('pricing.normal_desc')}
                  </p>
                  <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {pricingIncludes.map((line) => (
                      <li
                        key={line}
                        className="flex items-baseline gap-2.5 text-[14px]"
                        style={{ color: INK }}
                      >
                        <span
                          className="font-mono text-xs"
                          style={{ color: '#00926e' }}
                          aria-hidden
                        >
                          —
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="mt-8 border-t border-dashed pt-6 text-center"
                  style={{ borderColor: '#c9c2ab' }}
                >
                  <a
                    href="#demo"
                    className="group inline-flex h-11 items-center gap-2 rounded-md bg-[#1c1a14] px-6 text-sm font-semibold text-[#f4f1e8] transition-colors hover:bg-[#00926e]"
                  >
                    {t('pricing.cta')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                  <p
                    className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: INK3 }}
                  >
                    {t('pricing.note')}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── № 08 · DEMO (order pad) ─────────────────────────────────────── */}
      <section id="demo" className="scroll-mt-24 pb-24 lg:pb-32">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal variant="left">
            <SectionIndex no="08">{t('demo.kicker')}</SectionIndex>
            <h2
              className="mt-5 font-display text-3xl font-bold leading-[1.08] tracking-[-0.02em] lg:text-[2.6rem]"
              style={{ color: INK }}
            >
              {t('demo.title')}
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed" style={{ color: INK2 }}>
              {t('demo.lead')}
            </p>
            <ul className="mt-8 space-y-3">
              {[services[0]?.title, services[1]?.title, services[5]?.title].map(
                (line, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-[15px] font-medium"
                    style={{ color: INK }}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-[3px] border"
                      style={{ borderColor: '#00926e', color: '#00926e' }}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    {line}
                  </li>
                )
              )}
            </ul>
          </Reveal>

          <Reveal delay={120} variant="scale">
            <div className="mk-receipt relative px-7 pb-8 pt-6 lg:px-8">
              <p
                className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: INK3 }}
              >
                {t('demo.kicker')} — № 1
              </p>
              <div
                className="my-5 border-t border-dashed"
                style={{ borderColor: '#c9c2ab' }}
              />
              <DemoForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── № 09 · FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-24 pb-24 lg:pb-32">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <Reveal>
            <SectionIndex no="09">{t('faq.kicker')}</SectionIndex>
            <h2
              className="mt-5 font-display text-3xl font-bold leading-[1.08] tracking-[-0.02em] lg:text-[2.6rem]"
              style={{ color: INK }}
            >
              {t('faq.title')}
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <Faq items={faqItems} />
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA — the ink slab ────────────────────────────────────── */}
      <section className="px-5 pb-20 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-md bg-[#16140e] px-6 py-20 text-center lg:py-24">
          <span
            className="mk-stamp absolute right-6 top-6 hidden sm:inline-block"
            style={{ color: 'rgba(244,241,232,0.45)' }}
          >
            stokly ✳ {t('receipt.stamp')}
          </span>
          <Reveal variant="scale">
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.02em] text-[#f4f1e8] lg:text-6xl">
              {t('cta.title')}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-[#b9b4a3]">
              {t('cta.subtitle')}
            </p>
            <div className="mt-9 flex justify-center">
              <Magnetic>
                <a
                  href="#demo"
                  className="group inline-flex items-center gap-2 rounded-md bg-[#00C896] px-8 py-4 text-base font-semibold text-[#14130e] transition-colors hover:bg-[#5ff5cb]"
                >
                  {t('cta.button')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </Magnetic>
            </div>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.26em] text-[#6f6a5b]">
              * * * {t('receipt.note')} * * *
            </p>
          </Reveal>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </div>
  )
}

/* Centered ✳ ornament divider, the way printed menus separate courses. */
function MenuDivider() {
  return (
    <p
      className="my-7 text-center font-mono text-[11px] tracking-[0.6em] text-[#c9c2ab]"
      aria-hidden
    >
      ✳ ✳ ✳
    </p>
  )
}

/* Section index header: "№ 01" + hairline rule. */
function SectionIndex({
  no,
  children,
}: {
  no: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="shrink-0 font-mono text-[11px] font-semibold tracking-[0.22em] text-[#8e8a7b]">
        № {no} — <span className="uppercase">{children}</span>
      </span>
      <span className="h-px flex-1 bg-[#ddd7c4]" aria-hidden />
    </div>
  )
}

/* One dotted-leader line on the hero receipt. */
function ReceiptRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="mk-lead">
      <span style={{ color: '#5b574a' }}>{label}</span>
      <span className="mk-lead-dots" aria-hidden />
      <span
        className="font-semibold tabular-nums"
        style={{ color: accent ? '#00926e' : '#1c1a14' }}
      >
        {value}
      </span>
    </div>
  )
}
