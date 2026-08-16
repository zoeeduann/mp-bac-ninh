'use client'
import { useState, useTransition } from 'react'
import Turnstile from './Turnstile'
import CopyableWechat from '@/components/CopyableWechat'
import TrackedLink from '@/components/analytics/TrackedLink'
import { trackInquiryLead } from '@/lib/analytics'

interface LocationOption {
  id: number
  slug: string
  name: string
  city: string
  wechatId?: string | null
  whatsapp?: string | null
}

interface InquiryFormProps {
  locations: LocationOption[]
  defaultLocationId: number
  locale: 'zh-CN' | 'en'
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export default function InquiryForm({ locations, defaultLocationId, locale }: InquiryFormProps) {
  const isZh = locale === 'zh-CN'

  const [selectedLocationId, setSelectedLocationId] = useState(defaultLocationId)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [wechatId, setWechatId] = useState('')
  const [phone, setPhone] = useState('')
  const [direction, setDirection] = useState('')
  const [notes, setNotes] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')

  const [contactError, setContactError] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email && !wechatId) {
      setContactError(true)
      return
    }
    setContactError(false)
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'book_general_inquiry',
          location: selectedLocationId,
          name,
          email: email || undefined,
          wechatId: wechatId || undefined,
          phone,
          direction: direction || undefined,
          notes: notes || undefined,
          language: isZh ? 'zh' : 'en',
          turnstileToken: turnstileToken || 'dev-bypass',
          honeypot,
        }),
      })

      if (res.ok) {
        const selectedLocation = locations.find((location) => location.id === selectedLocationId)
        trackInquiryLead({
          locationSlug: selectedLocation?.slug,
          language: locale,
        })
        startTransition(() => setSubmitted(true))
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('[InquiryForm] Submit error:', res.status, data)
        setError(
          isZh
            ? '出了点问题，请稍后再试。'
            : 'Something went wrong, please try again.',
        )
      }
    } catch (err) {
      console.error('[InquiryForm] Network error:', err)
      setError(
        isZh
          ? '网络错误，请检查连接后重试。'
          : 'Network error, please check your connection.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-16">
        <p className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-4">
          {isZh ? '已收到' : 'Received'}
        </p>
        <h3 className="font-serif text-[28px] font-normal text-ink mb-4">
          {isZh ? '已收到你的咨询 ✓' : 'We received your note ✓'}
        </h3>
        <p className="font-sans text-[13px] text-ink-soft leading-[1.7]">
          {isZh
            ? '我们会在 24 小时内通过邮件或微信跟你联系。'
            : "We'll reach you within 24 hours via email or WeChat."}
        </p>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-[2.8rem]" onSubmit={handleSubmit}>
      {/* Honeypot */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] w-px h-px overflow-hidden"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        aria-hidden="true"
      />

      {/* Academy radio */}
      <div className="flex flex-col gap-[0.5rem]">
        <label className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft">
          {isZh ? '学堂' : 'Academy'}
        </label>
        <div className="flex flex-wrap gap-[1.2rem] mt-[0.4rem]">
          {locations.map((loc) => (
            <label
              key={loc.id}
              className="flex items-center gap-2 cursor-pointer font-sans text-[13px] font-medium text-ink"
            >
              <input
                type="radio"
                name="academy"
                value={loc.id}
                checked={selectedLocationId === loc.id}
                onChange={() => setSelectedLocationId(loc.id)}
                className="w-4 h-4 accent-sky cursor-pointer flex-shrink-0"
              />
              <span>{loc.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* WeChat / WhatsApp hint box */}
      <div className="bg-sky/[0.07] rounded p-[0.9rem_1.1rem] text-[12.5px] leading-[1.7] text-ink -mt-4 flex flex-col gap-1">
        <div>
          {isZh ? '想直接微信沟通?搜索学堂微信号:' : 'Prefer WeChat? Search the academy:'}
          {' '}
          {locations.map((loc, i) => (
            <span key={loc.id}>
              {i > 0 && ' · '}
              {loc.city}{' '}
              <CopyableWechat
                id={loc.wechatId ?? `mp_${loc.slug}`}
                locale={locale}
                className="font-mono tracking-[0.02em] text-sky font-semibold"
              />
            </span>
          ))}
        </div>
        {locations.some((l) => l.whatsapp) && (
          <div>
            {isZh ? '或加 WhatsApp:' : 'Or WhatsApp us:'}
            {' '}
            {locations.filter((l) => l.whatsapp).map((loc, i) => (
              <span key={loc.id}>
                {i > 0 && ' · '}
                {loc.city}{' '}
                <TrackedLink
                  href={
                    loc.whatsapp!.startsWith('http')
                      ? loc.whatsapp!
                      : `https://wa.me/${loc.whatsapp!.replace(/[^\d]/g, '')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  analyticsEvent="contact_click"
                  analyticsParameters={{ contact_method: 'whatsapp' }}
                  className="font-mono tracking-[0.02em] text-sky font-semibold no-underline hover:underline"
                >
                  {loc.whatsapp}
                </TrackedLink>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex flex-col gap-[0.5rem]">
        <label
          htmlFor="inq-name"
          className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
        >
          {isZh ? '姓名' : 'Name'}
        </label>
        <input
          id="inq-name"
          type="text"
          required
          autoComplete="name"
          placeholder={isZh ? '你的名字' : 'Your name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-sans text-[16px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-[0.6rem] w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 rounded-none appearance-none"
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-[0.5rem]">
        <label
          htmlFor="inq-email"
          className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
        >
          {isZh ? '邮箱' : 'Email'}
          <span className="text-[10px] font-normal tracking-normal normal-case ml-[0.6rem] opacity-70">
            {isZh ? '邮箱 或 微信 至少填一个' : 'Email or WeChat, at least one required'}
          </span>
        </label>
        <input
          id="inq-email"
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="font-sans text-[16px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-[0.6rem] w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 rounded-none appearance-none"
        />
      </div>

      {/* WeChat */}
      <div className="flex flex-col gap-[0.5rem]">
        <label
          htmlFor="inq-wechat"
          className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
        >
          {isZh ? '微信' : 'WeChat'}
        </label>
        <input
          id="inq-wechat"
          type="text"
          placeholder={isZh ? '微信号' : 'WeChat ID'}
          value={wechatId}
          onChange={(e) => setWechatId(e.target.value)}
          className="font-sans text-[16px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-[0.6rem] w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 rounded-none appearance-none"
        />
        {contactError && (
          <p className="font-sans text-[11px] text-clay mt-1">
            {isZh ? '邮箱或微信至少填一个' : 'Email or WeChat required'}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-[0.5rem]">
        <label
          htmlFor="inq-phone"
          className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
        >
          {isZh ? '电话' : 'Phone'}
        </label>
        <input
          id="inq-phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+66 / +86 ..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="font-sans text-[16px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-[0.6rem] w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 rounded-none appearance-none"
        />
      </div>

      {/* Direction */}
      <div className="flex flex-col gap-[0.5rem]">
        <label
          htmlFor="inq-direction"
          className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
        >
          {isZh ? '想体验的方向' : 'What interests you'}
        </label>
        <select
          id="inq-direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          className="font-sans text-[16px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-[0.6rem] w-full transition-colors focus:border-b-sky cursor-pointer rounded-none appearance-none"
          style={{
            // Chevron stroke is %236B6B72 = #6B6B72 (ink-soft), matching label colors.
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6B72' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 2px center',
            paddingRight: '1.5rem',
          }}
        >
          <option value="" disabled>
            {isZh ? '请选择' : 'Please select'}
          </option>
          <option value="meditation">{isZh ? '禅修' : 'Meditation'}</option>
          <option value="mindfulness">{isZh ? '正念' : 'Mindfulness'}</option>
          <option value="one_on_one">{isZh ? '一对一' : 'One-on-one'}</option>
          <option value="visit">{isZh ? '参观' : 'Visit'}</option>
          <option value="other">{isZh ? '其他' : 'Other'}</option>
        </select>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-[0.5rem]">
        <label
          htmlFor="inq-notes"
          className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft"
        >
          {isZh ? '备注' : 'Notes'}
        </label>
        <textarea
          id="inq-notes"
          rows={4}
          placeholder={
            isZh
              ? '希望参加的日期、任何病痛或限制、有什么想告诉我们...'
              : "Preferred dates, any physical limitations, anything you'd like us to know..."
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="font-sans text-[16px] text-ink bg-transparent border-b border-b-ink/[0.22] outline-none py-[0.6rem] w-full transition-colors focus:border-b-sky placeholder:text-ink-soft/45 resize-y min-h-[100px] leading-[1.6] rounded-none appearance-none"
        />
      </div>

      {/* Turnstile */}
      <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />

      {/* Error message */}
      {error && (
        <p className="font-sans text-[12px] text-clay -mt-4">{error}</p>
      )}

      {/* Submit area */}
      <div className="flex flex-col gap-[1.2rem] items-start">
        <button
          type="submit"
          disabled={submitting}
          className="font-sans text-[13px] font-semibold tracking-[0.12em] uppercase text-ink bg-sky border border-sky rounded-full py-4 px-[2.8rem] cursor-pointer transition-colors hover:bg-blue-deep hover:border-blue-deep hover:text-paper disabled:opacity-60 disabled:cursor-default max-sm:self-stretch max-sm:text-center"
        >
          {submitting
            ? (isZh ? '提交中...' : 'Submitting...')
            : (isZh ? '提交咨询' : 'Submit inquiry')}
        </button>
        <p className="font-sans text-[12px] text-ink-soft leading-[1.6]">
          {isZh
            ? '我们会在 24 小时内通过邮件或微信跟你联系。'
            : "We'll reach you within 24 hours via email or WeChat."}
        </p>
      </div>
    </form>
  )
}
