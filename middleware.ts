import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { locales, defaultLocale } from '@/i18n'
import {
  updateSession,
  getLocaleFromPath,
  isAuthRoute,
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

  // 2. Decide whether this is a protected dashboard route. Everything that is
  //    not an auth route (login/signup) and is under a locale prefix is the
  //    dashboard group, which requires authentication.
  const onAuthRoute = isAuthRoute(pathname)

  // 3. Unauthenticated user trying to reach a protected route → /login.
  if (!user && !onAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return NextResponse.redirect(url)
  }

  // 4. Authenticated user landing on login/signup → dashboard home.
  if (user && onAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    return NextResponse.redirect(url)
  }

  // 5. Run next-intl to attach locale handling, then merge in the auth cookies
  //    that updateSession may have set on supabaseResponse.
  const intlResponse = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value)
  })

  return intlResponse
}

export const config = {
  // Skip Next internals and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
