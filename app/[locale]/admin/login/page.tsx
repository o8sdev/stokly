import { setRequestLocale } from 'next-intl/server'
import { AdminLoginForm } from './login-form'

// Hidden system-admin portal login. Only platform_admins may enter.
export default async function AdminLoginPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d1b2a] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#122438] p-7">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-semibold text-brand">
            <span className="h-2 w-2 rounded-full bg-brand" />
            Stokly
          </div>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
            system admin
          </p>
        </div>
        <AdminLoginForm locale={locale} />
      </div>
    </main>
  )
}
