import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/image-alt', () => ({
  generateImageAlts: vi.fn(),
  uploadedImageSource: vi.fn(),
  publicImageUrl: vi.fn((value: unknown) => (typeof value === 'string' && value ? value : null)),
}))

import { autoGenerateMediaAltAfterChange } from '../collections/Media.hooks'
import { autoGenerateJournalAltAfterChange } from '../collections/Journal.hooks'
import { generateImageAlts, uploadedImageSource } from '../lib/image-alt'

function makeReq() {
  return {
    locale: 'zh-CN',
    context: {},
    file: { data: Buffer.from('image') },
    payload: {
      findByID: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('media auto alt hook', () => {
  it('fills both empty locales after upload', async () => {
    const req = makeReq()
    req.payload.findByID
      .mockResolvedValueOnce({ id: 7, alt: '' })
      .mockResolvedValueOnce({ id: 7, alt: null })
    vi.mocked(uploadedImageSource).mockResolvedValue({
      type: 'base64',
      mediaType: 'image/webp',
      data: 'abc',
    })
    vi.mocked(generateImageAlts).mockResolvedValue([
      {
        key: 'media-7',
        zh: '学员在庭院中静坐',
        en: 'Participants meditate in a courtyard',
      },
    ])

    await autoGenerateMediaAltAfterChange({
      doc: { id: 7, alt: '' },
      req,
      operation: 'create',
    } as any)

    expect(req.payload.update).toHaveBeenCalledTimes(2)
    expect(req.payload.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        locale: 'zh-CN',
        data: { alt: '学员在庭院中静坐' },
        context: { skipAutoAlt: true, skipIndexNow: true },
      }),
    )
    expect(req.payload.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        locale: 'en',
        data: { alt: 'Participants meditate in a courtyard' },
      }),
    )
  })

  it('preserves a manually filled locale and only fills the empty one', async () => {
    const req = makeReq()
    req.payload.findByID
      .mockResolvedValueOnce({ id: 8, alt: '人工填写的中文说明' })
      .mockResolvedValueOnce({ id: 8, alt: '' })
    vi.mocked(uploadedImageSource).mockResolvedValue({
      type: 'base64',
      mediaType: 'image/webp',
      data: 'abc',
    })
    vi.mocked(generateImageAlts).mockResolvedValue([
      { key: 'media-8', zh: 'AI 中文', en: 'AI English' },
    ])

    await autoGenerateMediaAltAfterChange({
      doc: { id: 8, alt: '人工填写的中文说明' },
      req,
      operation: 'create',
    } as any)

    expect(req.payload.update).toHaveBeenCalledOnce()
    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', data: { alt: 'AI English' } }),
    )
  })
})

describe('journal context-aware auto alt hook', () => {
  it('uses article context, preserves manual text, and fills only empty values', async () => {
    const req = makeReq()
    const zhDoc = {
      id: 3,
      title: '清迈春季茶会',
      body: {
        root: {
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: '大家在庭院学习泡茶。' }] },
          ],
        },
      },
      coverImage: {
        id: 10,
        url: 'https://cdn.example.com/cover.webp',
        sizes: { card: { url: 'https://cdn.example.com/cover-card.webp' } },
      },
      coverAlt: '人工填写的封面说明',
      photos: [
        {
          id: 'row-1',
          image: { id: 11, url: 'https://cdn.example.com/tea.webp' },
          caption: '春季茶席',
          alt: '',
        },
      ],
    }
    const enDoc = {
      ...zhDoc,
      title: 'Chiang Mai Spring Tea Gathering',
      coverAlt: '',
      photos: [{ ...zhDoc.photos[0], caption: '', alt: '' }],
    }
    req.payload.findByID.mockResolvedValueOnce(zhDoc).mockResolvedValueOnce(enDoc)
    vi.mocked(generateImageAlts).mockResolvedValue([
      { key: 'cover', zh: 'AI 封面', en: 'A spring tea gathering in Chiang Mai' },
      { key: 'photo-row-1', zh: '庭院中的春季茶席', en: 'A spring tea setting in the courtyard' },
    ])

    await autoGenerateJournalAltAfterChange({
      doc: { id: 3 },
      req,
      operation: 'update',
    } as any)

    const [, context] = vi.mocked(generateImageAlts).mock.calls[0]
    expect(context).toContain('清迈春季茶会')
    expect(context).toContain('大家在庭院学习泡茶')

    expect(req.payload.update).toHaveBeenCalledTimes(2)
    const zhUpdate = req.payload.update.mock.calls[0][0]
    expect(zhUpdate.locale).toBe('zh-CN')
    expect(zhUpdate.data.coverAlt).toBeUndefined()
    expect(zhUpdate.data.photos[0].alt).toBe('庭院中的春季茶席')

    const enUpdate = req.payload.update.mock.calls[1][0]
    expect(enUpdate.locale).toBe('en')
    expect(enUpdate.data.coverAlt).toBe('A spring tea gathering in Chiang Mai')
    expect(enUpdate.data.photos[0].alt).toBe('A spring tea setting in the courtyard')
    expect(enUpdate.context).toEqual({ skipAutoAlt: true, skipIndexNow: true })
  })

  it('skips a locale whose required title is still empty', async () => {
    const req = makeReq()
    const zhDoc = {
      id: 10,
      title: '清迈新建笔记',
      body: {
        root: {
          children: [{ type: 'paragraph', children: [{ type: 'text', text: '大家一起练习。' }] }],
        },
      },
      coverImage: { id: 30, url: 'https://cdn.example.com/cover.webp' },
      coverAlt: '',
      photos: [
        {
          id: 'row-10',
          image: { id: 31, url: 'https://cdn.example.com/practice.webp' },
          caption: '练习现场',
          alt: '',
        },
      ],
    }
    const enDoc = {
      ...zhDoc,
      title: '',
      coverAlt: '',
      photos: [{ ...zhDoc.photos[0], caption: '', alt: '' }],
    }
    req.payload.findByID.mockResolvedValueOnce(zhDoc).mockResolvedValueOnce(enDoc)
    vi.mocked(generateImageAlts).mockResolvedValue([
      { key: 'cover', zh: '清迈学堂练习现场', en: 'Practice at the Chiang Mai academy' },
      { key: 'photo-row-10', zh: '学员在清迈学堂练习', en: 'Participants practice at the academy' },
    ])

    await autoGenerateJournalAltAfterChange({
      doc: { id: 10 },
      req,
      operation: 'create',
    } as any)

    expect(req.payload.update).toHaveBeenCalledOnce()
    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'zh-CN',
        data: expect.objectContaining({
          coverAlt: '清迈学堂练习现场',
          photos: [expect.objectContaining({ alt: '学员在清迈学堂练习' })],
        }),
      }),
    )
  })

  it('continues when one locale cannot be read after save', async () => {
    const req = makeReq()
    const zhDoc = {
      id: 4,
      title: '清迈静坐记录',
      body: {
        root: {
          children: [{ type: 'paragraph', children: [{ type: 'text', text: '大家安静练习。' }] }],
        },
      },
      coverImage: { id: 20, url: 'https://cdn.example.com/cover.webp' },
      coverAlt: '',
      photos: [
        {
          id: 'row-2',
          image: { id: 21, url: 'https://cdn.example.com/sitting.webp' },
          caption: '静坐现场',
          alt: '',
        },
      ],
    }
    req.payload.findByID.mockResolvedValueOnce(zhDoc).mockRejectedValueOnce(new Error('Not found'))
    vi.mocked(generateImageAlts).mockResolvedValue([
      { key: 'cover', zh: '清迈学堂静坐现场', en: 'Sitting practice at the academy' },
      { key: 'photo-row-2', zh: '学员在室内安静静坐', en: 'Participants sit quietly indoors' },
    ])

    await autoGenerateJournalAltAfterChange({
      doc: { id: 4 },
      req,
      operation: 'create',
    } as any)

    expect(generateImageAlts).toHaveBeenCalledOnce()
    expect(req.payload.update).toHaveBeenCalledOnce()
    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'zh-CN',
        data: expect.objectContaining({
          coverAlt: '清迈学堂静坐现场',
          photos: [expect.objectContaining({ alt: '学员在室内安静静坐' })],
        }),
      }),
    )
  })

  it('short-circuits recursive updates', async () => {
    const req = makeReq()
    req.context = { skipAutoAlt: true }

    await autoGenerateJournalAltAfterChange({
      doc: { id: 3 },
      req,
      operation: 'update',
    } as any)

    expect(req.payload.findByID).not.toHaveBeenCalled()
    expect(generateImageAlts).not.toHaveBeenCalled()
  })
})
