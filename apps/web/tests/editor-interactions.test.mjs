// @vitest-environment jsdom
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PageEditor } from '../src/components/pages/PageEditor'
import { PageContent } from '../src/components/pages/PageContent'
import apiClient from '../src/api/client'
import { uploadInlineImage } from '../src/api/images'

vi.mock('../src/api/client', () => ({ default: { get: vi.fn() } }))

vi.mock('../src/api/images', () => ({
  uploadInlineImage: vi.fn(),
  IMAGE_TYPES: ['image/png', 'image/jpeg'],
}))

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
})
afterEach(cleanup)

async function mount(content = '<p>Welcome</p>') {
  const onChange = vi.fn()
  const onStatusChange = vi.fn()
  render(createElement(PageEditor, { content, onChange, onStatusChange, disabled: false }))
  const textbox = await screen.findByRole('textbox', { name: 'Page content' })
  return { editor: textbox.editor, textbox, onChange, onStatusChange }
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
