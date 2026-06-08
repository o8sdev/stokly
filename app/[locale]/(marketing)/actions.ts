'use server'

import { createClient } from '@/lib/supabase/server'
import { sendDemoEmail } from '@/lib/email/notify'

export interface DemoResult {
  ok?: boolean
  error?: boolean
}

// Public demo-request submission. Saves the lead via the SECURITY DEFINER
// `submit_demo_request` RPC (so the table is never directly writable), then
// fires a best-effort email alert. The caller is anonymous (no login).
export async function submitDemoRequest(
  _prev: DemoResult,
  formData: FormData
): Promise<DemoResult> {
  const name = String(formData.get('name') ?? '').trim()
  const restaurant = String(formData.get('restaurant') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()

  if (!name || !email || !email.includes('@')) {
    return { error: true }
  }

  const supabase = createClient()
  const { error } = await supabase.rpc('submit_demo_request', {
    p_name: name,
    p_restaurant: restaurant,
    p_email: email,
    p_message: message,
  })

  if (error) return { error: true }

  await sendDemoEmail({ name, restaurant, email, message })

  return { ok: true }
}
