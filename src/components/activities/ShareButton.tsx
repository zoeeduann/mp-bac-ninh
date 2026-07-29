'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'

interface ShareButtonProps {
  /** Path or absolute URL to share (e.g. the poster page). Relative paths
   *  are resolved against the current origin at click time. */
  url: string
  title: string
  text?: string
  locale: Locale
  /** `label` = pill button with text (detail page); `icon` = round icon
   *  button for overlaying on a card corner. */
  variant?: 'label' | 'icon'
  className?: string
}

function ShareIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function absoluteUrlOf(url: string): string {
  return url.startsWith('http') || typeof window === 'undefined'
    ? url
    : `${window.location.origin}${url}`
}

export default function ShareButton({
  url,
  title,
  text,
  locale,
  variant = 'label',
  className = '',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  // Popover state — only used in the label variant. The icon variant on
  // activity cards stays a one-tap native share (no room for a menu).
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const isZh = locale === 'zh-CN'

  // Close the popover on any click outside or Esc press.
  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Path 1: native share sheet → WeChat / LINE / etc. receive {title, text, url}
  // and build a rich link card (hero image + description via OG meta).
  const nativeShare = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      const abs = absoluteUrlOf(url)
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title, text, url: abs })
        } catch {
          // user dismissed the share sheet — no-op
        }
        return
      }
      // Desktop fallback: write composed plain-text payload to clipboard.
      const composedText = [title, text, abs]
        .filter((s): s is string => Boolean(s))
        .join('\n\n')
      try {
        await navigator.clipboard.writeText(composedText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // clipboard blocked — silently ignore
      }
    },
    [url, title, text],
  )

  // Path 2: write a composed plain-text payload directly to the clipboard,
  // bypassing the share sheet entirely. This avoids iOS's rich-link
  // clipboard object — which WeChat paste expands as a phantom 157B
  // "preview thumbnail" file alongside the message.
  const copyPlainText = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      const abs = absoluteUrlOf(url)
      const composedText = [title, text, abs]
        .filter((s): s is string => Boolean(s))
        .join('\n\n')
      try {
        await navigator.clipboard.writeText(composedText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // clipboard blocked — silently ignore
      }
    },
    [url, title, text],
  )

  // Icon variant (overlay on activity cards): one-tap native share, no menu.
  // Keeps the UI lightweight on dense list views.
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={nativeShare}
        aria-label={t(locale, 'share.poster_aria')}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-paper/90 text-ink backdrop-blur-sm shadow-sm transition-colors duration-150 hover:bg-sky hover:text-ink cursor-pointer ${className}`}
      >
        {copied ? (
          <span className="text-[9px] font-semibold leading-none px-1 text-center">
            {isZh ? '已复制' : 'Copied'}
          </span>
        ) : (
          <ShareIcon />
        )}
      </button>
    )
  }

  // Label variant (activity detail page, poster page): opens a small
  // popover with two paths so a single visible button covers both the
  // rich-card share AND the clean plain-text copy.
  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink bg-transparent border border-ink/25 rounded-full px-4 py-[0.45rem] cursor-pointer transition-colors duration-150 hover:border-sky hover:text-sky whitespace-nowrap ${className}`}
      >
        <ShareIcon />
        {copied ? t(locale, 'share.copied') : t(locale, 'share.cta')}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 z-20 min-w-[180px] rounded-lg border border-ink/10 bg-paper shadow-lg overflow-hidden"
        >
          <button
            type="button"
            role="menuitem"
            onClick={nativeShare}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13px] text-ink hover:bg-sky/20 transition-colors duration-150"
          >
            <span aria-hidden="true">📱</span>
            <span>{isZh ? '微信卡片分享' : 'Share to apps'}</span>
          </button>
          <div className="border-t border-ink/10" />
          <button
            type="button"
            role="menuitem"
            onClick={copyPlainText}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13px] text-ink hover:bg-sky/20 transition-colors duration-150"
          >
            <span aria-hidden="true">📋</span>
            <span>{isZh ? '复制链接(纯文本)' : 'Copy as plain text'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
