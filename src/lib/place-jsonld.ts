import type { Locale } from './i18n'
import { BAC_NINH_ALTERNATE_NAMES, BAC_NINH_POSTAL_ADDRESS, bacNinhSeo } from './bac-ninh-seo'
import { isThailandNetworkLocation } from './current-location'
import { localBusinessJsonLd } from './jsonld'
import { academyName } from './short-name'
import { locationUrl } from './site-config'

/**
 * The place's LocalBusiness JSON-LD, shared by every page that describes it
 * (home, about, contact, book). All of them emit the same `@id`, so an answer
 * engine landing on the contact page still learns what this place is, where
 * it is, that it is free, and who runs it — not just a breadcrumb.
 */
export function placeBusinessJsonLd(input: {
  location: any
  locale: Locale
  imageUrl?: string | null
}) {
  const { location, locale, imageUrl } = input
  const isBacNinh = location.slug === 'bac-ninh'
  const displayName = academyName(location.city, location.name)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${location.name} ${location.address || location.city}`,
  )}`

  return localBusinessJsonLd({
    displayName,
    city: location.city,
    // One entity for the whole site: always the home page URL.
    url: locationUrl(locale, location.slug),
    locale,
    address: location.address,
    mapEmbedUrl: location.mapEmbedUrl,
    email: location.email,
    phone: location.phone,
    imageUrl: imageUrl ?? undefined,
    description: bacNinhSeo(location.slug, locale)?.homeDescription ?? location.tagline,
    isThailandNetwork: isThailandNetworkLocation(location),
    ...(isBacNinh
      ? {
          alternateNames: BAC_NINH_ALTERNATE_NAMES,
          postalAddress: BAC_NINH_POSTAL_ADDRESS,
          parentOrganization: {
            name: 'Mindful Peace International',
            url: 'https://mindfulpeace.org',
          },
          priceCurrency: 'VND',
          // Sessions are held in Chinese; the site itself is also in English
          // and Vietnamese.
          availableLanguage: ['zh-CN', 'en', 'vi'],
        }
      : {}),
    mapUrl,
    sameAs: ((location.social ?? []) as { url?: string | null }[])
      .map((s) => s.url)
      .filter((u): u is string => typeof u === 'string' && u.length > 0),
  })
}
