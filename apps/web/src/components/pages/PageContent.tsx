import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'

import { editorContent } from '@/lib/page-content'

export function PageContent({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [StarterKit, Image, Table, TableRow, TableHeader, TableCell],
    content: editorContent(content),
    editable: false,
    immediatelyRender: false,
  })
  return <EditorContent editor={editor} className="wiki-content" />
}
