/* eslint-disable @next/next/no-img-element */
import React from 'react'
import Link from 'next/link'

interface PosterBookingBlockProps {
  locale: 'zh-CN' | 'en'
  /** The book button for the next session, or null when none is upcoming. */
  bookButton: React.ReactNode | null
  /** Scan-to-book QR (data URL); only rendered alongside a bookable session. */
  qrDataUrl: string | null
  activitiesHref: string
  detailHref: string
}

/**
 * Register area of the shareable poster. With an upcoming session it offers
 * the book button plus a scan-to-book QR. Without one there is nothing to
 * book, so no QR and no 扫码报名 / 报名 wording: a neutral line and a link to
 * the activities list instead.
 */
export default function PosterBookingBlock({
  locale,
  bookButton,
  qrDataUrl,
  activitiesHref,
  detailHref,
}: PosterBookingBlockProps) {
  const isZh = locale === 'zh-CN'
  const detailLinkClass =
    'inline-flex min-h-11 items-center justify-center font-sans text-[12px] font-semibold tracking-[0.06em] text-blue-deep no-underline text-center transition-colors duration-150 hover:text-ink'

  if (!bookButton) {
    return (
      // The session line above already says 近期暂无场次; just offer a way on.
      <div className="flex flex-col items-center border-t border-hairline pt-4 text-center">
        <Link href={activitiesHref} className={detailLinkClass}>
          {isZh ? '看看近期其他活动 →' : 'See other upcoming activities →'}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-stretch gap-3">
      {bookButton}

      {/* Scan-to-book QR: someone snaps the poster from a group chat, points
          their phone at the QR and lands on the booking form for this session. */}
      {qrDataUrl && (
        <div className="flex items-center justify-center gap-4 pt-4 mt-2 border-t border-hairline">
          <img
            src={qrDataUrl}
            alt=""
            aria-hidden="true"
            width={96}
            height={96}
            className="w-24 h-24 rounded-md"
          />
          <div className="flex flex-col text-left">
            <span className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink-soft">
              {isZh ? '扫码报名' : 'Scan to book'}
            </span>
            <span className="font-serif text-[14px] text-ink mt-1">
              {isZh ? '直达预约表单' : 'Goes straight to the form'}
            </span>
          </div>
        </div>
      )}

      <Link href={detailHref} className={detailLinkClass}>
        {isZh ? '查看活动详情 →' : 'View activity details →'}
      </Link>
    </div>
  )
}
