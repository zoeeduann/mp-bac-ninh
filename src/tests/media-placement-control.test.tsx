import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.stubGlobal('React', React)
const documentInfo = vi.hoisted(() => ({ id: 241, data: { id: 241, filename: 'cover.webp' } }))
vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => documentInfo,
  useFormModified: () => false,
}))
import MediaCoverGenerator from '@/components/admin/MediaCoverGenerator'
afterEach(() => vi.unstubAllGlobals())
it('shows the placement entry in the media editor and loads its previews', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    master: { url: '/master.webp', width: 1536, height: 1024 }, isGenerated: true,
    activities: [{ id: 4, title: '如何走出负面情绪', card: '/card.webp', hero: '/master.webp', share: '/api/activities/4/share-image' }], note: '已发布活动引用',
  }) }))
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  render(<MediaCoverGenerator />)
  fireEvent.click(screen.getByRole('button', { name: '查看版位与尺寸' }))
  await waitFor(() => expect(screen.getByRole('heading', { name: '链接分享预览' })).toBeInTheDocument())
  expect(screen.getByRole('img', { name: '活动卡片预览' })).toHaveAttribute('src', '/card.webp')
  expect(screen.getByRole('img', { name: '详情封面 / 下载海报配图预览' })).toHaveAttribute('src', '/master.webp')
})
