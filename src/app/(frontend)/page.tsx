import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getLocale, t } from '@/lib/i18n'
import { getThailandNetworkLocations } from '@/lib/current-location'
import {
  getPortalHome,
  getRecentJournalAcrossNetwork,
  getNextSessionForLocation,
  CITY_BILINGUAL,
} from '@/lib/content'
import { shortName, academyName } from '@/lib/short-name'
import { RichText } from '@/components/RichText'
import BodhiBackdrop from '@/components/brand/BodhiBackdrop'
import { formatDateCompact } from '@/lib/time'
import { buildMetadata, BASE } from '@/lib/metadata'
import { localePath, localizedUrl } from '@/lib/locale-url'
import { JsonLd } from '@/components/JsonLd'
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld'
import { networkSeoDescription, seoKeywords } from '@/lib/seo'
import type { Media, Location, Journal } from '@/payload-types'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isZh = locale === 'zh-CN'

  const portalHome = await getPortalHome(locale)
  const heroImgUrl =
    portalHome.heroImage && typeof portalHome.heroImage !== 'number'
      ? (portalHome.heroImage as Media).url ?? undefined
      : undefined

  const title = isZh
    ? '静心学堂 · 泰国 — 曼谷 · 清迈 · 普吉'
    : 'Mindfulpeace Academy Thailand — Bangkok · Chiang Mai · Phuket'
  const description = networkSeoDescription(locale)

  return buildMetadata({
    title,
    description,
    url: localizedUrl(locale, '/', BASE),
    imageUrl: heroImgUrl,
    locale,
    keywords: seoKeywords(locale),
    alternateLanguages: {
      'zh-CN': localizedUrl('zh-CN', '/', BASE),
      en: localizedUrl('en', '/', BASE),
    },
  })
}

function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return (img as Media).url ?? null
}

function mediaAlt(img: number | Media | null | undefined, fallback = ''): string {
  if (!img || typeof img === 'number') return fallback
  return (img as Media).alt ?? fallback
}

export default async function PortalHomePage() {
  const locale = await getLocale()
  const isZh = locale === 'zh-CN'

  const [portalHome, locations] = await Promise.all([
    getPortalHome(locale),
    getThailandNetworkLocations(locale),
  ])
  const journalEntries = await getRecentJournalAcrossNetwork(
    locale,
    locations.map((location) => location.id),
    6,
  )

  // Fetch next session for each location in parallel
  const nextSessions = await Promise.all(
    locations.map((loc) => getNextSessionForLocation(loc.id)),
  )

  const heroImgUrl = mediaUrl(portalHome.heroImage as any)
  const jsonLdLocations = locations.map((loc) => {
    const location = loc as Location & { heroImage: Media | number }
    return {
      name: academyName(location.city, location.name),
      city: location.city,
      url: localizedUrl(locale, `/${location.slug}`, BASE),
      address: (location as any).address ?? null,
      imageUrl: mediaUrl(location.heroImage),
    }
  })

  return (
    <div>
      <JsonLd
        data={[
          organizationJsonLd({
            url: BASE,
            locale,
            locations: jsonLdLocations,
          }),
          websiteJsonLd({
            url: localizedUrl(locale, '/', BASE),
            locale,
          }),
        ]}
      />
      {/* ─── HERO ─────────────────────────────────── */}
      <section className="relative h-svh max-h-[760px] min-h-[520px] overflow-hidden">
        {heroImgUrl ? (
          <Image
            src={heroImgUrl}
            alt={mediaAlt(portalHome.heroImage as any, 'Mindfulpeace Academy Thailand')}
            fill
            priority
            className="object-cover object-[center_32%] saturate-[0.85] brightness-[0.9]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-pale to-sky" />
        )}
        {/* gradient overlay — dark anchor at bottom-left where the text lives */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(45deg, rgba(42,42,51,0.78) 0%, rgba(42,42,51,0.42) 45%, rgba(42,42,51,0.08) 75%, transparent 100%)',
          }}
        />
        {/* text */}
        <div
          className="absolute left-[8%] bottom-[11%] max-w-[640px]"
          style={{ textShadow: 'var(--shadow-hero)' }}
        >
          <p className="font-sans text-[11px] font-semibold tracking-[0.24em] uppercase text-paper/85 mb-6">
            {t(locale, 'eyebrow.three_academies')}
          </p>
          <h1
            className="font-serif text-paper leading-[1.05] tracking-[0.04em] mb-4"
            style={{ fontSize: 'clamp(46px, 7vw, 80px)' }}
          >
            {portalHome.heroTitle}
          </h1>
          {portalHome.heroSubtitle && (
            <p
              className="font-serif text-paper/95 leading-[1.25] mb-11"
              style={{ fontSize: 'clamp(22px, 3vw, 38px)' }}
            >
              {portalHome.heroSubtitle}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-7">
            {/* Primary: filled sky pill — the "do the thing" CTA */}
            <Link
              href="#academies"
              className="font-sans text-[12px] font-semibold tracking-[0.1em] uppercase text-ink bg-sky rounded-full px-7 py-3 no-underline transition-colors duration-150 hover:bg-blue-deep hover:text-paper"
            >
              {t(locale, 'cta.find_academy')}
            </Link>
            {/* Secondary: underlined text — visually subordinate per VI's calm hierarchy */}
            <Link
              href="#about-network"
              className="font-sans text-[12px] font-semibold tracking-[0.14em] uppercase text-paper/90 no-underline border-b border-paper/40 pb-[3px] transition-all duration-150 hover:text-paper hover:border-paper"
            >
              {t(locale, 'cta.about_network')}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SECTION 1: THREE ACADEMIES ──────────── */}
      <section
        id="academies"
        className="px-[6vw] py-32 border-t border-hairline"
      >
        <div className="mb-16">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-6">
            {t(locale, 'eyebrow.three_academies')}
          </p>
          <h2
            className="font-serif font-normal text-ink leading-[1.3]"
            style={{ fontSize: 'clamp(24px, 3.2vw, 40px)' }}
          >
            {t(locale, 'section.choose_academy')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
          {locations.map((loc, idx) => {
            const location = loc as Location & { heroImage: Media | number }
            const imgUrl = mediaUrl(location.heroImage)
            const imgAlt = mediaAlt(location.heroImage, location.name)
            const next = nextSessions[idx]
            const short = shortName(location.city, location.name)

            return (
              <Link
                key={location.slug}
                href={localePath(locale, `/${location.slug}`)}
                className="block no-underline text-inherit overflow-hidden group"
              >
                {/* Portrait photo */}
                <div className="overflow-hidden aspect-[3/4] relative">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={imgAlt}
                      fill
                      className="object-cover saturate-[0.84] transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-ink/20" />
                  )}
                </div>
                {/* Card body */}
                <div className="pt-6 pb-6 border-t border-hairline">
                  <p className={`font-sans text-[10px] font-semibold ${isZh ? 'tracking-[0.3em]' : 'tracking-[0.2em] uppercase'} text-ink-soft mb-2`}>
                    {isZh
                      ? (CITY_BILINGUAL[location.slug]?.zh ?? location.city)
                      : (CITY_BILINGUAL[location.slug]?.en ?? location.city)}
                  </p>
                  <h3
                    className="font-serif font-normal text-ink leading-[1.2] mb-2"
                    style={{ fontSize: 'clamp(22px, 2.5vw, 30px)' }}
                  >
                    {academyName(location.city, location.name)}
                  </h3>
                  {location.tagline && (
                    <p className="font-serif text-[17px] text-ink-soft leading-[1.4] mb-3">
                      {location.tagline}
                    </p>
                  )}
                  {/* Short description */}
                  <p className="font-sans text-[12px] text-ink-soft leading-[1.6] mb-4">
                    {isZh
                      ? getCardDesc(location.slug, 'zh')
                      : getCardDesc(location.slug, 'en')}
                  </p>
                  {/* Next session row */}
                  {next && (
                    <div className="flex items-center gap-2 pt-4 border-t border-hairline font-sans text-[11px] font-medium text-ink-soft">
                      <span className="font-semibold tracking-[0.08em] text-ink whitespace-nowrap">
                        {t(locale, 'cta.next_label')}
                      </span>
                      <span>
                        · {formatDateCompact(new Date(next.startAt), locale)} · {next.activityTitle}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ─── SECTION 2: ROOTS / ABOUT ─────────────── */}
      <section
        id="about-network"
        className="relative overflow-hidden px-[6vw] py-36 border-t border-hairline"
      >
        <BodhiBackdrop variant="right" mode="light" />
        <div className="relative">
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-4">
          {t(locale, 'eyebrow.our_roots')}
        </p>
        <p
          className="font-serif text-ink/85 leading-[1.5] mb-14 max-w-[42ch]"
          style={{ fontSize: 'clamp(20px, 2.3vw, 28px)' }}
        >
          {t(locale, 'brand.positioning')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 mb-12">
          {/* Left: what the academy is */}
          <div>
            {portalHome.middleParagraph ? (
              <RichText
                data={portalHome.middleParagraph}
                className="font-serif text-[clamp(17px,1.8vw,20px)] text-ink leading-[1.9]"
              />
            ) : (
              <p className="font-serif text-[clamp(17px,1.8vw,20px)] text-ink leading-[1.9]">
                {isZh ? (
                  <>
                    静心学堂是一处<strong className="font-medium">社区公益型静心文化空间</strong>，秉承「悲、智、和、敬」的理念，通过打造禅意场景、倡导禅意生活方式，为大众提供开放而沉浸的静心文化体验。
                    <br /><br />
                    静心学堂 · 泰国 是国际静心协会（
                    <a href="https://mindfulpeace.org" target="_blank" rel="noreferrer" className="text-sky underline">
                      mindfulpeace.org
                    </a>
                    ）在泰国的本地分院。我们希望为更多人提供一套探索内心、安顿身心的方案，也为人类社会的和谐共处与可持续发展，提供一种东方智慧的解决之道。
                  </>
                ) : (
                  <>
                    Mindful Peace Academy is a <strong className="font-medium">community, not-for-profit space for the culture of stillness</strong> — rooted in compassion, wisdom, harmony, and respect. Through contemplative spaces and an unhurried way of living, we offer an open, immersive experience of mindful culture.
                    <br /><br />
                    Mindfulpeace Academy Thailand is the local Thai branch of the Mindfulpeace International Association (
                    <a href="https://mindfulpeace.org" target="_blank" rel="noreferrer" className="text-sky underline">
                      mindfulpeace.org
                    </a>
                    ), offering a way to look inward and settle body and mind — and, through Eastern wisdom, a path toward a more harmonious, sustainable world.
                  </>
                )}
              </p>
            )}
          </div>

          {/* Right: founder introduction — 济群法师 */}
          <div className="flex flex-col sm:flex-row gap-6">
            <Image
              src="/brand/master-jiqun.jpg"
              alt={isZh ? '济群法师' : 'Master Jiqun'}
              width={683}
              height={2048}
              // mix-blend-multiply lets the photo's white fade reveal the
              // bodhi backdrop behind it instead of showing a hard white
              // rectangle / seam.
              className="w-[128px] sm:w-[140px] h-auto self-start flex-shrink-0 mix-blend-multiply"
            />
            <div>
              <h3 className="font-serif text-[20px] font-medium text-ink leading-tight mb-1">
                {isZh ? '济群法师' : 'Master Jiqun'}
              </h3>
              <p className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-sky mb-4">
                {isZh ? '静心学堂课程体系创建者' : 'Founder · Academy curriculum'}
              </p>
              <p className="font-sans text-[13.5px] text-ink-soft leading-[1.85]">
                {isZh
                  ? '1984 年毕业于中国佛学院，先后于闽南佛学院、戒幢佛学研究所任教。沩仰宗第十代、临济宗第四十五代传人，著述逾四百万字。继承太虚大师「人生佛教」思想，提出「佛法是人生智慧」，致力于让佛法走入生活。集四十余年学修与三十余年弘法经验，围绕「人类独特的价值是什么？生命的意义在哪里？现代人如何安顿身心？」创建静心学堂课程体系，并无偿授予国际静心协会使用。'
                  : 'A 1984 graduate of the China Buddhist Academy, he has taught at the Minnan Buddhist Academy and Jiezhuang Buddhist Institute — a lineage holder of the Guiyang (10th gen.) and Linji (45th gen.) schools, with over four million words published. Continuing Master Taixu’s “Buddhism for human life,” he holds that the Dharma is wisdom for living. Across forty years of practice and thirty of teaching — around what makes human life valuable, where meaning lies, and how modern people can settle body and mind — he created the Academy’s curriculum and gave it freely to the Mindful Peace International association.'}
              </p>
            </div>
          </div>
        </div>

        <a
          href="https://mindfulpeace.org/#/"
          target="_blank"
          rel="noreferrer"
          className="font-sans text-[12px] font-semibold tracking-[0.08em] text-sky no-underline transition-colors duration-150 hover:text-ink"
        >
          {t(locale, 'cta.curriculum_link')}
        </a>
        </div>
      </section>

      {/* ─── SECTION 3: ACROSS THE NETWORK ──────── */}
      <section id="journal" className="px-[6vw] py-36">
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-6">
          {t(locale, 'eyebrow.journal')}
        </p>
        <h2
          className="font-serif font-normal text-ink leading-[1.3] mb-12"
          style={{ fontSize: 'clamp(24px, 3.2vw, 40px)' }}
        >
          {t(locale, 'section.three_cities')}
        </h2>

        {journalEntries.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[2px] mb-14">
            {journalEntries.map((entry) => {
              const journal = entry as Journal & {
                coverImage: Media | number
                location: Location | number
              }
              const imgUrl = mediaUrl(journal.coverImage)
              const imgAlt = journal.coverAlt?.trim() || mediaAlt(journal.coverImage, journal.title)
              const locationDoc = typeof journal.location === 'object' ? journal.location as Location : null
              const cityLabel = locationDoc?.city ?? ''
              const locationSlug = locationDoc?.slug ?? ''

              return (
                <Link
                  key={journal.id}
                  href={locationSlug ? localePath(locale, `/${locationSlug}/journal/${journal.slug}`) : '#'}
                  className="relative overflow-hidden block no-underline group"
                >
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={imgAlt}
                      width={800}
                      height={600}
                      className="w-full aspect-[4/3] object-cover saturate-[0.82] block transition-[filter] duration-300 group-hover:saturate-100"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-ink/15" />
                  )}
                  {cityLabel && (
                    <span className={`absolute top-3 left-3 font-sans text-[9px] font-semibold ${isZh ? 'tracking-[0.3em]' : 'tracking-[0.16em] uppercase'} text-paper bg-ink/62 px-2.5 py-1 rounded-[2px]`}>
                      {cityLabel}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ) : (
          /* fallback placeholder grid when no journal entries in DB */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[2px] mb-14">
            {['CHIANG MAI', 'BANGKOK', 'PHUKET', 'BANGKOK', 'CHIANG MAI', 'PHUKET'].map(
              (city, i) => (
                <div key={i} className="relative overflow-hidden">
                  <div className="w-full aspect-[4/3] bg-ink/10" />
                  <span className="absolute top-3 left-3 font-sans text-[9px] font-semibold tracking-[0.16em] uppercase text-paper/60 bg-ink/40 px-2.5 py-1 rounded-[2px]">
                    {city}
                  </span>
                </div>
              ),
            )}
          </div>
        )}

        <div className="text-center">
          <a
            href="#"
            className="font-sans text-[13px] font-semibold tracking-[0.06em] text-sky no-underline transition-colors duration-150 hover:text-ink"
          >
            {t(locale, 'cta.all_journal_entries')}
          </a>
        </div>
      </section>

      {/* ─── SECTION 4: CONTACT ──────────────────── */}
      <section
        id="contact"
        className="px-[6vw] py-36 border-t border-hairline scroll-mt-20"
      >
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-6">
          {t(locale, 'eyebrow.contact')}
        </p>
        <h2
          className="font-serif font-normal text-ink leading-[1.3] mb-12"
          style={{ fontSize: 'clamp(24px, 3.2vw, 40px)' }}
        >
          {t(locale, 'section.contact_three')}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {locations.map((loc) => {
            const l = loc as Location
            const waDigits = typeof l.whatsapp === 'string' ? l.whatsapp.replace(/\D/g, '') : ''
            return (
              <div
                key={l.slug}
                className="border border-ink/15 bg-paper/40 p-7 flex flex-col"
              >
                <h3 className="font-serif text-[22px] text-ink leading-tight mb-1">
                  {l.name}
                </h3>
                <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-6">
                  {l.city}
                </p>

                <dl className="font-sans text-[14px] space-y-4 text-ink flex-1">
                  {l.email && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-1">
                        Email
                      </dt>
                      <dd>
                        <a
                          href={`mailto:${l.email}`}
                          className="text-sky no-underline transition-colors duration-150 hover:text-ink break-all"
                        >
                          {l.email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {waDigits && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-1">
                        WhatsApp
                      </dt>
                      <dd>
                        <a
                          href={`https://wa.me/${waDigits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky no-underline transition-colors duration-150 hover:text-ink"
                        >
                          {l.whatsapp}
                        </a>
                      </dd>
                    </div>
                  )}
                  {l.wechatId && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-1">
                        {t(locale, 'footer.wechatLabel')}
                      </dt>
                      <dd className="font-medium tracking-[0.02em]">{l.wechatId}</dd>
                    </div>
                  )}
                </dl>

                <Link
                  href={localePath(locale, `/${l.slug}`)}
                  className="mt-8 self-start font-sans text-[12px] font-semibold tracking-[0.14em] uppercase text-blue-deep no-underline transition-colors duration-150 hover:text-ink"
                >
                  {t(locale, 'cta.view_academy')} →
                </Link>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

/** Hardcoded short description per slug for v1 (used until CMS has a shortDesc field on Location) */
function getCardDesc(slug: string, lang: 'zh' | 'en'): string {
  const descs: Record<string, { zh: string; en: string }> = {
    bangkok: {
      zh: '曼谷市中心的修学空间。城市喧嚣之中，留一处安静的落脚地。',
      en: "A sitting space in central Bangkok. Stillness found within the city's constant motion.",
    },
    chiangmai: {
      zh: '清迈山间的修学空间。静坐、喝茶、行走于山径之间。',
      en: 'Nestled in the Chiang Mai hills. Sitting, tea, and walks along the hillside paths.',
    },
    phuket: {
      zh: '普吉岛上的修学空间。海风、光线，与一段向内的安静时光。',
      en: 'A practice space on the island of Phuket. Sea-light, open air, and a quiet turning inward.',
    },
  }
  return descs[slug]?.[lang] ?? ''
}
