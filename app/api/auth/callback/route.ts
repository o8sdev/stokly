import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Auth redirect target for the password-recovery email link. Exchanges the
// PKCE `code` for a session (sets the auth cookies) and forwards to `next`.
// Lives under /api so middleware skips it (no auth gate before the exchange).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/'
  // Only allow relative same-site paths (no open redirect).
  const next = nextParam.startsWith('/') ? nextParam : '/'

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
