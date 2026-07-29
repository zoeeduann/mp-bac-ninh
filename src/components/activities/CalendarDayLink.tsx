'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface CalendarDayLinkProps {
  dateStr: string // "YYYY-MM-DD"
  isSelected: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Clicking a calendar day cell pushes `?day=YYYY-MM-DD` into the URL so the
 * server component can show the detail panel for that day.  We preserve the
 * existing `view=calendar` and `month=` params.
 */
export function CalendarDayLink({
  dateStr,
  isSelected,
  children,
  className = '',
}: CalendarDayLinkProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleClick = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (isSelected) {
      // Clicking an already-selected day deselects it (no hash, no scroll)
      params.delete('day')
      router.push(`${pathname}?${params.toString()}`)
    } else {
      params.set('day', dateStr)
      // Push with `#day-detail` so the browser scrolls the just-rendered
      // detail panel into view; otherwise users click a date and nothing
      // visibly happens — the panel materialises below the fold.
      router.push(`${pathname}?${params.toString()}#day-detail`, { scroll: false })
      // router.push respects hash on its own but a delayed scrollIntoView is
      // more reliable across browsers/transitions.
      requestAnimationFrame(() => {
        const target = document.getElementById('day-detail')
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [router, pathname, searchParams, dateStr, isSelected])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={className}
    >
      {children}
    </div>
  )
}
