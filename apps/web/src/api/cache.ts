import type { QueryClient } from '@tanstack/react-query'

import { queryKeys } from './query-keys'

export function invalidateResources(
  client: QueryClient,
  resources: string[],
  refetchType: 'active' | 'none' = 'none',
) {
  return Promise.all(
    resources.map((resource) =>
      client.invalidateQueries({
        queryKey: queryKeys.root(resource),
        refetchType,
      }),
    ),
  )
}
export const pageDependencies = [
  'pages',
  'sections',
  'section',
  'project',
  'projects',
  'subject',
  'subjects',
  'stats',
  'activities',
  'activities-count',
  'favorites',
  'favorites-count',
  'views',
  'search',
]
export const subjectDependencies = [
  'subject',
  'subjects',
  'project',
  'projects',
  'sections',
  'section',
  'pages',
  'page',
  'views',
  'favorites',
  'favorites-count',
  'stats',
  'search',
  'activities',
  'activities-count',
]
