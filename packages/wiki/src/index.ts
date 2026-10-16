import { getSchema, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Mention from '@tiptap/extension-mention'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { common, createLowlight } from 'lowlight'

const lowlight = createLowlight(common)
export const CODE_LANGUAGES = lowlight.listLanguages()

export function contentExtensions() {
  return [
    StarterKit.configure({ codeBlock: false, link: { openOnClick: true } }),
    Mention.configure({
      HTMLAttributes: { class: 'mention' },
      suggestion: { char: '@', items: () => [] },
    }),
    Image.configure({ allowBase64: false }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ]
}

export function editorContent(content: string): string | JSONContent {
  try {
    const value = JSON.parse(content)
    if (value?.type === 'doc' && Array.isArray(value.content)) return value
  } catch {
    /* HTML or literal text. */
  }
  if (
    /^\s*(?:<!doctype\s+html|<(?:html|body|p|h[1-6]|ul|ol|blockquote|pre|table|div|span|img|hr|figure|a|strong|em|b|i|u)(?:\s|\/?>))/i.test(
      content,
    )
  )
    return content
      .replace(/<!doctype[^>]*>/gi, '')
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<\/?(?:html|body)\b[^>]*>/gi, '')
  return {
    type: 'doc',
    content: content.split(/\r?\n/).map((text) => ({
      type: 'paragraph',
      ...(text ? { content: [{ type: 'text', text }] } : {}),
    })),
  }
}

export function prepareWikiContent(content: string, strictHTML = false) {
  const parsed = editorContent(content)
  if (typeof parsed === 'string' && strictHTML) {
    const allowed = new Set([
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
      'img',
      'hr',
      'a',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'del',
      'mark',
    ])
    for (const match of parsed.matchAll(/<([a-z][a-z0-9-]*)\b/gi))
      if (!allowed.has(match[1].toLowerCase()))
        throw new Error('Unsupported HTML element: ' + match[1])
    for (const match of parsed.matchAll(/<[a-z][^>]*\bstyle\s*=\s*["']([^"']*)["']/gi))
      for (const declaration of match[1].split(';')) {
        const property = declaration.split(':')[0].trim().toLowerCase()
        if (
          property &&
          !['color', 'background-color', 'text-align', 'width', 'height', 'max-width'].includes(
            property,
          )
        )
          throw new Error('Unsupported HTML style: ' + property)
      }
  }
  if (typeof parsed !== 'string') getSchema(contentExtensions()).nodeFromJSON(parsed).check()
  return parsed
}

export { descriptionText } from './text.js'
