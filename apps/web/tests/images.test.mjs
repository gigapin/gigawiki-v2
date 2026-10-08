// @vitest-environment jsdom
import { uploadInlineImage, MAX_IMAGE_SIZE } from '../src/api/images'
import apiClient from '../src/api/client'

vi.mock('../src/api/client', () => ({ default: { post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

it('sends multipart with INLINE in the query and uses the actual response shape', async () => {
  const file = new File(['bytes'], 'image.png', { type: 'image/png' })
  apiClient.post.mockResolvedValue({ data: { id: 'image', url: '/uploads/image.webp' } })
  await expect(uploadInlineImage(file)).resolves.toEqual({
    id: 'image',
    url: '/uploads/image.webp',
  })
  const [url, form, options] = apiClient.post.mock.calls[0]
  expect(url).toBe('/api/v2/images')
  expect(form.get('file')).toBe(file)
  expect(options).toEqual({ params: { type: 'INLINE' } })
})

it('rejects unsupported files before sending a request', async () => {
  await expect(
    uploadInlineImage(new File(['svg'], 'image.svg', { type: 'image/svg+xml' })),
  ).rejects.toThrow('JPEG')
  expect(apiClient.post).not.toHaveBeenCalled()
})

it('rejects files over the API size limit before sending a request', async () => {
  const file = new File(['bytes'], 'image.png', { type: 'image/png' })
  Object.defineProperty(file, 'size', { value: MAX_IMAGE_SIZE + 1 })
  await expect(uploadInlineImage(file)).rejects.toThrow('10 MB')
  expect(apiClient.post).not.toHaveBeenCalled()
})
