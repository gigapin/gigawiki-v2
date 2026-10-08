import { getSchema, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

import { editorContent } from './page-content'
import { normalizeLink } from './editor-link'

const lowlight = createLowlight(common)
export const CODE_LANGUAGES = lowlight.listLanguages()

export function wikiExtensions(editable: boolean) {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: {
        openOnClick: !editable,
        defaultProtocol: 'https',
        isAllowedUri: (url, context) => context.defaultValidate(url) && normalizeLink(url) !== null,
      },
    }),
    Image.configure({
      allowBase64: false,
      resize: editable
        ? {
            enabled: true,
            directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
            minWidth: 48,
            minHeight: 24,
            alwaysPreserveAspectRatio: true,
          }
        : false,
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
  ]
}

export function prepareWikiContent(content: string) {
  const parsed = editorContent(content)
  if (typeof parsed !== 'string') {
    // Fail visibly for unknown nodes/marks rather than silently deleting them.
    getSchema(wikiExtensions(false))
      .nodeFromJSON(parsed as JSONContent)
      .check()
  }
  return parsed
}
