// Cmd+K global search across Phase-1 admin data (tenant names, invite codes +
// emails, payment references, note bodies). Results are grouped by type.

import { createClient } from '@/lib/supabase/server'

export type SearchKind = 'tenant' | 'invitation' | 'payment' | 'note'

export interface SearchResult {
  kind: SearchKind
  id: string
  label: string
  sublabel?: string
  href: string
}

export async function globalSearch(
  q: string,
  locale: string
): Promise<SearchResult[]> {
  const term = q.trim()
  if (term.length < 2) return []
  const supabase = createClient()
  const like = `%${term}%`

  const [tenants, invites, payments, notes] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, name, plan_tier')
      .ilike('name', like)
      .neq('status', 'deleted')
      .limit(6),
    supabase
      .from('invitations')
      .select('id, code, email')
      .or(`code.ilike.${like},email.ilike.${like}`)
      .limit(6),
    supabase
      .from('manual_payments')
      .select('id, tenant_id, reference, amount')
      .ilike('reference', like)
      .limit(6),
    supabase
      .from('admin_notes')
      .select('id, tenant_id, body')
      .ilike('body', like)
      .limit(6),
  ])

  const results: SearchResult[] = []

  for (const t of tenants.data ?? []) {
    results.push({
      kind: 'tenant',
      id: t.id,
      label: t.name,
      sublabel: t.plan_tier,
      href: `/${locale}/admin/tenants/${t.id}`,
    })
  }
  for (const i of invites.data ?? []) {
    results.push({
      kind: 'invitation',
      id: i.id,
      label: i.code,
      sublabel: i.email ?? undefined,
      href: `/${locale}/admin/invitations`,
    })
  }
  for (const p of payments.data ?? []) {
    results.push({
      kind: 'payment',
      id: p.id,
      label: p.reference ?? '—',
      sublabel: `${p.amount} AZN`,
      href: `/${locale}/admin/tenants/${p.tenant_id}`,
    })
  }
  for (const n of notes.data ?? []) {
    results.push({
      kind: 'note',
      id: n.id,
      label: n.body.slice(0, 60),
      href: `/${locale}/admin/tenants/${n.tenant_id}`,
    })
  }

  return results
}
