import { useEffect, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'

import { wikiExtensions } from '@/lib/wiki-extensions'
import { Button } from '@/components/ui/button'

export function RichDescriptionEditor({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (html: string) => void
  disabled: boolean
}) {
  const extensions = useMemo(() => wikiExtensions(false), [])
  const editor = useEditor({
    extensions,
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-label': 'Description',
        role: 'textbox',
        class: 'wiki-content min-h-32 p-3',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })
  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])
  return (
    <div className="rounded border">
      <div
        role="toolbar"
        aria-label="Description formatting"
        className="flex flex-wrap gap-1 border-b p-1"
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Bold
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          Italic
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          List
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          Heading
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
