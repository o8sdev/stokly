'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

export interface AuthResult {
  error?: string
}

// Default waste categories seeded per-tenant on signup.
const DEFAULT_WASTE_CATEGORIES: {
  name: string
  name_az: string
  name_ru: string
}[] = [
  { name: 'Spoilage', name_az: 'Korlanma', name_ru: 'Порча' },
  { name: 'Over-prep', name_az: 'Artıq hazırlıq', name_ru: 'Переизбыток заготовки' },
  { name: 'Dropped', name_az: 'Düşən', name_ru: 'Уронили' },
  { name: 'Expired', name_az: 'Vaxtı keçmiş', name_ru: 'Просрочено' },
  { name: 'Other', name_az: 'Digər', name_ru: 'Другое' },
]

export async function login(
  locale: string,
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'invalid' }
  }

  redirect(`/${locale}`)
}

export async function signup(
  locale: string,
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const restaurantName = String(formData.get('restaurant_name') ?? '').trim()

  if (!email || !password || !restaurantName) {
    return { error: 'generic' }
  }

  const supabase = createClient()

  // 1. Create the auth user and sign them in.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
    {
      email,
      password,
    }
  )

  if (signUpError || !signUpData.user) {
    return { error: 'generic' }
  }

  const userId = signUpData.user.id

  // 2. Provision tenant + first member + waste categories with the service
  //    role client (RLS would otherwise block the very first inserts, since
  //    the user has no tenant_members row yet).
  const service = createServiceClient()

  const slug = slugify(restaurantName, userId.slice(0, 8))

  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      name: restaurantName,
      slug,
      currency: 'AZN',
      locale,
    })
    .select('id')
    .single()

  if (tenantError || !tenant) {
    return { error: 'generic' }
  }

  const { error: memberError } = await service
    .from('tenant_members')
    .insert({
      tenant_id: tenant.id,
      user_id: userId,
      role: 'owner',
    })

  if (memberError) {
    return { error: 'generic' }
  }

  await service.from('waste_categories').insert(
    DEFAULT_WASTE_CATEGORIES.map((c) => ({
      tenant_id: tenant.id,
      name: c.name,
      name_az: c.name_az,
      name_ru: c.name_ru,
    }))
  )

  // 3. Ensure a session exists (signUp signs in when email confirmation is
  //    disabled; if confirmation is required, fall back to explicit sign-in).
  if (!signUpData.session) {
    await supabase.auth.signInWithPassword({ email, password })
  }

  redirect(`/${locale}`)
}

export async function signout(locale: string): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect(`/${locale}/login`)
}
