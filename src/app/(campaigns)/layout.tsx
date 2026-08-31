import type { ReactNode } from 'react'
import '../../styles/tokens.css'
import '../../styles/campaign.css'

export default function CampaignLayout({ children }: { children: ReactNode }) {
  // Deliberately no remarketing tags, audience creation, or contact analytics.
  return (
    <html lang="zh-CN">
      <body className="campaign-body">{children}</body>
    </html>
  )
}
