import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import BookingModal from '../components/booking/BookingModal'

const baseProps = {
  open: true,
  onClose: vi.fn(),
  activityId: 58,
  activitySlug: 'tea-ceremony-seven-forms-training',
  activityTitle: '静茶七式研修班招生',
  occurrenceId: 'o1',
  sessionLabel: '完整系列课程 · 共 3 次',
  seriesSessionLabels: [
    '8月23日（周日）· 09:00 – 11:30 ICT',
    '8月29日（周六）· 09:00 – 11:30 ICT',
    '9月5日（周六）· 09:00 – 16:30 ICT',
  ],
  requiresFullAttendance: true,
  requiresChineseProficiency: true,
  locationId: 4,
  locationSlug: 'bac-ninh',
  locationName: '北宁善明静心小院',
  locale: 'zh-CN' as const,
  source: 'activity_detail' as const,
}

describe('BookingModal series course fields', () => {
  it('shows all course dates, Chinese level choices, Zalo, and attendance confirmation', () => {
    render(<BookingModal {...baseProps} />)

    expect(screen.getByText('系列课程 · 共 3 次，需全程参加')).toBeInTheDocument()
    expect(screen.getByText(/第 1 次：8月23日/)).toBeInTheDocument()
    expect(screen.getByText('① 听得懂，也表达得清楚')).toBeInTheDocument()
    expect(screen.getByText('② 能听懂，但表达困难')).toBeInTheDocument()
    expect(screen.getByText('③ 听和说都需要翻译才能够完成')).toBeInTheDocument()
    expect(screen.getByLabelText('Zalo')).toBeInTheDocument()
    expect(screen.getByText(/我已确认可以参加以上全部 3 次课程/)).toBeInTheDocument()
  })

  it('does not submit a series booking without full-attendance confirmation', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<BookingModal {...baseProps} />)

    fireEvent.change(screen.getByLabelText('Zalo'), { target: { value: '0900000000' } })
    fireEvent.submit(screen.getByRole('button', { name: '确认报名整期课程' }).closest('form')!)

    expect(screen.getByText('请确认可以参加全部课次')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('BookingModal guests field', () => {
  const singleProps = {
    ...baseProps,
    seriesSessionLabels: undefined,
    requiresFullAttendance: false,
    requiresChineseProficiency: false,
  }

  it('can be cleared and retyped, as on a phone keyboard', () => {
    render(<BookingModal {...singleProps} />)
    const input = screen.getByLabelText('人数') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')
    fireEvent.change(input, { target: { value: '3' } })
    expect(input.value).toBe('3')
  })

  it('steps with the + / − buttons within 1..10', () => {
    render(<BookingModal {...singleProps} />)
    const input = screen.getByLabelText('人数') as HTMLInputElement
    const minus = screen.getByRole('button', { name: '减少人数' })
    const plus = screen.getByRole('button', { name: '增加人数' })
    expect(minus).toBeDisabled()
    fireEvent.click(plus)
    fireEvent.click(plus)
    expect(input.value).toBe('3')
    for (let i = 0; i < 12; i++) fireEvent.click(plus)
    expect(input.value).toBe('10')
    expect(plus).toBeDisabled()
  })

  it('submits the typed guest count', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    render(<BookingModal {...singleProps} />)
    fireEvent.change(screen.getByLabelText('Zalo'), { target: { value: '0900000000' } })
    const input = screen.getByLabelText('人数') as HTMLInputElement
    fireEvent.change(input, { target: { value: '4' } })
    fireEvent.submit(input.closest('form')!)
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string).guests).toBe(4)
    fetchSpy.mockRestore()
  })
})
