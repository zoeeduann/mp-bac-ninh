'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BodhiBackdrop from '@/components/brand/BodhiBackdrop'
import { localePath } from '@/lib/locale-url'
import type { Locale } from '@/lib/i18n'

// Rendered inside the frontend layout (header and footer included) whenever a
// page calls notFound(). not-found receives no props; the visible URL carries
// the language (/en prefix for English).
export default function NotFound() {
  const pathname = usePathname() ?? '/'
  const locale: Locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'zh-CN'
  const isZh = locale === 'zh-CN'

  const links = [
    { href: localePath(locale, '/'), label: isZh ? '回到首页' : 'Back to home' },
    { href: localePath(locale, '/activities'), label: isZh ? '近期活动' : 'Upcoming activities' },
    { href: localePath(locale, '/contact'), label: isZh ? '联系我们' : 'Contact us' },
  ]

  return (
    <section className="relative overflow-hidden px-[6vw] py-28 border-b border-hairline bg-paper">
      <BodhiBackdrop variant="right" mode="light" />
      <div className="relative max-w-[920px]">
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-5">
          404
        </p>
        <h1
          className="font-serif font-normal text-ink leading-[1.14] mb-7"
          style={{ fontSize: 'clamp(34px, 5vw, 64px)' }}
        >
          {isZh ? '没有找到这个页面' : 'Page not found'}
        </h1>
        <p className="font-serif text-[clamp(18px,2vw,24px)] leading-[1.7] text-ink/78 max-w-[44ch] mb-10">
          {isZh
            ? '这个链接可能已经失效，或者活动已经结束。可以回到首页，或者看看小院的近期活动。'
            : 'This link may be out of date, or the activity has ended. Head back to the home page or see what is coming up at the Yard.'}
        </p>
        <ul className="flex flex-wrap gap-x-8 gap-y-3 list-none p-0 m-0">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-sans text-[14px] font-semibold tracking-[0.04em] text-blue-deep no-underline transition-colors duration-150 hover:text-ink"
              >
                {link.label} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
