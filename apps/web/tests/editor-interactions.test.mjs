// @vitest-environment jsdom
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { closeHistory } from '@tiptap/pm/history'

import { PageEditor } from '../src/components/pages/PageEditor'
import { PageContent } from '../src/components/pages/PageContent'
import apiClient from '../src/api/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const uploadInlineImage = vi.hoisted(() => vi.fn())

vi.mock('../src/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(async (_url, form) => ({ data: await uploadInlineImage(form.get('file')) })),
  },
}))
let client

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom has no layout; ProseMirror uses these methods when focusing selections.
  Range.prototype.getClientRects = () => []
  Range.prototype.getBoundingClientRect = () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
  })
  Element.prototype.scrollIntoView = vi.fn()
  document.elementFromPoint = () => null
})
afterEach(() => {
  cleanup()
  client?.clear()
})

async function mount(content = '<p>Welcome</p>') {
  const onChange = vi.fn()
  const onStatusChange = vi.fn()
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const view = render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PageEditor, { content, onChange, onStatusChange, disabled: false }),
    ),
  )
  const textbox = await screen.findByRole('textbox', { name: 'Page content' })
  return { editor: textbox.editor, textbox, onChange, onStatusChange, view }
}

it('edits and removes a link while preserving the selected text', async () => {
  const { editor, onChange } = await mount()
  act(() => editor.commands.setTextSelection({ from: 1, to: 8 }))
  await userEvent.click(screen.getByRole('button', { name: 'Add link' }))
  await userEvent.type(screen.getByLabelText('URL'), 'example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Apply link' }))
  expect(editor.getHTML()).toContain('href="https://example.com"')
  expect(editor.getText()).toBe('Welcome')
  expect(onChange).toHaveBeenCalled()
  await userEvent.click(
    within(screen.getByRole('toolbar', { name: 'Text formatting' })).getByRole('button', {
      name: 'Edit link',
    }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Remove link' }))
  expect(editor.getHTML()).not.toContain('<a')
})

it('rejects an executable URL and lets the user cancel without changing content', async () => {
  const { editor } = await mount()
  await userEvent.click(screen.getByRole('button', { name: 'Add link' }))
  await userEvent.type(screen.getByLabelText('URL'), 'javascript:alert(1)')
  await userEvent.click(screen.getByRole('button', { name: 'Apply link' }))
  expect(screen.getByRole('alert').textContent).toContain('valid')
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(editor.getHTML()).toBe('<p>Welcome</p>')
})

it('waits for image upload and inserts the returned URL, not base64', async () => {
  let complete
  uploadInlineImage.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve
    }),
  )
  const { editor, onStatusChange } = await mount()
  fireEvent.change(screen.getByLabelText('Choose image'), {
    target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] },
  })
  await waitFor(() =>
    expect(onStatusChange).toHaveBeenLastCalledWith({ uploading: true, invalid: false }),
  )
  expect(screen.getByRole('button', { name: 'Uploading…' }).disabled).toBe(true)
  await act(async () => complete({ id: 'image', url: '/uploads/uploads/photo.webp' }))
  expect(editor.getHTML()).toContain('src="/uploads/uploads/photo.webp"')
  expect(editor.getHTML()).not.toContain('base64')
  expect(onStatusChange).toHaveBeenLastCalledWith({ uploading: false, invalid: false })
})

it('keeps content unchanged on upload failure and makes retry possible', async () => {
  uploadInlineImage.mockRejectedValue(new Error('Upload failed'))
  const { editor } = await mount()
  fireEvent.change(screen.getByLabelText('Choose image'), {
    target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] },
  })
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Upload failed'))
  expect(editor.getHTML()).toBe('<p>Welcome</p>')
  expect(screen.getByRole('button', { name: 'Upload image' }).disabled).toBe(false)
})

it.each(['paste', 'drop'])('uploads an image from %s', async (action) => {
  uploadInlineImage.mockResolvedValue({ id: 'image', url: '/uploads/pasted.webp' })
  const { textbox, editor } = await mount()
  const file = new File(['image'], 'photo.png', { type: 'image/png' })
  if (action === 'paste') {
    fireEvent.paste(textbox, { clipboardData: { files: [file], getData: () => '' } })
  } else {
    vi.spyOn(editor.view, 'posAtCoords').mockReturnValue({ pos: 1, inside: 0 })
    fireEvent.drop(textbox, {
      dataTransfer: { files: [file], getData: () => '' },
      clientX: 0,
      clientY: 0,
    })
  }
  await waitFor(() => expect(editor.getHTML()).toContain('src="/uploads/pasted.webp"'))
  expect(uploadInlineImage).toHaveBeenCalledWith(file)
})

it('persists the selected language on a code block', async () => {
  const { editor } = await mount('<pre><code>const value = 42</code></pre>')
  act(() => editor.commands.setTextSelection(2))
  fireEvent.change(screen.getByLabelText('Code language'), { target: { value: 'javascript' } })
  expect(editor.getHTML()).toContain('language-javascript')
  await waitFor(() => expect(document.querySelector('.hljs-keyword')).not.toBeNull())
})

it('renders legacy JSON and highlights the same code in editor and reader', async () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'codeBlock',
        attrs: { language: 'javascript' },
        content: [{ type: 'text', text: 'const value = 42' }],
      },
    ],
  })
  const { editor } = await mount(content)
  expect(editor.getText()).toContain('const value = 42')
  await waitFor(() => expect(document.querySelector('.hljs-keyword')).not.toBeNull())
  cleanup()
  render(createElement(PageContent, { content }))
  await waitFor(() => expect(document.querySelector('.hljs-keyword')).not.toBeNull())
  expect(document.querySelector('code').textContent).toBe('const value = 42')
})

it('blocks saving unsupported legacy nodes instead of losing them', async () => {
  const content = JSON.stringify({ type: 'doc', content: [{ type: 'unknownWidget' }] })
  const { onStatusChange } = await mount(content)
  expect(screen.getByRole('alert').textContent).toContain('preserve the original')
  expect(onStatusChange).toHaveBeenLastCalledWith({ uploading: false, invalid: true })
})

it('resizes an image proportionally and preserves its dimensions after reopening in the reader', async () => {
  const { editor, onChange } = await mount(
    '<p>Photo</p><img src="/uploads/photo.webp" width="400" height="200">',
  )
  const image = document.querySelector('.tiptap img')
  // Supply layout and load information that jsdom cannot obtain from image URLs.
  Object.defineProperty(image, 'offsetWidth', { get: () => parseFloat(image.style.width) || 400 })
  Object.defineProperty(image, 'offsetHeight', { get: () => parseFloat(image.style.height) || 200 })
  fireEvent.load(image)
  expect(document.querySelectorAll('[data-resize-handle]')).toHaveLength(4)
  const handle = document.querySelector('[data-resize-handle="bottom-right"]')
  fireEvent.mouseDown(handle, { clientX: 400, clientY: 200 })
  fireEvent.mouseMove(document, { clientX: 600, clientY: 300 })
  fireEvent.mouseUp(document)
  const html = editor.getHTML()
  expect(html).toContain('width="600"')
  expect(html).toContain('height="300"')
  expect(onChange).toHaveBeenLastCalledWith(html)
  cleanup()
  render(createElement(PageContent, { content: html }))
  await waitFor(() => expect(document.querySelector('.tiptap img')).not.toBeNull())
  expect(document.querySelector('.tiptap img').getAttribute('width')).toBe('600')
  expect(document.querySelector('[data-resize-handle]')).toBeNull()
})

it('searches mention users and inserts a persistent mention with keyboard navigation', async () => {
  apiClient.get.mockResolvedValue({
    data: {
      users: [
        { id: 'alice', name: 'Alice' },
        { id: 'alex', name: 'Alex' },
      ],
    },
  })
  const { editor, textbox } = await mount('<p></p>')
  act(() => editor.chain().focus().insertContent('@Al').run())
  await screen.findByRole('listbox', { name: 'Mention users' })
  expect(apiClient.get).toHaveBeenCalledWith('/api/v2/users/mentions', { params: { search: 'Al' } })
  fireEvent.keyDown(textbox, { key: 'ArrowDown' })
  fireEvent.keyDown(textbox, { key: 'Enter' })
  expect(editor.getHTML()).toContain('data-id="alex"')
  expect(editor.getText()).toContain('@Alex')
  const html = editor.getHTML()
  cleanup()
  render(createElement(PageContent, { content: html }))
  expect(screen.getByText('@Alex')).toBeTruthy()
})

it('shows mention lookup errors without inserting a user', async () => {
  apiClient.get.mockRejectedValue(new Error('offline'))
  const { editor, textbox } = await mount('<p></p>')
  act(() => editor.chain().focus().insertContent('@Al').run())
  await screen.findByText('Cannot load users. Try typing again.')
  fireEvent.keyDown(textbox, { key: 'Enter' })
  expect(editor.getHTML()).not.toContain('data-type="mention"')
  fireEvent.keyDown(textbox, { key: 'Escape' })
  expect(screen.queryByRole('listbox')).toBeNull()
})

it('formats selected text from the contextual toolbar', async () => {
  const { editor } = await mount()
  act(() => editor.chain().focus().setTextSelection({ from: 1, to: 8 }).run())
  const toolbar = await screen.findByRole('toolbar', { name: 'Selection formatting' })
  await userEvent.click(within(toolbar).getByRole('button', { name: 'Bold' }))
  expect(editor.getHTML()).toContain('<strong>Welcome</strong>')
})

it('renders initial HTML without reporting an edit on mount', async () => {
  const { textbox, onChange } = await mount(
    '<h2>Introduction</h2><p>Hello <strong>wiki</strong></p>',
  )
  expect(within(textbox).getByRole('heading', { level: 2 }).textContent).toBe('Introduction')
  expect(textbox.querySelector('strong').textContent).toBe('wiki')
  expect(textbox.getAttribute('contenteditable')).toBe('true')
  expect(onChange).not.toHaveBeenCalled()
})

it('reports serialized content when the user types in the real editor', async () => {
  const { editor, textbox, onChange } = await mount('<p></p>')
  await userEvent.click(textbox)
  await userEvent.keyboard('Hello wiki')
  await waitFor(() => expect(editor.getText()).toBe('Hello wiki'))
  expect(onChange).toHaveBeenLastCalledWith('<p>Hello wiki</p>')
})

it('undoes and redoes a typed change through the toolbar', async () => {
  const { editor, textbox, onChange } = await mount('<p></p>')
  await userEvent.click(textbox)
  await userEvent.keyboard('Draft')
  const toolbar = within(screen.getByRole('toolbar', { name: 'Text formatting' }))
  await userEvent.click(toolbar.getByRole('button', { name: 'Undo' }))
  expect(editor.getText()).toBe('')
  expect(onChange).toHaveBeenLastCalledWith('<p></p>')
  await userEvent.click(toolbar.getByRole('button', { name: 'Redo' }))
  expect(editor.getText()).toBe('Draft')
  expect(onChange).toHaveBeenLastCalledWith('<p>Draft</p>')
})

it('blocks editing while disabled and preserves content when editing resumes', async () => {
  const { editor, textbox, onChange, onStatusChange, view } = await mount()
  const update = (disabled) =>
    view.rerender(
      createElement(
        QueryClientProvider,
        { client },
        createElement(PageEditor, {
          content: '<p>Welcome</p>',
          onChange,
          onStatusChange,
          disabled,
        }),
      ),
    )
  update(true)
  await waitFor(() => expect(textbox.getAttribute('contenteditable')).toBe('false'))
  expect(editor.isEditable).toBe(false)
  expect(screen.getByRole('button', { name: 'Upload image' }).disabled).toBe(true)
  await userEvent.click(textbox)
  await userEvent.keyboard('Blocked')
  expect(editor.getHTML()).toBe('<p>Welcome</p>')
  expect(onChange).not.toHaveBeenCalled()
  update(false)
  await waitFor(() => expect(editor.isEditable).toBe(true))
  await userEvent.click(textbox)
  await userEvent.keyboard('!')
  expect(editor.getText()).toContain('!')
  expect(editor.getText()).toContain('Welcome')
  expect(onChange).toHaveBeenCalled()
})

it('renders the reader without editing controls and ignores typing', async () => {
  render(createElement(PageContent, { content: '<h2>Published</h2><p>Read me</p>' }))
  const heading = await screen.findByRole('heading', { name: 'Published' })
  const content = heading.closest('.tiptap')
  expect(content.getAttribute('contenteditable')).toBe('false')
  expect(screen.queryByRole('toolbar')).toBeNull()
  await userEvent.click(content)
  await userEvent.keyboard('Unwanted edit')
  expect(content.textContent).toBe('PublishedRead me')
})

it.each([
  ['Remove row', 2, 3],
  ['Remove column', 3, 2],
])(
  'removes the selected table dimension with %s and supports undo',
  async (label, rows, columns) => {
    const { editor, onChange } = await mount('<p></p>')
    const toolbar = within(screen.getByRole('toolbar', { name: 'Text formatting' }))
    await userEvent.click(toolbar.getByRole('button', { name: 'Table' }))
    act(() => editor.view.dispatch(closeHistory(editor.state.tr)))
    await userEvent.click(toolbar.getByRole('button', { name: label }))
    const table = document.querySelector('.tiptap table')
    expect(table.rows).toHaveLength(rows)
    for (const row of table.rows) expect(row.cells).toHaveLength(columns)
    expect(onChange).toHaveBeenLastCalledWith(editor.getHTML())
    await userEvent.click(toolbar.getByRole('button', { name: 'Undo' }))
    expect(document.querySelector('.tiptap table').rows).toHaveLength(3)
    for (const row of document.querySelector('.tiptap table').rows)
      expect(row.cells).toHaveLength(3)
  },
)

it.each([
  ['Heading 1', 'h1'],
  ['Heading 4', 'h4'],
])('applies %s and returns to a paragraph', async (label, tag) => {
  const { editor } = await mount()
  const toolbar = within(screen.getByRole('toolbar', { name: 'Text formatting' }))
  await userEvent.click(toolbar.getByRole('button', { name: label }))
  expect(editor.getHTML()).toContain(`<${tag}>Welcome</${tag}>`)
  await userEvent.click(toolbar.getByRole('button', { name: 'Paragraph' }))
  expect(editor.getHTML()).toContain('<p>Welcome</p>')
  expect(editor.getHTML()).not.toContain(`<${tag}>`)
})
it.each([
  ['Strikethrough', 's'],
  ['Inline code', 'code'],
])('applies %s to a selection', async (label, tag) => {
  const { editor } = await mount()
  act(() => editor.commands.setTextSelection({ from: 1, to: 8 }))
  const toolbar = within(screen.getByRole('toolbar', { name: 'Text formatting' }))
  await userEvent.click(toolbar.getByRole('button', { name: label }))
  expect(editor.getHTML()).toContain(`<${tag}>Welcome</${tag}>`)
})
it('inserts a horizontal rule without losing existing text', async () => {
  const { editor } = await mount()
  await userEvent.click(
    within(screen.getByRole('toolbar', { name: 'Text formatting' })).getByRole('button', {
      name: 'Horizontal rule',
    }),
  )
  expect(editor.getHTML()).toContain('<hr>')
  expect(editor.getText()).toContain('Welcome')
})
