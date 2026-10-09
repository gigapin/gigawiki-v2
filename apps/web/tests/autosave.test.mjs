// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { PageForm } from '../src/pages/pages/PageEditorPage'
import { savePage } from '../src/api/pages'

const session = vi.hoisted(() => ({
  user: { role: 'EDITOR' },
  navigate: vi.fn(),
  blocker: vi.fn(),
}))
vi.mock('../src/stores/auth.store', () => ({ useAuthStore: (selector) => selector(session) }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => session.navigate,
  useBlocker: (options) => {
    session.blocker(options)
    return { status: 'idle' }
  },
  useParams: vi.fn(),
}))
vi.mock('../src/api/pages', () => ({ savePage: vi.fn(), fetchPage: vi.fn() }))
vi.mock('../src/components/shared/ProjectBreadcrumb', () => ({ ProjectBreadcrumb: () => null }))
vi.mock('../src/components/pages/PageEditor', () => ({
  PageEditor: ({ onChange, disabled, onStatusChange }) =>
    createElement(
      'div',
      null,
      createElement('textarea', {
        'aria-label': 'Content',
        disabled,
        onChange: (e) => onChange(e.target.value),
      }),
      createElement(
        'button',
        { onClick: () => onStatusChange({ uploading: true, invalid: false }) },
        'Uploading',
      ),
    ),
}))
const initial = { title: 'Title', content: '<p>Body</p>', isDraft: false, visibility: 'PUBLIC' }
let client
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  session.navigate.mockReset()
  session.user = { role: 'EDITOR' }
  savePage.mockResolvedValue({ slug: 'title', title: 'Title', isDraft: false })
})
afterEach(() => {
  cleanup()
  client?.clear()
  vi.useRealTimers()
})
function mount(slug = 'title') {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PageForm, {
        initial,
        slug,
        context: {
          projectSlug: 'project',
          projectName: 'Project',
          sectionId: 'section',
          sectionTitle: 'Section',
          sectionSlug: 'section',
        },
      }),
    ),
  )
}
async function tick(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}
function change(value = '<p>Changed</p>') {
  fireEvent.change(screen.getByLabelText('Content'), { target: { value } })
}
it('debounces edits for 30 seconds, preserves publication and stays in editor', async () => {
  mount()
  change()
  await tick(20_000)
  change('<p>Latest</p>')
  await tick(29_999)
  expect(savePage).not.toHaveBeenCalled()
  await tick(1)
  expect(savePage).toHaveBeenCalledWith({ ...initial, content: '<p>Latest</p>' }, { slug: 'title' })
  expect(session.navigate).not.toHaveBeenCalled()
  expect(screen.getByRole('status').textContent).toContain('Saved at')
  await tick(60_000)
  expect(savePage).toHaveBeenCalledTimes(1)
})
it('does not save unchanged, new, or uploading pages', async () => {
  mount()
  await tick(30_000)
  expect(savePage).not.toHaveBeenCalled()
  change()
  fireEvent.click(screen.getByText('Uploading'))
  await tick(30_000)
  expect(savePage).not.toHaveBeenCalled()
  cleanup()
  mount(null)
  change()
  await tick(30_000)
  expect(savePage).not.toHaveBeenCalled()
})
it('updates the edit URL after an autosaved title change and uses the new slug next time', async () => {
  mount()
  savePage.mockResolvedValue({ slug: 'new-title', title: 'New title', isDraft: false })
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New title' } })
  await tick(30_000)
  expect(session.navigate).toHaveBeenCalledWith({
    to: '/pages/$slug/edit',
    params: { slug: 'new-title' },
    replace: true,
  })
  change()
  await tick(30_000)
  expect(savePage.mock.calls[1][1]).toEqual({ slug: 'new-title' })
})
it('keeps unsaved changes and the exit guard after a failed save', async () => {
  mount()
  savePage.mockRejectedValue(new Error('offline'))
  change()
  await tick(30_000)
  await tick(1)
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.getByRole('status').textContent).toBe('Unsaved changes')
  expect(session.blocker.mock.calls.at(-1)[0].shouldBlockFn()).toBe(true)
  expect(session.navigate).not.toHaveBeenCalled()
})
it('manual publication cancels the scheduled autosave and opens the reader', async () => {
  mount()
  change()
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  await tick(1)
  expect(session.navigate).toHaveBeenCalledWith({ to: '/pages/$slug', params: { slug: 'title' } })
  expect(session.blocker.mock.calls.at(-1)[0].shouldBlockFn()).toBe(false)
  await tick(30_000)
  expect(savePage).toHaveBeenCalledTimes(1)
})

it('saves a draft without opening the reader and preserves draft status in later autosaves', async () => {
  mount()
  savePage.mockImplementation(async (payload) => ({ ...payload, slug: 'title' }))
  change()
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await tick(1)
  expect(savePage).toHaveBeenCalledWith({ ...initial, content: '<p>Changed</p>', isDraft: true }, { slug: 'title' })
  expect(session.navigate).not.toHaveBeenCalled()
  change('<p>More work</p>')
  await tick(30_000)
  expect(savePage).toHaveBeenLastCalledWith({ ...initial, content: '<p>More work</p>', isDraft: true }, { slug: 'title' })
})
it('creates a draft once, opens its edit URL and updates it on subsequent saves', async () => {
  mount(null)
  savePage.mockImplementation(async (payload) => ({ ...payload, slug: 'title' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await tick(1)
  expect(savePage.mock.calls[0][1]).toEqual({ sectionId: 'section' })
  expect(session.navigate).toHaveBeenCalledWith({ to: '/pages/$slug/edit', params: { slug: 'title' }, replace: true })
  change()
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await tick(1)
  expect(savePage.mock.calls[1][1]).toEqual({ slug: 'title' })
})
it('allows navigation immediately after saving even with the blocker callback from before the response', async () => {
  mount(null)
  let finish
  savePage.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  change()
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await tick(1)
  const guard = session.blocker.mock.calls.at(-1)[0].shouldBlockFn
  expect(guard()).toBe(true)
  session.navigate.mockImplementation(() => {
    expect(guard()).toBe(false)
  })
  await act(async () => { finish({ slug: 'title', isDraft: true }); await vi.advanceTimersByTimeAsync(1) })
  expect(session.navigate).toHaveBeenCalled()
})
it('retains changes after a failed manual draft save and allows retry', async () => {
  mount()
  savePage.mockRejectedValueOnce(new Error('offline')).mockImplementation(async (payload) => ({ ...payload, slug: 'title' }))
  change()
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await tick(1)
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(session.blocker.mock.calls.at(-1)[0].shouldBlockFn()).toBe(true)
  expect(session.navigate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await tick(1)
  expect(savePage).toHaveBeenLastCalledWith({ ...initial, content: '<p>Changed</p>', isDraft: true }, { slug: 'title' })
  expect(screen.queryByRole('alert')).toBeNull()
})
