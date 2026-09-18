'use client'
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

interface PlacementData {
  master: { url?: string; width?: number; height?: number }
  thumbnail?: { url?: string }
  isGenerated: boolean
  activities: { id: number; title: string; card: string | null; hero: string | null; share?: string }[]
  note: string
}

/** A placement-first replacement for Payload's technical size drawer. */
export default function MediaPlacements() {
  const { id } = useDocumentInfo()
  const dialog = useRef<HTMLDialogElement>(null)
  const [data, setData] = useState<PlacementData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function open() {
    dialog.current?.showModal()
    setData(null); setError(''); setLoading(true)
    try {
      const response = await fetch(`/api/media/${id}/placements`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '暂时无法加载预览。')
      setData(result)
    } catch (e) { setError(e instanceof Error ? e.message : '暂时无法加载预览。') }
    finally { setLoading(false) }
  }
  return <>
    <button type="button" className="media-placements-trigger" onClick={open} disabled={!id}>查看版位与尺寸</button>
    <dialog ref={dialog} className="media-placements" aria-label="图片版位与尺寸">
      <header><h2>版位与尺寸</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="关闭版位预览">关闭 ×</button></header>
      {loading && <p role="status">正在读取实际引用…</p>}
      {error && <p role="alert">{error}</p>}
      {data && <>
        <p>同一构图按清晰度缩放；分享预览单独排版。无需为每个尺寸重复生图。</p>
        {data.activities.map(a => <section key={a.id}>
          <h3>{a.title}</h3>
          <a href={`/admin/collections/activities/${a.id}`}>编辑活动</a>
          <Preview title="活动卡片" url={a.card} description="3:2 · 720×480 · 用于活动列表、首页活动推荐与相关活动" />
          <Preview title="详情封面 / 下载海报配图" url={a.hero} description="3:2 · 共用高清设计母版，完整展示，不重复生成同尺寸文件" />
          <Preview title="链接分享预览" url={a.share} description="1200×630 · 画面与活动标题独立排版，自动跟随活动更新" />
        </section>)}
        {!data.activities.length && <p>没有已发布活动将此媒体关联为封面。</p>}
        <details><summary>{data.isGenerated ? '设计母版与后台缩略图' : '后台素材与缩略图'}</summary>
          <Preview title={data.isGenerated ? '设计母版' : '上传素材'} url={data.master.url}
            description={`${data.master.width ?? '—'}×${data.master.height ?? '—'} · ${data.isGenerated ? '供前台按版位使用' : '活动原海报仅用于后台生成，不在前台展示'}`} />
          <Preview title="后台缩略图" url={data.thumbnail?.url} description="240×240 · 仅用于媒体库中快速找图，自动缩略" />
        </details>
        <p className="media-placements-note">{data.note}旧版裁切文件保留兼容，不代表仍在使用。</p>
      </>}
    </dialog>
  </>
}

function Preview({ title, url, description }: { title: string; url?: string | null; description: string }) {
  return <div className="media-placement-preview"><h4>{title}</h4><p>{description}</p>
    {url ? <><img src={url} alt={`${title}预览`} loading="lazy" /><a href={url} target="_blank" rel="noreferrer">打开图片</a></>
      : <p>尚未生成可用的横版封面，前台不会回退展示原海报。</p>}
  </div>
}
