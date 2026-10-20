// Read-only regression checks against a running production server.
// Usage: node scripts/check-public-route-cache.mjs http://localhost:3120 [activity-slug]
import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://localhost:3120'
const activitySlug = process.argv[3] || 'dhyana-tea-reading-circle'
const paths = ['/', '/about', '/contact', '/journal']
let checks = 0

async function read(path, options = {}) {
  const start = performance.now()
  const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(20000), ...options })
  const ttfb = Math.round(performance.now() - start)
  const html = await response.text()
  return { response, html, ttfb }
}

function assertPublicHtml(path, html, locale) {
  assert.ok(html.includes(`lang="${locale}"`), `${path}: wrong language`)
  assert.ok(!html.includes('Application error'), `${path}: render error`)
  assert.ok(!/href="\/(?:zh-CN|bac-ninh)(?:[/?"])/.test(html), `${path}: internal URL leaked`)
}

for (const locale of ['zh-CN', 'en']) {
  for (const path of paths) {
    const publicPath = locale === 'en' ? `/en${path === '/' ? '' : path}` : path
    const { response, html, ttfb } = await read(publicPath)
    assert.equal(response.status, 200, publicPath)
    assertPublicHtml(publicPath, html, locale)
    assert.ok(
      response.headers.has('x-nextjs-cache') || response.headers.get('x-nextjs-prerender') === '1',
      `${publicPath}: missing ISR evidence`,
    )
    assert.doesNotMatch(response.headers.get('cache-control') || '', /no-store/, `${publicPath}: not cacheable`)
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)
    assert.ok(canonical, `${publicPath}: missing canonical`)
    assert.equal(new URL(canonical[1]).pathname, publicPath, `${publicPath}: canonical changed`)
    assert.ok(html.includes('hrefLang="en"') || html.includes('hreflang="en"'), `${publicPath}: hreflang missing`)
    console.log(`${response.status} ${publicPath} ISR ${ttfb}ms`)
    checks++
  }
}

const vi = await read('/vi')
assert.equal(vi.response.status, 200, '/vi')
assert.ok(vi.html.includes('lang="vi"'), '/vi: wrong language')
checks++

for (const [path, locale] of [
  ['/activities', 'zh-CN'],
  ['/en/activities?view=calendar', 'en'],
  ['/book?utm_source=google', 'zh-CN'],
  [`/activities/${activitySlug}?src=shared_link`, 'zh-CN'],
  [`/en/activities/${activitySlug}`, 'en'],
]) {
  const { response, html } = await read(path)
  assert.equal(response.status, 200, path)
  assertPublicHtml(path, html, locale)
  assert.match(response.headers.get('cache-control') || '', /no-store/, `${path}: must stay dynamic`)
  checks++
}

for (const [from, to] of [
  ['/zh-CN/about?utm_source=google', '/about?utm_source=google'],
  ['/zh-CN', '/'],
  ['/bac-ninh/contact', '/contact'],
  ['/zh-CN/bac-ninh/journal', '/journal'],
  ['/en/bac-ninh', '/en'],
  ['/activities/mindful-tea-reading', '/activities/dhyana-tea-reading-circle'],
  ['/en/activities/health-circle', '/en/activities/healthy-circulation-cycle'],
]) {
  const { response } = await read(from)
  assert.equal(response.status, 308, from)
  const location = new URL(response.headers.get('location'), base)
  assert.equal(location.pathname + location.search, to, from)
  checks++
}

for (const path of ['/nonexistent-page', '/en/nonexistent-page', '/activities/nonexistent-activity']) {
  const { response } = await read(path)
  assert.equal(response.status, 404, path)
  checks++
}

console.log(`Passed ${checks} read-only production route checks.`)
