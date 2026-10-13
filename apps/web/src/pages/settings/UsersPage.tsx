import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { isAxiosError } from 'axios'

import {
  useUsers,
  useUpdateRole,
  useDeleteUser,
  useDeletionPreview,
  type AdminUser,
} from '@/api/users'
import { useAuthStore } from '@/stores/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/shared/Pagination'
import { ErrorState, EmptyState, ListSkeleton } from '@/components/shared/ResourceState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const COUNT_LABELS: Record<string, string> = {
  pages: 'Pages deleted',
  projects: 'Projects deleted',
  subjects: 'Subjects deleted',
  sections: 'Sections deleted',
  revisions: 'Revisions deleted',
  comments: 'Comments deleted',
  tags: 'Tags deleted',
  transferredProjects: 'Projects transferred to you',
  transferredSubjects: 'Subjects transferred to you',
  transferredPages: 'Pages preserved and transferred to you',
  promotedReplies: 'Other users’ replies preserved',
  preservedImages: 'Images preserved',
  transferredInvites: 'Invitations transferred to you',
}

function DeleteUserDialog({
  user,
  onClose,
  onDeleted,
}: {
  user: AdminUser
  onClose: () => void
  onDeleted: () => void
}) {
  const preview = useDeletionPreview(user.id)
  const mutation = useDeleteUser()
  const changed = isAxiosError(mutation.error) && mutation.error.response?.status === 409
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (mutation.isPending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Delete {user.name}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the account and its own content. Pages created by other users
            are preserved.
          </DialogDescription>
        </DialogHeader>
        <p className="break-all text-sm">{user.email}</p>
        {preview.isPending && <ListSkeleton />}
        {preview.isError && (
          <ErrorState
            description={apiErrorMessage(preview.error)}
            onRetry={() => void preview.refetch()}
          />
        )}
        {preview.data && (
          <ul className="max-h-60 space-y-1 overflow-auto text-sm">
            {Object.entries(preview.data.counts).map(([key, count]) => (
              <li key={key}>
                {COUNT_LABELS[key] ?? key}: {count}
              </li>
            ))}
          </ul>
        )}
        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(mutation.error)}
          </p>
        )}
        {changed && (
          <Button
            variant="outline"
            onClick={async () => {
              const result = await preview.refetch()
              if (result.isSuccess) mutation.reset()
            }}
          >
            Review new preview
          </Button>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={
              !preview.data ||
              preview.isFetching ||
              preview.isError ||
              mutation.isPending ||
              changed
            }
            onClick={() => {
              if (preview.data && !mutation.isPending)
                mutation.mutate(
                  { id: user.id, fingerprint: preview.data.fingerprint },
                  { onSuccess: onDeleted },
                )
            }}
          >
            {mutation.isPending ? 'Deleting…' : 'Delete account and content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UsersPage() {
  const account = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const query = useUsers(page, search)
  const mutation = useUpdateRole()
  const navigate = useNavigate()
  useEffect(() => {
    if (account && account.role !== 'ADMIN') void navigate({ to: '/settings/profile' })
  }, [account, navigate])
  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.avatar?.url && (
            <img
              src={row.original.avatar.url}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          )}
          <span>{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <select
          aria-label={`Role for ${row.original.name}`}
          className="rounded-md border bg-background p-2"
          value={row.original.role}
          disabled={mutation.isPending}
          onChange={(e) =>
            mutation.mutate({ id: row.original.id, role: e.target.value as AdminUser['role'] })
          }
        >
          <option value="GUEST">Guest</option>
          <option value="EDITOR">Editor</option>
          <option value="ADMIN">Admin</option>
        </select>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          disabled={row.original.id === account?.id || mutation.isPending}
          onClick={() => setDeleting(row.original)}
        >
          Delete {row.original.name}
        </Button>
      ),
    },
  ]
  // TanStack Table owns mutable row models; do not let React Compiler memoize this call.

  const table = useReactTable({
    data: query.data?.users ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })
  if (account?.role !== 'ADMIN') return <p role="alert">Admin access required.</p>
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Users</h2>
      <Input
        aria-label="Search users"
        placeholder="Search name or email"
        maxLength={100}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
      />
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(mutation.error)}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="text-sm">
          Role updated.
        </p>
      )}
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <>
          {!query.data.users.length ? (
            <EmptyState
              title="No users found"
              action={
                page > 1 ? (
                  <Button onClick={() => setPage(page - 1)}>Previous page</Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => (
                        <th className="p-3" scope="col" key={header.id}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr className="border-t" key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td className="p-3" key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={page}
            total={query.data.total}
            limit={20}
            onChange={setPage}
            disabled={query.isFetching}
          />
        </>
      )}
      {deleting && (
        <DeleteUserDialog
          user={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null)
            if (query.data?.users.length === 1 && page > 1) setPage(page - 1)
          }}
        />
      )}
    </div>
  )
}
