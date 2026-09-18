import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PosterBookingBlock from '../components/activities/PosterBookingBlock'

describe('PosterBookingBlock', () => {
  it('shows no QR and no 报名 wording when there is no upcoming session', () => {
    const { container } = render(
      <PosterBookingBlock
        locale="zh-CN"
        bookButton={null}
        qrDataUrl={null}
        activitiesHref="/activities"
        detailHref="/activities/mindfulness-ball"
      />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).not.toMatch(/报名|扫码/)
    expect(screen.getByRole('link', { name: /看看近期其他活动/ })).toHaveAttribute('href', '/activities')
  })

  it('offers the book button and scan-to-book QR for an upcoming session', () => {
    const { container } = render(
      <PosterBookingBlock
        locale="en"
        bookButton={<button type="button">Book</button>}
        qrDataUrl="data:image/png;base64,AAAA"
        activitiesHref="/en/activities"
        detailHref="/en/activities/mindfulness-ball"
      />,
    )
    expect(screen.getByRole('button', { name: 'Book' })).toBeInTheDocument()
    expect(screen.getByText('Scan to book')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeNull()
  })
})
