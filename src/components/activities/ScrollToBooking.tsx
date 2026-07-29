'use client'

import { useEffect } from 'react'

/**
 * Scrolls to the booking anchor row when a shareable link contains ?occ=<id>.
 * Rendered as a zero-size invisible element; the effect fires once on mount.
 */
export function ScrollToBooking({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [targetId])

  return null
}
