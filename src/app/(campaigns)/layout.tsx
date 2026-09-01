import React, { type ReactNode } from 'react'
import Script from 'next/script'
import '../../styles/tokens.css'
import '../../styles/campaign.css'
import { GOOGLE_ANALYTICS_ID } from '@/lib/site-config'

export default function CampaignLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="campaign-body">
        {GOOGLE_ANALYTICS_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics-campaign" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GOOGLE_ANALYTICS_ID}', {
                  allow_google_signals: false,
                  allow_ad_personalization_signals: false
                });
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  )
}
