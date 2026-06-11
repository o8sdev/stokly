'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { IMPERSONATION_COOKIE } from '@/lib/auth/tenant'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit'
import type { TenantStatus } from '@/types/database'

export interface TenantActionResult {
  ok?: boolean
  error?: string
  link?: string
}

async function ensureAdmin(locale: string) {
  return requirePlatformAdmin(locale)
}
async function ensureSuper(locale: string): Promise<boolean> {
  const ctx = await requirePlatformAdmin(locale)
  return ctx.role === 'super'
}

// ── Impersonation (god-mode) ───────────────────────────────────────────────
export async function enterTenant(locale: string, tenantId: string): Promise<void> {
  await ensureAdmin(locale)
  await logAdminAction('tenant_impersonated', { targetTenantId: tenantId })
  cookies().set(IMPERSONATION_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  redirect(`/${locale}/app/dashboard`)
}

// ── Plan change (up/down tier) ─────────────────────────────────────────────
export async function changePlan(
  locale: string,
  tenantId: string,
  planKey: string
): Promise<void> {
  if (!(await ensureSuper(locale))) return
  const supabase = createClient()
  const { data: current } = await supabase
    .from('tenants')
    .select('plan_tier, status, trial_ends_at')
    .eq('id', tenantId)
    .maybeSingle()

  const patch: {
    plan_tier: string
    status?: TenantStatus
    suspended_at?: null
    trial_ends_at?: string
  } = { plan_tier: planKey }

  if (planKey !== 'trial') {
    // Moving to a paid plan fully activates the tenant from ANY status
    // (suspended, churned, trial) — "set tier → Standart" = activate.
    patch.status = 'active'
    patch.suspended_at = null
  } else {
    // Downgrade to trial → keep a coherent, live trial window.
    patch.status = 'trial'
    patch.suspended_at = null
    const end = current?.trial_ends_at ? new Date(current.trial_ends_at) : null
    if (!end || end.getTime() < Date.now()) {
      const seed = new Date()
      seed.setDate(seed.getDate() + 14)
      patch.trial_ends_at = seed.toISOString()
    }
  }

  await supabase.from('tenants').update(patch).eq('id', tenantId)
  await supabase.rpc('log_activity', {
    p_tenant: tenantId,
    p_user: null,
    p_type: 'plan_changed',
    p_meta: { from: current?.plan_tier ?? null, to: planKey },
  })
  await logAdminAction('plan_changed', {
    targetTenantId: tenantId,
    details: { from: current?.plan_tier ?? null, to: planKey },
  })
  revalidatePath(`/${locale}/admin/tenants/${tenantId}`)
  revalidatePath(`/${locale}/admin/tenants`)
}

// Set / extend / grant a trial. Accepts either a relative `days` or an absolute
// `ends_at` date. Relative math anchors on max(now, current end) so extending an
// already-lapsed trial always lands in the future. Always (re)sets status='trial'
// and clears any suspension — so this doubles as "grant/revive a trial" from any
// status (suspended ex-trial, churned, etc.).
export async function setTrialPeriod(
  locale: string,
  _prev: TenantActionResult,
  formData: FormData
): Promise<TenantActionResult> {
  if (!(await ensureSuper(locale))) return { error: 'forbidden' }
  const tenantId = String(formData.get('tenant_id') ?? '')
  if (!tenantId) return { error: 'validation' }
  const endsAtRaw = String(formData.get('ends_at') ?? '').trim()
  const daysRaw = String(formData.get('days') ?? '').trim()

  const supabase = createClient()
  let newEnd: Date
  if (endsAtRaw) {
    // Inclusive through the chosen day; reject anything already past.
    newEnd = new Date(`${endsAtRaw}T23:59:59Z`)
    if (Number.isNaN(newEnd.getTime()) || newEnd.getTime() < Date.now()) {
      return { error: 'validation' }
    }
  } else {
    const days = Number(daysRaw)
    if (!Number.isFinite(days) || days <= 0) return { error: 'validation' }
    const { data: t } = await supabase
      .from('tenants')
      .select('trial_ends_at')
      .eq('id', tenantId)
      .maybeSingle()
    const existing = t?.trial_ends_at ? new Date(t.trial_ends_at) : null
    const base =
      existing && existing.getTime() > Date.now() ? existing : new Date()
    base.setDate(base.getDate() + days)
    newEnd = base
  }

  await supabase
    .from('tenants')
    .update({
      trial_ends_at: newEnd.toISOString(),
      status: 'trial',
      suspended_at: null,
    })
    .eq('id', tenantId)
  await logAdminAction('trial_extended', {
    targetTenantId: tenantId,
    details: { ends_at: newEnd.toISOString() },
  })
  revalidatePath(`/${locale}/admin/tenants/${tenantId}`)
  revalidatePath(`/${locale}/admin/tenants`)
  return { ok: true }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function suspendTenant(locale: string, tenantId: string): Promise<void> {
  if (!(await ensureSuper(locale))) return
  const supabase = createClient()
  await supabase
    .from('tenants')
    .update({ status: 'suspended', suspended_at: new Date().toISOString() })
    .eq('id', tenantId)
  await logAdminAction('account_suspended', { targetTenantId: tenantId })
  revalidatePath(`/${locale}/admin/tenants/${tenantId}`)
  revalidatePath(`/${locale}/admin/tenants`)
}

export async function reactivateTenant(locale: string, tenantId: string): Promise<void> {
  if (!(await ensureSuper(locale))) return
  const supabase = createClient()
  await supabase
    .from('tenants')
    .update({ status: 'active', suspended_at: null })
    .eq('id', tenantId)
  await logAdminAction('account_reactivated', { targetTenantId: tenantId })
  revalidatePath(`/${locale}/admin/tenants/${tenantId}`)
  revalidatePath(`/${locale}/admin/tenants`)
}

// Soft delete — recoverable; hides the tenant from default lists.
export async function softDeleteTenant(locale: string, tenantId: string): Promise<void> {
  if (!(await ensureSuper(locale))) return
  const supabase = createClient()
  await supabase
    .from('tenants')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', tenantId)
  await logAdminAction('account_deleted', { targetTenantId: tenantId })
  revalidatePath(`/${locale}/admin/tenants`)
}

// Hard delete — irreversible. Requires typing the exact tenant slug. Audited
// BEFORE the destructive delete so the trail survives.
export async function hardDeleteTenant(
  locale: string,
  tenantId: string,
  confirmSlug: string
): Promise<TenantActionResult> {
  if (!(await ensureSuper(locale))) return { error: 'forbidden' }
  const supabase = createClient()
  const { data: t } = await supabase
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .maybeSingle()
  if (!t) return { error: 'not_found' }
  if (confirmSlug.trim() !== t.slug) return { error: 'mismatch' }

  await logAdminAction('account_hard_deleted', {
    targetTenantId: tenantId,
    details: { slug: t.slug },
  })

  // Snapshot members (for auth-user cleanup), then ordered-delete the tenant + all
  // its data via the RPC — a plain cascade delete fails on RESTRICT FKs and locked
  // confirmed-sales days. Member auth users are removed after, via the service role.
  const { data: members } = await supabase
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', tenantId)
  const { error: delErr } = await supabase.rpc('delete_tenant_cascade', {
    p_tenant: tenantId,
  })
  if (delErr) return { error: 'generic' }
  try {
    const admin = createAdminClient()
    for (const m of members ?? []) {
      await admin.auth.admin.deleteUser(m.user_id)
    }
  } catch {
    // Service role key may be absent; the tenant data is already removed.
  }
  redirect(`/${locale}/admin/tenants`)
}

// ── Payments / notes ───────────────────────────────────────────────────────
export async function recordPayment(
  locale: string,
  _prev: TenantActionResult,
  formData: FormData
): Promise<TenantActionResult> {
  const ctx = await ensureAdmin(locale)
  const tenant_id = String(formData.get('tenant_id') ?? '')
  const amount = Number(formData.get('amount') ?? NaN)
  const plan_key = String(formData.get('plan_key') ?? '') || null
  const method = String(formData.get('method') ?? 'bank_transfer')
  const reference = String(formData.get('reference') ?? '').trim() || null
  const period_start = String(formData.get('period_start') ?? '') || null
  const period_end = String(formData.get('period_end') ?? '') || null
  const note = String(formData.get('note') ?? '').trim() || null

  if (!tenant_id || !Number.isFinite(amount) || amount < 0) {
    return { error: 'validation' }
  }

  const supabase = createClient()
  const { error } = await supabase.from('manual_payments').insert({
    tenant_id,
    amount,
    plan_key,
    method: method as 'bank_transfer' | 'cash' | 'other',
    reference,
    period_start,
    period_end,
    note,
    created_by: ctx.userId,
  })
  if (error) return { error: 'generic' }

  await logAdminAction('payment_recorded', {
    targetTenantId: tenant_id,
    details: { amount, plan_key },
  })
  revalidatePath(`/${locale}/admin/tenants/${tenant_id}`)
  revalidatePath(`/${locale}/admin/revenue`)
  return { ok: true }
}

export async function addNote(
  locale: string,
  _prev: TenantActionResult,
  formData: FormData
): Promise<TenantActionResult> {
  const ctx = await ensureAdmin(locale)
  const tenant_id = String(formData.get('tenant_id') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  if (!tenant_id || !body) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase.from('admin_notes').insert({
    tenant_id,
    body,
    author_id: ctx.userId,
    author_email: ctx.email,
  })
  if (error) return { error: 'generic' }
  await logAdminAction('note_added', { targetTenantId: tenant_id })
  revalidatePath(`/${locale}/admin/tenants/${tenant_id}`)
  return { ok: true }
}

// ── Password reset (recover a locked-out customer) ─────────────────────────
export async function resetTenantPassword(
  locale: string,
  tenantId: string
): Promise<TenantActionResult> {
  await ensureAdmin(locale)
  const supabase = createClient()
  const { data: owner } = await supabase
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  if (!owner) return { error: 'no_owner' }

  try {
    const admin = createAdminClient()
    const { data: userRes } = await admin.auth.admin.getUserById(owner.user_id)
    const email = userRes.user?.email
    if (!email) return { error: 'no_email' }
    const { data: link, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    if (error) return { error: 'generic' }
    await logAdminAction('password_reset', { targetTenantId: tenantId })
    return { ok: true, link: link.properties?.action_link }
  } catch {
    return { error: 'no_service_key' }
  }
}

// ── Bulk actions ───────────────────────────────────────────────────────────
export async function bulkSuspend(locale: string, ids: string[]): Promise<void> {
  if (!(await ensureSuper(locale)) || ids.length === 0) return
  const supabase = createClient()
  await supabase
    .from('tenants')
    .update({ status: 'suspended', suspended_at: new Date().toISOString() })
    .in('id', ids)
  await logAdminAction('account_suspended', { details: { bulk: ids.length } })
  revalidatePath(`/${locale}/admin/tenants`)
}

export async function bulkChangePlan(
  locale: string,
  ids: string[],
  planKey: string
): Promise<void> {
  if (!(await ensureSuper(locale)) || ids.length === 0) return
  const supabase = createClient()
  await supabase.from('tenants').update({ plan_tier: planKey }).in('id', ids)
  await logAdminAction('plan_changed', { details: { bulk: ids.length, to: planKey } })
  revalidatePath(`/${locale}/admin/tenants`)
}
