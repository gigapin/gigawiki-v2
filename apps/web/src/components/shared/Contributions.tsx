import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Pagination } from './Pagination'
import { ErrorState } from './ResourceState'

import { useParityRead, type ResourceLink } from '@/api/parity'
import { apiErrorMessage } from '@/lib/api-error'

export function Contributions() {
  const [page, setPage] = useState(1)
  const query = useParityRead<{
    subjects: number
    projects: number
    pagesCreated: number
    pagesLastEdited: number
    pages: ResourceLink[]
    total: number
  }>('contributions', '/users/me/contributions', { page, limit: 10 })
  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-xl">Your contributions</h2>
      {query.isPending ? (
        <p>Loading…</p>
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <p>
            Subjects created: {query.data.subjects} · Projects created: {query.data.projects} ·
            Pages created: {query.data.pagesCreated} · Pages last edited by you:{' '}
            {query.data.pagesLastEdited}
          </p>
          <h3>Latest pages edited by you</h3>
          {query.data.pages.map((item) => (
            <Link key={item.id} className="block" to="/pages/$slug" params={{ slug: item.slug }}>
              {item.title}
            </Link>
          ))}
          <Pagination page={page} limit={10} total={query.data.total} onChange={setPage} />
        </>
      )}
    </section>
  )
}
