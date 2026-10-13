import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import apiClient from './client'

import { useSettingsStore } from '@/stores/settings.store'

export type EditableSettingKey = 'ALLOW_SELF_REGISTRATION' | 'DEFAULT_USER_ROLE' | 'SITE_NAME'
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<Record<string, string>>('/api/v2/settings')
      useSettingsStore.setState({ settings: data })
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
    onSuccess: ({ key, value }) => {
      useSettingsStore.setState((s) => ({ settings: { ...s.settings, [key]: value } }))
      client.setQueryData<Record<string, string>>(['settings'], (current) => ({
        ...current,
        [key]: value,
      }))
    },
  })
}
