// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { generateLandscapeCover, LANDSCAPE_COVER_PROMPT } from '@/lib/generate-landscape-cover'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

const ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations'

const portrait = () => sharp({ create: { width: 60, height: 90, channels: 3, background: 'white' } }).png().toBuffer()
const landscape = () => sharp({ create: { width: 900, height: 600, channels: 3, background: 'white' } }).png().toBuffer()

const sent = (mock: ReturnType<typeof vi.fn>) =>
  JSON.parse((mock.mock.calls[0]![1] as RequestInit).body as string)

async function stubImage() {
  const mock = vi.fn().mockResolvedValue(Response.json({ data: [{ b64_json: (await landscape()).toString('base64') }] }))
  vi.stubGlobal('fetch', mock)
  return mock
}

it('sends the original as an edit reference and requests an unwatermarked 3:2 cover', async () => {
  vi.stubEnv('ARK_API_KEY', 'ark-test')
  const mock = await stubImage()
  const result = await generateLandscapeCover(await portrait())
  expect(mock.mock.calls[0]![0]).toBe(ENDPOINT)
  expect((mock.mock.calls[0]![1] as RequestInit & { headers: Record<string, string> }).headers.Authorization)
    .toBe('Bearer ark-test')
  const body = sent(mock)
  expect(body.model).toBe('doubao-seedream-5-0-pro-260628')
  expect(body.size).toBe('1536x1024')
  expect(body.watermark).toBe(false)
  expect(body.response_format).toBe('b64_json')
  expect(body.n).toBe(1)
  // Input needs the data: prefix with a lowercase mime; the reply does not.
  expect(body.image).toMatch(/^data:image\/png;base64,.+/)
  expect(body.prompt).toBe(LANDSCAPE_COVER_PROMPT)
  expect(LANDSCAPE_COVER_PROMPT).toContain('Remove QR codes')
  expect((await sharp(result).metadata()).width).toBe(900)
})

it('keeps the prompt inside the 600-word service limit', () => {
  expect(LANDSCAPE_COVER_PROMPT.trim().split(/\s+/).length).toBeLessThan(600)
})

it('honours an overridden host and model', async () => {
  vi.stubEnv('ARK_API_KEY', 'ark-test')
  vi.stubEnv('ARK_BASE_URL', 'https://ark.ap-southeast.volces.com/api/v3/images/generations')
  vi.stubEnv('ARK_IMAGE_MODEL', 'doubao-seedream-4-0-250828')
  const mock = await stubImage()
  await generateLandscapeCover(await portrait())
  expect(mock.mock.calls[0]![0]).toBe('https://ark.ap-southeast.volces.com/api/v3/images/generations')
  expect(sent(mock).model).toBe('doubao-seedream-4-0-250828')
})

it('reports a refusal when the reply carries no image', async () => {
  vi.stubEnv('ARK_API_KEY', 'ark-test')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: [{ url: 'https://example.com/x.png' }] })))
  await expect(generateLandscapeCover(await portrait())).rejects.toThrow('内容审核')
})

it('surfaces the service code and message without echoing the reply body', async () => {
  vi.stubEnv('ARK_API_KEY', 'ark-test')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    Response.json({ error: { code: 'SensitiveContentDetected', message: 'Request blocked by content review.' } }, { status: 400 }),
  ))
  await expect(generateLandscapeCover(await portrait()))
    .rejects.toThrow(/400.*SensitiveContentDetected.*content review/s)
})

it('rejects a result that is not a landscape cover', async () => {
  vi.stubEnv('ARK_API_KEY', 'ark-test')
  const square = await sharp({ create: { width: 600, height: 600, channels: 3, background: 'white' } }).png().toBuffer()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: [{ b64_json: square.toString('base64') }] })))
  await expect(generateLandscapeCover(await portrait())).rejects.toThrow('不是横版封面')
})

it('does not request generation without configuration', async () => {
  vi.stubEnv('ARK_API_KEY', '')
  const mock = vi.fn(); vi.stubGlobal('fetch', mock)
  await expect(generateLandscapeCover(Buffer.from('x'))).rejects.toThrow('ARK_API_KEY')
  expect(mock).not.toHaveBeenCalled()
})

it('retries a dropped connection once and records the network cause', async () => {
  vi.stubEnv('ARK_API_KEY', 'ark-test')
  const dropped = () => new TypeError('fetch failed', { cause: Object.assign(new Error('other side closed'), { code: 'UND_ERR_SOCKET' }) })
  const recovered = vi.fn()
    .mockRejectedValueOnce(dropped())
    .mockResolvedValueOnce(Response.json({ data: [{ b64_json: (await landscape()).toString('base64') }] }))
  vi.stubGlobal('fetch', recovered)
  // Skip the back-off pause between the two attempts.
  vi.stubGlobal('setTimeout', (resolve: () => void) => { resolve(); return 0 })
  const result = await generateLandscapeCover(await portrait())
  expect((await sharp(result).metadata()).width).toBe(900)
  expect(recovered).toHaveBeenCalledTimes(2)

  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(dropped()))
  await expect(generateLandscapeCover(await portrait()))
    .rejects.toThrow('无法连接图片生成服务（UND_ERR_SOCKET other side closed），请稍后重试。')
})
