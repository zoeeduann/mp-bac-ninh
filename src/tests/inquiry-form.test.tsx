import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import InquiryForm from '../components/booking/InquiryForm'

const bacNinh = { id: 4, slug: 'bac-ninh', name: '越南北宁善明静心小院', city: '越南北宁' }

describe('InquiryForm contact hint', () => {
  it('never fabricates a WeChat ID when the location has none', () => {
    const { container } = render(
      <InquiryForm locations={[{ ...bacNinh, wechatId: null }]} defaultLocationId={4} locale="zh-CN" />,
    )
    expect(container.textContent).not.toContain('mp_bac-ninh')
    expect(screen.queryByText(/搜索微信号/)).not.toBeInTheDocument()
  })

  it('shows the real WeChat ID when one exists', () => {
    render(
      <InquiryForm
        locations={[{ ...bacNinh, wechatId: 'shanming_bn' }]}
        defaultLocationId={4}
        locale="en"
      />,
    )
    expect(screen.getByText(/Prefer WeChat/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /shanming_bn/ })).toBeInTheDocument()
  })

  it('hides the academy picker when there is only one location', () => {
    render(<InquiryForm locations={[bacNinh]} defaultLocationId={4} locale="zh-CN" />)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
})
