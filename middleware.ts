import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { locales, defaultLocale } from '@/i18n'
import {
  updateSession,
  getLocaleFromPath,
} from '@/lib/supabase/middleware'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Refresh the Supabase session (sets/clears auth cookies).
  const { supabaseResponse, user } = await updateSession(request)

  const locale = getLocaleFromPath(pathname)

  // 2. Only the business (/app) and admin (/admin) areas are gated; their auth
  //    pages stay public. Everything else — the marketing landing, /blog, and
  //    any other public page — needs no session.
  const onBusinessLogin = pathname === `/${locale}/app/login`
  const onAdminLogin = pathname === `/${locale}/admin/login`
  const onForgotPassword = pathname === `/${locale}/app/forgot-password`
  const onResetPassword = pathname === `/${locale}/app/reset-password`

  const inAppArea =
    pathname === `/${locale}/app` || pathname.startsWith(`/${locale}/app/`)
  const inAdminArea =
    pathname === `/${locale}/admin` || pathname.startsWith(`/${locale}/admin/`)

  const isAuthException =
    onBusinessLogin || onAdminLogin || onForgotPassword || onResetPassword
  const isProtected = (inAppArea || inAdminArea) && !isAuthException

  // 3. Unauthenticated on a protected route → the portal-appropriate login.
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = inAdminArea
      ? `/${locale}/admin/login`
      : `/${locale}/app/login`
    return NextResponse.redirect(url)
  }

  // 4. "Already signed in → skip the login" is handled by the login PAGES
  //    themselves (server-side), where the portal-specific role can be checked.
  //    Doing it blindly here (any session) caused a redirect loop: an
  //    authenticated non-admin bounced /admin → /admin/login → /admin → … , and
  //    likewise a member-less account looped on /app.

  // 5. Run next-intl, then merge in any refreshed auth cookies.
  const intlResponse = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value)
  })

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
