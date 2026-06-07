'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface AuthResult {
  error?: string
}

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

  // Create the auth user, passing the restaurant name + locale as metadata.
  // The database trigger `on_auth_user_created` (handle_new_tenant) provisions
  // the tenant + owner membership + default waste categories as a SECURITY
  // DEFINER function — so no service_role key is needed in the app. When email
  // confirmation is disabled, signUp returns a session and we land on the
  // dashboard; when it is enabled, the user is provisioned now and the
  // middleware routes them to /login until they confirm.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        restaurant_name: restaurantName,
        locale,
      },
    },
  })

  if (error || !data.user) {
    return { error: 'generic' }
  }

  redirect(`/${locale}`)
}

export async function signout(locale: string): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect(`/${locale}/login`)
}
