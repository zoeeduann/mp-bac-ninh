'use client'

import React, { useState } from 'react'
import type { Locale } from '@/lib/i18n'

interface CopyableWechatProps {
  /** The WeChat ID to display and copy. */
  id: string
  locale: Locale
  /** Additional classes — call sites pass the typography classes the
   *  surrounding text uses (e.g. `font-mono text-ink font-semibold`) so the
   *  button visually inherits the original `<strong>`/`<span>` it replaces. */
  className?: string
}

/**
 * A WeChat ID displayed as plain text but actually a button: click it and the
 * id is copied to the clipboard. Text flips to "已复制 ✓" / "Copied ✓" for two
 * seconds, then reverts. Failures (denied clipboard permission, no API) are
 * swallowed silently — the user just doesn't see the confirmation.
 */
export default function CopyableWechat({
  id,
  locale,
  className = '',
}: CopyableWechatProps) {
  const isZh = locale === 'zh-CN'
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked / unavailable — no-op
    }
  }

  const label = copied ? (isZh ? '已复制 ✓' : 'Copied ✓') : id
  const aria = isZh ? `复制微信号 ${id}` : `Copy WeChat ID ${id}`

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={aria}
      className={`bg-transparent border-none p-0 m-0 cursor-pointer transition-colors duration-150 hover:text-sky ${className}`}
    >
      {label}
    </button>
  )
}
