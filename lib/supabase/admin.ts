import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Service-role client for ADMIN-ONLY, server-side operations (e.g. creating a
// business account via the Auth Admin API). Bypasses RLS. NEVER import this on
// the public site, and never expose SUPABASE_SERVICE_ROLE_KEY to the client.
// All callers must be gated by requirePlatformAdmin first.
// Thrown when the service-role key isn't configured; callers catch this to show
// a clean message instead of an unhandled runtime error.
export class ServiceRoleKeyMissingError extends Error {
  constructor() {
    super(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local (from ' +
        'Supabase → Settings → API → service_role) and restart the server.'
    )
    this.name = 'ServiceRoleKeyMissingError'
  }
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new ServiceRoleKeyMissingError()
  }
  return createServerClient<Database>(url, serviceKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        /* stateless */
      },
    },
  })
}
