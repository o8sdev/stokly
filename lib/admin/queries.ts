// Admin list loaders — server-side filtered, sorted, paginated. Kept separate
// from the tenant-scoped lib/data/queries.ts. Tenant-name joins are done with a
// follow-up `.in()` lookup (no embedded joins) to stay fully typed.

import { createClient } from '@/lib/supabase/server'
import type {
  Tenant,
  ManualPayment,
  Invitation,
  AdminAuditLog,
  AdminNote,
} from '@/types/database'

const DAY = 86400000

function clampPageSize(n: number | undefined): number {
  return n === 50 || n === 100 ? n : 25
}

async function tenantNameMap(
  supabase: ReturnType<typeof createClient>,
  ids: (string | null)[]
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))]
  if (unique.length === 0) return new Map()
  const { data } = await supabase.from('tenants').select('id, name').in('id', unique)
  return new Map((data ?? []).map((t) => [t.id, t.name]))
}

// ── TENANTS ────────────────────────────────────────────────────────────────
export interface TenantFilter {
  search?: string
  plan?: string
  status?: string
  signupFrom?: string
  signupTo?: string
  lastActive?: 'today' | 'week' | 'month' | 'inactive14' | 'inactive30'
  sort?: 'name' | 'created_at' | 'last_active_at' | 'plan_tier' | 'status'
  dir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface TenantListResult {
  rows: Tenant[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export async function listTenants(
  filter: TenantFilter
): Promise<TenantListResult> {
  const supabase = createClient()
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = clampPageSize(filter.pageSize)

  let q = supabase.from('tenants').select('*', { count: 'exact' })

  if (filter.status && filter.status !== 'all') {
    q = q.eq('status', filter.status as Tenant['status'])
  } else {
    q = q.neq('status', 'deleted')
  }
  if (filter.plan && filter.plan !== 'all') q = q.eq('plan_tier', filter.plan)
  if (filter.search) q = q.ilike('name', `%${filter.search}%`)
  if (filter.signupFrom) q = q.gte('created_at', filter.signupFrom)
  if (filter.signupTo) q = q.lte('created_at', filter.signupTo)

  const now = Date.now()
  switch (filter.lastActive) {
    case 'today':
      q = q.gte('last_active_at', new Date(now - DAY).toISOString())
      break
    case 'week':
      q = q.gte('last_active_at', new Date(now - 7 * DAY).toISOString())
      break
    case 'month':
      q = q.gte('last_active_at', new Date(now - 30 * DAY).toISOString())
      break
    case 'inactive14':
      q = q.lt('last_active_at', new Date(now - 14 * DAY).toISOString())
      break
    case 'inactive30':
      q = q.lt('last_active_at', new Date(now - 30 * DAY).toISOString())
      break
  }

  const sort = filter.sort ?? 'created_at'
  q = q.order(sort, { ascending: filter.dir === 'asc', nullsFirst: false })

  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)

  const { data, count } = await q
  const total = count ?? 0
  return {
    rows: data ?? [],
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = createClient()
  const { data } = await supabase.from('tenants').select('*').eq('id', id).maybeSingle()
  return data ?? null
}

// Owner/members of a tenant (with emails resolved best-effort by the page).
export interface TenantMemberRow {
  user_id: string
  role: string
  created_at: string
}
export async function getTenantMembers(tenantId: string): Promise<TenantMemberRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenant_members')
    .select('user_id, role, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
  return data ?? []
}

// ── PAYMENTS ───────────────────────────────────────────────────────────────
export interface PaymentRow extends ManualPayment {
  tenant_name: string | null
}
export interface PaymentFilter {
  search?: string // tenant name
  plan?: string
  from?: string
  to?: string
  sort?: 'paid_at' | 'amount'
  dir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}
export interface PaymentListResult {
  rows: PaymentRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export async function listPayments(
  filter: PaymentFilter
): Promise<PaymentListResult> {
  const supabase = createClient()
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = filter.pageSize ?? 25

  let tenantIds: string[] | null = null
  if (filter.search) {
    const { data: t } = await supabase
      .from('tenants')
      .select('id')
      .ilike('name', `%${filter.search}%`)
    tenantIds = (t ?? []).map((x) => x.id)
    if (tenantIds.length === 0) {
      return { rows: [], total: 0, page, pageSize, pageCount: 1 }
    }
  }

  let q = supabase.from('manual_payments').select('*', { count: 'exact' })
  if (tenantIds) q = q.in('tenant_id', tenantIds)
  if (filter.plan && filter.plan !== 'all') q = q.eq('plan_key', filter.plan)
  if (filter.from) q = q.gte('paid_at', filter.from)
  if (filter.to) q = q.lte('paid_at', filter.to)
  q = q.order(filter.sort ?? 'paid_at', { ascending: filter.dir === 'asc' })
  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)

  const { data, count } = await q
  const names = await tenantNameMap(supabase, (data ?? []).map((p) => p.tenant_id))
  const rows: PaymentRow[] = (data ?? []).map((p) => ({
    ...p,
    tenant_name: names.get(p.tenant_id) ?? null,
  }))
  const total = count ?? 0
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function getTenantPayments(tenantId: string): Promise<ManualPayment[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('manual_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('paid_at', { ascending: false })
  return data ?? []
}

export interface OverdueRow {
  id: string
  name: string
  plan_tier: string
  last_covered: string | null
  days_overdue: number | null
}

// Active tenants whose last covered period ended 3+ days ago (or never paid).
export async function getOverdueTenants(): Promise<OverdueRow[]> {
  const supabase = createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, plan_tier')
    .eq('status', 'active')
  const list = tenants ?? []
  if (list.length === 0) return []
  const ids = list.map((t) => t.id)
  const { data: payments } = await supabase
    .from('manual_payments')
    .select('tenant_id, period_end, paid_at')
    .in('tenant_id', ids)
  const lastCovered = new Map<string, string>()
  for (const p of payments ?? []) {
    const covered = p.period_end ?? p.paid_at.slice(0, 10)
    const prev = lastCovered.get(p.tenant_id)
    if (!prev || covered > prev) lastCovered.set(p.tenant_id, covered)
  }
  const now = Date.now()
  const rows: OverdueRow[] = []
  for (const t of list) {
    const covered = lastCovered.get(t.id) ?? null
    const coveredMs = covered ? new Date(covered).getTime() : 0
    if (!covered || now - coveredMs > 3 * DAY) {
      rows.push({
        id: t.id,
        name: t.name,
        plan_tier: t.plan_tier,
        last_covered: covered,
        days_overdue: covered ? Math.floor((now - coveredMs) / DAY) : null,
      })
    }
  }
  return rows
}

// ── INVITATIONS ──────────────────────────────────────────────────────────
export interface InvitationRow extends Invitation {
  tenant_name: string | null
}
export interface InvitationFilter {
  search?: string
  status?: string
  plan?: string
  page?: number
  pageSize?: number
}
export interface InvitationListResult {
  rows: InvitationRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export async function listInvitations(
  filter: InvitationFilter
): Promise<InvitationListResult> {
  const supabase = createClient()
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = filter.pageSize ?? 25
  let q = supabase.from('invitations').select('*', { count: 'exact' })
  if (filter.status && filter.status !== 'all') {
    q = q.eq('status', filter.status as Invitation['status'])
  }
  if (filter.plan && filter.plan !== 'all') q = q.eq('plan_key', filter.plan)
  if (filter.search) {
    q = q.or(`code.ilike.%${filter.search}%,email.ilike.%${filter.search}%`)
  }
  q = q.order('created_at', { ascending: false })
  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)
  const { data, count } = await q
  const names = await tenantNameMap(supabase, (data ?? []).map((i) => i.tenant_id))
  const rows: InvitationRow[] = (data ?? []).map((i) => ({
    ...i,
    tenant_name: i.tenant_id ? names.get(i.tenant_id) ?? null : null,
  }))
  const total = count ?? 0
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

// ── AUDIT LOG ──────────────────────────────────────────────────────────────
export interface AuditRow extends AdminAuditLog {
  tenant_name: string | null
}
export interface AuditFilter {
  action?: string
  actor?: string
  tenant?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}
export interface AuditListResult {
  rows: AuditRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export async function listAuditLogs(filter: AuditFilter): Promise<AuditListResult> {
  const supabase = createClient()
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = filter.pageSize ?? 50
  let q = supabase.from('admin_audit_log').select('*', { count: 'exact' })
  if (filter.action && filter.action !== 'all') q = q.eq('action', filter.action)
  if (filter.actor) q = q.ilike('actor_email', `%${filter.actor}%`)
  if (filter.tenant) q = q.eq('target_tenant_id', filter.tenant)
  if (filter.from) q = q.gte('created_at', filter.from)
  if (filter.to) q = q.lte('created_at', filter.to)
  q = q.order('created_at', { ascending: false })
  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)
  const { data, count } = await q
  const names = await tenantNameMap(
    supabase,
    (data ?? []).map((a) => a.target_tenant_id)
  )
  const rows: AuditRow[] = (data ?? []).map((a) => ({
    ...a,
    tenant_name: a.target_tenant_id ? names.get(a.target_tenant_id) ?? null : null,
  }))
  const total = count ?? 0
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

// ── NOTES ──────────────────────────────────────────────────────────────────
export async function getTenantNotes(tenantId: string): Promise<AdminNote[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('admin_notes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  return data ?? []
}
