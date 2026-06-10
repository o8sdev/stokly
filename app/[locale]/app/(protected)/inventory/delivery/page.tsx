import { redirect } from 'next/navigation'

// Purchases (deliveries) now live at /app/purchases (the "Alışlar" page, which
// also shows the purchase history). Keep this path working for old links.
export default function DeliveryRedirect({
  params: { locale },
}: {
  params: { locale: string }
}) {
  redirect(`/${locale}/app/purchases`)
}
