'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/admin/audit'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genCode(): string {
  let s = ''
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `STK-${s}`
}

function expiryToDate(expiry: string): string | null {
  if (expiry === 'never') return null
  const days = expiry === '30' ? 30 : 7
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export interface InviteResult {
  ok?: boolean
  error?: string
  code?: string
}

export async function createInvitation(
  locale: string,
  _prev: InviteResult,
  formData: FormData
): Promise<InviteResult> {
  const ctx = await requirePlatformAdmin(locale)
  const email = String(formData.get('email') ?? '').trim() || null
  const plan_key = String(formData.get('plan_key') ?? 'trial')
  const expiry = String(formData.get('expiry') ?? '30')
  const note = String(formData.get('note') ?? '').trim() || null

  const supabase = createClient()
  const code = genCode()
  const { error } = await supabase.from('invitations').insert({
    code,
    email,
    plan_key,
    expires_at: expiryToDate(expiry),
    note,
    created_by: ctx.userId,
  })
  if (error) return { error: 'generic' }
  await logAdminAction('invite_created', { details: { code, plan_key } })
  revalidatePath(`/${locale}/admin/invitations`)
  return { ok: true, code }
}

export async function createBulkInvitations(
  locale: string,
  count: number,
  planKey: string,
  expiry: string
): Promise<{ codes: string[] }> {
  const ctx = await requirePlatformAdmin(locale)
  const n = Math.max(1, Math.min(50, Math.floor(count)))
  const expires_at = expiryToDate(expiry)
  const rows = Array.from({ length: n }, () => ({
    code: genCode(),
    plan_key: planKey,
    expires_at,
    created_by: ctx.userId,
  }))
  const supabase = createClient()
  const { data, error } = await supabase.from('invitations').insert(rows).select('code')
  if (error) return { codes: [] }
  await logAdminAction('invite_created', { details: { bulk: n, plan_key: planKey } })
  revalidatePath(`/${locale}/admin/invitations`)
  return { codes: (data ?? []).map((r) => r.code) }
}

export async function revokeInvitation(
  locale: string,
  id: string
): Promise<void> {
  await requirePlatformAdmin(locale)
  const supabase = createClient()
  await supabase.from('invitations').update({ status: 'revoked' }).eq('id', id)
  await logAdminAction('invite_revoked', { details: { id } })
  revalidatePath(`/${locale}/admin/invitations`)
}
