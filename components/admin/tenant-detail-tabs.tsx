'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Check, Circle, Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RecordPaymentDialog, AddNoteDialog } from './tenant-dialogs'
import { formatMoney, formatDate, formatPercent, cn } from '@/lib/utils'
import type { Plan } from '@/types/database'
import type { MilestoneKey } from '@/lib/admin/onboarding-constants'

export interface OverviewData {
  ingredientCount: number
  recipeCount: number
  movementCount: number
  lastCount: string | null
  milestones: { key: MilestoneKey; completed: boolean; completedAt: string | null }[]
  logins: string[]
}
export interface IngRow {
  id: string
  name: string
  unit: string
  cost: number
  yield: number
  stock: number
}
export interface RecRow {
  id: string
  name: string
  ingredientCount: number
  totalCost: number
  foodCostPercent: number
  salePrice: number | null
}
export interface MoveRow {
  id: string
  created_at: string
  type: string
  ingredient: string
  quantity: number
  unit: string
  notes: string | null
}
export interface BatchRow {
  id: string
  ingredient: string
  qtyReceived: number
  qtyRemaining: number
  unit: string
  unitCost: number
  received: string
  expiry: string | null
  status: string
  expiringSoon: boolean
}
export interface PayRow {
  id: string
  paid_at: string
  planLabel: string
  amount: number
  period: string
  method: string
  reference: string | null
}
export interface NoteRow {
  id: string
  created_at: string
  author: string
  body: string
}

const TH = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400'
const TD = 'px-3 py-2.5'

function foodCostColor(pct: number): string {
  if (pct === 0) return 'text-slate-400'
  if (pct < 30) return 'text-emerald-300'
  if (pct < 35) return 'text-amber-300'
  if (pct < 40) return 'text-orange-300'
  return 'text-[#F08C8C]'
}

const MOVE_TYPES = ['all', 'delivery', 'count', 'waste', 'adjustment'] as const
const BATCH_STATUSES = ['all', 'active', 'depleted', 'expired', 'written_off'] as const

export function TenantDetailTabs({
  locale,
  tenantId,
  plans,
  currentPlan,
  overview,
  ingredients,
  recipes,
  movements,
  batches,
  payments,
  notes,
}: {
  locale: string
  tenantId: string
  plans: Plan[]
  currentPlan: string
  overview: OverviewData
  ingredients: IngRow[]
  recipes: RecRow[]
  movements: MoveRow[]
  batches: BatchRow[]
  payments: PayRow[]
  notes: NoteRow[]
}) {
  const t = useTranslations('admin.tenant_detail')
  const tOnb = useTranslations('admin.onboarding')
  const [ingSearch, setIngSearch] = React.useState('')
  const [moveType, setMoveType] = React.useState<string>('all')
  const [batchStatus, setBatchStatus] = React.useState<string>('all')
  const [payOpen, setPayOpen] = React.useState(false)
  const [noteOpen, setNoteOpen] = React.useState(false)

  const ingFiltered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(ingSearch.toLowerCase())
  )
  const moveFiltered =
    moveType === 'all' ? movements : movements.filter((m) => m.type === moveType)
  const batchFiltered =
    batchStatus === 'all' ? batches : batches.filter((b) => b.status === batchStatus)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">{t('tab_overview')}</TabsTrigger>
        <TabsTrigger value="ingredients">
          {t('tab_ingredients')} ({overview.ingredientCount})
        </TabsTrigger>
        <TabsTrigger value="recipes">
          {t('tab_recipes')} ({overview.recipeCount})
        </TabsTrigger>
        <TabsTrigger value="stock">{t('tab_stock')}</TabsTrigger>
        <TabsTrigger value="batches">{t('tab_batches')}</TabsTrigger>
        <TabsTrigger value="payments">{t('tab_payments')}</TabsTrigger>
        <TabsTrigger value="notes">{t('tab_notes')}</TabsTrigger>
      </TabsList>

      {/* OVERVIEW */}
      <TabsContent value="overview">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t('ingredients'), value: overview.ingredientCount },
            { label: t('recipes'), value: overview.recipeCount },
            { label: t('stock_movements'), value: overview.movementCount },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-400">{c.label}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">{c.value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">{t('last_count')}</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {overview.lastCount ? formatDate(overview.lastCount) : '—'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 font-semibold text-white">{t('onboarding_checklist')}</h3>
            <ul className="space-y-2">
              {overview.milestones.map((m, i) => (
                <li key={m.key} className="flex items-center gap-2.5 text-sm">
                  {m.completed ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-600" />
                  )}
                  <span className={cn('flex-1', m.completed ? 'text-slate-200' : 'text-slate-500')}>
                    {i + 1}. {tOnb(`steps.${m.key}`)}
                  </span>
                  {m.completedAt && (
                    <span className="text-[11px] text-slate-500">
                      {formatDate(m.completedAt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 font-semibold text-white">{t('login_history')}</h3>
            {overview.logins.length === 0 ? (
              <p className="text-sm text-slate-500">{t('no_logins')}</p>
            ) : (
              <ul className="space-y-1.5">
                {overview.logins.map((l, i) => (
                  <li key={i} className="font-mono text-xs text-slate-400">
                    {new Date(l).toLocaleString(locale === 'ru' ? 'ru-RU' : 'az-AZ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </TabsContent>

      {/* INGREDIENTS */}
      <TabsContent value="ingredients">
        <input
          value={ingSearch}
          onChange={(e) => setIngSearch(e.target.value)}
          placeholder={t('search_ingredients')}
          className="mb-3 h-9 w-full max-w-xs rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-brand focus:outline-none"
        />
        <TableShell
          head={[t('name'), t('unit'), t('cost'), t('yield'), t('stock')]}
          empty={ingFiltered.length === 0 ? t('no_ingredients') : null}
        >
          {ingFiltered.map((i) => (
            <tr key={i.id} className="border-b border-white/[0.06] last:border-0">
              <td className={TD + ' font-medium text-white'}>{i.name}</td>
              <td className={TD + ' font-mono text-slate-300'}>{i.unit}</td>
              <td className={TD + ' font-mono text-slate-300'}>{formatMoney(i.cost)}</td>
              <td className={TD + ' font-mono text-slate-300'}>
                {Math.round(i.yield * 100)}%
              </td>
              <td className={TD + ' font-mono text-slate-300'}>{i.stock}</td>
            </tr>
          ))}
        </TableShell>
      </TabsContent>

      {/* RECIPES */}
      <TabsContent value="recipes">
        <TableShell
          head={[t('name'), t('ingredients'), t('cost'), t('food_cost'), t('sale_price')]}
          empty={recipes.length === 0 ? t('no_recipes') : null}
        >
          {recipes.map((r) => (
            <tr key={r.id} className="border-b border-white/[0.06] last:border-0">
              <td className={TD + ' font-medium text-white'}>{r.name}</td>
              <td className={TD + ' font-mono text-slate-300'}>{r.ingredientCount}</td>
              <td className={TD + ' font-mono text-slate-300'}>{formatMoney(r.totalCost)}</td>
              <td className={cn(TD, 'font-mono font-semibold', foodCostColor(r.foodCostPercent))}>
                {r.salePrice ? formatPercent(r.foodCostPercent) : '—'}
              </td>
              <td className={TD + ' font-mono text-slate-300'}>
                {r.salePrice ? formatMoney(r.salePrice) : '—'}
              </td>
            </tr>
          ))}
        </TableShell>
      </TabsContent>

      {/* STOCK */}
      <TabsContent value="stock">
        <div className="mb-3 flex flex-wrap gap-1">
          {MOVE_TYPES.map((mt) => (
            <button
              key={mt}
              type="button"
              onClick={() => setMoveType(mt)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs',
                moveType === mt ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {t(`movement.${mt}`)}
            </button>
          ))}
        </div>
        <TableShell
          head={[t('date'), t('type'), t('ingredient'), t('quantity'), t('notes')]}
          empty={moveFiltered.length === 0 ? t('no_movements') : null}
        >
          {moveFiltered.map((m) => (
            <tr key={m.id} className="border-b border-white/[0.06] last:border-0">
              <td className={TD + ' text-slate-400'}>{formatDate(m.created_at)}</td>
              <td className={TD}>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                  {t(`movement.${m.type}`)}
                </span>
              </td>
              <td className={TD + ' text-white'}>{m.ingredient}</td>
              <td className={TD + ' font-mono text-slate-300'}>
                {m.quantity} {m.unit}
              </td>
              <td className={TD + ' text-slate-500'}>{m.notes ?? '—'}</td>
            </tr>
          ))}
        </TableShell>
      </TabsContent>

      {/* BATCHES */}
      <TabsContent value="batches">
        <div className="mb-3 flex flex-wrap gap-1">
          {BATCH_STATUSES.map((bs) => (
            <button
              key={bs}
              type="button"
              onClick={() => setBatchStatus(bs)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs',
                batchStatus === bs ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {t(`batch.${bs}`)}
            </button>
          ))}
        </div>
        <TableShell
          head={[t('ingredient'), t('received_qty'), t('remaining'), t('unit_cost'), t('received'), t('expiry'), t('status')]}
          empty={batchFiltered.length === 0 ? t('no_batches') : null}
        >
          {batchFiltered.map((b) => (
            <tr
              key={b.id}
              className={cn(
                'border-b border-white/[0.06] last:border-0',
                b.expiringSoon && 'bg-amber-500/5'
              )}
            >
              <td className={TD + ' text-white'}>{b.ingredient}</td>
              <td className={TD + ' font-mono text-slate-300'}>{b.qtyReceived} {b.unit}</td>
              <td className={TD + ' font-mono text-slate-300'}>{b.qtyRemaining} {b.unit}</td>
              <td className={TD + ' font-mono text-slate-300'}>{formatMoney(b.unitCost)}</td>
              <td className={TD + ' text-slate-400'}>{formatDate(b.received)}</td>
              <td className={cn(TD, b.expiringSoon ? 'text-amber-300' : 'text-slate-400')}>
                {b.expiry ? formatDate(b.expiry) : '—'}
              </td>
              <td className={TD}>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                  {t(`batch.${b.status}`)}
                </span>
              </td>
            </tr>
          ))}
        </TableShell>
      </TabsContent>

      {/* PAYMENTS */}
      <TabsContent value="payments">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {t('total_paid')}:{' '}
            <span className="font-mono font-semibold text-white">{formatMoney(totalPaid)}</span>
          </p>
          <button
            type="button"
            onClick={() => setPayOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-[#04231A] hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" /> {t('add_payment')}
          </button>
        </div>
        <TableShell
          head={[t('date'), t('plan'), t('amount'), t('period'), t('method'), t('reference')]}
          empty={payments.length === 0 ? t('no_payments') : null}
        >
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-white/[0.06] last:border-0">
              <td className={TD + ' text-slate-400'}>{formatDate(p.paid_at)}</td>
              <td className={TD + ' text-slate-300'}>{p.planLabel}</td>
              <td className={TD + ' font-mono font-semibold text-white'}>{formatMoney(p.amount)}</td>
              <td className={TD + ' text-slate-400'}>{p.period}</td>
              <td className={TD + ' text-slate-400'}>{t(p.method)}</td>
              <td className={TD + ' font-mono text-slate-500'}>{p.reference ?? '—'}</td>
            </tr>
          ))}
        </TableShell>
        <RecordPaymentDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          locale={locale}
          tenantId={tenantId}
          plans={plans}
          defaultPlan={currentPlan}
        />
      </TabsContent>

      {/* NOTES */}
      <TabsContent value="notes">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-[#04231A] hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" /> {t('add_note')}
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{t('no_notes')}</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{n.author}</span>
                  <span>{formatDate(n.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-200">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
        <AddNoteDialog
          open={noteOpen}
          onOpenChange={setNoteOpen}
          locale={locale}
          tenantId={tenantId}
        />
      </TabsContent>
    </Tabs>
  )
}

function TableShell({
  head,
  empty,
  children,
}: {
  head: string[]
  empty: string | null
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 scroll-thin">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            {head.map((h) => (
              <th key={h} className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-12 text-center text-sm text-slate-500">
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}
