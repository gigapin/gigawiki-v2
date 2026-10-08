import { fetchProject, createProject, updateProject, deleteProject } from '../src/api/projects'
import { moveSection } from '../src/lib/section-order'
import { apiErrorMessage } from '../src/lib/api-error'
import { AxiosError } from 'axios'
import apiClient from '../src/api/client'

vi.mock('../src/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

beforeEach(() => vi.clearAllMocks())

describe('Project API contracts', () => {
  const project = { id: 'p1', name: 'Guide', slug: 'guide' }
  it('reads the project directly from the API response, without an envelope', async () => {
    apiClient.get.mockResolvedValue({ data: project })
    expect(await fetchProject('guide')).toEqual(project)
    expect(apiClient.get).toHaveBeenCalledWith('/api/v2/projects/guide')
  })
  it('creates a project within the selected subject', async () => {
    const input = { name: 'Guide', description: '', visibility: 'PRIVATE', subjectId: 's1' }
    apiClient.post.mockResolvedValue({ data: project })
    expect(await createProject(input)).toEqual(project)
    expect(apiClient.post).toHaveBeenCalledWith('/api/v2/projects', input)
  })
  it('uses PATCH and returns the new slug after renaming', async () => {
    const input = { name: 'New guide', description: '', visibility: 'PUBLIC' }
    apiClient.patch.mockResolvedValue({ data: { ...project, slug: 'new-guide' } })
    expect((await updateProject('guide', input)).slug).toBe('new-guide')
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v2/projects/guide', input)
  })
  it('passes deletion failures to the caller', async () => {
    apiClient.delete.mockRejectedValue(new Error('Forbidden'))
    await expect(deleteProject('guide')).rejects.toThrow('Forbidden')
  })
})

describe('Section reordering', () => {
  const sections = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('moves a section down without modifying the cached list', () => {
    expect(moveSection(sections, 'a', 'c').map((section) => section.id)).toEqual(['b', 'c', 'a'])
    expect(sections.map((section) => section.id)).toEqual(['a', 'b', 'c'])
  })
  it('moves a section up', () => {
    expect(moveSection(sections, 'c', 'a').map((section) => section.id)).toEqual(['c', 'a', 'b'])
  })
  it('does not save an unchanged or stale selection', () => {
    expect(moveSection(sections, 'a', 'a')).toBeNull()
    expect(moveSection(sections, 'deleted', 'a')).toBeNull()
    expect(moveSection([], 'a', 'b')).toBeNull()
  })
})

describe('User-facing API errors', () => {
  function error(data) {
    return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      data,
      status: 409,
    })
  }
  it('handles both route errors and the global Prisma conflict envelope', () => {
    expect(apiErrorMessage(error({ error: 'Forbidden' }))).toBe('Forbidden')
    expect(
      apiErrorMessage(
        error({ success: false, error: { code: 'CONFLICT', message: 'Name already exists' } }),
      ),
    ).toBe('Name already exists')
  })
  it('shows a readable fallback for network errors', () => {
    expect(apiErrorMessage(new AxiosError('Network Error'))).toContain('Unable to reach the server')
  })
})
