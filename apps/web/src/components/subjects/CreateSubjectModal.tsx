import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { COVER_COLORS } from '@/styles/cover-colors'
import { createSubject } from '@/api/subjects'
import { useAuthStore } from '@/stores/auth.store'
import { Icon, type IconName } from '@/components/ui/icon'

/* ── constants ── */

const ICON_PICKS: IconName[] = [
  'book',
  'folder',
  'doc',
  'hash',
  'tag',
  'globe',
  'spark',
  'lightning',
  'msg',
  'star',
  'users',
  'history',
]

const toSlug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/* ── live preview card ── */

interface PreviewCardProps {
  name: string
  description: string
  colorId: string
  icon: IconName
  visibility: 'PUBLIC' | 'PRIVATE'
  ownerName: string
  slug: string
}

function PreviewCard({
  name,
  description,
  colorId,
  icon,
  visibility,
  ownerName,
  slug,
}: PreviewCardProps) {
  const tone = COVER_COLORS.find((c) => c.id === colorId) ?? COVER_COLORS[0]
  const glyph = name[0]?.toUpperCase() ?? '?'
  const displayName = name || 'Subject name'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* card */}
      <div
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${tone.bodyEdge}`,
          background: tone.body,
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
        }}
      >
        {/* banner */}
        <div
          style={{
            height: 100,
            background: `linear-gradient(160deg, ${tone.banner} 0%, ${tone.bannerDeep} 100%)`,
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '0 16px 10px',
          }}
        >
          <span
            style={{
              position: 'absolute',
              right: 8,
              bottom: -12,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 100,
              lineHeight: 1,
              color: tone.glyph,
              opacity: 0.45,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {glyph}
          </span>

          {/* icon badge */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'rgba(0,0,0,0.28)',
              border: '1px solid rgba(255,255,255,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tone.label,
              backdropFilter: 'blur(4px)',
            }}
          >
            <Icon name={icon} size={15} stroke={1.7} />
          </div>

          {/* project count badge */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: tone.label,
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: '2px 7px',
              backdropFilter: 'blur(4px)',
            }}
          >
            0 projects
          </div>

          {/* visibility badge */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: visibility === 'PUBLIC' ? 'oklch(0.88 0.14 158)' : tone.label,
              background: visibility === 'PUBLIC' ? 'oklch(0.25 0.07 158)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${visibility === 'PUBLIC' ? 'oklch(0.38 0.1 158)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 999,
              padding: '2px 7px',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background:
                  visibility === 'PUBLIC' ? 'oklch(0.72 0.15 158)' : 'oklch(0.65 0.02 250)',
                display: 'inline-block',
              }}
            />
            {visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE'}
          </div>
        </div>

        {/* body */}
        <div style={{ padding: '12px 16px 16px' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 20,
              lineHeight: 1.2,
              color: tone.label,
              margin: '0 0 6px',
            }}
          >
            {displayName}
          </h3>
          <p
            style={{
              fontSize: 12,
              color: 'var(--db-muted)',
              lineHeight: 1.5,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontStyle: description ? 'normal' : 'italic',
            }}
          >
            {description ||
              'A short description of what lives in this subject — projects, sections, and pages.'}
          </p>
        </div>
      </div>

      {/* meta panel */}
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          border: '1px solid var(--db-line)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {[
          { label: 'Link', value: slug ? `/s/${slug}` : '/s/…', icon: 'external' as IconName },
          {
            label: 'Visibility',
            value: visibility === 'PUBLIC' ? 'public' : 'private',
            icon: 'eye' as IconName,
          },
          { label: 'Owner', value: ownerName, icon: 'user' as IconName },
        ].map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderTop: i > 0 ? '1px solid var(--db-line)' : undefined,
              background: 'var(--db-bg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                color: 'var(--db-muted)',
                fontSize: 12,
              }}
            >
              <Icon name={row.icon} size={13} stroke={1.6} />
              {row.label}
            </div>
            <span
              style={{
                fontSize: 12,
                color: 'var(--db-ink-2)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── modal ── */

interface CreateSubjectModalProps {
  open: boolean
  onClose: () => void
}

export function CreateSubjectModal({ open, onClose }: CreateSubjectModalProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [name, setName] = useState('')
  const [slugOverride, setSlugOverride] = useState('')
  const [description, setDescription] = useState('')
  const [colorId, setColorId] = useState('emerald')
  const [icon, setIcon] = useState<IconName>('book')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')

  const nameRef = useRef<HTMLInputElement>(null)

  const autoSlug = toSlug(name)
  const slug = slugOverride || autoSlug

  const mutation = useMutation({
    mutationFn: () =>
      createSubject({
        name: name.trim(),
        description: description.trim() || undefined,
        color: colorId,
        icon,
        visibility,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      handleClose()
    },
  })

  function handleClose() {
    setName('')
    setSlugOverride('')
    setDescription('')
    setColorId('emerald')
    setIcon('book')
    setVisibility('PUBLIC')
    mutation.reset()
    onClose()
  }

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && name.trim()) {
        e.preventDefault()
        mutation.mutate()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, name])

  if (!open) return null

  const canSubmit = name.trim().length > 0 && !mutation.isPending

  return createPortal(
    <>
      {/* backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(3px)',
          zIndex: 9998,
        }}
      />

      {/* modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 9999,
          display: 'flex',
          width: 'min(94vw, 860px)',
          maxHeight: '92vh',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid var(--db-line-2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 8px 20px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── left: form ── */}
        <div
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--db-bg-2)',
            overflowY: 'auto',
          }}
        >
          {/* header */}
          <div
            style={{
              padding: '22px 24px 18px',
              borderBottom: '1px solid var(--db-line)',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              {/* icon square */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'var(--db-em-soft)',
                  border: '1px solid color-mix(in oklch, var(--db-em) 30%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--db-em)',
                  flexShrink: 0,
                }}
              >
                <Icon name="folder" size={17} stroke={1.7} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    color: 'var(--db-em)',
                    marginBottom: 2,
                  }}
                >
                  NEW SUBJECT
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 24,
                    margin: 0,
                    color: 'var(--db-ink)',
                    lineHeight: 1.1,
                  }}
                >
                  Create a subject
                </h2>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--db-muted)', margin: 0, lineHeight: 1.5 }}>
              A top-level area of the knowledge base. You can add projects and pages once it exists.
            </p>

            {/* close */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                width: 28,
                height: 28,
                borderRadius: 7,
                border: '1px solid var(--db-line)',
                background: 'var(--db-surface)',
                color: 'var(--db-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* form body */}
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              flex: 1,
            }}
          >
            {/* subject name */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--db-ink-2)' }}>
                  Subject name <span style={{ color: 'var(--db-em)' }}>*</span>
                </label>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--db-muted-2)',
                  }}
                >
                  {name.length}/45
                </span>
              </div>
              <input
                ref={nameRef}
                type="text"
                placeholder="e.g. Engineering, Design, Security"
                value={name}
                maxLength={45}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1px solid ${name ? 'var(--db-em)' : 'var(--db-line)'}`,
                  background: 'var(--db-surface)',
                  color: 'var(--db-ink)',
                  fontSize: 14,
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms',
                  boxShadow: name
                    ? '0 0 0 3px color-mix(in oklch, var(--db-em) 15%, transparent)'
                    : 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--db-em)'
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px color-mix(in oklch, var(--db-em) 15%, transparent)'
                }}
                onBlur={(e) => {
                  if (!name) {
                    e.currentTarget.style.borderColor = 'var(--db-line)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              />
            </div>

            {/* url slug */}
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--db-ink-2)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                URL slug
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--db-line)',
                  borderRadius: 8,
                  background: 'var(--db-surface)',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    padding: '9px 10px 9px 12px',
                    fontSize: 13,
                    color: 'var(--db-muted)',
                    fontFamily: 'var(--font-mono)',
                    borderRight: '1px solid var(--db-line)',
                    whiteSpace: 'nowrap',
                    background: 'var(--db-bg)',
                  }}
                >
                  /s/
                </span>
                <input
                  type="text"
                  value={slugOverride || autoSlug}
                  placeholder="subject-name"
                  onChange={(e) => setSlugOverride(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--db-ink)',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: 11.5,
                  color: 'var(--db-muted-2)',
                  margin: '5px 0 0',
                  lineHeight: 1.4,
                }}
              >
                Auto-generated from the name. Used in links and references.
              </p>
            </div>

            {/* description */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--db-ink-2)' }}>
                  Description
                </label>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--db-muted-2)',
                  }}
                >
                  {description.length}/140
                </span>
              </div>
              <textarea
                placeholder="What kind of knowledge belongs here? This shows on the subject card."
                value={description}
                maxLength={140}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--db-line)',
                  background: 'var(--db-surface)',
                  color: 'var(--db-ink)',
                  fontSize: 13.5,
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.55,
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--db-em)'
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px color-mix(in oklch, var(--db-em) 15%, transparent)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--db-line)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* cover color */}
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--db-ink-2)',
                  display: 'block',
                  marginBottom: 10,
                }}
              >
                Cover color
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COVER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setColorId(c.id)}
                    title={c.id}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${c.banner} 0%, ${c.bannerDeep} 100%)`,
                      border: colorId === c.id ? '2px solid var(--db-em)' : '2px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow:
                        colorId === c.id
                          ? '0 0 0 3px color-mix(in oklch, var(--db-em) 30%, transparent)'
                          : '0 1px 4px rgba(0,0,0,0.4)',
                      transition: 'box-shadow 120ms, border-color 120ms',
                    }}
                  >
                    {colorId === c.id && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="4 12 10 18 20 6" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* icon */}
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--db-ink-2)',
                  display: 'block',
                  marginBottom: 10,
                }}
              >
                Icon
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ICON_PICKS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    title={ic}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border:
                        icon === ic ? '1.5px solid var(--db-em)' : '1.5px solid var(--db-line)',
                      background: icon === ic ? 'var(--db-em-soft)' : 'var(--db-surface)',
                      color: icon === ic ? 'var(--db-em)' : 'var(--db-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'border-color 120ms, background 120ms, color 120ms',
                    }}
                  >
                    <Icon name={ic} size={16} stroke={1.7} />
                  </button>
                ))}
              </div>
            </div>

            {/* visibility */}
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--db-ink-2)',
                  display: 'block',
                  marginBottom: 10,
                }}
              >
                Visibility
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  {
                    value: 'PUBLIC' as const,
                    label: 'Public',
                    desc: 'Anyone in the workspace can find and read it.',
                  },
                  {
                    value: 'PRIVATE' as const,
                    label: 'Private',
                    desc: 'Only invited members have access.',
                  },
                ].map((opt) => {
                  const selected = visibility === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setVisibility(opt.value)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: selected
                          ? '1.5px solid var(--db-em)'
                          : '1.5px solid var(--db-line)',
                        background: selected ? 'var(--db-em-soft)' : 'var(--db-surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        transition: 'border-color 120ms, background 120ms',
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: selected
                            ? '5px solid var(--db-em)'
                            : '2px solid var(--db-line-2)',
                          marginTop: 2,
                          flexShrink: 0,
                          transition: 'border 120ms',
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--db-ink)',
                            marginBottom: 2,
                          }}
                        >
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--db-muted)', lineHeight: 1.4 }}>
                          {opt.desc}
                        </div>
                      </div>
                      {selected && (
                        <div
                          style={{
                            marginLeft: 'auto',
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'var(--db-em)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="4 12 10 18 20 6" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* error */}
            {mutation.isError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'color-mix(in oklch, var(--db-rose) 14%, var(--db-surface))',
                  border: '1px solid color-mix(in oklch, var(--db-rose) 38%, transparent)',
                  color: 'var(--db-rose-t)',
                  fontSize: 13,
                }}
              >
                {(mutation.error as Error)?.message ?? 'Something went wrong. Please try again.'}
              </div>
            )}
          </div>

          {/* footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--db-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--db-bg)',
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'var(--db-muted-2)',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              Press{' '}
              <kbd
                style={{
                  background: 'var(--db-surface)',
                  border: '1px solid var(--db-line-2)',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontSize: 11,
                  fontFamily: 'inherit',
                }}
              >
                ⌘↵
              </kbd>{' '}
              to create
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--db-line)',
                  background: 'transparent',
                  color: 'var(--db-ink-2)',
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={!canSubmit}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: '1px solid color-mix(in oklch, var(--db-em) 40%, transparent)',
                  background: canSubmit ? 'var(--db-em-soft)' : 'var(--db-surface)',
                  color: canSubmit ? 'var(--db-em-deep)' : 'var(--db-muted-2)',
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: canSubmit ? 'pointer' : 'default',
                  fontFamily: 'var(--font-ui)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'background 150ms, color 150ms',
                  opacity: canSubmit ? 1 : 0.5,
                }}
              >
                {mutation.isPending ? (
                  <>
                    <span
                      style={{
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        border: '2px solid color-mix(in oklch, var(--db-em) 40%, transparent)',
                        borderTopColor: 'var(--db-em)',
                        animation: 'spin 0.7s linear infinite',
                        display: 'inline-block',
                      }}
                    />
                    Creating…
                  </>
                ) : (
                  <>
                    <Icon name="check" size={13} stroke={2.2} />
                    Create subject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── right: live preview ── */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            background: 'var(--db-bg)',
            borderLeft: '1px solid var(--db-line)',
            padding: '22px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: 18,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--db-muted)',
              letterSpacing: '0.07em',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--db-em)',
                boxShadow: '0 0 6px var(--db-em)',
                flexShrink: 0,
              }}
            />
            LIVE PREVIEW
          </div>

          <PreviewCard
            name={name}
            description={description}
            colorId={colorId}
            icon={icon}
            visibility={visibility}
            ownerName={user?.name ?? 'You'}
            slug={slug}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>,
    document.body,
  )
}
