'use client'
import { useState } from 'react'
import BookingModal from './BookingModal'

export interface BookSessionButtonProps {
  activityId: number
  activitySlug: string
  activityTitle: string
  occurrenceId: string
  sessionLabel: string
  locationId: number
  locationSlug: string
  locationName: string
  locationWechatId?: string
  locale: 'zh-CN' | 'en'
  source: 'activity_detail' | 'book_list' | 'shared_link'
  isFull: boolean
}

export default function BookSessionButton(props: BookSessionButtonProps) {
  const [open, setOpen] = useState(false)
  const isZh = props.locale === 'zh-CN'

  if (props.isFull) {
    return (
      <span className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft border border-ink-soft/30 rounded-full px-5 py-[0.45rem] cursor-default">
        {isZh ? '已满' : 'Full'}
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink bg-sky rounded-full px-5 py-[0.45rem] border-none cursor-pointer transition-colors duration-150 hover:bg-blue-deep hover:text-paper whitespace-nowrap"
      >
        {isZh ? '立即报名' : 'Book'}
      </button>
      <BookingModal
        open={open}
        onClose={() => setOpen(false)}
        activityId={props.activityId}
        activitySlug={props.activitySlug}
        activityTitle={props.activityTitle}
        occurrenceId={props.occurrenceId}
        sessionLabel={props.sessionLabel}
        locationId={props.locationId}
        locationName={props.locationName}
        locationWechatId={props.locationWechatId}
        locale={props.locale}
        source={props.source}
      />
    </>
  )
}
