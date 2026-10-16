import { useState } from 'react'

import { useParityAction, useParityRead } from '@/api/parity'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/shared/Pagination'
import { apiErrorMessage } from '@/lib/api-error'

type Report = {
  state: string
  error?: string
  warnings?: string[]
  note?: string
  rows?: { id: string | null; path: string; driver: string; references: number; status: string }[]
  total?: number
}
export function ImageAuditPage() {
  const [id, setId] = useState('')
  const [page, setPage] = useState(1)
  const start = useParityAction<{ id: string }>('/admin/images/audits')
  const query = useParityRead<Report>(
    'image-audit',
    `/admin/images/audits/${id}`,
    { page, limit: 20 },
    Boolean(id),
    true,
  )
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Image audit</h2>
      <p>
        Inspect managed local/S3 uploads and references. This report never moves or deletes files.
        Candidates may have external consumers.
      </p>
      <Button
        disabled={
          start.isPending ||
          Boolean(id && query.data && !['completed', 'failed'].includes(query.data.state))
        }
        onClick={() =>
          start.mutate(
            {},
            {
              onSuccess: (result) => {
                setId(result.id)
                setPage(1)
              },
            },
          )
        }
      >
        Start read-only scan
      </Button>
      {(start.isError || query.isError) && (
        <p role="alert">{apiErrorMessage(start.error ?? query.error)}</p>
      )}
      {query.data && (
        <>
          <p role="status">{query.data.state}</p>
          {query.data.error && <p role="alert">{query.data.error}</p>}
          {query.data.warnings?.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Storage</th>
                  <th>References</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {query.data.rows?.map((row, index) => (
                  <tr key={`${row.driver}:${row.path}:${index}`}>
                    <td className="break-all border p-2">{row.path}</td>
                    <td className="border p-2">{row.driver}</td>
                    <td className="border p-2">{row.references}</td>
                    <td className="border p-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={query.data.total ?? 0} onChange={setPage} />
        </>
      )}
    </section>
  )
}
