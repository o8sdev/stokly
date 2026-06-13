'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Warehouse,
  Store,
  Truck,
  Carrot,
  ChefHat,
  ClipboardList,
  Star,
  Plus,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import {
  createSupplier,
  createLocation,
  setDefaultConsumptionLocation,
  dismissOnboarding,
  type SettingsResult,
} from '@/app/[locale]/app/(protected)/settings/actions'
import {
  addIngredientQuick,
  type OnboardingResult,
} from '@/app/[locale]/app/(protected)/onboarding/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { cn } from '@/lib/utils'
import { UNIT_OPTIONS, packPresetsFor } from '@/lib/constants/units'
import { CostFromPurchase } from '@/components/ingredients/cost-from-purchase'

interface SalesPoint {
  id: string
  name: string
  isDefault: boolean
}

export interface OnboardingWizardProps {
  locale: string
  suppliers: { id: string; name: string }[]
  ingredients: { id: string; name: string; unit: string }[]
  salesPoints: SalesPoint[]
  warehouseName: string | null
  recipeNames: string[]
  hasStock: boolean
}

const selectCls =
  'flex h-[38px] w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15'

// Re-run the server page once an inline add succeeds, so the wizard's lists +
// step completion update without leaving the flow.
function useRefreshOnSuccess(success: boolean | undefined, reset?: () => void) {
  const router = useRouter()
  useEffect(() => {
    if (success) {
      reset?.()
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success])
}

export function OnboardingWizard({
  locale,
  suppliers,
  ingredients,
  salesPoints,
  warehouseName,
  recipeNames,
  hasStock,
}: OnboardingWizardProps) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const steps = [
    { key: 'sales_points', icon: Store, done: salesPoints.length > 0 },
    { key: 'suppliers', icon: Truck, done: suppliers.length > 0 },
    { key: 'ingredients', icon: Carrot, done: ingredients.length > 0 },
    { key: 'recipes', icon: ChefHat, done: recipeNames.length > 0 },
    { key: 'stock', icon: ClipboardList, done: hasStock },
  ] as const

  const firstUndone = steps.findIndex((s) => !s.done)
  const [current, setCurrent] = useState(firstUndone === -1 ? 0 : firstUndone)
  const step = steps[current]

  function exit() {
    startTransition(async () => {
      await dismissOnboarding(locale)
      router.push(`/${locale}/app/dashboard`)
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t('wizard_title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('wizard_subtitle')}
          </p>
        </div>
        <button
          onClick={exit}
          disabled={pending}
          className="shrink-0 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t('skip_setup')}
        </button>
      </div>

      {/* Progress rail */}
      <div className="mt-6 flex items-center gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setCurrent(i)}
            className="flex flex-1 items-center gap-2"
            title={t(`step_${s.key}`)}
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                s.done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : i === current
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground'
              )}
            >
              {s.done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden truncate text-xs font-medium sm:inline',
                i === current ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {t(`step_${s.key}`)}
            </span>
            {i < steps.length - 1 && (
              <span className="h-px flex-1 bg-border" aria-hidden />
            )}
          </button>
        ))}
      </div>

      {/* Step body */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <step.icon className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-foreground">
            {t(`step_${step.key}`)}
          </h2>
        </div>

        {step.key === 'sales_points' && (
          <SalesPointsStep
            locale={locale}
            salesPoints={salesPoints}
            warehouseName={warehouseName}
          />
        )}
        {step.key === 'suppliers' && (
          <SuppliersStep locale={locale} suppliers={suppliers} />
        )}
        {step.key === 'ingredients' && (
          <IngredientsStep
            locale={locale}
            ingredients={ingredients}
            suppliers={suppliers}
          />
        )}
        {step.key === 'recipes' && (
          <LinkOutStep
            help={t('rec_help')}
            items={recipeNames}
            cta={t('create_recipe_cta')}
            href="/app/recipes/new"
            emptyHint={t('none_yet')}
          />
        )}
        {step.key === 'stock' && (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-muted-foreground">{t('stock_help')}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gap-2">
                <Link href="/app/inventory/count">
                  <ClipboardList className="h-4 w-4" />
                  {t('opening_count_cta')}
                </Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link href="/app/purchases">
                  <Truck className="h-4 w-4" />
                  {t('log_purchase_cta')}
                </Link>
              </Button>
            </div>
            {hasStock && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <Check className="h-4 w-4" />
                {t('stock_done')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Button>
        {current < steps.length - 1 ? (
          <Button
            onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
            className="gap-1.5"
          >
            {step.done ? t('continue') : t('skip_step')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={exit} disabled={pending} className="gap-1.5">
            {t('finish')}
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Steps ──────────────────────────────────────────────────────────────────

function SalesPointsStep({
  locale,
  salesPoints,
  warehouseName,
}: {
  locale: string
  salesPoints: SalesPoint[]
  warehouseName: string | null
}) {
  const t = useTranslations('onboarding')
  const tl = useTranslations('locations')
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action] = useFormState<SettingsResult, FormData>(
    createLocation.bind(null, locale),
    {}
  )
  useRefreshOnSuccess(state.success, () => formRef.current?.reset())

  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-muted-foreground">{t('sp_help')}</p>

      {warehouseName && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
          <Warehouse className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{warehouseName}</span>
          <span className="text-xs text-muted-foreground">
            {t('warehouse_note')}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {salesPoints.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Store className="h-4 w-4 text-primary" />
              {p.name}
            </span>
            {p.isDefault ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Star className="h-3.5 w-3.5" />
                {tl('default_consumption')}
              </span>
            ) : (
              <form action={setDefaultConsumptionLocation.bind(null, locale, p.id)}>
                <button
                  type="submit"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t('make_default')}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1 space-y-1">
          <Label htmlFor="sp_name">{t('sp_name')}</Label>
          <Input id="sp_name" name="name" required placeholder={t('sp_name_ph')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sp_kind">{tl('kind')}</Label>
          <select id="sp_kind" name="kind" defaultValue="kitchen" className={selectCls}>
            <option value="kitchen">{tl('kind_kitchen')}</option>
            <option value="bar">{tl('kind_bar')}</option>
            <option value="prep">{tl('kind_prep')}</option>
          </select>
        </div>
        <SubmitButton pendingText={t('adding')} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t('add')}
        </SubmitButton>
        {state.error && (
          <p className="w-full text-sm text-destructive">{t('add_error')}</p>
        )}
      </form>
    </div>
  )
}

function SuppliersStep({
  locale,
  suppliers,
}: {
  locale: string
  suppliers: { id: string; name: string }[]
}) {
  const t = useTranslations('onboarding')
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action] = useFormState<SettingsResult, FormData>(
    createSupplier.bind(null, locale),
    {}
  )
  useRefreshOnSuccess(state.success, () => formRef.current?.reset())

  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-muted-foreground">{t('sup_help')}</p>
      <ChipList items={suppliers.map((s) => s.name)} emptyHint={t('none_yet')} />
      <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1 space-y-1">
          <Label htmlFor="sup_name">{t('sup_name')}</Label>
          <Input id="sup_name" name="name" required placeholder={t('sup_name_ph')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sup_phone">{t('sup_phone')}</Label>
          <Input id="sup_phone" name="phone" placeholder="+994…" />
        </div>
        <SubmitButton pendingText={t('adding')} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t('add')}
        </SubmitButton>
        {state.error && (
          <p className="w-full text-sm text-destructive">{t('add_error')}</p>
        )}
      </form>
    </div>
  )
}

function IngredientsStep({
  locale,
  ingredients,
  suppliers,
}: {
  locale: string
  ingredients: { id: string; name: string; unit: string }[]
  suppliers: { id: string; name: string }[]
}) {
  const t = useTranslations('onboarding')
  const ti = useTranslations('ingredients')
  const formRef = useRef<HTMLFormElement>(null)
  const [baseUnit, setBaseUnit] = useState('')
  const [costVal, setCostVal] = useState('')
  const [convRows, setConvRows] = useState<{ unit: string; factor: string }[]>([])
  const [state, action] = useFormState<OnboardingResult, FormData>(
    addIngredientQuick.bind(null, locale),
    {}
  )
  useRefreshOnSuccess(state.success, () => {
    formRef.current?.reset()
    setBaseUnit('')
    setCostVal('')
    setConvRows([])
  })

  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-muted-foreground">{t('ing_help')}</p>
      <ChipList
        items={ingredients.map((i) => `${i.name} · ${i.unit}`)}
        emptyHint={t('none_yet')}
      />
      <form ref={formRef} action={action} className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <Label htmlFor="ing_name">{ti('name')}</Label>
            <Input id="ing_name" name="name" required placeholder={t('ing_name_ph')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ing_unit">{ti('unit')}</Label>
            <select
              id="ing_unit"
              name="unit"
              required
              defaultValue=""
              onChange={(e) => setBaseUnit(e.target.value)}
              className={selectCls}
            >
              <option value="" disabled>
                {ti('select_unit')}
              </option>
              {UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {ti(`units.${o.key}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ing_cost">
              {ti('cost')}
              {baseUnit ? ` · 1 ${baseUnit}` : ''}
            </Label>
            <Input
              id="ing_cost"
              name="cost_per_unit"
              type="number"
              step="0.0001"
              min="0"
              value={costVal}
              placeholder="0"
              onChange={(e) => setCostVal(e.target.value)}
              className="text-right font-mono tabular-nums"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ing_supplier">{ti('supplier')}</Label>
            <select id="ing_supplier" name="supplier_id" defaultValue="" className={selectCls}>
              <option value="">{ti('no_supplier')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {baseUnit && (
          <CostFromPurchase
            baseUnit={baseUnit}
            factors={Object.fromEntries(
              convRows
                .filter((r) => r.unit && Number(r.factor) > 0)
                .map((r) => [r.unit, Number(r.factor)])
            )}
            onApply={(c) => setCostVal(String(c))}
          />
        )}

        {/* Unit conversions — e.g. fish priced per kq but bought/used as pieces:
            "1 ədəd = 0.45 kq". Costs the alt unit at the base price. */}
        <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
          <Label className="text-xs">{ti('conversions_title')}</Label>
          <p className="text-xs text-muted-foreground">
            {ti('conversions_help', { base: baseUnit || '—' })}
          </p>
          <p className="text-xs text-muted-foreground">{t('ing_conv_tip')}</p>
          {convRows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">1</span>
              <select
                value={r.unit}
                onChange={(e) =>
                  setConvRows((rows) =>
                    rows.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x))
                  )
                }
                aria-label={ti('conversions_unit')}
                className="flex h-9 w-28 rounded-md border border-input bg-card px-2 text-sm"
              >
                <option value="">{ti('select_unit')}</option>
                {UNIT_OPTIONS.filter((o) => o.value !== baseUnit).map((o) => (
                  <option key={o.value} value={o.value}>
                    {ti(`units.${o.key}`)}
                  </option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">=</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.000001"
                min="0"
                value={r.factor}
                onChange={(e) =>
                  setConvRows((rows) =>
                    rows.map((x, j) => (j === i ? { ...x, factor: e.target.value } : x))
                  )
                }
                aria-label={ti('conversions_factor', { base: baseUnit || '—' })}
                className="h-9 w-24 text-right font-mono tabular-nums"
              />
              <span className="text-sm text-muted-foreground">{baseUnit || '—'}</span>
              {Number(r.factor) > 0 && Number(costVal) > 0 && (
                <span className="font-mono text-xs text-primary">
                  ≈ {(Number(r.factor) * Number(costVal)).toFixed(2)} AZN
                </span>
              )}
              <button
                type="button"
                onClick={() => setConvRows((rows) => rows.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
                aria-label={ti('conversions_remove')}
              >
                ×
              </button>
            </div>
          ))}
          {baseUnit && packPresetsFor(baseUnit).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {ti('conversions_presets')}
              </span>
              {packPresetsFor(baseUnit).map((pz) => (
                <button
                  key={pz.label}
                  type="button"
                  onClick={() =>
                    setConvRows((rows) => [
                      ...rows.filter((r) => r.unit || r.factor),
                      { unit: pz.unit, factor: String(pz.factor) },
                    ])
                  }
                  className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {pz.label}
                </button>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConvRows((rows) => [...rows, { unit: '', factor: '' }])}
          >
            + {ti('conversions_add')}
          </Button>
          <input
            type="hidden"
            name="conversions"
            value={JSON.stringify(
              convRows
                .filter((r) => r.unit && Number(r.factor) > 0)
                .map((r) => ({ unit: r.unit, factor: Number(r.factor) }))
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <SubmitButton pendingText={t('adding')} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t('add')}
          </SubmitButton>
          {state.error && (
            <p className="text-sm text-destructive">{t('add_error')}</p>
          )}
        </div>
      </form>
    </div>
  )
}

function LinkOutStep({
  help,
  items,
  cta,
  href,
  emptyHint,
}: {
  help: string
  items: string[]
  cta: string
  href: string
  emptyHint: string
}) {
  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-muted-foreground">{help}</p>
      <ChipList items={items} emptyHint={emptyHint} />
      <Button asChild className="gap-2">
        <Link href={href}>
          <Plus className="h-4 w-4" />
          {cta}
        </Link>
      </Button>
    </div>
  )
}

function ChipList({
  items,
  emptyHint,
}: {
  items: string[]
  emptyHint: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium"
        >
          <Check className="h-3 w-3 text-green-600" />
          {it}
        </span>
      ))}
    </div>
  )
}
