import { editorContent } from '../src/lib/page-content'

describe('legacy page content', () => {
  it('keeps plain text and script-like text as escaped editor text nodes', () => {
    expect(editorContent('Hello\n<script>alert(1)</script>')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] },
      ],
    })
  })
  it('preserves editor HTML for schema-based parsing', () => {
    expect(editorContent('<h2>Title</h2><p>Text</p>')).toBe('<h2>Title</h2><p>Text</p>')
  })
  it('creates an editable empty paragraph for a blank page', () => {
    expect(editorContent('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })
  it('recognizes serialized Tiptap documents without flattening marks or tables', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Legacy', marks: [{ type: 'bold' }] }],
        },
      ],
    }
    expect(editorContent(JSON.stringify(doc))).toEqual(doc)
  })
  it.each(['{"hello":"world"}', '{"type":"doc","content":"wrong"}', '{broken'])(
    'keeps non-document JSON literal: %s',
    (text) => {
      expect(editorContent(text).content[0].content[0].text).toBe(text)
    },
  )
  it('recognizes image-only HTML', () => {
    expect(editorContent('<img src="/uploads/image.webp">')).toBe('<img src="/uploads/image.webp">')
  })
})
