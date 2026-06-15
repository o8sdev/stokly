'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { StockCountForm, type CountItem } from './stock-count-form'
import { OpeningCountWizard } from './opening-count-wizard'
import { PreCountModal } from './pre-count-modal'
import { MissingSalesPanel } from './missing-sales-panel'
import type { PreCountInfo } from '@/lib/data/counts'

// Gates the count behind the pre-count checklist, then renders the existing
// single-submit count form with a mid-count "add sales" affordance. No DB
// draft: the period is created when the count is confirmed (submitStockCount).
export function CountFlow({
  locale,
  items,
  preCount,
  locations,
  defaultLocationId,
  blind = false,
}: {
  locale: string
  items: CountItem[]
  preCount: PreCountInfo
  locations: { id: string; name: string }[]
  defaultLocationId: string
  blind?: boolean
}) {
  const t = useTranslations()
  const router = useRouter()
  const [started, setStarted] = useState(false)
  const [missing, setMissing] = useState<string[]>(preCount.missingSalesDates)
  const [panelOpen, setPanelOpen] = useState(false)

  function handleSaved(saved: string[]) {
    setMissing((prev) => prev.filter((d) => !saved.includes(d)))
    setPanelOpen(false)
    router.refresh()
  }

  // Day-0 opening count: a strict step-by-step wizard (one location per step,
  // every ingredient required even if 0, and submittable only on the final
  // review step behind a confirmation). There is no prior period to reconcile,
  // so the pre-count sales checklist is skipped entirely.
  if (!preCount.hasPreviousCount) {
    return (
      <OpeningCountWizard locale={locale} items={items} locations={locations} />
    )
  }

  if (!started) {
    return (
      <>
        <PreCountModal
          locale={locale}
          preCount={{ ...preCount, missingSalesDates: missing }}
          onStart={() => setStarted(true)}
          onAddSales={() => setPanelOpen(true)}
        />
        <MissingSalesPanel
          locale={locale}
          dates={missing}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onSaved={handleSaved}
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
        <div className="text-sm">
          <span className="text-muted-foreground">{t('precount.period')}: </span>
          <span className="font-medium">
            {formatDate(preCount.periodStart)} → {formatDate(preCount.periodEnd)}
          </span>
          {missing.length > 0 && (
            <span className="ml-2 text-xs text-amber-600">
              {t('precount.sales_missing', { count: missing.length })}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setPanelOpen(true)}
          className="gap-1.5"
        >
          <Receipt className="h-4 w-4" />
          {t('precount.add_sales')}
        </Button>
      </div>

      <StockCountForm
        locale={locale}
        items={items}
        locations={locations}
        defaultLocationId={defaultLocationId}
        blind={blind}
      />

      <MissingSalesPanel
        locale={locale}
        dates={missing}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
