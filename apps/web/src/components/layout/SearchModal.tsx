import { useCallback, useEffect, useRef, useState } from 'react'

import apiClient from '@/api/client'
import { Icon } from '@/components/ui/icon'

interface SearchResult {
  id: string
  title: string
  type: 'PAGE' | 'PROJECT' | 'SECTION'
  project?: { name: string }
  subject?: { name: string }
  slug: string
}

interface SearchResponse {
  results: SearchResult[]
}

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setFocusedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await apiClient.get<SearchResponse>(`/api/v2/search?q=${encodeURIComponent(q)}`)
      setResults(res.data.results ?? [])
      setFocusedIndex(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 300)
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, results.length, onClose])

  if (!open) return null

  const typeIcon = (type: SearchResult['type']) =>
    type === 'PAGE'
      ? ('doc' as const)
      : type === 'PROJECT'
        ? ('folder' as const)
        : ('hash' as const)

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
          boxShadow: '0 24px 60px -16px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          fontFamily: "'Geist', system-ui, sans-serif",
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
            placeholder="Search pages, projects, people…"
            style={{
              flex: 1,
              border: 0,
              outline: 'none',
              background: 'transparent',
              fontFamily: "'Geist', system-ui, sans-serif",
              fontSize: 15,
              color: 'var(--db-ink)',
            }}
          />
          {loading && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--db-muted)',
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              …
            </span>
          )}
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
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
                  <Icon name={typeIcon(r.type)} size={13} />
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
                  {(r.project || r.subject) && (
                    <div style={{ fontSize: 11.5, color: 'var(--db-muted)', marginTop: 1 }}>
                      {r.subject?.name && <span>{r.subject.name}</span>}
                      {r.subject?.name && r.project?.name && (
                        <span style={{ margin: '0 5px', color: 'var(--db-muted-2)' }}>›</span>
                      )}
                      {r.project?.name && <span>{r.project.name}</span>}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    color: 'var(--db-muted-2)',
                    fontFamily: "'Geist Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}
                >
                  {r.type.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* empty state */}
        {!loading && query.trim() !== '' && results.length === 0 && (
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
                    fontFamily: "'Geist Mono', monospace",
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
