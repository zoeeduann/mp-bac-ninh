'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { locationPath } from '@/lib/site-config'

interface NavItem {
  label: string
  href: string
}

interface MobileNavProps {
  open: boolean
  onClose: () => void
  locale: Locale
  navItems: NavItem[]
  locationSlug: string | null
  showVietnamese?: boolean
}

export default function MobileNav({
  open,
  onClose,
  locale,
  navItems,
  locationSlug,
  showVietnamese = false,
}: MobileNavProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Auto-focus close button on open; restore focus on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      closeBtnRef.current?.focus()
    } else {
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-paper z-[200] flex flex-col items-start justify-center px-[8vw] py-[6vw]"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <button
        ref={closeBtnRef}
        onClick={onClose}
        aria-label="Close navigation menu"
        className="absolute top-3 right-[calc(4vw-12px)] text-2xl text-ink-soft hover:text-ink cursor-pointer bg-transparent border-none leading-none inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
      >
        ✕
      </button>

      <ul className="list-none flex flex-col gap-8 mb-12">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onClose}
              className="font-serif text-[28px] font-normal text-ink no-underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      {locationSlug && (
        <Link
          href={locationPath(locale, locationSlug, '/book')}
          onClick={onClose}
          className="font-sans text-[11px] font-semibold tracking-[0.12em] uppercase text-ink bg-sky rounded-full px-5 py-2 no-underline transition-colors duration-150 hover:bg-blue-deep hover:text-paper"
        >
          {t(locale, 'book.cta')}
        </Link>
      )}

      {showVietnamese && (
        <Link
          href="/vi"
          hrefLang="vi"
          onClick={onClose}
          className="mt-8 inline-flex min-h-[44px] items-center border-t border-hairline pt-6 font-sans text-[12px] font-semibold tracking-[0.12em] text-ink-soft hover:text-ink"
        >
          Tiếng Việt · VI
        </Link>
      )}
    </div>
  )
}
