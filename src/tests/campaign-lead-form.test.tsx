import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CampaignLeadForm from '@/components/campaigns/CampaignLeadForm'

vi.mock('@/lib/site-config', () => ({ TURNSTILE_ENABLED: false }))
const { sendCampaignMetric } = vi.hoisted(() => ({ sendCampaignMetric: vi.fn() }))
vi.mock('@/lib/campaign-metrics-client', () => ({ sendCampaignMetric }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function fill() {
  fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '  测试访客  ' } })
  fireEvent.change(screen.getByLabelText(/Zalo.*注册手机号/), { target: { value: '0912 345 678' } })
  fireEvent.click(screen.getByRole('checkbox'))
}

describe('campaign inquiries', () => {
  it('submits only a name, explicit Zalo number and inquiry context; shows success after server confirmation', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true, id: 'test-only' }) })
    vi.stubGlobal('fetch', fetch)
    render(<CampaignLeadForm focus="mindfulness" locationId={4} />)
    await waitFor(() => expect(sendCampaignMetric).toHaveBeenCalledWith('page_view', 'mindfulness'))
    fill()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('已收到你的咨询'))
    expect(fetch).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toMatchObject({
      name: '测试访客',
      zaloId: '0912345678',
      phone: '0912345678',
      location: 4,
      source: 'book_general_inquiry',
      campaignFocus: 'mindfulness',
      direction: 'mindfulness',
    })
    expect(body.activity).toBeUndefined()
    expect(body.notes).toContain('访客已同意')
    expect(screen.getByRole('status')).toHaveTextContent('不代表已报名')
    expect(sendCampaignMetric.mock.calls).toEqual([
      ['page_view', 'mindfulness'],
      ['form_start', 'mindfulness'],
    ])
  })

  it('counts one form start across multiple edits and never sends contact details to metrics', async () => {
    render(<CampaignLeadForm focus="buddhism" locationId={4} />)
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '张三' } })
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '张三丰' } })
    fireEvent.change(screen.getByLabelText(/Zalo.*注册手机号/), {
      target: { value: '0912345678' },
    })

    await waitFor(() => expect(sendCampaignMetric).toHaveBeenCalledTimes(2))
    expect(sendCampaignMetric.mock.calls).toEqual([
      ['page_view', 'buddhism'],
      ['form_start', 'buddhism'],
    ])
    expect(JSON.stringify(sendCampaignMetric.mock.calls)).not.toContain('张三')
    expect(JSON.stringify(sendCampaignMetric.mock.calls)).not.toContain('0912345678')
  })

  it('keeps the entered details and allows retry after a rate limit response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'rate_limited' }),
      }),
    )
    render(<CampaignLeadForm focus="buddhism" locationId={4} />)
    fill()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('提交次数较多'))
    expect(screen.getByLabelText('姓名')).toHaveValue('  测试访客  ')
    expect(screen.getByLabelText(/Zalo.*注册手机号/)).toHaveValue('0912 345 678')
    expect(screen.getByRole('button')).toBeEnabled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('does not claim success for an invalid success response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    render(<CampaignLeadForm focus="buddhism" locationId={4} />)
    fill()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('未能确认提交成功'))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('does not send a malformed contact number or submit without consent', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<CampaignLeadForm focus="mindfulness" locationId={4} />)
    fill()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.submit(screen.getByRole('form'))
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText(/Zalo.*注册手机号/), {
      target: { value: 'not-a-number' },
    })
    fireEvent.submit(screen.getByRole('form'))
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('有效的 Zalo')
  })
})
