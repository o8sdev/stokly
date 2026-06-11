'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import {
  saveDailySalesItems,
  type SalesItemInput,
} from '@/app/[locale]/app/(protected)/sales/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/utils'

export interface MenuItem {
  id: string
  name: string
  price: number
}

interface Row {
  k: string
  recipe_id: string
  qty: string
  // Comp / staff meal: consumes stock, earns no revenue.
  is_comp: boolean
}

let rowCounter = 0
function nextRowKey(): string {
  rowCounter += 1
  return `srow-${rowCounter}`
}

export function SalesItemEditor({
  locale,
  date,
  menuItems,
  initialItems,
  note: initialNote,
  locked = false,
}: {
  locale: string
  date: string
  menuItems: MenuItem[]
  initialItems: { recipe_id: string; quantity: number; is_comp?: boolean }[]
  note?: string | null
  locked?: boolean
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const priceById = useMemo(
    () => new Map(menuItems.map((m) => [m.id, m.price])),
    [menuItems]
  )
  const nameById = useMemo(
    () => new Map(menuItems.map((m) => [m.id, m.name])),
    [menuItems]
  )

  const [rows, setRows] = useState<Row[]>(
    initialItems
      .filter((i) => priceById.has(i.recipe_id))
      .map((i) => ({
        k: nextRowKey(),
        recipe_id: i.recipe_id,
        qty: String(i.quantity),
        is_comp: i.is_comp === true,
      }))
  )
  const [note, setNote] = useState(initialNote ?? '')

  // The same dish may appear twice (a paid row + a comp row), so the picker
  // always offers the full menu; duplicate (dish, comp) rows merge on save.
  const paidTotal = rows.reduce(
    (sum, r) =>
      sum +
      (r.is_comp ? 0 : (Number(r.qty) || 0) * (priceById.get(r.recipe_id) ?? 0)),
    0
  )
  const compTotal = rows.reduce(
    (sum, r) =>
      sum +
      (r.is_comp ? (Number(r.qty) || 0) * (priceById.get(r.recipe_id) ?? 0) : 0),
    0
  )

  function addItem(id: string) {
    if (!id) return
    setRows((rs) => [
      ...rs,
      { k: nextRowKey(), recipe_id: id, qty: '1', is_comp: false },
    ])
    setStatus('idle')
  }
  function patchRow(k: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.k === k ? { ...r, ...patch } : r)))
    setStatus('idle')
  }
  function removeRow(k: string) {
    setRows((rs) => rs.filter((r) => r.k !== k))
    setStatus('idle')
  }

  function save() {
    const items: SalesItemInput[] = rows
      .map((r) => ({
        recipe_id: r.recipe_id,
        quantity: Number(r.qty) || 0,
        is_comp: r.is_comp,
      }))
      .filter((i) => i.quantity > 0)
    startTransition(async () => {
      const res = await saveDailySalesItems(locale, { date, note, items })
      if (res.success) {
        setStatus('ok')
        router.refresh()
      } else {
        setStatus('error')
      }
    })
  }

  return (
    <div className="stokly-card space-y-4 p-4">
      {locked && (
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          {t('sales.locked_readonly')}
        </p>
      )}
      {/* Add a menu item */}
      <div className={locked ? 'hidden' : 'space-y-2'}>
        <Label>{t('sales.add_item')}</Label>
        <div className="flex gap-2">
          <select
            value=""
            onChange={(e) => addItem(e.target.value)}
            disabled={locked || menuItems.length === 0}
            className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
          >
            <option value="">{t('sales.select_item')}</option>
            {menuItems.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.price > 0 ? ` — ${formatMoney(m.price)}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Line items */}
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {t('sales.no_items_yet')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">{t('sales.item')}</th>
                <th className="w-24 px-3 py-2 text-right font-semibold">
                  {t('sales.qty')}
                </th>
                <th className="w-16 px-2 py-2 text-center font-semibold">
                  {t('sales.comp')}
                </th>
                <th className="w-28 px-3 py-2 text-right font-semibold">
                  {t('sales.line_total')}
                </th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const price = priceById.get(r.recipe_id) ?? 0
                const line = (Number(r.qty) || 0) * price
                return (
                  <tr
                    key={r.k}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">
                      {nameById.get(r.recipe_id)}
                      {r.is_comp ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          {t('sales.comp')}
                        </span>
                      ) : (
                        price === 0 && (
                          <span className="ml-2 text-[11px] text-amber-600">
                            {t('sales.no_price')}
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={r.qty}
                        disabled={locked}
                        onChange={(e) => patchRow(r.k, { qty: e.target.value })}
                        className="h-9 text-right font-mono"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.is_comp}
                        disabled={locked}
                        onChange={(e) =>
                          patchRow(r.k, { is_comp: e.target.checked })
                        }
                        aria-label={t('sales.comp_hint')}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td
                      className={
                        'px-3 py-2 text-right font-mono tabular-nums' +
                        (r.is_comp ? ' text-muted-foreground line-through' : '')
                      }
                    >
                      {formatMoney(line)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => removeRow(r.k)}
                          aria-label={t('common.delete')}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-secondary/30">
                <td className="px-3 py-2.5 text-sm font-semibold" colSpan={3}>
                  {t('sales.revenue')}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums">
                  {formatMoney(paidTotal)}
                </td>
                <td />
              </tr>
              {compTotal > 0 && (
                <tr className="border-t border-border/60 bg-secondary/20">
                  <td
                    className="px-3 py-2 text-xs text-muted-foreground"
                    colSpan={3}
                  >
                    {t('sales.comp_value')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {formatMoney(compTotal)}
                  </td>
                  <td />
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}

      {/* Note */}
      <div className="space-y-2">
        <Label htmlFor="sales_note">{t('sales.note')}</Label>
        <Input
          id="sales_note"
          value={note}
          disabled={locked}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {!locked && status === 'error' && (
        <p className="text-sm text-destructive">{t('common.error')}</p>
      )}
      {!locked && status === 'ok' && (
        <p className="text-sm text-green-600">{t('common.save')} ✓</p>
      )}

      {!locked && (
        <Button onClick={save} disabled={pending} className="gap-2">
          <Plus className="h-4 w-4" />
          {pending ? t('common.saving') : t('common.save')}
        </Button>
      )}
    </div>
  )
}
