import axios from 'axios'

import { API_BASE_URL } from './config'
export function fetchPublicSettings(signal?: AbortSignal) {
  return axios
    .get<
      Record<string, string>
    >(`${API_BASE_URL}/api/v2/settings`, { withCredentials: true, ...(signal ? { signal } : {}) })
    .then((r) => r.data)
}
