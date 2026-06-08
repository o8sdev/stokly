import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { locales, defaultLocale } from '@/i18n'
import {
  updateSession,
  getLocaleFromPath,
  isLandingRoute,
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

  // 2. Public routes: the marketing landing (locale root) + the two hidden
  //    portal logins. Everything else under /app/* or /admin/* is protected.
  const onLanding = isLandingRoute(pathname, locale)
  const onBusinessLogin = pathname === `/${locale}/app/login`
  const onAdminLogin = pathname === `/${locale}/admin/login`
  const inAdminArea = pathname.startsWith(`/${locale}/admin`)
  const isPublic = onLanding || onBusinessLogin || onAdminLogin

  // 3. Unauthenticated → the portal-appropriate login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = inAdminArea
      ? `/${locale}/admin/login`
      : `/${locale}/app/login`
    return NextResponse.redirect(url)
  }

  // 4. Authenticated user on a login page → that portal's home.
  if (user && onAdminLogin) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/admin`
    return NextResponse.redirect(url)
  }
  if (user && onBusinessLogin) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/app/dashboard`
    return NextResponse.redirect(url)
  }

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
