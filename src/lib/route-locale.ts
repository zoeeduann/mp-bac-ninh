import { notFound } from 'next/navigation'
import { LOCALES, type Locale } from './i18n'

/** Read the route segment, never request headers/cookies, so public pages can use ISR. */
export async function getLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params
  if (!LOCALES.includes(locale as Locale)) notFound()
  return locale as Locale
}
