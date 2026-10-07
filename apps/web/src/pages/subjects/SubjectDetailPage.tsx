import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { Subject } from '@shared/types/subject'

import { CARD_TONES, toneForColor } from '@/styles/cover-colors'
import apiClient from '@/api/client'
import { Icon, type IconName } from '@/components/ui/icon'
import { useAuthStore } from '@/stores/auth.store'
import { CreateProjectModal } from '@/components/subjects/CreateProjectModal'
import { fetchProjectsBySubject, type ProjectWithMeta } from '@/api/projects'

const TONE_KEYS = Object.keys(CARD_TONES)

/* ── colour palette (mirrors SubjectsPage) ── */

/* ── helpers ── */
function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/* ── subject response type ── */
type SubjectDetail = Subject & {
  user: { id: string; name: string }
  _count: { projects: number }
}

function fetchSubjectBySlug(slug: string) {
  return apiClient.get<SubjectDetail>(`/api/v2/subjects/${slug}`).then((r) => r.data)
}

/* ── project card ── */
interface ProjectCardProps {
  project: ProjectWithMeta
  toneIndex: number
  onClick: () => void
}

function ProjectCard({ project, toneIndex, onClick }: ProjectCardProps) {
  const tone = toneForColor(TONE_KEYS[toneIndex % TONE_KEYS.length])
  const glyph = project.name[0]?.toUpperCase() ?? '?'
  const [hovered, setHovered] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${tone.bodyEdge}`,
        background: tone.body,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered
          ? '0 4px 12px rgba(0,0,0,0.5), 0 20px 40px -16px rgba(0,0,0,0.6)'
          : '0 2px 4px rgba(0,0,0,0.3)',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
      }}
    >
      {/* banner */}
      <div
        style={{
          height: 110,
          background: `linear-gradient(160deg, ${tone.banner} 0%, ${tone.bannerDeep} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* decorative letter */}
        <span
          style={{
            position: 'absolute',
            right: 10,
            bottom: -18,
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 110,
            lineHeight: 1,
            color: tone.glyph,
            opacity: 0.4,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {glyph}
        </span>

        {/* visibility badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: tone.label,
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 999,
            padding: '2px 8px 2px 6px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Icon name={project.visibility === 'PUBLIC' ? 'globe' : 'lock'} size={9} stroke={2} />
          {project.visibility}
        </div>
      </div>

      {/* body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: tone.label,
            margin: '0 0 5px',
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {project.name}
        </h3>

        {project.description ? (
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--db-muted)',
              margin: '0 0 10px',
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.description}
          </p>
        ) : (
          <div style={{ marginBottom: 10 }} />
        )}

        {/* tags */}
        {project.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag.id}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: tone.label,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11.5,
            color: 'var(--db-muted-2)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="eye" size={11} />
            {project._count.views.toLocaleString()} {project._count.views === 1 ? 'view' : 'views'}
          </span>
          <span>{timeAgo(project.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}

/* ── pagination ── */
interface PaginationProps {
  page: number
  total: number
  limit: number
  onChange: (p: number) => void
}

function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    minWidth: 32,
    height: 32,
    borderRadius: 6,
    border: active
      ? '1px solid color-mix(in oklch, var(--db-em) 40%, transparent)'
      : '1px solid var(--db-line)',
    background: active ? 'var(--db-em-soft)' : 'transparent',
    color: active ? 'var(--db-em-deep)' : disabled ? 'var(--db-muted-2)' : 'var(--db-muted)',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
  })

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 32,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--db-muted)', fontFamily: 'var(--font-mono)' }}>
        Showing {from}–{to} of {total} projects
      </span>

      <div style={{ display: 'flex', gap: 5 }}>
        <button
          onClick={() => page > 1 && onChange(page - 1)}
          disabled={page === 1}
          style={btnStyle(false, page === 1)}
        >
          <Icon name="chev-left" size={13} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--db-muted-2)',
                fontSize: 13,
              }}
            >
              …
            </span>
          ) : (
            <button key={p} onClick={() => onChange(p)} style={btnStyle(p === page)}>
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => page < totalPages && onChange(page + 1)}
          disabled={page === totalPages}
          style={btnStyle(false, page === totalPages)}
        >
          <Icon name="chev-right" size={13} />
        </button>
      </div>
    </div>
  )
}

/* ── page ── */
const PROJECTS_PER_PAGE = 9

export function SubjectDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const subjectQuery = useQuery({
    queryKey: ['subject', slug],
    queryFn: () => fetchSubjectBySlug(slug),
  })

  const projectsQuery = useQuery({
    queryKey: ['subject', slug, 'projects', page],
    queryFn: () => fetchProjectsBySubject(slug, { page, limit: PROJECTS_PER_PAGE }),
    placeholderData: (prev) => prev,
  })

  const subject = subjectQuery.data
  const projectsData = projectsQuery.data
  const projects = projectsData?.projects ?? []
  const total = projectsData?.total ?? 0

  const tone = subject ? toneForColor(subject.color ?? 'emerald') : CARD_TONES['emerald']
  const canCreate = user?.role === 'ADMIN' || user?.role === 'EDITOR'
  const canManage = subject && (user?.id === subject.userId || user?.role === 'ADMIN')

  /* loading */
  if (subjectQuery.isLoading) {
    return (
      <div style={{ maxWidth: 1320, width: '100%' }}>
        <div style={{ height: 200, background: 'var(--db-surface)' }} />
        <div style={{ padding: '28px 36px' }}>
          <div
            style={{
              height: 52,
              width: 320,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              marginBottom: 10,
            }}
          />
          <div
            style={{
              height: 16,
              width: 240,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.04)',
            }}
          />
        </div>
        <div
          style={{
            padding: '0 36px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 180,
                borderRadius: 16,
                background: 'var(--db-surface)',
                border: '1px solid var(--db-line)',
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  /* error */
  if (subjectQuery.isError || !subject) {
    return (
      <div style={{ padding: '32px 36px' }}>
        <div
          style={{
            padding: '20px 24px',
            background: 'color-mix(in oklch, var(--db-rose) 12%, var(--db-surface))',
            border: '1px solid color-mix(in oklch, var(--db-rose) 35%, transparent)',
            borderRadius: 12,
            color: 'var(--db-rose-t)',
            fontSize: 13.5,
          }}
        >
          Subject not found or failed to load.
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1320, width: '100%' }}>
      {/* hero banner */}
      <div
        style={{
          height: 200,
          background: `linear-gradient(160deg, ${tone.banner} 0%, ${tone.bannerDeep} 100%)`,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* visibility badge */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: tone.label,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 999,
            padding: '3px 10px 3px 8px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Icon name={subject.visibility === 'PUBLIC' ? 'globe' : 'lock'} size={10} stroke={2} />
          {subject.visibility}
        </div>

        {/* three-dot menu */}
        {canManage && (
          <div style={{ position: 'absolute', top: 14, right: 16 }}>
            <ThreeDotMenu />
          </div>
        )}

        {/* icon badge (overlapping bottom edge) */}
        <div
          style={{
            position: 'absolute',
            bottom: -28,
            left: 36,
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'rgba(0,0,0,0.35)',
            border: `2px solid ${tone.banner}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tone.label,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <Icon name={(subject.icon as IconName) ?? 'book'} size={26} stroke={1.6} />
        </div>
      </div>

      {/* subject info */}
      <div style={{ padding: '48px 36px 24px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: 48,
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            margin: '0 0 8px',
            color: 'var(--db-ink)',
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {subject.name}
          {projectsData && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontStyle: 'normal',
                fontSize: 12,
                color: 'var(--db-muted)',
                background: 'var(--db-bg-2)',
                border: '1px solid var(--db-line)',
                padding: '3px 9px',
                borderRadius: 999,
                transform: 'translateY(-4px)',
              }}
            >
              {total} {total === 1 ? 'project' : 'projects'}
            </span>
          )}
        </h1>

        {subject.description && (
          <p
            style={{
              fontSize: 14.5,
              color: 'var(--db-muted)',
              margin: '0 0 16px',
              maxWidth: 640,
              lineHeight: 1.6,
            }}
          >
            {subject.description}
          </p>
        )}

        {/* owner row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* avatar */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: tone.banner,
              border: `1px solid ${tone.bodyEdge}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 600,
              color: tone.label,
              flexShrink: 0,
            }}
          >
            {initials(subject.user.name)}
          </div>

          <span style={{ fontSize: 13, color: 'var(--db-ink-2)' }}>
            {subject.user.name}
            <span style={{ color: 'var(--db-muted-2)' }}> · Owner</span>
          </span>

          <span style={{ color: 'var(--db-line)', fontSize: 13 }}>|</span>

          <span
            style={{
              fontSize: 12.5,
              color: 'var(--db-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            Created {formatDate(subject.createdAt)}
          </span>

          <span style={{ color: 'var(--db-line)', fontSize: 13 }}>|</span>

          <span
            style={{
              fontSize: 12.5,
              color: 'var(--db-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Icon name="clock" size={12} />
            Updated {timeAgo(subject.updatedAt)}
          </span>
        </div>
      </div>

      {/* projects section */}
      <div style={{ padding: '8px 36px 64px' }}>
        {/* section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--db-ink)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Projects
            </h2>
            {projectsData && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--db-muted)',
                  background: 'var(--db-bg-2)',
                  border: '1px solid var(--db-line)',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                {(page - 1) * PROJECTS_PER_PAGE + 1}–{Math.min(page * PROJECTS_PER_PAGE, total)} of{' '}
                {total}
              </span>
            )}
          </div>

          {canCreate && (
            <button
              onClick={() => setCreateOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                background: 'var(--db-em-soft)',
                border: '1px solid color-mix(in oklch, var(--db-em) 35%, transparent)',
                color: 'var(--db-em-deep)',
                fontSize: 13.5,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-em-soft-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--db-em-soft)')}
            >
              <Icon name="plus" size={14} stroke={2.2} />
              New project
            </button>
          )}
        </div>

        {/* grid */}
        {projectsQuery.isLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {Array.from({ length: PROJECTS_PER_PAGE }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 200,
                  borderRadius: 16,
                  background: 'var(--db-surface)',
                  border: '1px solid var(--db-line)',
                }}
              />
            ))}
          </div>
        ) : total === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px dashed var(--db-line)',
              borderRadius: 16,
              color: 'var(--db-muted-2)',
            }}
          >
            <div
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: 'italic',
                fontSize: 28,
                color: 'var(--db-muted)',
                marginBottom: 8,
              }}
            >
              No projects yet
            </div>
            <p style={{ fontSize: 13.5, margin: 0 }}>
              {canCreate
                ? 'Create the first project in this subject.'
                : 'No projects have been added to this subject.'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {projects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                toneIndex={i}
                onClick={() => navigate({ to: '/projects/$slug', params: { slug: project.slug } })}
              />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          total={total}
          limit={PROJECTS_PER_PAGE}
          onChange={(p) => {
            setPage(p)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      </div>

      <CreateProjectModal
        open={createOpen}
        subjectId={subject.id}
        subjectSlug={slug}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}

/* ── three-dot menu ── */
function ThreeDotMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(0,0,0,0.28)',
          color: 'rgba(255,255,255,0.8)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
        }}
      >
        <Icon name="dots-h" size={16} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              zIndex: 50,
              background: 'var(--db-surface)',
              border: '1px solid var(--db-line)',
              borderRadius: 10,
              padding: '4px',
              minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {[
              { label: 'Edit subject', icon: 'pencil' as IconName },
              { label: 'Manage access', icon: 'users' as IconName },
              { label: 'Change visibility', icon: 'globe' as IconName },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 7,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--db-ink-2)',
                  fontSize: 13.5,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Icon name={item.icon} size={14} stroke={1.7} />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
