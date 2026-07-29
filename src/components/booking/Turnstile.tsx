'use client'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void }) => string
      remove: (id: string) => void
    }
  }
}

interface Props {
  onToken: (token: string) => void
  siteKey: string
}

export default function Turnstile({ onToken, siteKey }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const renderedId = useRef<string | null>(null)

  useEffect(() => {
    if (!siteKey) {
      // Dev mode — no site key configured; auto-supply a dummy token
      onToken('dev-bypass')
      return
    }

    function render() {
      if (!ref.current || !window.turnstile || renderedId.current) return
      renderedId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (t: string) => onToken(t),
      })
    }

    if (window.turnstile) {
      render()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = () => render()
    document.head.appendChild(script)

    return () => {
      if (renderedId.current && window.turnstile) {
        try {
          window.turnstile.remove(renderedId.current)
        } catch {
          // ignore
        }
      }
    }
  }, [onToken, siteKey])

  if (!siteKey) return null
  return <div ref={ref} />
}
