'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import { swapLocalePath } from '@/lib/locale-url'

const TOGGLE_CLASS =
  'font-sans text-[11px] font-semibold tracking-[0.1em] text-ink-soft hover:text-ink cursor-pointer select-none transition-colors duration-150 bg-transparent border-none inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mx-2'

function ToggleLink({ current }: { current: Locale }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const next: Locale = current === 'zh-CN' ? 'en' : 'zh-CN'
  const qs = searchParams.toString()
  const href = swapLocalePath(pathname, next) + (qs ? `?${qs}` : '')

  return (
    <Link
      href={href}
      hrefLang={next === 'zh-CN' ? 'zh-CN' : 'en'}
      aria-label={current === 'zh-CN' ? 'Switch to English' : '切换到中文'}
      className={TOGGLE_CLASS}
    >
      {current === 'zh-CN' ? 'EN' : '中'}
    </Link>
  )
}

export default function LanguageToggle({ current }: { current: Locale }) {
  // useSearchParams() must sit inside a Suspense boundary or `next build`
  // fails. Wrapping here keeps every render site (Header/MobileNav) unchanged.
  // The fallback shows the label statically (no href) for the brief suspense
  // window so layout doesn't shift.
  return (
    <Suspense fallback={<span className={TOGGLE_CLASS}>{current === 'zh-CN' ? 'EN' : '中'}</span>}>
      <ToggleLink current={current} />
    </Suspense>
  )
}
