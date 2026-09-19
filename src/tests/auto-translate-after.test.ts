import { describe, expect, it, vi } from 'vitest'

describe('scheduleAfterResponse', () => {
  it('defers the task to after the response inside a request', async () => {
    vi.resetModules()
    const after = vi.fn()
    vi.doMock('next/server', () => ({ after }))
    const { scheduleAfterResponse } = await import('@/collections/Activities.hooks')
    const task = vi.fn(async () => {})
    expect(scheduleAfterResponse(task)).toBe(true)
    expect(after).toHaveBeenCalledWith(task)
    expect(task).not.toHaveBeenCalled()
    vi.doUnmock('next/server')
  })

  it('reports false outside a request so the caller runs the task inline', async () => {
    vi.resetModules()
    vi.doMock('next/server', () => ({
      after: () => {
        throw new Error('`after` was called outside a request scope.')
      },
    }))
    const { scheduleAfterResponse } = await import('@/collections/Activities.hooks')
    expect(scheduleAfterResponse(async () => {})).toBe(false)
    vi.doUnmock('next/server')
  })
})
