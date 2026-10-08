import { EditorContent, useEditor } from '@tiptap/react'

import { prepareWikiContent, wikiExtensions } from '@/lib/wiki-extensions'

export function PageContent({ content }: { content: string }) {
  try {
    prepareWikiContent(content)
  } catch {
    return (
      <p role="alert" className="text-destructive">
        This page contains an unsupported content format.
      </p>
    )
  }
  return <WikiReader content={content} />
}

function WikiReader({ content }: { content: string }) {
  const editor = useEditor({
    extensions: wikiExtensions(false),
    content: prepareWikiContent(content),
    editable: false,
    immediatelyRender: false,
  })
  return <EditorContent editor={editor} className="wiki-content" />
}
