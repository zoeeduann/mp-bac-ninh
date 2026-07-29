import Link from 'next/link'

/**
 * Sidebar link to the in-admin help page (rendered from
 * docs/admin-guide.md). Mounted via admin.components.afterNavLinks in
 * payload.config.ts so it sits below Payload's collection nav.
 */
export default function HelpNavLink() {
  return (
    <Link
      href="/admin/help"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        marginTop: 8,
        color: 'inherit',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 500,
        borderTop: '1px solid var(--theme-elevation-150, #ececec)',
        paddingTop: 16,
      }}
    >
      <span aria-hidden="true">📘</span>
      <span>使用说明</span>
    </Link>
  )
}
