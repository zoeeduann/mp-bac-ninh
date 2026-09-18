'use client'

import { useRef, useState } from 'react'
import type { Activity, Media } from '@/payload-types'
import { mediaCoverJob } from '@/lib/media-cover-state'

type Item = { id: number; title: string; location: string; media: Media }
const ready = (m: Media) => !!m.cardCover && mediaCoverJob(m.cardCoverJob)?.sourceFilename === m.filename

export default function MediaCoverBatch() {
  const [items, setItems] = useState<Item[]>([])
  const [location, setLocation] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const stop = useRef(false)
  async function refresh() {
    setError('')
    try {
      const response = await fetch('/api/activities?limit=500&depth=2&where[status][equals]=published', { cache: 'no-store' })
      if (!response.ok) throw new Error('无法加载活动图片。')
      const data = await response.json()
      const rows: Item[] = (data.docs as Activity[]).flatMap(a => {
        if (!a.heroImage || typeof a.heroImage !== 'object' || typeof a.location !== 'object') return []
        return [{ id: a.heroImage.id, title: a.title, location: a.location.slug, media: a.heroImage }]
      })
      setItems(rows); setLoaded(true)
      setLocation(value => value || (rows.some(r => r.location === 'bac-ninh') ? 'bac-ninh' : rows[0]?.location || ''))
    } catch (err) { setError(err instanceof Error ? err.message : '加载失败。') }
  }
  const selected = items.filter(i => location === 'all' || i.location === location)
  const pending = [...new Map(selected.filter(i => !ready(i.media)).map(i => [i.id, i])).values()]
  async function generate() {
    stop.current = false; setRunning(true); setError('')
    const queue = [...pending]
    let completed = 0
    try {
      while (queue.length && !stop.current) {
        const batch = queue.splice(0, 3)
        setProgress(`已完成 ${completed}/${pending.length}，正在生成：${batch.map(i => i.title).join('、')}`)
        const response = await fetch('/api/media/generate-covers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: batch.map(i => i.id) }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || '本批生成失败。')
        for (const result of data.results) {
          if (result.doc) setItems(rows => rows.map(row => row.id === result.id ? { ...row, media: result.doc } : row))
        }
        const failure = data.results.find((r: { status: string }) => !['ready', 'skipped'].includes(r.status))
        if (failure) throw new Error(failure.error || '部分图片未完成，请刷新查看后继续。')
        completed += batch.length
      }
      setProgress(stop.current ? '已暂停。已完成的图片已保存，可刷新后继续。' : `本次已完成 ${completed} 张。`)
    } catch (err) { setError(err instanceof Error ? err.message : '网络中断，请刷新查看后继续。') }
    finally { setRunning(false) }
  }
  return <details style={{ margin: '0 0 24px', padding: 20, border: '1px solid var(--theme-elevation-150)' }}>
    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>批量统一活动横版封面</summary>
    <p>使用原海报调用火山方舟豆包 Seedream 重新排版为 3:2 横版，突出主题和主要文字，移除二维码及日期、时间、地址等信息；活动信息由页面单独展示。已生成的封面会保留。</p>
    <button type="button" disabled={running} onClick={refresh}>加载 / 刷新活动图片</button>
    {loaded && <>
      <p><label>处理范围 <select value={location} onChange={e => setLocation(e.target.value)} disabled={running}>
        <option value="all">所有学堂</option>
        {[...new Set(items.map(i => i.location))].map(slug => <option key={slug} value={slug}>{{ chiangmai: '清迈', bangkok: '曼谷', 'bac-ninh': '北宁', phuket: '普吉' }[slug] || slug}</option>)}
      </select></label></p>
      <p>共 {selected.length} 个活动，待生成 {pending.length} 张。会将所选原海报发送给火山方舟豆包并产生图片生成费用，生成后自动用于网站卡片。请保持本页打开；关闭后可刷新继续。</p>
      <button type="button" disabled={running || !pending.length} onClick={generate}>生成此范围的 {pending.length} 张横版封面</button>
      {running && <button type="button" onClick={() => { stop.current = true; setProgress('本批完成后暂停…') }}>本批完成后暂停</button>}
      <p role="status">{progress}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {selected.map(item => {
          const cover = typeof item.media.cardCover === 'object' ? item.media.cardCover : null
          return <div key={`${item.location}-${item.id}`}>
            {cover?.url && <img src={cover.url} alt={`${item.title} 横版封面`} style={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'contain' }} />}
            <a href={`/admin/collections/media/${item.id}`} target="_blank" rel="noreferrer">{item.title}</a>
            <div>{ready(item.media) ? '已完成' : mediaCoverJob(item.media.cardCoverJob)?.status === 'failed' ? '生成失败，可继续重试' : '待生成'}</div>
          </div>
        })}
      </div>
    </>}
    {error && <p role="alert">{error}</p>}
  </details>
}
