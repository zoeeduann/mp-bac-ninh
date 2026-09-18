'use client'

import { useEffect, useState } from 'react'
import MediaPlacements from './MediaPlacements'
import { useDocumentInfo, useFormModified } from '@payloadcms/ui'
import type { Media } from '@/payload-types'
import { coverJobIsBusy, mediaCoverJob } from '@/lib/media-cover-state'

export default function MediaCoverGenerator() {
  const { id, data } = useDocumentInfo()
  const modified = useFormModified()
  const [media, setMedia] = useState<Media | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => { setMedia(data as Media || null); setError('') }, [id, data])
  const job = mediaCoverJob(media?.cardCoverJob)
  const busy = running || coverJobIsBusy(job)
  const cover = media?.cardCover && typeof media.cardCover === 'object' ? media.cardCover : null

  useEffect(() => {
    if (!id || !busy) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/media/${id}?depth=1`, { cache: 'no-store' })
        if (response.ok && !cancelled) setMedia(await response.json())
      } catch { /* A transient poll failure should not interrupt generation. */ }
      if (!cancelled) setTick(value => value + 1)
    }, 3000)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [id, busy, tick])

  async function generate() {
    if (!id || modified || busy) return
    setRunning(true); setError('')
    try {
      const response = await fetch(`/api/media/${id}/generate-cover`, { method: 'POST' })
      const result = await response.json()
      if (result.doc) setMedia(result.doc)
      if (!response.ok) throw new Error(result.error || '生成失败，请稍后重试。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试。')
    } finally { setRunning(false) }
  }

  return (
    <section style={{ marginBottom: 28 }}>
      <MediaPlacements />
      <h3>自动横版封面</h3>
      <p>竖版图片保存后自动重排为横版封面，保留主题和主要文字，去掉二维码。活动列表与详情共用 3:2 横版构图；链接分享预览按 1200×630 单独排版，原图只保留为后台生成素材。</p>
      {cover?.url && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover.url} alt="生成的横版封面预览" style={{ display: 'block', width: '100%', maxWidth: 540, height: 'auto', marginBottom: 12 }} />
        <p>此封面已用于活动卡片。请核对主要文字；不满意可重新生成。</p>
      </>}
      {!id || modified ? <p>请先保存图片，再生成或重新生成封面。</p> : null}
      <p role="status" aria-live="polite">
        {busy ? '正在生成横版封面，通常需要几分钟；可以继续编辑其他内容。'
          : job?.status === 'unconfigured' ? '图片生成服务尚未配置，请联系管理员设置 ARK_API_KEY。'
          : job?.status === 'failed' ? job.error || '生成失败，可以重试。'
          : job?.status === 'queued' || job?.status === 'processing' ? '上次生成未完成，可以重试。' : ''}
      </p>
      <button type="button" onClick={generate} disabled={!id || modified || busy}
        style={{ padding: '10px 16px', cursor: busy ? 'wait' : 'pointer' }}>
        {busy ? '生成中…' : cover ? '重新生成横版封面' : '生成横版封面'}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
