import React from 'react'
import { ImageResponse } from 'next/og'
import { shareSafeText } from './activity-share'

export function renderActivityShare({ title, academy, domain, image, font }: {
  title: string; academy: string; domain: string; image: string; font: ArrayBuffer
}) {
  const clean = shareSafeText(title.trim())
  const characters = Array.from(clean)
  const heading = characters.length > 100 ? characters.slice(0, 99).join('') + '…' : clean
  const fontSize = characters.length > 64 ? 28 : characters.length > 40 ? 34 : characters.length > 24 ? 40 : 48
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', padding: '63px 36px', gap: 32,
      background: '#F7F5F0', color: '#2A2A33', fontFamily: 'ShareSans' }}>
      {/* Full 3:2 artwork, with no crop or stretched subjects. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" width={756} height={504} style={{ objectFit: 'contain', borderRadius: 12 }} />
      <div style={{ display: 'flex', width: 340, height: 504, flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', fontSize: 23, color: '#1C76A6', lineHeight: 1.4 }}>{shareSafeText(academy)}</div>
        <div style={{ display: 'flex', fontSize, lineHeight: 1.24, wordBreak: 'break-word' }}>{heading}</div>
        <div style={{ display: 'flex', fontSize: 18, color: '#928178' }}>{domain}</div>
      </div>
    </div>,
    { width: 1200, height: 630, fonts: [{ name: 'ShareSans', data: font, weight: 400, style: 'normal' }] },
  )
}
