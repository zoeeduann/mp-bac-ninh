'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { locationPath } from '@/lib/site-config'
import BookingModal from './BookingModal'
import { toZonedTime, format as fmtTz } from 'date-fns-tz'

const TZ = 'Asia/Bangkok'

interface SessionRow {
  activityId: number
  activitySlug: string
  activityTitle: string
  occurrenceId: string
  startAt: string
  endAt: string
  capacityOverride: number | null
  activityCapacity: number
  remaining: number
  locationId: number
  /** Used to build the activity-detail link on the title. */
  locationSlug: string
  locationName: string
  locationWechatId?: string | null
  locationWhatsapp?: string | null
}

interface AutoOpenContext {
  activitySlug: string | null
  occurrenceId: string | null
  source: 'activity_detail' | 'book_list' | 'shared_link'
}

interface UpcomingSessionsListProps {
  sessions: SessionRow[]
  locale: 'zh-CN' | 'en'
  autoOpen: AutoOpenContext
}

function formatDayZh(date: Date): string {
  const z = toZonedTime(date, TZ)
  return fmtTz(z, 'M月 d日', { timeZone: TZ })
}
function formatDayEn(date: Date): string {
  const z = toZonedTime(date, TZ)
  return fmtTz(z, 'MMM d', { timeZone: TZ })
}
function formatTimeRange(startAt: string, endAt: string): string {
  const start = toZonedTime(new Date(startAt), TZ)
  const end = toZonedTime(new Date(endAt), TZ)
  return `${fmtTz(start, 'HH:mm', { timeZone: TZ })} – ${fmtTz(end, 'HH:mm', { timeZone: TZ })} ICT`
}
function formatWeekdayZh(date: Date): string {
  const z = toZonedTime(date, TZ)
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[z.getDay()]
}
function formatWeekdayEn(date: Date): string {
  const z = toZonedTime(date, TZ)
  return fmtTz(z, 'EEEE', { timeZone: TZ })
}

interface ModalState {
  open: boolean
  session: SessionRow | null
  source: 'activity_detail' | 'book_list' | 'shared_link'
}

export default function UpcomingSessionsList({ sessions, locale, autoOpen }: UpcomingSessionsListProps) {
  const isZh = locale === 'zh-CN'

  const [modal, setModal] = useState<ModalState>({
    open: false,
    session: null,
    source: 'book_list',
  })

  // True when the URL asked to open a specific session but it is no longer
  // available (already started, cancelled, or otherwise not in the upcoming
  // list) — e.g. arriving from a calendar "Book" button for a past session.
  const [requestedUnavailable, setRequestedUnavailable] = useState(false)

  // Auto-open modal if URL context matches
  useEffect(() => {
    if (autoOpen.activitySlug && autoOpen.occurrenceId) {
      const match = sessions.find(
        (s) => s.activitySlug === autoOpen.activitySlug && s.occurrenceId === autoOpen.occurrenceId,
      )
      if (match) {
        setModal({ open: true, session: match, source: autoOpen.source })
        setRequestedUnavailable(false)
      } else {
        setRequestedUnavailable(true)
      }
    }
  }, [autoOpen, sessions])

  const unavailableNotice = requestedUnavailable ? (
    <div className="mb-8 max-w-[860px] rounded border border-sky/40 bg-sky/10 px-4 py-3 font-sans text-[13px] text-ink leading-[1.6]">
      {isZh
        ? '你想报名的场次已结束或暂时无法预约。可以看看下面其他场次,或在本页下方留言咨询。'
        : 'The session you wanted is no longer available. Browse the other upcoming sessions below, or leave us a note further down this page.'}
    </div>
  ) : null

  function openModal(session: SessionRow) {
    setModal({ open: true, session, source: 'book_list' })
  }

  function closeModal() {
    setModal((prev) => ({ ...prev, open: false }))
  }

  if (sessions.length === 0) {
    return (
      <>
        {unavailableNotice}
        <p className="font-sans text-[13px] text-ink-soft">
          {isZh ? '暂无近期场次。' : 'No upcoming sessions at the moment.'}
        </p>
      </>
    )
  }

  return (
    <>
      {unavailableNotice}
      <div className="flex flex-col max-w-[860px]">
        {sessions.map((session, i) => {
          const isFull = session.remaining === 0
          const effectiveCap = session.capacityOverride ?? session.activityCapacity
          const occupied = effectiveCap - session.remaining
          const startDate = new Date(session.startAt)

          return (
            <div
              key={`${session.activitySlug}-${session.occurrenceId}-${i}`}
              className="
                flex flex-col gap-3 py-[1.8rem] border-b border-hairline first:border-t
                md:grid md:gap-8 md:items-center
                md:[grid-template-columns:1fr_1.4fr_1fr_auto]
              "
            >
              {/* Activity name */}
              <div>
                <Link
                  href={locationPath(locale, session.locationSlug, `/activities/${session.activitySlug}`)}
                  className="font-serif text-[17px] font-medium text-ink block mb-[0.25rem] no-underline transition-colors duration-150 hover:text-sky"
                >
                  {session.activityTitle}
                </Link>
              </div>

              {/* Date / time */}
              <div>
                <span className="font-serif text-[17px] font-normal text-ink block mb-[0.2rem]">
                  {isZh
                    ? `${formatDayZh(startDate)} · ${formatWeekdayZh(startDate)}`
                    : `${formatDayEn(startDate)} · ${formatWeekdayEn(startDate)}`}
                </span>
                <span className="font-sans text-[12px] font-medium text-ink-soft">
                  {formatTimeRange(session.startAt, session.endAt)}
                </span>
              </div>

              {/* Location + capacity */}
              <div>
                <span className="inline-block font-sans text-[10px] font-semibold tracking-[0.12em] uppercase text-sky border border-sky/35 rounded-full px-[0.6rem] py-[0.18rem] mb-[0.4rem]">
                  {session.locationName}
                </span>
                <span className="font-sans text-[12px] text-ink-soft block">
                  {occupied}/{effectiveCap}{' · '}
                  {isFull ? (
                    <span className="text-ink-soft">{isZh ? '已满' : 'Full'}</span>
                  ) : session.remaining <= 3 ? (
                    <span className="text-clay font-semibold">
                      {isZh ? `${session.remaining} 个名额` : `${session.remaining} spots left`}
                    </span>
                  ) : (
                    <span>
                      {isZh ? `${session.remaining} 个名额` : `${session.remaining} spots left`}
                    </span>
                  )}
                </span>
              </div>

              {/* Book button */}
              <div>
                {isFull ? (
                  <span className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft border border-ink-soft/30 rounded-full px-5 py-[0.55rem] cursor-default block text-center">
                    {isZh ? '已满' : 'Full'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openModal(session)}
                    className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink bg-sky border-none rounded-full px-[1.3rem] py-[0.55rem] cursor-pointer transition-colors hover:bg-blue-deep hover:text-paper whitespace-nowrap"
                  >
                    {isZh ? '立即报名' : 'Book'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal — rendered once, driven by state */}
      {modal.session && (
        <BookingModal
          open={modal.open}
          onClose={closeModal}
          activityId={modal.session.activityId}
          activitySlug={modal.session.activitySlug}
          activityTitle={modal.session.activityTitle}
          occurrenceId={modal.session.occurrenceId}
          sessionLabel={(() => {
            const s = modal.session
            const startDate = new Date(s.startAt)
            return isZh
              ? `${formatDayZh(startDate)}(${formatWeekdayZh(startDate)}) · ${formatTimeRange(s.startAt, s.endAt)}`
              : `${formatWeekdayEn(startDate)} ${formatDayEn(startDate)} · ${formatTimeRange(s.startAt, s.endAt)}`
          })()}
          locationId={modal.session.locationId}
          locationSlug={modal.session.locationSlug}
          locationName={modal.session.locationName}
          locationWechatId={modal.session.locationWechatId ?? undefined}
          locationWhatsapp={modal.session.locationWhatsapp ?? undefined}
          locale={locale}
          source={modal.source}
        />
      )}
    </>
  )
}
