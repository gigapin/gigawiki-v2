import sanitizeHtml from 'sanitize-html'
import { generateHTML } from '@tiptap/html/server'

import { contentExtensions, prepareWikiContent } from './index.js'

export function sanitizeContent(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
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
    ],
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      code: ['class'],
      span: ['data-type', 'data-id', 'data-label', 'class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^[a-z]+$/i],
        'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^[a-z]+$/i],
        'text-align': [/^(left|right|center|justify)$/],
      },
    },
  })
}

export function wikiHTML(content: string) {
  const parsed = prepareWikiContent(content)
  return sanitizeContent(
    typeof parsed === 'string' ? parsed : generateHTML(parsed, contentExtensions()),
  )
}
