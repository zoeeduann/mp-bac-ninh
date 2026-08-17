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
  locationName: '北宁善明小院',
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
