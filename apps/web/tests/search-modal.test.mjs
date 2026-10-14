// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react'
import { SearchModal } from '../src/components/layout/SearchModal'
import apiClient from '../src/api/client'
const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('../src/api/client', () => ({ default: { get: vi.fn() } }))
let client
beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.useRealTimers()
})
function mount() {
  const onClose = vi.fn()
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(SearchModal, { open: true, onClose }),
    ),
  )
  return { input: screen.getByPlaceholderText(/Search/i), onClose }
}
async function tick(ms) {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}
it('debounces typing for 300 ms and opens the selected page with Enter', async () => {
  vi.useFakeTimers()
  apiClient.get.mockResolvedValue({
    data: { results: [{ id: 'page', title: 'Guide', slug: 'guide' }] },
  })
  const { input, onClose } = mount()
  fireEvent.change(input, { target: { value: 'gu' } })
  await tick(299)
  expect(apiClient.get).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { value: 'guide' } })
  await tick(299)
  expect(apiClient.get).not.toHaveBeenCalled()
  await tick(1)
  expect(apiClient.get).toHaveBeenCalledTimes(1)
  await tick(1)
  expect(screen.getByText('Guide')).toBeTruthy()
  fireEvent.keyDown(document, { key: 'Enter' })
  expect(navigate).toHaveBeenCalledWith({ to: '/pages/$slug', params: { slug: 'guide' } })
  expect(onClose).toHaveBeenCalledTimes(1)
})
it('hides results immediately when typing another search', async () => {
  vi.useFakeTimers()
  apiClient.get.mockResolvedValue({
    data: { results: [{ id: 'old', title: 'Old guide', slug: 'old-guide' }] },
  })
  const { input } = mount()
  fireEvent.change(input, { target: { value: 'old' } })
  await tick(300)
  await tick(1)
  expect(screen.getByText('Old guide')).toBeTruthy()
  fireEvent.change(input, { target: { value: 'new' } })
  expect(screen.queryByText('Old guide')).toBeNull()
  fireEvent.keyDown(document, { key: 'Enter' })
  expect(navigate).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { value: '' } })
  await tick(300)
  expect(apiClient.get).toHaveBeenCalledTimes(1)
})
it('distinguishes failed searches from empty results and permits retry', async () => {
  apiClient.get
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue({ data: { results: [{ id: 'page', title: 'Guide', slug: 'guide' }] } })
  const { input } = mount()
  fireEvent.change(input, { target: { value: 'guide' } })
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toContain('Search unavailable')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByText('Guide')
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
})
it('groups results by project and preserves keyboard navigation', async () => {
  vi.useFakeTimers()
  apiClient.get.mockResolvedValue({
    data: {
      results: [
        { id: 'z', title: 'Zulu page', slug: 'zulu', projectId: 'z', projectName: 'Zulu project' },
        {
          id: 'a',
          title: 'Alpha page',
          slug: 'alpha',
          projectId: 'a',
          projectName: 'Alpha project',
        },
      ],
    },
  })
  const { input } = mount()
  fireEvent.change(input, { target: { value: 'page' } })
  await tick(300)
  await tick(1)
  expect(screen.getAllByRole('heading').map((item) => item.textContent)).toEqual([
    'Alpha project',
    'Zulu project',
  ])
  fireEvent.keyDown(document, { key: 'ArrowDown' })
  fireEvent.keyDown(document, { key: 'Enter' })
  expect(navigate).toHaveBeenCalledWith({ to: '/pages/$slug', params: { slug: 'zulu' } })
})
