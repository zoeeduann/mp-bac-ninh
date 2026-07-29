'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { localePath } from '@/lib/locale-url'
import { shortName } from '@/lib/short-name'

interface LocationDoc {
  slug: string
  name: string
  city: string
}

interface LocationChipProps {
  current: LocationDoc | null
  all: LocationDoc[]
  locale: Locale
}

function chipLabel(current: LocationDoc | null, locale: Locale): string {
  if (!current) {
    return locale === 'zh-CN' ? '寻找学堂' : 'Find an academy'
  }
  return `${current.city} · ${shortName(current.city, current.name)}`
}

/** Inline 8x8 chevron — renders consistently across OSes (unlike text glyphs ▾▸). */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="8"
      height="6"
      viewBox="0 0 8 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="transition-transform duration-150"
      style={{ transform: open ? 'rotate(180deg)' : 'none' }}
    >
      <path d="M1 1.5l3 3 3-3" />
    </svg>
  )
}

export default function LocationChip({ current, all, locale }: LocationChipProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on click-outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    // Hidden below sm: at 375 it overlaps the brand sub-label "泰国 / Thailand".
    // Mobile users reach academies via the hero CTA and the hamburger drawer.
    <div className="relative hidden sm:block" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={[
          'inline-flex items-center gap-1.5',
          'font-sans text-[10px] font-semibold tracking-[0.14em] uppercase',
          'border rounded-full px-3 py-2 cursor-pointer select-none bg-transparent',
          'transition-colors duration-150 whitespace-nowrap',
          'min-h-[36px]',
          open
            ? 'border-sky text-sky'
            : 'border-ink/20 text-ink-soft hover:border-ink/40 hover:text-ink',
        ].join(' ')}
      >
        {chipLabel(current, locale)}
        <Chevron open={open} />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 min-w-[210px] bg-paper border border-ink/15 rounded z-[200] overflow-hidden"
        >
          {all.map((loc) => {
            const isCurrent = current?.slug === loc.slug
            const locShort = shortName(loc.city, loc.name)
            const locLabel = locShort ? `${loc.city} · ${locShort}` : loc.city
            return (
              <Link
                key={loc.slug}
                href={localePath(locale, `/${loc.slug}`)}
                onClick={() => setOpen(false)}
                className={[
                  'flex items-center justify-between px-[1.1rem] py-3',
                  'font-sans text-[11px] font-semibold tracking-[0.1em] uppercase',
                  'text-ink-soft no-underline transition-colors duration-100',
                  'hover:bg-sky/5 hover:text-ink',
                  isCurrent ? 'text-ink' : '',
                ].join(' ')}
              >
                <span>{locLabel}</span>
                {isCurrent && <span className="text-[11px] text-sky">✓</span>}
              </Link>
            )
          })}
          {current && (
            <>
              <hr className="border-none border-t border-ink/10 m-0" />
              <Link
                href={localePath(locale, '/')}
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 px-[1.1rem] py-3 font-sans text-[11px] font-medium tracking-[0.06em] text-ink-soft no-underline transition-colors duration-100 hover:bg-sky/5 hover:text-ink"
              >
                {t(locale, 'common.backToPortal')}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
