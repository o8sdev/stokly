import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['az', 'ru'] as const
export const defaultLocale = 'az' as const

export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` replaces the deprecated `locale` parameter (next-intl 3.22+).
  const requested = await requestLocale
  const locale =
    requested && locales.includes(requested as Locale)
      ? requested
      : defaultLocale

  if (!locales.includes(locale as Locale)) notFound()

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
