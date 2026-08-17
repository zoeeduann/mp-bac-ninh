import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Footer, { socialLabel } from '@/components/layout/Footer'

let pathname = '/'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

vi.mock('@/lib/site-config', () => ({
  locationPath: (locale: string, slug: string, suffix = '') => {
    const localized = `${locale === 'en' ? '/en' : ''}${suffix}`
    return slug === 'bac-ninh' ? localized || '/' : `/${slug}${localized}`
  },
}))

const locations = [
  {
    slug: 'bangkok',
    name: '曼谷静心学堂',
    city: '曼谷',
    social: [{ label: 'Facebook', url: 'https://facebook.com/bangkok' }],
  },
  {
    slug: 'bac-ninh',
    name: '北宁善明小院',
    city: '越南北宁',
    tagline: '禅意生活、智慧人生、觉醒之道。',
    email: 'bacninh@example.com',
    phone: '+84 91 111 1111',
    wechatId: 'mindful_bacninh',
    whatsapp: '+84 91 111 1111',
    social: [{ label: 'Facebook', url: 'https://facebook.com/bacninh' }],
  },
]

type TestWindow = Window & { gtag?: ReturnType<typeof vi.fn> }

describe('standalone Bac Ninh Footer', () => {
  beforeEach(() => {
    pathname = '/'
    Object.assign(window, { gtag: vi.fn() })
  })

  it('uses clean standalone paths and never renders the Thailand network', () => {
    render(<Footer locale="zh-CN" allLocations={locations} siteLocationSlug="bac-ninh" />)

    expect(screen.getByText('北宁善明小院')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '活动' })).toHaveAttribute('href', '/activities')
    expect(screen.queryByText('曼谷静心学堂')).not.toBeInTheDocument()
    expect(screen.queryByText('网络')).not.toBeInTheDocument()
  })

  it('shows the Bac Ninh Facebook and preserves tracked direct contact actions', () => {
    render(<Footer locale="en" allLocations={locations} siteLocationSlug="bac-ninh" />)

    const facebook = screen.getByRole('link', { name: /Facebook/ })
    expect(facebook).toHaveAttribute('href', 'https://facebook.com/bacninh')
    document.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(facebook)
    expect((window as TestWindow).gtag).toHaveBeenCalledWith('event', 'contact_click', {
      contact_method: 'facebook',
    })
    expect(screen.getByRole('link', { name: 'Activities' })).toHaveAttribute(
      'href',
      '/en/activities',
    )
    expect(screen.getByRole('link', { name: 'bacninh@example.com' })).toHaveAttribute(
      'href',
      'mailto:bacninh@example.com',
    )
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      'https://wa.me/84911111111',
    )
    expect(screen.getByRole('button', { name: /mindful_bacninh/ })).toBeInTheDocument()
  })
})

describe('socialLabel', () => {
  it('uses a label when present and otherwise a readable hostname', () => {
    expect(socialLabel({ label: ' Facebook ', url: 'https://facebook.com/bacninh' })).toBe(
      'Facebook',
    )
    expect(socialLabel({ url: 'https://www.facebook.com/bacninh' })).toBe('facebook.com')
  })
})
