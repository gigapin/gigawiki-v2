// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { SubjectFormDialog } from '../src/components/subjects/SubjectFormDialog'
import { SubjectActions } from '../src/components/subjects/SubjectActions'
import { ProjectFormDialog } from '../src/components/projects/ProjectFormDialog'
import apiClient from '../src/api/client'
const fixture = vi.hoisted(() => ({ user: { id: 'owner', role: 'EDITOR' }, navigate: vi.fn() }))
vi.mock('../src/api/client', () => ({
  default: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('../src/stores/auth.store', () => ({ useAuthStore: (selector) => selector(fixture) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => fixture.navigate }))
const subject = {
  id: 's',
  slug: 'subject',
  userId: 'owner',
  name: 'Subject',
  description: 'Description',
  visibility: 'PRIVATE',
  color: 'blue',
  icon: 'book',
  imageId: 'old',
  image: { id: 'old', url: '/old.webp' },
}
let client
beforeEach(() => {
  vi.clearAllMocks()
  fixture.user = { id: 'owner', role: 'EDITOR' }
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.scrollIntoView = vi.fn()
  apiClient.post.mockImplementation(async (url) => ({
    data:
      url === '/api/v2/images'
        ? { id: 'cover', url: '/cover.webp' }
        : { ...subject, imageId: 'cover' },
  }))
  apiClient.patch.mockResolvedValue({ data: subject })
  apiClient.delete.mockResolvedValue({ data: {} })
})
afterEach(() => {
  cleanup()
  client?.clear()
})
function mount(Component, props = {}) {
  client = new QueryClient()
  const onClose = vi.fn(),
    onSaved = vi.fn()
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(Component, { onClose, onSaved, ...props }),
    ),
  )
  return { onClose, onSaved }
}
const file = () => new File(['pixels'], 'cover.png', { type: 'image/png' })
it('creates a subject with a cover in one resource request after deferred upload', async () => {
  const { onSaved } = mount(SubjectFormDialog)
  await userEvent.type(screen.getByLabelText('Name'), ' New subject ')
  await userEvent.upload(screen.getByLabelText('Cover image'), file())
  expect(screen.getByAltText('Cover preview').getAttribute('src')).toBe('blob:preview')
  expect(apiClient.post).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Create subject' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(apiClient.post.mock.calls[0][2]).toEqual({ params: { type: 'COVER' } })
  expect(apiClient.post).toHaveBeenLastCalledWith(
    '/api/v2/subjects',
    expect.objectContaining({ name: 'New subject', imageId: 'cover' }),
  )
})
it('removes an existing cover by sending null without deleting the shared image', async () => {
  const { onSaved } = mount(SubjectFormDialog, { subject })
  await userEvent.click(screen.getByRole('button', { name: 'Remove cover' }))
  expect(screen.queryByAltText('Cover preview')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(apiClient.patch).toHaveBeenCalledWith(
    '/api/v2/subjects/subject',
    expect.objectContaining({ imageId: null, color: 'blue', visibility: 'PRIVATE' }),
  )
  expect(apiClient.delete).not.toHaveBeenCalled()
})
it('rejects unsupported or oversized dropped images before upload', () => {
  mount(SubjectFormDialog)
  const input = screen.getByLabelText('Cover image')
  fireEvent.drop(input.parentElement, {
    dataTransfer: { files: [new File(['svg'], 'cover.svg', { type: 'image/svg+xml' })] },
  })
  expect(screen.getByRole('alert').textContent).toContain('JPEG')
  const large = file()
  Object.defineProperty(large, 'size', { value: 11 * 1024 * 1024 })
  fireEvent.drop(input.parentElement, { dataTransfer: { files: [large] } })
  expect(screen.getByRole('alert').textContent).toContain('10 MB')
  expect(apiClient.post).not.toHaveBeenCalled()
})
it('cancels before saving without uploading anything and revokes the preview URL', async () => {
  const { onClose } = mount(SubjectFormDialog)
  await userEvent.upload(screen.getByLabelText('Cover image'), file())
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalled()
  expect(apiClient.post).not.toHaveBeenCalled()
  cleanup()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
})
it('retains fields and reuses an uploaded cover when resource save fails', async () => {
  apiClient.patch
    .mockRejectedValueOnce(
      new AxiosError('Conflict', undefined, undefined, undefined, {
        status: 409,
        data: { error: 'Name already used' },
      }),
    )
    .mockResolvedValue({ data: subject })
  const { onSaved } = mount(SubjectFormDialog, { subject })
  await userEvent.upload(screen.getByLabelText('Cover image'), file())
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await screen.findByRole('alert')
  expect(screen.getByLabelText('Name').value).toBe('Subject')
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(apiClient.post).toHaveBeenCalledTimes(1)
  expect(apiClient.patch).toHaveBeenCalledTimes(2)
})
it('creates a project with a cover using the same multipart contract', async () => {
  const { onSaved } = mount(ProjectFormDialog, { subjectId: 's' })
  await userEvent.type(screen.getByLabelText('Name'), 'Project')
  await userEvent.upload(screen.getByLabelText('Cover image'), file())
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(apiClient.post).toHaveBeenLastCalledWith(
    '/api/v2/projects',
    expect.objectContaining({ subjectId: 's', imageId: 'cover' }),
  )
})
it.each([
  ['GUEST', 'other', false, false],
  ['EDITOR', 'other', false, false],
  ['EDITOR', 'owner', true, false],
  ['ADMIN', 'other', true, true],
])('shows Subject controls for %s with ownership %s', (role, id, edit, remove) => {
  fixture.user = { id, role }
  mount(SubjectActions, { subject })
  expect(Boolean(screen.queryByRole('button', { name: 'Edit subject' }))).toBe(edit)
  expect(Boolean(screen.queryByRole('button', { name: 'Delete subject' }))).toBe(remove)
})
it('confirms Subject deletion, handles failure and navigates after retry', async () => {
  fixture.user.role = 'ADMIN'
  apiClient.delete.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: {} })
  mount(SubjectActions, { subject })
  await userEvent.click(screen.getByRole('button', { name: 'Delete subject' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
  expect(apiClient.delete).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Delete subject' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
  await screen.findByRole('alert')
  expect(fixture.navigate).not.toHaveBeenCalled()
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
  await waitFor(() => expect(fixture.navigate).toHaveBeenCalledWith({ to: '/subjects' }))
  expect(apiClient.delete).toHaveBeenLastCalledWith('/api/v2/subjects/subject')
})
