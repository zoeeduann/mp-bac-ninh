'use client'

import React from 'react'
import { locationPath } from '@/lib/site-config'

export default function CampaignError({ reset }: { reset: () => void }) {
  return (
    <main className="campaign campaign-section" role="alert">
      <p className="campaign-eyebrow">越南北宁 · 善明小院</p>
      <h1 style={{ whiteSpace: 'normal', fontSize: '32px' }}>暂时未能加载小院资料</h1>
      <p>请稍后重试，也可以前往小院官网了解活动与课程。</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '24px' }}>
        <button className="campaign-button" onClick={reset}>
          重新加载
        </button>
        <a
          className="campaign-button campaign-button-outline"
          href={locationPath('zh-CN', 'bac-ninh')}
        >
          前往小院官网 ↗
        </a>
      </div>
    </main>
  )
}
