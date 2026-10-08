import apiClient from './client'

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024

export async function uploadInlineImage(file: File): Promise<{ id: string; url: string }> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Choose a JPEG, PNG, WebP or GIF image.')
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Images must be at most 10 MB.')
  const body = new FormData()
  body.append('file', file)
  const { data } = await apiClient.post<{ id: string; url: string }>('/api/v2/images', body, {
    params: { type: 'INLINE' },
  })
  return data
}
