'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2, Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useRouter } from '@/lib/i18n/navigation'
import {
  validateDraft,
  type DraftRow,
} from '@/lib/import/parse-ingredients'
import { importIngredients } from '@/app/[locale]/app/(protected)/ingredients/import/actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ImportPreview({
  locale,
  initialRows,
  onBack,
}: {
  locale: string
  initialRows: DraftRow[]
  onBack: () => void
}) {
  const t = useTranslations('import')
  const router = useRouter()
  const [rows, setRows] = useState<DraftRow[]>(initialRows)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(
    null
  )

  const validated = useMemo(() => rows.map(validateDraft), [rows])
  const validCount = validated.filter((v) => v.row).length
  const errorCount = validated.length - validCount

  function patch(rowNumber: number, field: keyof DraftRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.row_number === rowNumber ? { ...r, [field]: value } : r))
    )
  }

  function remove(rowNumber: number) {
    setRows((prev) => prev.filter((r) => r.row_number !== rowNumber))
  }

  function confirm() {
    const payload = validated
      .map((v) => v.row)
      .filter((r): r is NonNullable<typeof r> => r !== null)
    if (payload.length === 0) return
    startTransition(async () => {
      const res = await importIngredients(locale, JSON.stringify(payload))
      if (res.ok) {
        setResult({ inserted: res.inserted ?? 0, skipped: res.skipped ?? 0 })
        router.refresh()
      }
    })
  }

  if (result) {
    return (
      <div className="stokly-card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-6 w-6" />
        </div>
        <p className="text-lg font-semibold">
          {result.skipped > 0
            ? t('success_skipped', {
                count: result.inserted,
                skipped: result.skipped,
              })
            : t('success', { count: result.inserted })}
        </p>
        <Button asChild>
          <Link href="/app/ingredients" className="gap-2">
            {t('back')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    )
  }

  const cell =
    'h-9 w-full rounded-md border bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15'

  function field(v: (typeof validated)[number], name: keyof DraftRow) {
    const err = v.errors[name as string]
    return (
      <input
        value={v.draft[name]}
        onChange={(e) => patch(v.row_number, name, e.target.value)}
        className={cn(cell, err ? 'border-[#E53E3E]' : 'border-input')}
        title={err ? t(`err_${err}` as 'err_required') : undefined}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-[#166534]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
            {t('summary_ready', { count: validCount })}
          </span>
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-2 font-medium text-[#991B1B]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E53E3E]" />
              {t('summary_errors', { count: errorCount })}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t('units_hint')}</p>
      </div>

      {/* Editable table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="w-1 px-2 py-2" />
              <th className="px-2 py-2 text-left font-semibold">{t('col_name')}</th>
              <th className="px-2 py-2 text-left font-semibold">{t('col_unit')}</th>
              <th className="px-2 py-2 text-left font-semibold">{t('col_cost')}</th>
              <th className="px-2 py-2 text-left font-semibold">{t('col_yield')}</th>
              <th className="px-2 py-2 text-left font-semibold">
                {t('col_supplier')}
              </th>
              <th className="px-2 py-2 text-left font-semibold">{t('col_low')}</th>
              <th className="w-1 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {validated.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {t('empty')}
                </td>
              </tr>
            ) : (
              validated.map((v) => {
                const status = v.row
                  ? v.warning
                    ? 'warn'
                    : 'ok'
                  : 'error'
                const stripe =
                  status === 'ok'
                    ? 'bg-[#22C55E]'
                    : status === 'warn'
                      ? 'bg-[#D97706]'
                      : 'bg-[#E53E3E]'
                return (
                  <tr key={v.row_number} className="border-b border-[#F0F4F8]">
                    <td className="p-0">
                      <span className={cn('block h-9 w-1', stripe)} />
                    </td>
                    <td className="px-1.5 py-1.5">{field(v, 'name')}</td>
                    <td className="px-1.5 py-1.5 w-20">{field(v, 'unit')}</td>
                    <td className="px-1.5 py-1.5 w-24">{field(v, 'cost')}</td>
                    <td className="px-1.5 py-1.5 w-20">{field(v, 'yield')}</td>
                    <td className="px-1.5 py-1.5">{field(v, 'supplier')}</td>
                    <td className="px-1.5 py-1.5 w-24">{field(v, 'low_stock')}</td>
                    <td className="px-1.5 py-1.5">
                      <button
                        onClick={() => remove(v.row_number)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#FEF2F2] hover:text-[#E53E3E]"
                        aria-label="delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Button>
        <Button onClick={confirm} disabled={pending || validCount === 0}>
          {pending ? t('importing') : t('confirm')}
        </Button>
      </div>
    </div>
  )
}
