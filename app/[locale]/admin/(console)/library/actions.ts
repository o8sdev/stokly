'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { BUSINESS_TYPE_KEYS } from '@/lib/constants/business-types'

export interface LibraryResult {
  ok?: boolean
  error?: string
}

export async function addLibraryItem(
  locale: string,
  _prev: LibraryResult,
  formData: FormData
): Promise<LibraryResult> {
  await requirePlatformAdmin(locale)

  const name_az = String(formData.get('name_az') ?? '').trim()
  const name_ru = String(formData.get('name_ru') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const default_unit = String(formData.get('default_unit') ?? '').trim()
  const yieldDisplay = Number(formData.get('yield') ?? 100)
  const is_common = formData.get('is_common') === 'on'
  const businessTypes = formData
    .getAll('business_types')
    .map((v) => String(v))
    .filter((v) => BUSINESS_TYPE_KEYS.includes(v))

  if (!name_az || !category || !default_unit) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase.from('global_ingredient_library').insert({
    name_az,
    name_ru: name_ru || null,
    category,
    default_unit,
    default_yield_percent:
      Number.isFinite(yieldDisplay) && yieldDisplay > 0
        ? Math.min(1, yieldDisplay / 100)
        : 1,
    is_common,
    business_types: businessTypes.length > 0 ? businessTypes : null,
  })
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/admin/library`)
  return { ok: true }
}

export async function deleteLibraryItem(
  locale: string,
  id: string
): Promise<void> {
  await requirePlatformAdmin(locale)
  const supabase = createClient()
  await supabase.from('global_ingredient_library').delete().eq('id', id)
  revalidatePath(`/${locale}/admin/library`)
}

// Toggle whether a library item shows as a one-click "common" quick-add chip.
export async function toggleLibraryCommon(
  locale: string,
  id: string,
  value: boolean
): Promise<void> {
  await requirePlatformAdmin(locale)
  const supabase = createClient()
  await supabase
    .from('global_ingredient_library')
    .update({ is_common: value })
    .eq('id', id)
  revalidatePath(`/${locale}/admin/library`)
}
