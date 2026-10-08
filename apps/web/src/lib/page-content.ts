import type { JSONContent } from '@tiptap/react'

/** Recognize serialized Tiptap documents; keep other JSON and plain text literal. */
export function editorContent(content: string) {
  try {
    const parsed: unknown = JSON.parse(content)
    if (isDocument(parsed)) return parsed
  } catch {
    // HTML and plain text are also supported.
  }
  if (/^\s*<(?:p|h[1-6]|ul|ol|blockquote|pre|table|div|img|hr)(?:\s|\/?>)/i.test(content))
    return content
  return {
    type: 'doc',
    content: content.split(/\r?\n/).map((text) => ({
      type: 'paragraph',
      ...(text ? { content: [{ type: 'text', text }] } : {}),
    })),
  }
}

function isDocument(value: unknown): value is JSONContent {
  if (!value || typeof value !== 'object') return false
  const node = value as JSONContent
  return node.type === 'doc' && Array.isArray(node.content) && node.content.every(isNode)
}

function isNode(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const node = value as JSONContent
  return (
    typeof node.type === 'string' &&
    (node.type !== 'text' || typeof node.text === 'string') &&
    (node.content === undefined || (Array.isArray(node.content) && node.content.every(isNode)))
  )
}
