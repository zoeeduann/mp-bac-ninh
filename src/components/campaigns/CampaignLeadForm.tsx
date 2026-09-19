'use client'

import React, { useEffect, useRef, useState } from 'react'
import Turnstile from '@/components/booking/Turnstile'
import { TURNSTILE_ENABLED } from '@/lib/site-config'
import {
  campaignCopy,
  campaignInquiryNotes,
  normalizeZaloPhone,
  type CampaignFocus,
} from '@/lib/campaigns'
import { sendCampaignMetric } from '@/lib/campaign-metrics-client'
import { trackCampaignFormStart, trackCampaignLead } from '@/lib/analytics'

export default function CampaignLeadForm({
  focus,
  locationId,
}: {
  focus: CampaignFocus
  locationId: number
}) {
  const [name, setName] = useState('')
  const [zalo, setZalo] = useState('')
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const sending = useRef(false)
  const pageViewSent = useRef(false)
  const formStartSent = useRef(false)

  useEffect(() => {
    if (pageViewSent.current) return
    pageViewSent.current = true
    sendCampaignMetric('page_view', focus)
  }, [focus])

  function markFormStarted() {
    if (formStartSent.current) return
    formStartSent.current = true
    sendCampaignMetric('form_start', focus)
    trackCampaignFormStart(focus)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current) return
    const phone = normalizeZaloPhone(zalo)
    if (!name.trim() || !phone || !consent) {
      setError(
        !name.trim()
          ? '请填写你的姓名。'
          : !phone
            ? '请填写有效的 Zalo 注册手机号，例如 0912 345 678。'
            : '请先同意小院通过 Zalo 回复本次咨询。',
      )
      return
    }
    if (TURNSTILE_ENABLED && !token) {
      setError('请先完成人机验证。')
      return
    }
    sending.current = true
    setState('sending')
    setError('')
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'book_general_inquiry',
          campaignFocus: focus,
          location: locationId,
          name: name.trim(),
          zaloId: phone,
          phone,
          direction: focus === 'mindfulness' ? 'mindfulness' : 'other',
          notes: campaignInquiryNotes(focus, window.location.search),
          language: 'zh',
          turnstileToken: token || 'not-required',
          honeypot,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || result?.ok !== true || !result.id) {
        setError(
          response.status === 429
            ? '提交次数较多，请稍后再试。已填写的内容会保留。'
            : '暂时未能确认提交成功，请稍后重试。已填写的内容会保留。',
        )
        setState('idle')
        return
      }
      trackCampaignLead(focus)
      setState('sent')
    } catch {
      setError('网络连接中断，请检查网络后重试。已填写的内容会保留。')
      setState('idle')
    } finally {
      sending.current = false
    }
  }

  if (state === 'sent')
    return (
      <div className="campaign-success" role="status" aria-live="polite">
        <span className="campaign-success-mark" aria-hidden="true">
          ✓
        </span>
        <h3>已收到你的咨询</h3>
        <p>小院将通过你留下的 Zalo 与你联系。请留意好友申请或消息。</p>
        <p className="campaign-small">这只是咨询登记，不代表已报名或占位。</p>
      </div>
    )

  return (
    <form onSubmit={submit} className="campaign-form" aria-label="姓名和 Zalo 咨询表单">
      <div>
        <label htmlFor="lead-name">姓名</label>
        <input
          id="lead-name"
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            markFormStarted()
          }}
          placeholder="我们该怎样称呼你"
          disabled={state === 'sending'}
        />
      </div>
      <div>
        <label htmlFor="lead-zalo">
          Zalo <span>（注册手机号）</span>
        </label>
        <input
          id="lead-zalo"
          name="zalo"
          type="tel"
          autoComplete="tel"
          required
          maxLength={40}
          value={zalo}
          onChange={(e) => {
            setZalo(e.target.value)
            markFormStarted()
          }}
          placeholder="例如 0912 345 678"
          aria-describedby="zalo-help"
          disabled={state === 'sending'}
        />
        <p id="zalo-help" className="campaign-small">
          请填写可通过 Zalo 联系到的号码；非越南号码请带国家区号。
        </p>
      </div>
      <div className="campaign-honeypot" aria-hidden="true">
        <label htmlFor="lead-website">Website</label>
        <input
          id="lead-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>
      <label className="campaign-consent">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={state === 'sending'}
        />
        <span>
          我同意善明静心小院使用以上资料，通过 Zalo 联系并回复本次咨询。
          <a href="#privacy">资料使用说明</a>
        </span>
      </label>
      {TURNSTILE_ENABLED && (
        <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''} onToken={setToken} />
      )}
      {error && (
        <p role="alert" className="campaign-form-error">
          {error}
        </p>
      )}
      <button className="campaign-button" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? '正在提交…' : campaignCopy[focus].cta}
        <span aria-hidden="true">↗</span>
      </button>
      <p className="campaign-small campaign-form-note">
        所有活动与课程均为公益免费。先了解，再决定是否参加。
      </p>
    </form>
  )
}
