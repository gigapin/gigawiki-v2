import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import apiClient from './client'

import { useAuthStore } from '@/stores/auth.store'

export type CommentResource = { type: 'pages' | 'projects' | 'sections'; id: string; slug: string }
export interface CommentItemData {
  id: string
  body: string
  parentId: string | null
  userId: string
  user: { id: string; name: string; slug: string; avatar?: { url: string } | null }
  createdAt: string
  updatedAt: string
  replies: CommentItemData[]
}
export interface CommentsResponse {
  comments: CommentItemData[]
  total: number
  page: number
  limit: number
}
export type CommentAction =
  | { type: 'create'; body: string; parentId?: string }
  | { type: 'update'; id: string; body: string }
  | { type: 'delete'; id: string }

export function useComments(resource: CommentResource, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['comments', resource.type, resource.slug, page, limit],
    queryFn: ({ signal }) =>
      apiClient
        .get<CommentsResponse>(`/api/v2/${resource.type}/${resource.slug}/comments`, {
          params: { page, limit },
          signal,
        })
        .then((r) => r.data),
  })
}

export function useCommentMutation(resource: CommentResource) {
  const client = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const prefix = ['comments', resource.type, resource.slug]
  return useMutation({
    mutationFn: async (action: CommentAction) => {
      if (action.type === 'delete')
        return apiClient.delete(`/api/v2/comments/${action.id}`).then(() => undefined)
      if (action.type === 'update')
        return apiClient
          .patch<CommentItemData>(`/api/v2/comments/${action.id}`, { body: action.body })
          .then((r) => r.data)
      const field = { pages: 'pageId', projects: 'projectId', sections: 'sectionId' }[resource.type]
      return apiClient
        .post<CommentItemData>('/api/v2/comments', {
          body: action.body,
          [field]: resource.id,
          ...(action.parentId ? { parentId: action.parentId } : {}),
        })
        .then((r) => r.data)
    },
    onMutate: async (action) => {
      await client.cancelQueries({ queryKey: prefix })
      const snapshots = client.getQueriesData<CommentsResponse>({ queryKey: prefix })
      const deletingRoot =
        action.type === 'delete' &&
        snapshots.some(([, value]) => value?.comments.some((root) => root.id === action.id))
      const now = new Date().toISOString()
      const temporary: CommentItemData = {
        id: `pending-${crypto.randomUUID()}`,
        body: action.type === 'delete' ? '' : action.body,
        parentId: action.type === 'create' ? (action.parentId ?? null) : null,
        userId: user?.id ?? '',
        user: { id: user?.id ?? '', name: user?.name ?? '', slug: user?.slug ?? '' },
        createdAt: now,
        updatedAt: now,
        replies: [],
      }
      client.setQueriesData<CommentsResponse>({ queryKey: prefix }, (current) => {
        if (!current) return current
        let total = current.total
        let comments = current.comments.map((root) => ({
          ...root,
          replies: [...(root.replies ?? [])],
        }))
        if (action.type === 'create') {
          if (action.parentId)
            comments = comments.map((root) =>
              root.id === action.parentId
                ? { ...root, replies: [...root.replies, temporary] }
                : root,
            )
          else {
            total++
            // Roots are sorted oldest first: append only where the new root belongs.
            if (current.page === Math.ceil(total / current.limit)) comments.push(temporary)
          }
        } else {
          if (deletingRoot) total--
          comments = comments
            .filter((root) => action.type !== 'delete' || root.id !== action.id)
            .map((root) => ({
              ...root,
              ...(action.type === 'update' && root.id === action.id
                ? { body: action.body, updatedAt: now }
                : {}),
              replies: root.replies
                .filter((reply) => action.type !== 'delete' || reply.id !== action.id)
                .map((reply) =>
                  action.type === 'update' && reply.id === action.id
                    ? { ...reply, body: action.body, updatedAt: now }
                    : reply,
                ),
            }))
        }
        return { ...current, total, comments }
      })
      return { snapshots }
    },
    onError: (_error, _action, context) => {
      context?.snapshots.forEach(([key, value]) => client.setQueryData(key, value))
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: prefix }),
        client.invalidateQueries({
          queryKey: [
            resource.type === 'pages'
              ? 'page'
              : resource.type === 'projects'
                ? 'project'
                : 'section',
            resource.slug,
          ],
          exact: true,
        }),
        client.invalidateQueries({ queryKey: ['activities'] }),
        client.invalidateQueries({ queryKey: ['activities-count'] }),
      ])
    },
  })
}
