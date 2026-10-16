import { lazy, Suspense } from 'react'

const Content = lazy(() =>
  import('@/components/pages/PageContent').then((module) => ({ default: module.PageContent })),
)
export function Description({
  value,
  format,
}: {
  value: string | null | undefined
  format?: string
}) {
  if (!value) return null
  if (format !== 'html') return <span className="whitespace-pre-wrap">{value}</span>
  return (
    <Suspense fallback={<span>Loading description…</span>}>
      <Content key={value} content={value} />
    </Suspense>
  )
}
