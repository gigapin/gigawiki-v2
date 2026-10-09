import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { BubbleMenu } from '@tiptap/react/menus'
import { TextSelection, type SelectionBookmark } from '@tiptap/pm/state'

import { Button } from '@/components/ui/button'
import { prepareWikiContent, wikiExtensions, CODE_LANGUAGES } from '@/lib/wiki-extensions'
import { normalizeLink } from '@/lib/editor-link'
import { uploadInlineImage, IMAGE_TYPES } from '@/api/images'
import { apiErrorMessage } from '@/lib/api-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export function PageEditor({
  content,
  onChange,
  disabled,
  onStatusChange,
}: {
  content: string
  onChange: (html: string) => void
  disabled: boolean
  onStatusChange: (status: { uploading: boolean; invalid: boolean }) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const bookmark = useRef<SelectionBookmark | null>(null)
  const prepared = useMemo(() => {
    try {
      return { value: prepareWikiContent(content), error: '' }
    } catch {
      return {
        value: '',
        error:
          'This page contains unsupported content. Saving is disabled to preserve the original.',
      }
    }
  }, [content])
  const blocked = disabled || uploading || Boolean(prepared.error)
  useEffect(() => {
    onStatusChange({ uploading, invalid: Boolean(prepared.error) })
  }, [uploading, prepared.error, onStatusChange])
  const editor = useEditor({
    extensions: [...wikiExtensions(true), Placeholder.configure({ placeholder: 'Start writing…' })],
    content: prepared.value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? [])
        if (!files.length) return false
        event.preventDefault()
        if (files.length > 1) {
          setUploadError('Upload one image at a time.')
          return true
        }
        void insertImage(files[0])
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = Array.from(event.dataTransfer?.files ?? [])
        if (moved || !files.length) return false
        event.preventDefault()
        if (files.length > 1) {
          setUploadError('Upload one image at a time.')
          return true
        }
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (position) editor?.commands.setTextSelection(position.pos)
        void insertImage(files[0])
        return true
      },
      attributes: {
        role: 'textbox',
        'aria-label': 'Page content',
        'aria-multiline': 'true',
        class: 'min-h-[320px] p-5',
      },
    },
  })
  useEffect(() => {
    editor?.setEditable(!blocked)
  }, [editor, blocked])
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
      language: editor?.getAttributes('codeBlock').language ?? 'plaintext',
      link: editor?.isActive('link'),
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
  async function insertImage(file: File) {
    if (!editor || blocked || uploadingRef.current) return
    uploadingRef.current = true
    setUploading(true)
    setUploadError('')
    try {
      const image = await uploadInlineImage(file)
      if (!editor.isDestroyed) {
        editor.chain().focus().setImage({ src: image.url, alt: file.name }).run()
      }
    } catch (error) {
      setUploadError(
        error instanceof Error && !('isAxiosError' in error)
          ? error.message
          : apiErrorMessage(error),
      )
    } finally {
      uploadingRef.current = false
      setUploading(false)
    }
  }

  function openLink() {
    if (!editor) return
    bookmark.current = editor.state.selection.getBookmark()
    setLinkUrl(editor.getAttributes('link').href ?? '')
    setLinkError('')
    setLinkOpen(true)
  }

  function applyLink(remove = false) {
    if (!editor) return
    const href = normalizeLink(linkUrl)
    if (!remove && !href) {
      setLinkError('Enter a valid web, email or local URL.')
      return
    }
    const selection = bookmark.current?.resolve(editor.state.doc)
    if (selection) editor.view.dispatch(editor.state.tr.setSelection(selection))
    const chain = editor.chain().focus().extendMarkRange('link')
    if (remove) chain.unsetLink().run()
    else chain.setLink({ href: href! }).run()
    setLinkOpen(false)
  }

  return (
    <fieldset disabled={blocked} className="min-w-0 overflow-hidden rounded-lg border bg-card">
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
            disabled={!editor || blocked}
            onClick={control.run}
          >
            {control.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!editor || blocked}
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          Table
        </Button>
        <Button
          type="button"
          size="sm"
          variant={state?.link ? 'secondary' : 'ghost'}
          disabled={!editor || blocked}
          onClick={openLink}
        >
          {state?.link ? 'Edit link' : 'Add link'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!editor || blocked}
          onClick={() => fileInput.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Upload image'}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          aria-label="Choose image"
          className="sr-only"
          disabled={blocked}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void insertImage(file)
          }}
        />
        {state?.code && (
          <label className="flex items-center gap-2 px-2 text-sm">
            Code language
            <select
              aria-label="Code language"
              className="rounded border bg-background p-1 text-foreground"
              value={state.language}
              disabled={blocked}
              onChange={(event) =>
                editor
                  ?.chain()
                  .focus()
                  .updateAttributes('codeBlock', { language: event.target.value })
                  .run()
              }
            >
              <option value="plaintext">Plain text</option>
              {CODE_LANGUAGES.filter((language) => language !== 'plaintext').map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
        )}
        {state?.table && (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={blocked}
              onClick={() => editor?.chain().focus().addRowAfter().run()}
            >
              Add row
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={blocked}
              onClick={() => editor?.chain().focus().addColumnAfter().run()}
            >
              Add column
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={blocked}
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
          disabled={!editor || blocked || !state?.undo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          Undo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!editor || blocked || !state?.redo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          Redo
        </Button>
      </div>
      {(uploadError || prepared.error) && (
        <p role="alert" className="px-5 py-2 text-sm text-destructive">
          {prepared.error || uploadError}
        </p>
      )}
      {uploading && (
        <p role="status" className="px-5 py-2 text-sm text-muted-foreground">
          Uploading image… Wait before saving.
        </p>
      )}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{state?.link ? 'Edit link' : 'Add link'}</DialogTitle>
            <DialogDescription>
              Apply a link to the selected text, or type linked text after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="editor-link">URL</Label>
            <Input
              id="editor-link"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyLink()
                }
              }}
            />
          </div>
          {linkError && (
            <p role="alert" className="text-sm text-destructive">
              {linkError}
            </p>
          )}
          <DialogFooter>
            {state?.link && (
              <Button type="button" variant="destructive" onClick={() => applyLink(true)}>
                Remove link
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => applyLink()}>
              Apply link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editor && !blocked && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor, state }) =>
            editor.isEditable &&
            state.selection instanceof TextSelection &&
            !state.selection.empty &&
            state.selection.$from.parent.isTextblock &&
            !editor.isActive('codeBlock')
          }
        >
          <div
            role="toolbar"
            aria-label="Selection formatting"
            className="flex gap-1 rounded-md border bg-popover p-1 shadow-lg"
          >
            {controls.slice(0, 2).map((control) => (
              <Button
                type="button"
                key={control.label}
                size="sm"
                variant={control.active ? 'secondary' : 'ghost'}
                aria-pressed={Boolean(control.active)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={control.run}
              >
                {control.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onMouseDown={(event) => event.preventDefault()}
              onClick={openLink}
            >
              {state?.link ? 'Edit link' : 'Add link'}
            </Button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent
        editor={editor}
        className={`wiki-content ${blocked ? 'pointer-events-none opacity-60' : ''}`}
      />
    </fieldset>
  )
}
