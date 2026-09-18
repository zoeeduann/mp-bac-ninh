'use client'
import { useState } from 'react'
import BookingModal from './BookingModal'

export interface BookSessionButtonProps {
  activityId: number
  activitySlug: string
  activityTitle: string
  occurrenceId: string
  sessionLabel: string
  seriesSessionLabels?: string[]
  requiresFullAttendance?: boolean
  requiresChineseProficiency?: boolean
  locationId: number
  locationSlug: string
  locationName: string
  locationWechatId?: string
  locale: 'zh-CN' | 'en'
  source: 'activity_detail' | 'book_list' | 'shared_link'
  isFull: boolean
  /** Extra classes for the trigger (e.g. full width in the mobile sticky bar). */
  className?: string
  /** Trigger text; defaults to 立即报名 / Book. */
  label?: string
}

const BASE =
  'inline-flex min-h-11 items-center justify-center font-sans text-[11px] font-semibold tracking-[0.1em] uppercase rounded-full px-5 py-[0.45rem] whitespace-nowrap md:min-h-0'

export default function BookSessionButton(props: BookSessionButtonProps) {
  const [open, setOpen] = useState(false)
  const isZh = props.locale === 'zh-CN'
  const extra = props.className ?? ''

  if (props.isFull) {
    return (
      <span className={[BASE, 'text-ink-soft border border-ink-soft/30 cursor-default', extra].join(' ')}>
        {isZh ? '已满' : 'Full'}
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          BASE,
          'text-paper bg-blue-deep border-none cursor-pointer transition-colors duration-150 hover:bg-ink',
          extra,
        ].join(' ')}
      >
        {props.label ?? (isZh ? '立即报名' : 'Book')}
      </button>
      <BookingModal
        open={open}
        onClose={() => setOpen(false)}
        activityId={props.activityId}
        activitySlug={props.activitySlug}
        activityTitle={props.activityTitle}
        occurrenceId={props.occurrenceId}
        sessionLabel={props.sessionLabel}
        seriesSessionLabels={props.seriesSessionLabels}
        requiresFullAttendance={props.requiresFullAttendance}
        requiresChineseProficiency={props.requiresChineseProficiency}
        locationId={props.locationId}
        locationSlug={props.locationSlug}
        locationName={props.locationName}
        locationWechatId={props.locationWechatId}
        locale={props.locale}
        source={props.source}
      />
    </>
  )
}
