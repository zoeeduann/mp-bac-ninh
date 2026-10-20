import type { ReactNode } from 'react'
import { LOCATION_SLUGS } from '@/lib/current-location'
import { SITE_LOCATION_SLUG } from '@/lib/site-config'

// Declare the location segment so landing pages can enter the Full Route
// Cache. A single-location deployment only serves its own academy. Pages that
// read searchParams or show live seat counts stay dynamic.
export function generateStaticParams() {
  return (SITE_LOCATION_SLUG ? [SITE_LOCATION_SLUG] : LOCATION_SLUGS).map((loc) => ({ loc }))
}

export default function LocationLayout({ children }: { children: ReactNode }) {
  return children
}
