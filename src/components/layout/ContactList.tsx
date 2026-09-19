import React from 'react'
import TrackedLink from '@/components/analytics/TrackedLink'
import CopyableWechat from '@/components/CopyableWechat'
import type { ContactChannel } from '@/lib/contact'

interface ContactListProps {
  channels: ContactChannel[]
  /** Locale for the WeChat copy button feedback text. */
  locale: 'zh-CN' | 'en'
  /** `footer`: compact rows; `page`: label above a larger value. */
  variant?: 'footer' | 'page'
  className?: string
}

const LINK =
  'inline-flex min-h-11 items-center text-blue-deep no-underline transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/50 md:min-h-0'

/**
 * Real contact channels only (see `contactChannels`), each tappable:
 * tel:, mailto:, wa.me, zalo.me, social URLs. WeChat is copy-to-clipboard.
 * Renders nothing when the list is empty so callers can collapse the block.
 */
export default function ContactList({
  channels,
  locale,
  variant = 'footer',
  className = '',
}: ContactListProps) {
  if (channels.length === 0) return null
  const isPage = variant === 'page'

  return (
    <ul className={`flex list-none flex-col ${isPage ? 'gap-8' : 'gap-1 md:gap-3'} ${className}`}>
      {channels.map((channel) => {
        const key = `${channel.method}-${channel.value}`
        const labelEl = (
          <span
            className={
              isPage
                ? 'block font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-1'
                : 'mr-2 text-ink/45'
            }
          >
            {channel.label}
          </span>
        )
        const valueClass = isPage ? 'font-sans text-[15px]' : 'text-[13px] leading-relaxed'

        if (channel.method === 'wechat') {
          return (
            <li key={key} className={isPage ? '' : 'flex min-h-11 flex-wrap items-center text-[13px] md:min-h-0'}>
              {labelEl}
              <CopyableWechat
                id={channel.value}
                locale={locale}
                className={`${valueClass} font-semibold tracking-[0.02em] text-blue-deep min-h-11 md:min-h-0`}
              />
            </li>
          )
        }

        return (
          <li key={key} className={isPage ? '' : 'flex flex-wrap items-center text-[13px]'}>
            {labelEl}
            <TrackedLink
              href={channel.href}
              aria-label={channel.label === channel.value ? undefined : `${channel.label}: ${channel.value}`}
              {...(channel.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              analyticsEvent="contact_click"
              analyticsParameters={{ contact_method: channel.method }}
              className={`${LINK} ${valueClass} break-all`}
            >
              {channel.value}
            </TrackedLink>
          </li>
        )
      })}
    </ul>
  )
}
