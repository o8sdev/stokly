'use server'

import { requireTenant } from '@/lib/auth/tenant'
import { getPeriod } from '@/lib/data/counts'
import { getTenant } from '@/lib/data/queries'
import { sendEmail } from '@/lib/email/notify'
import {
  computePeriodKpis,
  type PeriodReportData,
} from '@/lib/calculations/period-report'

export interface EmailReportResult {
  ok?: boolean
  error?: 'not_configured' | 'generic'
}

const money = (n: number): string => `${n.toFixed(2)} AZN`
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// E-mail the stored period report to the signed-in user (the owner sends the
// results to their own inbox — useful when managers drive the dashboard).
export async function emailPeriodReport(
  locale: string,
  periodId: string
): Promise<EmailReportResult> {
  const ctx = await requireTenant(locale)
  if (!ctx.email) return { error: 'generic' }

  const [period, tenant] = await Promise.all([
    getPeriod(ctx.tenantId, periodId),
    getTenant(ctx.tenantId),
  ])
  const report = (period?.report_data as unknown as PeriodReportData) ?? null
  if (!period || !report) return { error: 'generic' }
  const kpis = computePeriodKpis(report)

  const topLines = report.lines
    .slice(0, 10)
    .map(
      (l) =>
        `<tr><td style="padding:4px 12px 4px 0">${esc(l.name)}</td>` +
        `<td align="right" style="padding:4px 0;font-family:monospace">${l.usage_qty} ${esc(l.unit)}</td>` +
        `<td align="right" style="padding:4px 0 4px 16px;font-family:monospace">${money(l.usage_value)}</td></tr>`
    )
    .join('')

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 24px 4px 0;color:#5b574a">${label}</td>` +
    `<td align="right" style="padding:4px 0;font-family:monospace;font-weight:600">${value}</td></tr>`

  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:560px;color:#1c1a14">
    <h2 style="margin:0 0 4px">Stokly — ${esc(tenant?.name ?? '')}</h2>
    <p style="margin:0 0 16px;color:#5b574a">
      ${report.period_start} → ${report.period_end} (${report.days_in_period} gün)
    </p>
    <table cellspacing="0" cellpadding="0">
      ${row('Satış (gəlir)', money(report.sales_total))}
      ${row('Maya dəyəri (COGS)', money(report.cogs))}
      ${row('Yemək dəyəri %', report.food_cost_percent != null ? `${report.food_cost_percent}%` : '—')}
      ${row('İtki', money(report.waste_value))}
      ${row('Alışlar', money(report.deliveries_value))}
      ${row('Açılış anbarı', money(report.opening_value))}
      ${row('Bağlanış anbarı', money(report.closing_value))}
      ${row('Dövriyyə (turnover)', kpis.inventory_turnover != null ? String(kpis.inventory_turnover) : '—')}
      ${row('Stok günləri', kpis.days_on_hand != null ? String(kpis.days_on_hand) : '—')}
    </table>
    <h3 style="margin:20px 0 6px;font-size:14px">İstifadə üzrə ilk 10 inqrediyent</h3>
    <table cellspacing="0" cellpadding="0" style="font-size:13px">${topLines}</table>
    <p style="margin:20px 0 0;color:#8e8a7b;font-size:12px">
      Stokly · avtomatik hesabat — ${esc(ctx.email)}
    </p>
  </div>`

  if (!process.env.RESEND_API_KEY) return { error: 'not_configured' }
  const ok = await sendEmail({
    to: ctx.email,
    subject: `Stokly hesabat — ${tenant?.name ?? ''} · ${report.period_start} → ${report.period_end}`,
    html,
  })
  return ok ? { ok: true } : { error: 'generic' }
}
