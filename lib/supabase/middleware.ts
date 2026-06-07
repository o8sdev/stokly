import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { locales, defaultLocale } from '@/i18n'

type CookieToSet = { name: string; value: string; options: CookieOptions }

// Refreshes the Supabase auth session on every request and enforces auth
// on dashboard routes. Returns both the (possibly mutated) response and the
// resolved user so the composed middleware can branch on auth state.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}

// Extract the locale segment from a pathname, falling back to the default.
export function getLocaleFromPath(pathname: string): string {
  const segment = pathname.split('/')[1]
  return locales.includes(segment as (typeof locales)[number])
    ? segment
    : defaultLocale
}

// Routes that do not require authentication (login / signup live under (auth)).
const AUTH_PATHS = ['/login', '/signup']

export function isAuthRoute(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname.includes(p))
}
