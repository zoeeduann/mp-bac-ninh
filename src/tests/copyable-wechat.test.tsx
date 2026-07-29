import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act, screen } from '@testing-library/react'
import CopyableWechat from '@/components/CopyableWechat'

describe('CopyableWechat', () => {
  // Stub navigator.clipboard so jsdom/happy-dom doesn't throw.
  let writeText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the WeChat id as the button label by default', () => {
    render(<CopyableWechat id="mp_chiangmai" locale="zh-CN" />)
    expect(screen.getByRole('button').textContent).toBe('mp_chiangmai')
  })

  it('writes the id to the clipboard on click', async () => {
    render(<CopyableWechat id="mp_chiangmai" locale="zh-CN" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(writeText).toHaveBeenCalledWith('mp_chiangmai')
  })

  it('flips to "已复制 ✓" on click in zh locale', async () => {
    render(<CopyableWechat id="mp_chiangmai" locale="zh-CN" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(screen.getByRole('button').textContent).toBe('已复制 ✓')
  })

  it('flips to "Copied ✓" on click in en locale', async () => {
    render(<CopyableWechat id="mp_chiangmai" locale="en" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(screen.getByRole('button').textContent).toBe('Copied ✓')
  })

  it('reverts to the id after 2 seconds', async () => {
    render(<CopyableWechat id="mp_chiangmai" locale="zh-CN" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(screen.getByRole('button').textContent).toBe('已复制 ✓')
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('button').textContent).toBe('mp_chiangmai')
  })

  it('uses an aria-label describing the action plus the id', () => {
    render(<CopyableWechat id="mp_chiangmai" locale="zh-CN" />)
    const aria = screen.getByRole('button').getAttribute('aria-label') ?? ''
    expect(aria).toContain('mp_chiangmai')
    expect(aria).toMatch(/复制|copy/i)
  })

  it('forwards the className prop so call sites can inherit local typography', () => {
    render(
      <CopyableWechat
        id="mp_chiangmai"
        locale="zh-CN"
        className="font-mono text-ink"
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('font-mono')
    expect(btn.className).toContain('text-ink')
  })

  it('does not throw when navigator.clipboard.writeText is rejected', async () => {
    writeText.mockRejectedValueOnce(new Error('blocked'))
    render(<CopyableWechat id="mp_chiangmai" locale="zh-CN" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    // Stays on the id — no copied state, no crash
    expect(screen.getByRole('button').textContent).toBe('mp_chiangmai')
  })
})
