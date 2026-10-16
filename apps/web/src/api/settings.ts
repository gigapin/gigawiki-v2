export { fetchPublicSettings } from './public-settings'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from './query-keys'
import apiClient from './client'

import { useSettingsStore } from '@/stores/settings.store'

export type EditableSettingKey =
  | 'ALLOW_SELF_REGISTRATION'
  | 'DEFAULT_USER_ROLE'
  | 'COMMENTS_ENABLED'
  | 'SITE_NAME'
  | 'SITE_LOGO_IMAGE_ID'
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: async ({ signal }) => {
      const data = await fetchSettings(signal)
      if (!signal.aborted) useSettingsStore.setState({ settings: data })
      return data
    },
  })
}
export function useUpdateSetting() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: EditableSettingKey; value: string }) =>
      apiClient
        .put<{ key: string; value: string }>(`/api/v2/settings/${key}`, { value })
        .then((r) => r.data),
    onSuccess: async ({ key, value }) => {
      if (key === 'COMMENTS_ENABLED') await client.invalidateQueries({ queryKey: ['comments'] })
      await client.cancelQueries({ queryKey: queryKeys.settings() })
      useSettingsStore.setState((s) => ({ settings: { ...s.settings, [key]: value } }))
      client.setQueriesData<Record<string, string>>(
        { queryKey: queryKeys.settings() },
        (current) => (current ? { ...current, [key]: value } : current),
      )
      await client.invalidateQueries({
        queryKey: queryKeys.settings(),
        refetchType: key === 'SITE_LOGO_IMAGE_ID' ? 'active' : 'none',
      })
    },
  })
}

export function publicSettingsOptions() {
  return {
    queryKey: queryKeys.publicSettings(),
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchSettings(signal),
    staleTime: 0,
  }
}

export function fetchSettings(signal?: AbortSignal) {
  return apiClient.get<Record<string, string>>('/api/v2/settings', { signal }).then((r) => r.data)
}
