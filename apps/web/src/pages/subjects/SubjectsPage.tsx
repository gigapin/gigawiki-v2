import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { CARD_TONES, toneForColor } from '@/styles/cover-colors'
import { fetchSubjects } from '@/api/subjects'
import { useAuthStore } from '@/stores/auth.store'
import { Icon, type IconName } from '@/components/ui/icon'
import { CreateSubjectModal } from '@/components/subjects/CreateSubjectModal'

/* ── colour palette keyed by colorId ── */

/* ── subject card ── */
interface SubjectCardProps {
  name: string
  slug: string
  description: string | null
  projectCount: number
  color: string
  icon: IconName
  onClick: () => void
}

function SubjectCard({ name, description, projectCount, color, icon, onClick }: SubjectCardProps) {
  const tone = toneForColor(color)
  const glyph = name[0]?.toUpperCase() ?? '?'
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
        borderRadius: 18,
        overflow: 'hidden',
        border: `1px solid ${tone.bodyEdge}`,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `var(--shadow-card-hover)` : 'var(--shadow-card)',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        background: tone.body,
      }}
    >
      {/* banner */}
      <div
        style={{
          height: 130,
          background: `linear-gradient(160deg, ${tone.banner} 0%, ${tone.bannerDeep} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '0 20px 14px',
        }}
      >
        {/* decorative large letter */}
        <span
          style={{
            position: 'absolute',
            right: 12,
            bottom: -16,
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 130,
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
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid rgba(255,255,255,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tone.label,
            backdropFilter: 'blur(4px)',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={16} stroke={1.7} />
        </div>

        {/* project count badge */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: tone.label,
            background: 'rgba(0,0,0,0.25)',
            border: `1px solid rgba(255,255,255,0.12)`,
            borderRadius: 999,
            padding: '2px 8px',
            backdropFilter: 'blur(4px)',
          }}
        >
          {projectCount} {projectCount === 1 ? 'project' : 'projects'}
        </div>
      </div>

      {/* body */}
      <div style={{ padding: '16px 20px 20px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 26,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            color: 'var(--db-ink)',
            margin: '0 0 8px',
          }}
        >
          {name}
        </h3>
        {description ? (
          <p
            style={{
              fontSize: 13,
              color: 'var(--db-muted)',
              lineHeight: 1.55,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--db-muted-2)', margin: 0, fontStyle: 'italic' }}>
            No description
          </p>
        )}
      </div>
    </div>
  )
}

/* ── skeleton card ── */
const SKELETON_COLORS = Object.keys(CARD_TONES)

function SubjectCardSkeleton({ index }: { index: number }) {
  const tone = toneForColor(SKELETON_COLORS[index % SKELETON_COLORS.length])
  return (
    <div
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        border: `1px solid ${tone.bodyEdge}`,
        background: tone.body,
      }}
    >
      <div
        style={{
          height: 130,
          background: `linear-gradient(160deg, ${tone.bannerDeep} 0%, ${tone.body} 100%)`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 72,
            height: 20,
            borderRadius: 999,
            background: 'var(--skeleton-fill)',
          }}
        />
      </div>
      <div style={{ padding: '16px 20px 20px' }}>
        <div
          style={{
            height: 28,
            width: '60%',
            borderRadius: 6,
            background: 'var(--skeleton-fill)',
            marginBottom: 10,
          }}
        />
        <div
          style={{
            height: 13,
            width: '90%',
            borderRadius: 4,
            background: 'var(--skeleton-fill)',
          }}
        />
        <div
          style={{
            height: 13,
            width: '70%',
            borderRadius: 4,
            background: 'var(--skeleton-fill)',
            marginTop: 5,
          }}
        />
      </div>
    </div>
  )
}

/* ── page ── */
export function SubjectsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canCreate = user?.role === 'ADMIN' || user?.role === 'EDITOR'
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => fetchSubjects({ limit: 50 }),
  })

  const subjects = data?.subjects ?? []

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 1320, width: '100%' }}>
      {/* header row */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 20,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 52,
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              margin: '0 0 6px',
              color: 'var(--db-ink)',
              display: 'flex',
              alignItems: 'baseline',
              gap: 14,
            }}
          >
            Subjects
            {data && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontStyle: 'normal',
                  fontSize: 13,
                  color: 'var(--db-muted)',
                  background: 'var(--db-bg-2)',
                  border: '1px solid var(--db-line)',
                  padding: '3px 9px',
                  borderRadius: 999,
                  transform: 'translateY(-4px)',
                }}
              >
                {data.total}
              </span>
            )}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--db-muted)', margin: 0 }}>
            Top-level knowledge containers — each subject holds related projects and pages.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'var(--db-em-soft)',
              border: '1px solid color-mix(in oklch, var(--db-em) 35%, transparent)',
              color: 'var(--db-em-deep)',
              fontSize: 13.5,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-em-soft-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--db-em-soft)')}
          >
            <Icon name="plus" size={14} stroke={2.2} />
            New subject
          </button>
        )}
      </header>

      {/* error state */}
      {isError && (
        <div
          style={{
            padding: '20px 24px',
            background: 'color-mix(in oklch, var(--db-rose) 12%, var(--db-surface))',
            border: '1px solid color-mix(in oklch, var(--db-rose) 35%, transparent)',
            borderRadius: 12,
            color: 'var(--db-rose-t)',
            fontSize: 13.5,
            marginBottom: 24,
          }}
        >
          Failed to load subjects. Please try again.
        </div>
      )}

      {/* grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
        }}
      >
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => <SubjectCardSkeleton key={i} index={i} />)}

        {!isLoading &&
          subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              name={subject.name}
              slug={subject.slug}
              description={subject.description}
              projectCount={
                (subject as typeof subject & { _count: { projects: number } })._count?.projects ?? 0
              }
              color={subject.color ?? 'emerald'}
              icon={(subject.icon as IconName) ?? 'book'}
              onClick={() => navigate({ to: '/subjects/$slug', params: { slug: subject.slug } })}
            />
          ))}

        {!isLoading && subjects.length === 0 && !isError && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px dashed var(--db-line)',
              borderRadius: 18,
              color: 'var(--db-muted-2)',
            }}
          >
            <div
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: 'italic',
                fontSize: 32,
                color: 'var(--db-muted)',
                marginBottom: 10,
              }}
            >
              No subjects yet
            </div>
            <p style={{ fontSize: 13.5, margin: 0 }}>
              {canCreate
                ? 'Create your first subject to start organising knowledge.'
                : 'No subjects have been created yet.'}
            </p>
          </div>
        )}
      </div>

      <CreateSubjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
