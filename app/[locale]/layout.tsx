import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  DM_Sans,
  JetBrains_Mono,
  Bricolage_Grotesque,
  Spectral,
} from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n'
import { cn } from '@/lib/utils'
import { NavigationProgress } from '@/components/ui/navigation-progress'
import '../globals.css'

// Body type — DM Sans. Numeric / money type — JetBrains Mono.
// Marketing display headlines — Bricolage Grotesque (landing page only).
const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

// Editorial serif for italic accent words on the landing page. Includes
// Cyrillic + latin-ext so both Russian and Azerbaijani render correctly.
const spectral = Spectral({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-editorial',
  display: 'swap',
})

export const metadata: Metadata = {
  // Absolute base for og/twitter image URLs (app/opengraph-image.png). Set
  // NEXT_PUBLIC_SITE_URL to the real domain in production.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  ),
  title: 'Stokly',
  description: 'Restaurant inventory and food-cost management',
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={cn(
        dmSans.variable,
        jetbrainsMono.variable,
        bricolage.variable,
        spectral.variable
      )}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
