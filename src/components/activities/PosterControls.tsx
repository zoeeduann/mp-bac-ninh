'use client'

import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { posterFilename } from '@/lib/poster-download'
import type { Locale } from '@/lib/i18n'

interface PosterControlsProps {
  /** The activity slug; used to name the downloaded file. */
  activitySlug: string
  /** ID of the DOM node to capture as the poster image. */
  targetId: string
  locale: Locale
}

type State = 'idle' | 'preparing' | 'done'

/**
 * Renders a "Download poster" button on the poster page and auto-triggers the
 * download when the URL has `?autodownload=1`. Captures `#${targetId}` as PNG
 * via html-to-image and offers it as a browser download.
 *
 * Deliberately rendered OUTSIDE the captured node so the button itself never
 * appears in the resulting image.
 */
export default function PosterControls({
  activitySlug,
  targetId,
  locale,
}: PosterControlsProps) {
  const isZh = locale === 'zh-CN'
  const [state, setState] = useState<State>('idle')
  const autoFired = useRef(false)

  async function capture() {
    if (typeof document === 'undefined') return
    setState('preparing')
    try {
      // Wait for web fonts so the captured PNG doesn't fall back to system
      // typefaces. document.fonts is widely supported and resolves once every
      // @font-face declaration the page references has finished loading.
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready
      }

      const node = document.getElementById(targetId)
      if (!node) return

      // Wait for every <img> inside the target to finish loading before we
      // ask html-to-image to snapshot the DOM. On mobile especially, the
      // hero image is the slowest asset; without this wait, the resulting
      // PNG comes back with a blank rectangle where the photo should be —
      // which is the "手机浏览器下载没有背景图" symptom reported.
      await waitForImagesLoaded(node)

      // Extra tick for Next/Image hydration / browser layout to settle.
      await new Promise((r) => setTimeout(r, 400))

      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#FAF7F2', // paper — matches the poster card background
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = posterFilename(activitySlug)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setState('done')
      setTimeout(() => setState('idle'), 2000)
    } catch (err) {
      console.error('[poster-download] capture failed:', err)
      setState('idle')
    }
  }

  /** Resolve once every <img> inside `root` has either fully loaded
   *  (`complete && naturalWidth > 0`) or errored — with a per-image timeout
   *  so a single broken asset never holds the capture hostage. */
  async function waitForImagesLoaded(root: HTMLElement): Promise<void> {
    const imgs = Array.from(root.querySelectorAll('img'))
    const PER_IMAGE_TIMEOUT_MS = 6000
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve()
              return
            }
            const done = () => {
              img.removeEventListener('load', done)
              img.removeEventListener('error', done)
              resolve()
            }
            img.addEventListener('load', done, { once: true })
            img.addEventListener('error', done, { once: true })
            setTimeout(done, PER_IMAGE_TIMEOUT_MS)
          }),
      ),
    )
  }

  // Auto-download when ?autodownload=1 — fires once per mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (autoFired.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('autodownload') === '1') {
      autoFired.current = true
      void capture()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const label =
    state === 'preparing'
      ? isZh
        ? '准备中…'
        : 'Preparing…'
      : state === 'done'
        ? isZh
          ? '已下载 ✓'
          : 'Downloaded ✓'
        : isZh
          ? '下载海报'
          : 'Download poster'

  return (
    <button
      type="button"
      onClick={capture}
      disabled={state === 'preparing'}
      className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink bg-sky rounded-full px-5 py-[0.55rem] cursor-pointer border-none transition-colors duration-150 hover:bg-blue-deep hover:text-paper disabled:opacity-60 disabled:cursor-default"
    >
      {label}
    </button>
  )
}
