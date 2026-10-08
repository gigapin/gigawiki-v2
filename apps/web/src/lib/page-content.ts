/** Keep legacy plain text as text nodes, never interpret it as editor markup. */
export function editorContent(content: string) {
  if (/^\s*<(?:p|h[1-6]|ul|ol|blockquote|pre|table|div)(?:\s|>)/i.test(content)) return content
  return {
    type: 'doc',
    content: content.split(/\r?\n/).map((text) => ({
      type: 'paragraph',
      ...(text ? { content: [{ type: 'text', text }] } : {}),
    })),
  }
}
