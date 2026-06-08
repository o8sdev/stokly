import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Service-role client for ADMIN-ONLY, server-side operations (e.g. creating a
// business account via the Auth Admin API). Bypasses RLS. NEVER import this on
// the public site, and never expose SUPABASE_SERVICE_ROLE_KEY to the client.
// All callers must be gated by requirePlatformAdmin first.
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          /* stateless */
        },
      },
    }
  )
}
