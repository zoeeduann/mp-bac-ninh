import fs from 'node:fs'
import path from 'node:path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'

/**
 * Renders `docs/admin-guide.md` inside the Payload admin chrome at
 * `/admin/help`. The doc lives in the repo as the single source of truth so
 * editors and developers see the same content; this view just re-renders it
 * with markdown styling.
 */
export default function HelpView() {
  let md = ''
  try {
    md = fs.readFileSync(
      path.join(process.cwd(), 'docs/admin-guide.md'),
      'utf-8',
    )
  } catch {
    md = '# 文档暂时无法加载\n\n请联系系统管理员。'
  }

  return (
    <div
      style={{
        maxWidth: 840,
        margin: '0 auto',
        padding: '40px 32px 80px',
        lineHeight: 1.75,
        color: 'var(--theme-elevation-1000, #1a1a1a)',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", "Noto Sans SC", sans-serif',
      }}
      className="admin-help-view"
    >
      {/* rehype-slug auto-generates an id="..." on every heading from the
          heading text — matches GitHub's anchor convention so the TOC
          links (#1-登录后台 etc) work. */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
      >
        {md}
      </ReactMarkdown>
      {/* Scoped styles — Payload admin doesn't ship Tailwind/Prose, so we
          inline enough rules to make markdown readable in its chrome. */}
      <style>{`
        /* scroll-margin-top: TOC links land the heading below Payload's
           sticky top bar (~56px), not under it. */
        .admin-help-view h1,
        .admin-help-view h2,
        .admin-help-view h3,
        .admin-help-view h4 {
          scroll-margin-top: 72px;
        }
        .admin-help-view h1 {
          font-size: 28px;
          font-weight: 600;
          margin: 0 0 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--theme-elevation-200, #e3e3e3);
        }
        .admin-help-view h2 {
          font-size: 22px;
          font-weight: 600;
          margin: 40px 0 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--theme-elevation-150, #ececec);
        }
        .admin-help-view h3 {
          font-size: 17px;
          font-weight: 600;
          margin: 28px 0 12px;
        }
        .admin-help-view h4 {
          font-size: 15px;
          font-weight: 600;
          margin: 20px 0 8px;
        }
        .admin-help-view p {
          margin: 0 0 14px;
        }
        .admin-help-view ul, .admin-help-view ol {
          margin: 0 0 14px;
          padding-left: 1.4em;
        }
        .admin-help-view li {
          margin: 4px 0;
        }
        .admin-help-view li > p {
          margin: 4px 0;
        }
        .admin-help-view code {
          background: var(--theme-elevation-100, #f4f4f4);
          padding: 1px 6px;
          border-radius: 4px;
          font-family: "SF Mono", "Menlo", monospace;
          font-size: 0.92em;
        }
        .admin-help-view pre {
          background: var(--theme-elevation-100, #f4f4f4);
          padding: 14px 16px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 0 0 14px;
        }
        .admin-help-view pre code {
          background: transparent;
          padding: 0;
        }
        .admin-help-view blockquote {
          border-left: 3px solid var(--theme-elevation-300, #d0d0d0);
          margin: 0 0 14px;
          padding: 4px 16px;
          color: var(--theme-elevation-700, #555);
          font-style: italic;
        }
        .admin-help-view a {
          color: var(--theme-success-500, #3473ce);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .admin-help-view a:hover {
          color: var(--theme-success-700, #1c4f9c);
        }
        .admin-help-view table {
          border-collapse: collapse;
          margin: 0 0 18px;
          width: 100%;
        }
        .admin-help-view table th,
        .admin-help-view table td {
          border: 1px solid var(--theme-elevation-200, #e3e3e3);
          padding: 8px 12px;
          text-align: left;
          vertical-align: top;
        }
        .admin-help-view table th {
          background: var(--theme-elevation-100, #f4f4f4);
          font-weight: 600;
        }
        .admin-help-view hr {
          border: 0;
          border-top: 1px solid var(--theme-elevation-200, #e3e3e3);
          margin: 32px 0;
        }
        .admin-help-view strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
