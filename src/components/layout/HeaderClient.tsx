'use client'

import { useState } from 'react'
import MobileMenuButton from './MobileMenuButton'
import MobileNav from './MobileNav'
import type { Locale } from '@/lib/i18n'

interface NavItem {
  label: string
  href: string
}

interface HeaderClientProps {
  locale: Locale
  navItems: NavItem[]
  locationSlug: string | null
  showVietnamese?: boolean
}

export default function HeaderClient({
  locale,
  navItems,
  locationSlug,
  showVietnamese = false,
}: HeaderClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <MobileMenuButton onClick={() => setMobileOpen(true)} />
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        locale={locale}
        navItems={navItems}
        locationSlug={locationSlug}
        showVietnamese={showVietnamese}
      />
    </>
  )
}
