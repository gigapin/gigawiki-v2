import apiClient from '../src/api/client'
import { useAuthStore } from '../src/stores/auth.store'

beforeEach(() =>
  useAuthStore.setState({ user: { id: 'old-user', role: 'ADMIN' }, accessToken: 'old-token' }),
)
afterEach(() => useAuthStore.setState({ user: null, accessToken: null }))
function capture(config) {
  return apiClient
    .get('/api/v2/auth/me', {
      ...config,
      adapter: async (request) => ({
        data: request.headers.Authorization,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: request,
      }),
    })
    .then((response) => response.data)
}
it('preserves the new login token instead of replacing it with the previous account token', async () => {
  expect(await capture({ headers: { Authorization: 'Bearer new-user-token' } })).toBe(
    'Bearer new-user-token',
  )
})
it('uses the current session token when no token is explicitly supplied', async () => {
  expect(await capture()).toBe('Bearer old-token')
})
