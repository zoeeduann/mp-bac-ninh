'use client'

import React from 'react'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import type { AnalyticsParameters } from '@/lib/analytics'
import { trackEvent } from '@/lib/analytics'

interface TrackedLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  analyticsEvent: string
  analyticsParameters?: AnalyticsParameters
}

/** An ordinary anchor that records the click before the browser follows it. */
export default function TrackedLink({
  analyticsEvent,
  analyticsParameters,
  onClick,
  ...props
}: TrackedLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (!event.defaultPrevented) {
      trackEvent(analyticsEvent, analyticsParameters)
    }
  }

  return <a {...props} onClick={handleClick} />
}
