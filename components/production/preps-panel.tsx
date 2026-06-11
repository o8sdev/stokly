import { getTranslations } from 'next-intl/server'
import { Boxes } from 'lucide-react'
import type { PrepSummary } from '@/lib/data/queries'
import { MonoValue } from '@/components/ui/stokly-theme'
import { formatQuantity, formatMoney, formatDate } from '@/lib/utils'

// Stocked preps (Yarımfabrikat) at a glance: current on-hand, cost/serving, last
// production yield, nearest expiry. Hidden until at least one stocked prep exists.
export async function PrepsPanel({ preps }: { preps: PrepSummary[] }) {
  const t = await getTranslations('production')
  if (preps.length === 0) return null

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Boxes className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">{t('preps_title')}</h2>
          <p className="text-xs text-muted-foreground">{t('preps_help')}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2.5 font-semibold">{t('prep_name')}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t('prep_onhand')}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t('prep_cost')}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t('prep_yield')}</th>
            <th className="px-4 py-2.5 text-left font-semibold">{t('prep_expiry')}</th>
          </tr>
        </thead>
        <tbody>
          {preps.map((p) => (
            <tr key={p.recipe_id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-2.5 font-medium">{p.name}</td>
              <td className="px-3 py-2.5 text-right">
                <span
                  className={p.on_hand < 0 ? 'font-semibold text-[#DC2626]' : ''}
                >
                  <MonoValue value={formatQuantity(p.on_hand)} unit={p.unit} />
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <MonoValue value={formatMoney(p.cost_per_unit)} />
              </td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                {p.last_yield_percent != null
                  ? `${(p.last_yield_percent * 100).toFixed(0)}%`
                  : '—'}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {p.nearest_expiry ? formatDate(p.nearest_expiry) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
