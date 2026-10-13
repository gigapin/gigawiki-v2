// Keep resource prefixes stable: mutations invalidate every pagination/filter variant.
export const queryKeys = {
  root: (resource: string) => [resource] as const,
  subjects: (params: object = {}) => ['subjects', params] as const,
  subject: (slug: string | undefined) => ['subject', slug] as const,
  projects: (slug: string | undefined, params: object = {}) =>
    ['subject', slug, 'projects', params] as const,
  project: (slug: string | undefined) => ['project', slug] as const,
  sections: (slug: string) => ['sections', slug] as const,
  section: (slug: string | undefined) => ['section', slug] as const,
  pages: (slug: string | undefined, page = 1, limit = 10) =>
    ['pages', 'section', slug, page, limit] as const,
  page: (slug: string | undefined) => ['page', slug] as const,
  search: (q: string, page = 1, limit = 20) => ['search', q, page, limit] as const,
  revisions: (slug: string, page = 1, limit = 10) => ['revisions', slug, page, limit] as const,
  revision: (slug: string, number: number | undefined) => ['revision', slug, number] as const,
  comments: (type: string, slug: string, ...pagination: number[]) =>
    ['comments', type, slug, ...pagination] as const,
  tags: (prefix: string) => ['tags', prefix] as const,
  favorites: (countOnly: boolean, userId: string | undefined, page: number, limit: number) =>
    [countOnly ? 'favorites-count' : 'favorites', userId, page, limit] as const,
  views: (userId: string | undefined, limit: number) => ['views', userId, 1, limit] as const,
  activities: (params: object = {}, countOnly = false) =>
    [countOnly ? 'activities-count' : 'activities', params] as const,
  users: (params: object) => ['admin-users', params] as const,
  user: (id: string | undefined) => ['user', id] as const,
  me: (id: string | undefined) => ['me', id] as const,
  deletionPreview: (id: string | null) => ['user-deletion-preview', id] as const,
  invites: (page: number) => ['admin-invites', page] as const,
  settings: () => ['settings'] as const,
  publicSettings: () => ['settings', 'public'] as const,
}
