'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface ViewToggleProps {
  activeView: 'list' | 'calendar'
  isZh: boolean
}

export function ViewToggle({ activeView, isZh }: ViewToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setView = useCallback(
    (view: 'list' | 'calendar') => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', view)
      // Keep cat and month params if present; remove day when switching views
      if (view === 'list') params.delete('day')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return (
    /* Visible at all widths — the calendar grid uses
       grid-template-columns: repeat(7, minmax(0, 1fr)) and is designed
       to fit a 375px viewport, so there's no reason to gate the entry. */
    <div className="flex items-center">
      <button
        onClick={() => setView('list')}
        className={[
          'font-sans text-[11px] font-semibold tracking-[0.14em] uppercase',
          'bg-none border-none cursor-pointer px-0 py-[0.3rem] relative transition-colors duration-150',
          activeView === 'list'
            ? 'text-ink after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[1.5px] after:bg-sky after:rounded-sm'
            : 'text-ink-soft hover:text-ink',
        ].join(' ')}
      >
        {isZh ? '列表' : 'List'}
      </button>

      {/* vertical hairline separator */}
      <span className="inline-block w-px h-[14px] bg-ink/10 mx-7 self-center" />

      <button
        onClick={() => setView('calendar')}
        className={[
          'font-sans text-[11px] font-semibold tracking-[0.14em] uppercase',
          'bg-none border-none cursor-pointer px-0 py-[0.3rem] relative transition-colors duration-150',
          activeView === 'calendar'
            ? 'text-ink after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[1.5px] after:bg-sky after:rounded-sm'
            : 'text-ink-soft hover:text-ink',
        ].join(' ')}
      >
        {isZh ? '日历' : 'Calendar'}
      </button>
    </div>
  )
}
