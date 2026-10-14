import { useState } from 'react'

import { useUsers } from '@/api/users'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
export function OwnerPicker({
  value,
  onChange,
  disabled,
}: {
  value?: string
  onChange: (id: string) => void
  disabled: boolean
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const users = useUsers({ page, limit: 100, search })
  return (
    <div className="space-y-2">
      <label htmlFor="owner-search">Find page owner</label>
      <Input
        id="owner-search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value)
          setPage(1)
        }}
        disabled={disabled}
      />
      <select
        aria-label="Page owner"
        className="w-full rounded border p-2"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {!users.data?.users.some((user) => user.id === value) && (
          <option value={value ?? ''}>Current owner</option>
        )}
        {users.data?.users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      {page > 1 && (
        <Button type="button" variant="outline" onClick={() => setPage((number) => number - 1)}>
          Previous users
        </Button>
      )}
      {page * 100 < (users.data?.total ?? 0) && (
        <Button type="button" variant="outline" onClick={() => setPage((number) => number + 1)}>
          More users
        </Button>
      )}
      {users.isError && (
        <p role="alert">
          Users unavailable. <button onClick={() => void users.refetch()}>Retry</button>
        </p>
      )}
    </div>
  )
}
