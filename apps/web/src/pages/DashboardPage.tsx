import { useQuery } from '@tanstack/react-query'

import { RecentlyVisited } from '@/components/dashboard/RecentlyVisited'
import { fetchSubjects } from '@/api/subjects'
import { useFavorites } from '@/api/favorites'
import { fetchActivities } from '@/api/activities'
import { useAuthStore } from '@/stores/auth.store'
import { Icon, type IconName } from '@/components/ui/icon'

/* ── helpers ── */
function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function firstName(name: string) {
  return name.split(' ')[0]
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function timeAgo(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/* ── sparkline ── */
const SPARK_DATA = [4, 7, 5, 9, 11, 10, 14, 17, 15, 19, 22, 24]

function Sparkline({ tone = 'em' }: { tone?: string }) {
  const data = SPARK_DATA
  const w = 76,
    h = 28,
    pad = 2
  const min = Math.min(...data),
    max = Math.max(...data)
  const range = max - min || 1
  const stepX = (w - pad * 2) / (data.length - 1)
  const points = data.map((v, i) => [
    pad + i * stepX,
    pad + (h - pad * 2) * (1 - (v - min) / range),
  ])
  const d = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')
  const dArea = `${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`
  const color =
    tone === 'em'
      ? 'oklch(0.58 0.135 158)'
      : tone === 'amber'
        ? 'oklch(0.65 0.13 75)'
        : tone === 'indigo'
          ? 'oklch(0.55 0.14 268)'
          : 'oklch(0.62 0.15 18)'
  const gradId = `sp-${tone}`
  return (
    <svg
      style={{ position: 'absolute', right: 12, top: 12, width: 76, height: 28 }}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={dArea} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="2"
        fill={color}
      />
    </svg>
  )
}

/* ── stat cards ── */
function StatCards() {
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => fetchSubjects({ limit: 1 }),
  })
  const { data: favsData } = useFavorites({ limit: 1 }, true)
  const { data: activitiesData } = useQuery({
    queryKey: ['activities-count'],
    queryFn: () => fetchActivities({ limit: 1 }),
    retry: false,
  })

  const stats = [
    {
      label: 'Subjects',
      value: subjectsData?.total ?? '—',
      unit: '',
      trend: 'up' as const,
      period: 'all time',
      icon: 'book' as IconName,
      tone: 'em',
    },
    {
      label: 'Favorites',
      value: favsData?.total ?? '—',
      unit: 'saved',
      trend: 'flat' as const,
      period: 'bookmarked',
      icon: 'star' as IconName,
      tone: 'amber',
    },
    {
      label: 'Activity',
      value: activitiesData?.total ?? 0,
      unit: 'events',
      trend: 'flat' as const,
      period: 'total logged',
      icon: 'edit' as IconName,
      tone: 'indigo',
    },
    {
      label: 'Views this week',
      value: 0,
      unit: '',
      trend: 'flat' as const,
      period: 'coming soon',
      icon: 'eye' as IconName,
      tone: 'rose',
    },
  ]

  const toneIcon: Record<string, { bg: string; color: string }> = {
    em: { bg: 'var(--db-em-soft)', color: 'var(--db-em-deep)' },
    amber: {
      bg: 'color-mix(in oklch, var(--db-amber) 22%, var(--db-surface))',
      color: 'var(--db-amber-t)',
    },
    indigo: {
      bg: 'color-mix(in oklch, var(--db-indigo) 22%, var(--db-surface))',
      color: 'var(--db-indigo-t)',
    },
    rose: {
      bg: 'color-mix(in oklch, var(--db-rose) 22%, var(--db-surface))',
      color: 'var(--db-rose-t)',
    },
  }

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: 'var(--db-surface)',
            border: '1px solid var(--db-line)',
            borderRadius: 14,
            padding: '16px 16px 12px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 120ms ease, box-shadow 120ms ease',
            fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = ''
            e.currentTarget.style.boxShadow = ''
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--db-muted)',
              fontSize: 12,
              letterSpacing: '0.02em',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                display: 'grid',
                placeItems: 'center',
                ...toneIcon[s.tone],
              }}
            >
              <Icon name={s.icon} size={12} stroke={1.8} />
            </span>
            {s.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              fontSize: 40,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'var(--db-ink)',
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
            }}
          >
            {s.value}
            {s.unit && (
              <span
                style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: 12,
                  color: 'var(--db-muted)',
                  letterSpacing: '0.02em',
                }}
              >
                {s.unit}
              </span>
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--db-muted)' }}>{s.period}</div>
          <Sparkline tone={s.tone} />
        </div>
      ))}
    </div>
  )
}

/* ── activity feed ── */
const VERB_ICON: Record<string, IconName> = {
  CREATED: 'plus',
  UPDATED: 'edit',
  DELETED: 'doc',
  COMMENTED: 'msg',
  REPLIED: 'msg',
  RESTORED: 'history',
}

const VERB_LABEL: Record<string, string> = {
  CREATED: 'created',
  UPDATED: 'edited',
  DELETED: 'deleted',
  COMMENTED: 'commented on',
  REPLIED: 'replied to',
  RESTORED: 'restored',
}

function ActivityFeed() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => fetchActivities({ limit: 10 }),
    retry: false,
  })

  const avatarGradients = [
    'linear-gradient(135deg,oklch(0.7 0.13 30),oklch(0.55 0.15 350))',
    'linear-gradient(135deg,oklch(0.7 0.13 200),oklch(0.55 0.15 260))',
    'linear-gradient(135deg,oklch(0.75 0.12 90),oklch(0.55 0.16 50))',
    'linear-gradient(135deg,oklch(0.7 0.13 18),oklch(0.5 0.16 350))',
  ]

  return (
    <div style={{ marginBottom: 36 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 22,
            letterSpacing: '-0.005em',
            color: 'var(--db-ink)',
            margin: 0,
          }}
        >
          Recent activity
        </h2>
      </div>
      <div
        style={{
          background: 'var(--db-surface)',
          border: '1px solid var(--db-line)',
          borderRadius: 14,
          padding: '6px 4px',
        }}
      >
        {isLoading && (
          <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--db-muted)' }}>
            Loading…
          </div>
        )}
        {(isError || (!isLoading && (!data?.activities || data.activities.length === 0))) && (
          <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--db-muted)' }}>
            No activity to display.
          </div>
        )}
        {data?.activities.map((a, i) => {
          const resourceName =
            a.page?.title ?? a.project?.name ?? a.section?.title ?? a.resourceType
          const grad = avatarGradients[i % avatarGradients.length]
          const userInitials = initials(a.user?.name ?? '?')
          return (
            <div
              key={a.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr auto',
                gap: 12,
                alignItems: 'flex-start',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: grad,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 12,
                  position: 'relative',
                }}
              >
                {userInitials}
                <span
                  style={{
                    position: 'absolute',
                    right: -3,
                    bottom: -3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--db-surface)',
                    border: '1.5px solid var(--db-surface)',
                    color: 'var(--db-em-deep)',
                  }}
                >
                  <Icon name={VERB_ICON[a.type] ?? 'edit'} size={9} stroke={2.2} />
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--db-ink-2)', lineHeight: 1.5 }}>
                <b style={{ fontWeight: 600, color: 'var(--db-ink)' }}>{a.user?.name}</b>{' '}
                {VERB_LABEL[a.type] ?? a.type.toLowerCase()}{' '}
                <span
                  style={{
                    color: 'var(--db-em-deep)',
                    borderBottom: '1px dashed color-mix(in oklch, var(--db-em) 50%, transparent)',
                    paddingBottom: 1,
                  }}
                >
                  {resourceName}
                </span>
                <span style={{ color: 'var(--db-muted)' }}> · {a.resourceType}</span>
                {a.details && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: '8px 10px',
                      background: 'var(--db-surface-2)',
                      border: '1px solid var(--db-line)',
                      borderLeft: '2px solid var(--db-em)',
                      borderRadius: 4,
                      fontSize: 12.5,
                      color: 'var(--db-ink-2)',
                    }}
                  >
                    {a.details}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--db-muted)',
                  whiteSpace: 'nowrap',
                  marginTop: 4,
                }}
              >
                {timeAgo(a.createdAt)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── favorites list ── */
const EMBLEM_TONES: Record<string, { bg: string; color: string }> = {
  0: { bg: 'var(--db-em-soft)', color: 'var(--db-em-deep)' },
  1: {
    bg: 'color-mix(in oklch, var(--db-amber) 24%, var(--db-surface))',
    color: 'var(--db-amber-t)',
  },
  2: {
    bg: 'color-mix(in oklch, var(--db-indigo) 24%, var(--db-surface))',
    color: 'var(--db-indigo-t)',
  },
  3: {
    bg: 'color-mix(in oklch, var(--db-rose) 24%, var(--db-surface))',
    color: 'var(--db-rose-t)',
  },
  4: {
    bg: 'color-mix(in oklch, var(--db-slate) 20%, var(--db-surface))',
    color: 'var(--db-slate-t)',
  },
}

function FavoritesList() {
  const { data, isLoading } = useFavorites({ limit: 6 })

  return (
    <div style={{ marginBottom: 36 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 22,
            letterSpacing: '-0.005em',
            color: 'var(--db-ink)',
            margin: 0,
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
          }}
        >
          Your favorites
          {data && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--db-muted)',
                background: 'var(--db-bg-2)',
                border: '1px solid var(--db-line)',
                padding: '2px 7px',
                borderRadius: 999,
                transform: 'translateY(-2px)',
              }}
            >
              {data.total}
            </span>
          )}
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isLoading && <div style={{ fontSize: 13, color: 'var(--db-muted)' }}>Loading…</div>}
        {!isLoading && (!data?.favorites || data.favorites.length === 0) && (
          <div
            style={{
              background: 'var(--db-surface)',
              border: '1px solid var(--db-line)',
              borderRadius: 14,
              padding: 14,
              fontSize: 13,
              color: 'var(--db-muted)',
            }}
          >
            No favorites yet.
          </div>
        )}
        {data?.favorites.map((fav, i) => {
          const tone = EMBLEM_TONES[String(i % 5)]
          const title =
            (
              fav as {
                page?: { title: string }
                project?: { name: string }
                section?: { title: string }
              }
            ).page?.title ??
            (
              fav as {
                page?: { title: string }
                project?: { name: string }
                section?: { title: string }
              }
            ).project?.name ??
            (
              fav as {
                page?: { title: string }
                project?: { name: string }
                section?: { title: string }
              }
            ).section?.title ??
            'Untitled'
          const crumb = fav.pageId ? 'Page' : fav.projectId ? 'Project' : 'Section'
          const glyph = title[0]?.toUpperCase() ?? '?'
          return (
            <div
              key={fav.id}
              style={{
                display: 'flex',
                gap: 12,
                background: 'var(--db-surface)',
                border: '1px solid var(--db-line)',
                borderRadius: 14,
                padding: 14,
                alignItems: 'flex-start',
                cursor: 'pointer',
                transition: 'box-shadow 120ms, transform 120ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: 'italic',
                  fontSize: 22,
                  lineHeight: 1,
                  ...tone,
                }}
              >
                {glyph}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10.5,
                    color: 'var(--db-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {crumb}
                </div>
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--db-ink)',
                    margin: '0 0 4px',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {title}
                </h4>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--db-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{timeAgo(fav.createdAt)}</span>
                </div>
              </div>
              <div style={{ color: 'var(--db-amber)' }}>
                <Icon name="star-fill" size={14} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── dashboard root ── */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: favsData } = useFavorites({ limit: 1 }, true)

  return (
    <div style={{ padding: '28px 28px 60px', maxWidth: 1320, width: '100%' }}>
      {/* welcome */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <h1
            style={{
              fontFamily: "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
              fontWeight: 400,
              fontSize: 52,
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              margin: '0 0 6px',
              color: 'var(--db-ink)',
            }}
          >
            Welcome back,{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--db-em-deep)' }}>
              {firstName(user?.name ?? '')}.
            </em>
          </h1>
          <div style={{ color: 'var(--db-muted)', fontSize: 14 }}>
            {todayLabel()}
            {favsData && favsData.total > 0 && (
              <>
                <span style={{ color: 'var(--db-muted-2)', margin: '0 8px' }}>·</span>
                {favsData.total} saved favorites
              </>
            )}
          </div>
        </div>
      </header>

      <StatCards />

      {/* two-col: activity + favorites */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, alignItems: 'start' }}
      >
        <ActivityFeed />
        <FavoritesList />
      </div>
      <RecentlyVisited />
    </div>
  )
}
