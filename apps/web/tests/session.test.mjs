import axios from 'axios'
import { useAuthStore } from '../src/stores/auth.store'
import { useSettingsStore } from '../src/stores/settings.store'

vi.mock('../src/api/config', () => ({ API_BASE_URL: '' }))

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, accessToken: null, isInitialized: false, isLoading: false })
  useSettingsStore.setState({ settings: {} })
})

it('restores the session using the actual refresh and me response shapes', async () => {
  const user = { id: 'editor', name: 'Alex', role: 'EDITOR' }
  axios.post.mockResolvedValue({ data: { accessToken: 'token' } })
  axios.get.mockResolvedValue({ data: { user } })
  await useAuthStore.getState().initAuth()
  expect(useAuthStore.getState()).toMatchObject({
    user,
    accessToken: 'token',
    isInitialized: true,
    isLoading: false,
  })
  expect(axios.post).toHaveBeenCalledWith('/api/v2/auth/refresh', {}, { withCredentials: true })
  expect(axios.get).toHaveBeenCalledWith('/api/v2/auth/me', {
    headers: { Authorization: 'Bearer token' },
    withCredentials: true,
  })
  await useAuthStore.getState().initAuth()
  expect(axios.post).toHaveBeenCalledTimes(1)
})

it('clears the session when refresh is rejected', async () => {
  axios.post.mockRejectedValue(new Error('Expired refresh token'))
  await useAuthStore.getState().initAuth()
  expect(useAuthStore.getState()).toMatchObject({
    user: null,
    accessToken: null,
    isInitialized: true,
    isLoading: false,
  })
})

it('loads public settings without expecting a data envelope', async () => {
  axios.get.mockResolvedValue({ data: { SITE_NAME: 'GigaWiki', ALLOW_SELF_REGISTRATION: 'false' } })
  await useSettingsStore.getState().fetchSettings()
  expect(useSettingsStore.getState().getSetting('SITE_NAME')).toBe('GigaWiki')
  expect(useSettingsStore.getState().getSetting('ALLOW_SELF_REGISTRATION')).toBe('false')
})
