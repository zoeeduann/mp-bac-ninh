'use client'
import { useState, useEffect, useRef, useTransition } from 'react'
import Turnstile from './Turnstile'
import CopyableWechat from '@/components/CopyableWechat'
import TrackedLink from '@/components/analytics/TrackedLink'
import { trackActivityLead, trackBookingStart } from '@/lib/analytics'

export interface BookingModalProps {
  open: boolean
  onClose: () => void
  // context
  activityId: number
  activitySlug: string
  activityTitle: string
  occurrenceId: string
  sessionLabel: string
  locationId: number
  locationSlug: string
  locationName: string
  locationWechatId?: string
  locationWhatsapp?: string | null
  locale: 'zh-CN' | 'en'
  source: 'activity_detail' | 'book_list' | 'shared_link'
}

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; waitlisted: boolean; userEmail: string }
  | { kind: 'full' }
  | { kind: 'error'; message: string }

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export default function BookingModal({
  open,
  onClose,
  activityId,
  activitySlug,
  activityTitle,
  occurrenceId,
  sessionLabel,
  locationId,
  locationSlug,
  locationName,
  locationWechatId,
  locationWhatsapp,
  locale,
  source,
}: BookingModalProps) {
  const isZh = locale === 'zh-CN'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [wechatId, setWechatId] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState(1)
  const [notes, setNotes] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [contactError, setContactError] = useState(false)

  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' })
  const [, startTransition] = useTransition()

  const closeRef = useRef<HTMLButtonElement>(null)
  const trackedOpenRef = useRef(false)

  // Count a booking start once per modal opening, including shared links that
  // auto-open the form. Closing and reopening starts a new attempt.
  useEffect(() => {
    if (open && !trackedOpenRef.current) {
      trackBookingStart({
        bookingSource: source,
        locationSlug,
        activitySlug,
        language: locale,
      })
      trackedOpenRef.current = true
    } else if (!open) {
      trackedOpenRef.current = false
    }
  }, [activitySlug, locale, locationSlug, open, source])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      // Focus close button
      setTimeout(() => closeRef.current?.focus(), 50)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setName('')
      setEmail('')
      setWechatId('')
      setPhone('')
      setGuests(1)
      setNotes('')
      setHoneypot('')
      setTurnstileToken('')
      setContactError(false)
      setSubmitState({ kind: 'idle' })
    }
  }, [open])

  async function handleSubmit(acceptWaitlist = false) {
    // Client-side validation
    if (!email && !wechatId) {
      setContactError(true)
      return
    }
    setContactError(false)

    setSubmitState({ kind: 'submitting' })

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          activity: activityId,
          occurrenceId,
          location: locationId,
          name,
          email: email || undefined,
          wechatId: wechatId || undefined,
          phone,
          guests,
          notes: notes || undefined,
          language: isZh ? 'zh' : 'en',
          turnstileToken: turnstileToken || 'dev-bypass',
          honeypot,
          acceptWaitlist,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        trackActivityLead({
          bookingSource: source,
          locationSlug,
          activitySlug,
          language: locale,
          waitlisted: data.kind === 'waitlisted',
        })
        startTransition(() => {
          setSubmitState({
            kind: 'success',
            waitlisted: data.kind === 'waitlisted',
            userEmail: email,
          })
        })
      } else if (res.status === 409) {
        setSubmitState({ kind: 'full' })
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('[BookingModal] Booking error:', res.status, data)
        setSubmitState({
          kind: 'error',
          message: isZh
            ? '出了点问题，请稍后再试。'
            : 'Something went wrong, please try again.',
        })
      }
    } catch (err) {
      console.error('[BookingModal] Network error:', err)
      setSubmitState({
        kind: 'error',
        message: isZh
          ? '网络错误，请检查连接后重试。'
          : 'Network error, please check your connection.',
      })
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/55 z-[400] animate-[fadeIn_200ms_ease]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bm-activity-name"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[401] w-[90%] max-w-[540px] max-h-[90vh] overflow-y-auto bg-paper border border-ink/[0.18] rounded-[4px] px-[2.75rem] py-[2.5rem] max-sm:px-6 max-sm:py-8 animate-[fadeSlideIn_200ms_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-[1.1rem] right-[1.25rem] bg-transparent border-none text-[18px] leading-none text-ink-soft cursor-pointer p-1 transition-colors hover:text-ink"
        >
          ✕
        </button>

        {/* Header */}
        <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-ink-soft mb-[0.7rem]">
          {isZh ? '预约' : 'Booking'}
        </p>
        <h2
          id="bm-activity-name"
          className="font-serif text-[24px] font-normal text-ink leading-[1.2] mb-[0.45rem]"
        >
          {activityTitle}
        </h2>
        <span className="font-serif text-[14px] text-ink-soft mb-[1.4rem] block">
          {sessionLabel} · {locationName}
        </span>
        <hr className="border-none border-t border-hairline mb-[1.8rem]" />

        {/* Success state */}
        {submitState.kind === 'success' && (
          <div className="text-center py-8">
            <p className="font-sans text-[10px] font-semibold tracking-[0.2em] uppercase text-ink-soft mb-3">
              {submitState.waitlisted
                ? (isZh ? '已加入候补' : 'Added to waitlist')
                : (isZh ? '预约已收到' : 'Received')}
            </p>
            <h3 className="font-serif text-[22px] font-normal text-ink mb-4">
              {submitState.waitlisted
                ? (isZh ? '已经把你排在候补 ✓' : "You're on the waitlist ✓")
                : (isZh ? '谢谢你 ✓' : 'Thank you ✓')}
            </h3>
            <p className="font-sans text-[13px] text-ink-soft leading-[1.7] mb-6">
              {(() => {
                // Inline the WeChat ID as a click-to-copy chip; build the
                // sentence as JSX so we can drop CopyableWechat in mid-string.
                const wechatChip = locationWechatId ? (
                  <>
                    {isZh ? '微信: ' : ' WeChat: '}
                    <CopyableWechat
                      id={locationWechatId}
                      locale={locale}
                      className="font-mono font-semibold"
                    />
                  </>
                ) : null
                const emailChip = submitState.userEmail
                  ? isZh
                    ? ` 或邮箱: ${submitState.userEmail}`
                    : ` or email: ${submitState.userEmail}`
                  : ''
                if (submitState.waitlisted) {
                  return isZh ? (
                    <>
                      这一场目前已满，你已经排在候补名单。有空位时，义工会第一时间通过{wechatChip}{emailChip}联系你。
                    </>
                  ) : (
                    <>
                      This session is full. You&apos;ve been added to the waitlist. When a spot opens, we&apos;ll contact you via{wechatChip}{emailChip} right away.
                    </>
                  )
                }
                return isZh ? (
                  <>
                    我们已经收到你的预约。义工会在 24 小时内通过{wechatChip}{emailChip}跟你确认。
                  </>
                ) : (
                  <>
                    We&apos;ve received your booking. Our team will confirm within 24 hours via{wechatChip}{emailChip}.
                  </>
                )
              })()}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft border border-ink-soft/30 rounded-full px-5 py-2 cursor-pointer transition-colors hover:border-ink hover:text-ink"
            >
              {isZh ? '关闭' : 'Close'}
            </button>
          </div>
        )}

        {/* Form state */}
        {submitState.kind !== 'success' && (
          <form
            className="flex flex-col gap-[1.6rem]"
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit(false)
            }}
          >
            {/* Honeypot */}
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="sr-only"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />

            {/* Name */}
            <div className="flex flex-col gap-[0.45rem]">
              <label
                htmlFor="bm-name"
                className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
              >
                {isZh ? '姓名' : 'Name'}
              </label>
              <input
                id="bm-name"
                type="text"
                required
                autoComplete="name"
                placeholder={isZh ? '你的名字' : 'Your name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-sans text-[15px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-2 w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 rounded-none appearance-none"
              />
            </div>

            {/* Contact row: email + wechat */}
            <div className="flex flex-col gap-[0.45rem]">
              <label className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft">
                {isZh ? '联系方式' : 'Contact'}
              </label>
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-[1.2rem]">
                <div className="flex flex-col gap-[0.45rem]">
                  <label
                    htmlFor="bm-email"
                    className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
                  >
                    {isZh ? '邮箱' : 'Email'}
                  </label>
                  <input
                    id="bm-email"
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-sans text-[15px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-2 w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 rounded-none appearance-none"
                  />
                </div>
                <div className="flex flex-col gap-[0.45rem]">
                  <label
                    htmlFor="bm-wechat"
                    className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
                  >
                    {isZh ? '微信' : 'WeChat'}
                  </label>
                  <input
                    id="bm-wechat"
                    type="text"
                    placeholder="WeChat ID"
                    value={wechatId}
                    onChange={(e) => setWechatId(e.target.value)}
                    className="font-sans text-[15px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-2 w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 rounded-none appearance-none"
                  />
                </div>
              </div>
              {contactError && (
                <p className="font-sans text-[11px] text-clay mt-1">
                  {isZh ? '至少填一个联系方式' : 'fill at least one'}
                </p>
              )}
              {!contactError && (
                <p className="font-sans text-[11px] text-ink-soft mt-1">
                  {isZh ? '至少填一个' : 'fill at least one'}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-[0.45rem]">
              <label
                htmlFor="bm-phone"
                className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
              >
                {isZh ? '电话' : 'Phone'}
              </label>
              <input
                id="bm-phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+66 / +86 ..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="font-sans text-[15px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-2 w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 rounded-none appearance-none"
              />
            </div>

            {/* Guests */}
            <div className="flex flex-col gap-[0.45rem]">
              <label
                htmlFor="bm-guests"
                className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
              >
                {isZh ? '人数' : 'Guests'}
              </label>
              <input
                id="bm-guests"
                type="number"
                min={1}
                max={10}
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                className="font-sans text-[15px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-2 max-w-[6rem] transition-colors focus:border-b-sky rounded-none appearance-none"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-[0.45rem]">
              <label
                htmlFor="bm-notes"
                className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
              >
                {isZh ? '备注' : 'Notes'}
              </label>
              <textarea
                id="bm-notes"
                rows={3}
                placeholder={isZh ? '任何需要告诉我们的' : 'Anything we should know (optional)'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="font-sans text-[15px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-2 w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 resize-y min-h-[80px] leading-[1.6] rounded-none appearance-none"
              />
            </div>

            {/* Turnstile */}
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onToken={setTurnstileToken}
            />

            {/* Capacity full inline panel */}
            {submitState.kind === 'full' && (
              <div className="bg-sky/15 border border-sky/40 rounded p-4 text-[13px] text-ink">
                <p className="font-semibold mb-3">
                  {isZh ? '本场已满 · 你要不要进候补？' : 'This session is full. Join the waitlist?'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink bg-sky rounded-full px-4 py-2 cursor-pointer transition-colors hover:bg-blue-deep hover:text-paper"
                  >
                    {isZh ? '加入候补' : 'Join waitlist'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmitState({ kind: 'idle' })}
                    className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft border border-ink-soft/30 rounded-full px-4 py-2 cursor-pointer transition-colors hover:border-ink hover:text-ink"
                  >
                    {isZh ? '返回' : 'Back'}
                  </button>
                </div>
              </div>
            )}

            {/* Error message */}
            {submitState.kind === 'error' && (
              <p className="font-sans text-[12px] text-clay">
                {submitState.message}
              </p>
            )}

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={submitState.kind === 'submitting'}
                className="font-sans text-[12px] font-semibold tracking-[0.12em] uppercase text-ink bg-sky border-none rounded-full py-[0.85rem] px-[2.2rem] cursor-pointer transition-colors w-full mt-[0.6rem] hover:bg-blue-deep hover:text-paper disabled:opacity-60 disabled:cursor-default"
              >
                {submitState.kind === 'submitting'
                  ? (isZh ? '提交中...' : 'Submitting...')
                  : (isZh ? '确认报名' : 'Confirm booking')}
              </button>
              <p className="font-sans text-[12px] text-ink-soft text-center mt-[0.7rem] leading-[1.5]">
                {isZh
                  ? '提交后我们会在 24 小时内通过邮件或微信跟你确认'
                  : 'Confirmation within 24h via email or WeChat'}
              </p>
            </div>

            {/* WeChat alt + WhatsApp alt */}
            {(locationWechatId || locationWhatsapp) && (
              <div className="mt-[1.6rem] pt-[1.4rem] border-t border-hairline text-[13px] text-ink-soft text-center flex flex-col gap-2">
                {locationWechatId && (
                  <div>
                    {isZh ? '或直接添加学堂微信：' : "Or add the academy's WeChat: "}
                    <CopyableWechat
                      id={locationWechatId}
                      locale={locale}
                      className="font-mono text-ink font-semibold tracking-[0.02em] ml-1"
                    />
                  </div>
                )}
                {locationWhatsapp && (
                  <div>
                    {isZh ? '或加 WhatsApp：' : 'Or WhatsApp us: '}
                    <TrackedLink
                      href={
                        locationWhatsapp.startsWith('http')
                          ? locationWhatsapp
                          : `https://wa.me/${locationWhatsapp.replace(/[^\d]/g, '')}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      analyticsEvent="contact_click"
                      analyticsParameters={{ contact_method: 'whatsapp' }}
                      className="font-mono text-ink font-semibold tracking-[0.02em] ml-1 no-underline hover:underline"
                    >
                      {locationWhatsapp}
                    </TrackedLink>
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 8px)); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  )
}
