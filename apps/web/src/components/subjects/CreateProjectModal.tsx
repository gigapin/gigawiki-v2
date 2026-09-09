import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import apiClient from '@/api/client'

interface Props {
  open: boolean
  subjectId: string
  subjectSlug: string
  onClose: () => void
}

function createProject(body: {
  name: string
  subjectId: string
  description?: string
  visibility: 'PUBLIC' | 'PRIVATE'
}) {
  return apiClient.post('/api/v2/projects', body).then((r) => r.data)
}

export function CreateProjectModal({ open, subjectId, subjectSlug, onClose }: Props) {
  const queryClient = useQueryClient()
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setVisibility('PUBLIC')
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') mutation.mutate()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, name])

  const mutation = useMutation({
    mutationFn: () =>
      createProject({
        name: name.trim(),
        subjectId,
        description: description.trim() || undefined,
        visibility,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject', subjectSlug, 'projects'] })
      queryClient.invalidateQueries({ queryKey: ['subject', subjectSlug] })
      onClose()
    },
  })

  if (!open) return null

  const canSubmit = name.trim().length > 0 && !mutation.isPending

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--db-surface)',
          border: '1px solid var(--db-line)',
          borderRadius: 16,
          padding: '28px 32px 24px',
          width: 460,
          maxWidth: 'calc(100vw - 32px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <h2
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 26,
            color: 'var(--db-ink)',
            margin: '0 0 24px',
          }}
        >
          New project
        </h2>

        {/* name */}
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--db-muted)',
              marginBottom: 6,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Name
          </span>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={190}
            placeholder="Project name"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--db-bg-2)',
              border: '1px solid var(--db-line)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 14,
              color: 'var(--db-ink)',
              outline: 'none',
              fontFamily: "'Geist', system-ui, sans-serif",
            }}
          />
        </label>

        {/* description */}
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--db-muted)',
              marginBottom: 6,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Description{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              (optional)
            </span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What is this project about?"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--db-bg-2)',
              border: '1px solid var(--db-line)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 14,
              color: 'var(--db-ink)',
              outline: 'none',
              resize: 'vertical',
              fontFamily: "'Geist', system-ui, sans-serif",
              lineHeight: 1.55,
            }}
          />
        </label>

        {/* visibility */}
        <div style={{ marginBottom: 28 }}>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--db-muted)',
              marginBottom: 8,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Visibility
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['PUBLIC', 'PRIVATE'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: `1px solid ${visibility === v ? 'var(--db-em)' : 'var(--db-line)'}`,
                  background: visibility === v ? 'var(--db-em-soft)' : 'var(--db-bg-2)',
                  color: visibility === v ? 'var(--db-em-deep)' : 'var(--db-muted)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'Geist', system-ui, sans-serif",
                }}
              >
                {v.charAt(0) + v.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {mutation.isError && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'color-mix(in oklch, var(--db-rose) 12%, var(--db-surface))',
              border: '1px solid color-mix(in oklch, var(--db-rose) 35%, transparent)',
              color: 'var(--db-rose-t)',
              fontSize: 13,
            }}
          >
            Failed to create project. Please try again.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--db-line)',
              background: 'transparent',
              color: 'var(--db-muted)',
              fontSize: 13.5,
              cursor: 'pointer',
              fontFamily: "'Geist', system-ui, sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid color-mix(in oklch, var(--db-em) 35%, transparent)',
              background: canSubmit ? 'var(--db-em-soft)' : 'var(--db-bg-2)',
              color: canSubmit ? 'var(--db-em-deep)' : 'var(--db-muted-2)',
              fontSize: 13.5,
              fontWeight: 500,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: "'Geist', system-ui, sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            {mutation.isPending ? (
              <>
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                Creating…
              </>
            ) : (
              'Create project'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
