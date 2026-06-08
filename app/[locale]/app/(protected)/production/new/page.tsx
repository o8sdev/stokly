import { redirect } from 'next/navigation'

// Phase 2 placeholder — the production builder does not exist yet, so this
// route simply sends the user back to the production landing page.
export default function NewProductionRun({
  params: { locale },
}: {
  params: { locale: string }
}) {
  redirect(`/${locale}/app/production`)
}
