import { useEffect } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'

import { Button } from '@/components/ui/button'
import { editorContent } from '@/lib/page-content'

export function PageEditor({
  content,
  onChange,
  disabled,
}: {
  content: string
  onChange: (html: string) => void
  disabled: boolean
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: editorContent(content),
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Page content',
        'aria-multiline': 'true',
        class: 'min-h-[320px] p-5',
      },
    },
  })
  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      undo: editor?.can().undo(),
      redo: editor?.can().redo(),
      table: editor?.isActive('table'),
      bold: editor?.isActive('bold'),
      italic: editor?.isActive('italic'),
      h2: editor?.isActive('heading', { level: 2 }),
      h3: editor?.isActive('heading', { level: 3 }),
      bullet: editor?.isActive('bulletList'),
      ordered: editor?.isActive('orderedList'),
      quote: editor?.isActive('blockquote'),
      code: editor?.isActive('codeBlock'),
    }),
  })
  const controls = [
    { label: 'Bold', active: state?.bold, run: () => editor?.chain().focus().toggleBold().run() },
    {
      label: 'Italic',
      active: state?.italic,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Heading 2',
      active: state?.h2,
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Heading 3',
      active: state?.h3,
      run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'Bullet list',
      active: state?.bullet,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      active: state?.ordered,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Quote',
      active: state?.quote,
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      label: 'Code block',
      active: state?.code,
      run: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
  ]
  return (
    <fieldset disabled={disabled} className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex flex-wrap gap-1 border-b p-2"
      >
        {controls.map((control) => (
          <Button
            type="button"
            key={control.label}
            size="sm"
            variant={control.active ? 'secondary' : 'ghost'}
            aria-pressed={Boolean(control.active)}
            disabled={!editor || disabled}
            onClick={control.run}
          >
            {control.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!editor || disabled}
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          Table
        </Button>
        {state?.table && (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => editor?.chain().focus().addRowAfter().run()}
            >
              Add row
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => editor?.chain().focus().addColumnAfter().run()}
            >
              Add column
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => editor?.chain().focus().deleteTable().run()}
            >
              Remove table
            </Button>
          </>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!editor || disabled || !state?.undo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          Undo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!editor || disabled || !state?.redo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          Redo
        </Button>
      </div>
      <EditorContent
        editor={editor}
        className={`wiki-content ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      />
    </fieldset>
  )
}
