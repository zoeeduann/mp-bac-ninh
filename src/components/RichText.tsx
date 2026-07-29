import React from 'react'

export type LexicalNode = {
  type: string
  children?: LexicalNode[]
  text?: string
  format?: number | string
  tag?: string
  listType?: string
  fields?: { url?: string }
  [k: string]: unknown
}

export function RichText({ data, className }: { data: any; className?: string }) {
  if (!data?.root?.children) return null
  return (
    <div className={className}>
      {(data.root.children as LexicalNode[]).map((node, i) => renderNode(node, i))}
    </div>
  )
}

export function renderNode(node: LexicalNode, key: number | string): React.ReactNode {
  if (node.type === 'paragraph') {
    return (
      <p key={key} className="mb-4 last:mb-0">
        {node.children?.map((c, i) => renderNode(c, i))}
      </p>
    )
  }
  if (node.type === 'heading') {
    const Tag = (node.tag || 'h3') as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    return (
      <Tag key={key} className="font-serif mb-3">
        {node.children?.map((c, i) => renderNode(c, i))}
      </Tag>
    )
  }
  if (node.type === 'list') {
    const Tag = node.listType === 'number' ? 'ol' : 'ul'
    return (
      <Tag key={key} className="list-disc pl-6 mb-4">
        {node.children?.map((c, i) => renderNode(c, i))}
      </Tag>
    )
  }
  if (node.type === 'listitem') {
    return <li key={key}>{node.children?.map((c, i) => renderNode(c, i))}</li>
  }
  if (node.type === 'link') {
    return (
      <a key={key} href={node.fields?.url || '#'} className="text-sky underline">
        {node.children?.map((c, i) => renderNode(c, i))}
      </a>
    )
  }
  if (node.type === 'text') {
    let text: React.ReactNode = node.text || ''
    const f = (node.format as number) || 0
    if (f & 1) text = <strong key="b">{text}</strong>
    if (f & 2) text = <em key="i">{text}</em>
    if (f & 8) text = <u key="u">{text}</u>
    return <span key={key}>{text}</span>
  }
  // linebreak
  if (node.type === 'linebreak') {
    return <br key={key} />
  }
  return null
}
