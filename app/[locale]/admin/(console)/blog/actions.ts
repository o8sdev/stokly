'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import type { Database } from '@/types/database'

export interface BlogResult {
  ok?: boolean
  error?: string
}

type BlogUpdate = Database['public']['Tables']['blog_posts']['Update']

const SLUG_MAP: Record<string, string> = {
  ə: 'e',
  ı: 'i',
  ş: 's',
  ç: 'c',
  ö: 'o',
  ü: 'u',
  ğ: 'g',
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[əışçöüğ]/g, (c) => SLUG_MAP[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

interface Fields {
  slug: string
  title_az: string
  title_ru: string
  excerpt_az: string
  excerpt_ru: string
  body_az: string
  body_ru: string
  cover_url: string
  tag: string
  status: 'draft' | 'published' | 'archived'
}

function readFields(formData: FormData): Fields {
  return {
    slug: String(formData.get('slug') ?? '').trim(),
    title_az: String(formData.get('title_az') ?? '').trim(),
    title_ru: String(formData.get('title_ru') ?? '').trim(),
    excerpt_az: String(formData.get('excerpt_az') ?? '').trim(),
    excerpt_ru: String(formData.get('excerpt_ru') ?? '').trim(),
    body_az: String(formData.get('body_az') ?? '').trim(),
    body_ru: String(formData.get('body_ru') ?? '').trim(),
    cover_url: String(formData.get('cover_url') ?? '').trim(),
    tag: String(formData.get('tag') ?? '').trim(),
    // 'archived' unpublishes without deleting: the public site only shows
    // status='published', so archiving hides a post; re-publishing restores it.
    status: ((): Fields['status'] => {
      const s = String(formData.get('status') ?? 'draft')
      return s === 'published' || s === 'archived' ? s : 'draft'
    })(),
  }
}

export async function createBlogPost(
  locale: string,
  _prev: BlogResult,
  formData: FormData
): Promise<BlogResult> {
  await requirePlatformAdmin(locale)
  const f = readFields(formData)
  if (!f.title_az || !f.body_az) return { error: 'validation' }

  const slug =
    (f.slug ? slugify(f.slug) : slugify(f.title_az)) ||
    `post-${Date.now().toString(36)}`

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('blog_posts').insert({
    slug,
    title_az: f.title_az,
    title_ru: f.title_ru || null,
    excerpt_az: f.excerpt_az || null,
    excerpt_ru: f.excerpt_ru || null,
    body_az: f.body_az,
    body_ru: f.body_ru || null,
    cover_url: f.cover_url || null,
    tag: f.tag || null,
    status: f.status,
    published_at: f.status === 'published' ? new Date().toISOString() : null,
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.code === '23505' ? 'slug' : 'generic' }

  revalidatePath(`/${locale}/admin/blog`)
  revalidatePath(`/${locale}/blog`)
  redirect(`/${locale}/admin/blog`)
}

export async function updateBlogPost(
  locale: string,
  id: string,
  _prev: BlogResult,
  formData: FormData
): Promise<BlogResult> {
  await requirePlatformAdmin(locale)
  const f = readFields(formData)
  if (!f.title_az || !f.body_az) return { error: 'validation' }

  const supabase = createClient()
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('published_at')
    .eq('id', id)
    .maybeSingle()

  let published_at = (existing?.published_at as string | null) ?? null
  if (f.status === 'published' && !published_at) {
    published_at = new Date().toISOString()
  }

  const update: BlogUpdate = {
    title_az: f.title_az,
    title_ru: f.title_ru || null,
    excerpt_az: f.excerpt_az || null,
    excerpt_ru: f.excerpt_ru || null,
    body_az: f.body_az,
    body_ru: f.body_ru || null,
    cover_url: f.cover_url || null,
    tag: f.tag || null,
    status: f.status,
    published_at,
    updated_at: new Date().toISOString(),
  }
  if (f.slug) update.slug = slugify(f.slug)

  const { error } = await supabase
    .from('blog_posts')
    .update(update)
    .eq('id', id)
  if (error) return { error: error.code === '23505' ? 'slug' : 'generic' }

  revalidatePath(`/${locale}/admin/blog`)
  revalidatePath(`/${locale}/blog`)
  redirect(`/${locale}/admin/blog`)
}

export async function deleteBlogPost(
  locale: string,
  id: string
): Promise<void> {
  await requirePlatformAdmin(locale)
  const supabase = createClient()
  await supabase.from('blog_posts').delete().eq('id', id)
  revalidatePath(`/${locale}/admin/blog`)
  revalidatePath(`/${locale}/blog`)
  redirect(`/${locale}/admin/blog`)
}

export async function togglePublish(
  locale: string,
  id: string,
  publish: boolean
): Promise<void> {
  await requirePlatformAdmin(locale)
  const supabase = createClient()
  const patch: BlogUpdate = {
    status: publish ? 'published' : 'draft',
    updated_at: new Date().toISOString(),
  }
  if (publish) patch.published_at = new Date().toISOString()
  await supabase.from('blog_posts').update(patch).eq('id', id)
  revalidatePath(`/${locale}/admin/blog`)
  revalidatePath(`/${locale}/blog`)
}
