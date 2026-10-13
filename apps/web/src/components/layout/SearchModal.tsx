import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useSearch } from '@/api/pages'
import { Icon } from '@/components/ui/icon'

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: Props) {
  return open ? <SearchDialog onClose={onClose} /> : null
}

function SearchDialog({ onClose }: Omit<Props, 'open'>) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchQuery = useSearch(debouncedQuery)
  const results = useMemo(
    () => (query.trim() === debouncedQuery.trim() ? (searchQuery.data?.results ?? []) : []),
    [query, debouncedQuery, searchQuery.data],
  )
  const [focusedIndex, setFocusedIndex] = useState(0)
  const loading =
    searchQuery.isFetching || (query.trim().length >= 2 && query.trim() !== debouncedQuery.trim())
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 30)
    return () => {
      clearTimeout(focusTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setFocusedIndex(0)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(val), 300)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Enter' && results[focusedIndex]) {
        e.preventDefault()
        onClose()
        void navigate({ to: '/pages/$slug', params: { slug: results[focusedIndex].slug } })
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(0, Math.min(i + 1, results.length - 1)))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [results, focusedIndex, onClose, navigate])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          background: 'var(--db-surface)',
          border: '1px solid var(--db-line)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-dialog)',
          overflow: 'hidden',
          fontFamily: 'var(--font-ui)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: results.length > 0 || loading ? '1px solid var(--db-line)' : undefined,
          }}
        >
          <span style={{ color: 'var(--db-muted)', flexShrink: 0 }}>
            <Icon name="search" size={16} stroke={1.8} />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="Search pages…"
            style={{
              flex: 1,
              border: 0,
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-ui)',
              fontSize: 15,
              color: 'var(--db-ink)',
            }}
          />
          {loading && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--db-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              …
            </span>
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--db-muted)',
              background: 'var(--db-bg-2)',
              border: '1px solid var(--db-line)',
              padding: '2px 7px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
            onClick={onClose}
          >
            Esc
          </span>
        </div>

        {/* results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 6px' }}>
            {results.map((r, i) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onClose()
                  void navigate({ to: '/pages/$slug', params: { slug: r.slug } })
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: i === focusedIndex ? 'var(--db-bg-2)' : 'transparent',
                }}
                onMouseEnter={() => setFocusedIndex(i)}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--db-em-soft)',
                    color: 'var(--db-em-deep)',
                  }}
                >
                  <Icon name="doc" size={13} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: 'var(--db-ink)',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.title}
                  </div>
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    color: 'var(--db-muted-2)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}
                >
                  page
                </span>
              </div>
            ))}
          </div>
        )}

        {searchQuery.isError && query.trim() === debouncedQuery.trim() && (
          <p role="alert" className="p-4 text-sm text-destructive">
            Search unavailable. <button onClick={() => void searchQuery.refetch()}>Retry</button>
          </p>
        )}

        {/* empty state */}
        {!searchQuery.isError && !loading && query.trim().length >= 2 && results.length === 0 && (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              fontSize: 13.5,
              color: 'var(--db-muted)',
            }}
          >
            No results for <b style={{ color: 'var(--db-ink-2)' }}>"{query}"</b>
          </div>
        )}

        {/* hint footer */}
        {results.length === 0 && !loading && query.trim() === '' && (
          <div
            style={{
              padding: '14px 16px',
              display: 'flex',
              gap: 20,
              fontSize: 11.5,
              color: 'var(--db-muted-2)',
            }}
          >
            {[
              ['↑↓', 'navigate'],
              ['↵', 'open'],
              ['Esc', 'close'],
            ].map(([key, label]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    background: 'var(--db-bg-2)',
                    border: '1px solid var(--db-line)',
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  {key}
                </span>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
