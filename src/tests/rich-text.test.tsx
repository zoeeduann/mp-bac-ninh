import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { RichText } from '@/components/RichText'

function makeLexical(children: any[]) {
  return {
    root: {
      type: 'root',
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

describe('RichText', () => {
  it('renders nothing when data is null', () => {
    const { container } = render(<RichText data={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a plain paragraph', () => {
    const data = makeLexical([
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: 'Hello world', format: 0, version: 1 }],
      },
    ])
    const { container } = render(<RichText data={data} />)
    expect(container.querySelector('p')?.textContent).toBe('Hello world')
  })

  it('renders bold text (format & 1)', () => {
    const data = makeLexical([
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: 'Bold', format: 1, version: 1 }],
      },
    ])
    const { container } = render(<RichText data={data} />)
    expect(container.querySelector('strong')?.textContent).toBe('Bold')
  })

  it('renders italic text (format & 2)', () => {
    const data = makeLexical([
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: 'Italic', format: 2, version: 1 }],
      },
    ])
    const { container } = render(<RichText data={data} />)
    expect(container.querySelector('em')?.textContent).toBe('Italic')
  })

  it('renders underline text (format & 8)', () => {
    const data = makeLexical([
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: 'Under', format: 8, version: 1 }],
      },
    ])
    const { container } = render(<RichText data={data} />)
    expect(container.querySelector('u')?.textContent).toBe('Under')
  })

  it('renders a heading', () => {
    const data = makeLexical([
      {
        type: 'heading',
        tag: 'h2',
        version: 1,
        children: [{ type: 'text', text: 'Title', format: 0, version: 1 }],
      },
    ])
    const { container } = render(<RichText data={data} />)
    expect(container.querySelector('h2')?.textContent).toBe('Title')
  })

  it('renders an unordered list', () => {
    const data = makeLexical([
      {
        type: 'list',
        listType: 'bullet',
        version: 1,
        children: [
          {
            type: 'listitem',
            version: 1,
            children: [{ type: 'text', text: 'Item 1', format: 0, version: 1 }],
          },
        ],
      },
    ])
    const { container } = render(<RichText data={data} />)
    expect(container.querySelector('ul')).not.toBeNull()
    expect(container.querySelector('li')?.textContent).toBe('Item 1')
  })

  it('applies custom className to wrapper div', () => {
    const data = makeLexical([
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: 'hi', format: 0, version: 1 }],
      },
    ])
    const { container } = render(<RichText data={data} className="prose" />)
    expect(container.firstElementChild?.classList.contains('prose')).toBe(true)
  })
})
