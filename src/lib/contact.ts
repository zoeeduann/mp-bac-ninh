/**
 * Real, tappable contact channels for a location. Only fields that actually
 * hold a value are returned; nothing is ever fabricated (no placeholder
 * WeChat IDs, no guessed numbers).
 */

export type ContactLocale = 'zh-CN' | 'en' | 'vi'

export type ContactMethod =
  | 'phone'
  | 'whatsapp'
  | 'zalo'
  | 'wechat'
  | 'email'
  | 'facebook'
  | 'instagram'
  | 'social'

export interface ContactSource {
  email?: string | null
  phone?: string | null
  wechatId?: string | null
  whatsapp?: string | null
  social?: { label?: string | null; url?: string | null }[] | null
}

export interface ContactChannel {
  method: ContactMethod
  label: string
  /** Text shown to the visitor. */
  value: string
  /** Link target; absent for WeChat (copy-to-clipboard instead). */
  href?: string
  external?: boolean
}

const LABELS: Record<ContactLocale, Record<ContactMethod, string>> = {
  'zh-CN': {
    phone: '电话',
    whatsapp: 'WhatsApp',
    zalo: 'Zalo',
    wechat: '微信号',
    email: '邮箱',
    facebook: 'Facebook',
    instagram: 'Instagram',
    social: '社交媒体',
  },
  en: {
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    zalo: 'Zalo',
    wechat: 'WeChat',
    email: 'Email',
    facebook: 'Facebook',
    instagram: 'Instagram',
    social: 'Social',
  },
  vi: {
    phone: 'Điện thoại',
    whatsapp: 'WhatsApp',
    zalo: 'Zalo',
    wechat: 'WeChat',
    email: 'Email',
    facebook: 'Facebook',
    instagram: 'Instagram',
    social: 'Mạng xã hội',
  },
}

export function contactLabel(locale: ContactLocale, method: ContactMethod): string {
  return LABELS[locale][method]
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function whatsappHref(value: string): string {
  if (/^https?:\/\//i.test(value)) return value
  return `https://wa.me/${value.replace(/[^\d]/g, '')}`
}

/** Zalo links: a full URL is kept; a phone number becomes zalo.me/<digits>. */
export function zaloHref(value: string): string | null {
  if (/^https?:\/\//i.test(value)) return value
  const digits = value.replace(/[^\d]/g, '')
  return digits.length >= 8 ? `https://zalo.me/${digits}` : null
}

export function socialMethod(link: { label?: string | null; url?: string | null }): ContactMethod {
  const identity = `${link.label ?? ''} ${link.url ?? ''}`.toLowerCase()
  if (identity.includes('zalo')) return 'zalo'
  if (identity.includes('facebook') || identity.includes('fb.com')) return 'facebook'
  if (identity.includes('instagram')) return 'instagram'
  return 'social'
}

/** "https://www.facebook.com/mindfulpeaceshanming/" → "facebook.com/mindfulpeaceshanming". */
export function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`
  } catch {
    return url
  }
}

function socialDisplay(label: string, url: string, method: ContactMethod): string {
  // A label that merely names the network ("Facebook") would repeat the row
  // label, so show where the link goes instead.
  if (label && label.toLowerCase() !== method) return label
  return shortUrl(url)
}

export function contactChannels(source: ContactSource, locale: ContactLocale): ContactChannel[] {
  const out: ContactChannel[] = []
  const phone = clean(source.phone)
  const whatsapp = clean(source.whatsapp)
  const wechat = clean(source.wechatId)
  const email = clean(source.email)

  if (phone) out.push({ method: 'phone', label: contactLabel(locale, 'phone'), value: phone, href: telHref(phone) })
  if (whatsapp) {
    out.push({
      method: 'whatsapp',
      label: contactLabel(locale, 'whatsapp'),
      value: whatsapp,
      href: whatsappHref(whatsapp),
      external: true,
    })
  }

  for (const link of source.social ?? []) {
    const url = clean(link.url)
    const label = clean(link.label)
    if (!url) continue
    const method = socialMethod(link)
    if (method === 'zalo') {
      const href = zaloHref(url)
      if (!href) continue
      const isUrl = /^https?:\/\//i.test(url)
      out.push({
        method,
        label: contactLabel(locale, 'zalo'),
        value: isUrl ? socialDisplay(label, url, 'zalo') : url,
        href,
        external: true,
      })
      continue
    }
    if (!/^https?:\/\//i.test(url)) continue
    out.push({
      method,
      label: contactLabel(locale, method),
      value: socialDisplay(label, url, method),
      href: url,
      external: true,
    })
  }

  if (wechat) out.push({ method: 'wechat', label: contactLabel(locale, 'wechat'), value: wechat })
  if (email) out.push({ method: 'email', label: contactLabel(locale, 'email'), value: email, href: `mailto:${email}` })
  return out
}
