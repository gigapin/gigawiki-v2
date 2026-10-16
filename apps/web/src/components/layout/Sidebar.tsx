import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { Subject } from '@shared/types/subject'
import { BookOpen, ChevronRight, Folder } from 'lucide-react'

import { SiteLogo } from '@/components/shared/SiteLogo'
import { SiteName } from '@/components/shared/SiteName'
import { InviteUsersLink } from '@/components/auth/InviteUsersLink'
import { useLogout } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { useSections } from '@/api/sections'
import { useParityRead, type PageResult, type ResourceLink } from '@/api/parity'
import { Pagination } from '@/components/shared/Pagination'
import { useProjects } from '@/api/projects'
import { useSubjects } from '@/api/subjects'
import { useAuthStore } from '@/stores/auth.store'
import { Icon, type IconName } from '@/components/ui/icon'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

type SubjectNode = Subject & { _count: { projects: number } }

function SectionItem({
  section,
  projectSlug,
}: {
  section: { id: string; slug: string; title: string }
  projectSlug: string
}) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const query = useParityRead<PageResult<ResourceLink, 'pages'>>(
    'pages',
    `/sections/${section.slug}/pages`,
    { page, limit: 20 },
    open,
  )
  return (
    <div>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Toggle pages in ${section.title}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <ChevronRight className={open ? 'rotate-90' : ''} />
        </Button>
        <Link
          to="/projects/$slug"
          params={{ slug: projectSlug }}
          search={{ section: section.slug }}
        >
          {section.title}
        </Link>
      </div>
      {open && (
        <div className="ml-4 border-l pl-2">
          {query.isPending ? (
            <p>Loading pages…</p>
          ) : query.isError ? (
            <Button variant="ghost" onClick={() => void query.refetch()}>
              Retry pages
            </Button>
          ) : (
            <>
              {query.data.pages.length === 0 && <p>No pages yet.</p>}
              {query.data.pages.map((item) => (
                <Link
                  className="block py-1 text-sm"
                  to="/pages/$slug"
                  params={{ slug: item.slug }}
                  key={item.id}
                >
                  {item.title}
                </Link>
              ))}
              <Pagination page={page} limit={20} total={query.data.total} onChange={setPage} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectItem({ project }: { project: { id: string; slug: string; name: string } }) {
  const [open, setOpen] = useState(false)
  const sections = useSections(project.slug, open)
  return (
    <div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={`Toggle sections in ${project.name}`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronRight className={open ? 'rotate-90' : ''} />
        </Button>
        <Link
          to="/projects/$slug"
          params={{ slug: project.slug }}
          className="flex items-center gap-2 rounded p-2 text-sm"
        >
          <Folder className="size-4" />
          {project.name}
        </Link>
      </div>
      {open && (
        <div className="ml-6 border-l pl-3">
          {sections.isPending && <p role="status">Loading sections…</p>}
          {sections.isError && (
            <button onClick={() => void sections.refetch()}>Retry loading sections</button>
          )}
          {sections.data?.map((section) => (
            <SectionItem key={section.id} section={section} projectSlug={project.slug} />
          ))}
          {sections.data?.length === 0 && <p className="text-xs">No sections yet.</p>}
        </div>
      )}
    </div>
  )
}

function SubjectItem({ subject }: { subject: SubjectNode }) {
  const [open, setOpen] = useState(false)
  const projects = useProjects(subject.slug, { limit: 20 }, { enabled: open })
  return (
    <div>
      <div className="flex items-center gap-1 rounded-md">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          aria-label={`Toggle projects in ${subject.name}`}
          aria-expanded={open}
          aria-controls={`nav-subject-${subject.id}`}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronRight
            className={open ? 'rotate-90 transition-transform' : 'transition-transform'}
          />
        </Button>
        <Link
          to="/subjects/$slug"
          params={{ slug: subject.slug }}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BookOpen className="size-4 shrink-0" />
          <span className="truncate">{subject.name}</span>
          <span className="ml-auto text-xs">{subject._count.projects}</span>
        </Link>
      </div>
      {open && (
        <div id={`nav-subject-${subject.id}`} className="ml-3 space-y-1 border-l py-1 pl-3">
          {projects.isPending ? (
            <p role="status" className="p-2 text-xs text-muted-foreground">
              Loading projects…
            </p>
          ) : projects.isError ? (
            <Button variant="ghost" size="sm" onClick={() => void projects.refetch()}>
              Retry loading projects
            </Button>
          ) : projects.data?.projects.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">No projects yet.</p>
          ) : (
            projects.data?.projects.map((project) => (
              <ProjectItem key={project.id} project={project} />
            ))
          )}
          {projects.data && projects.data.total > projects.data.projects.length && (
            <Link
              to="/subjects/$slug"
              params={{ slug: subject.slug }}
              className="block p-2 text-xs text-primary"
            >
              View all projects
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function UserMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const logout = useLogout()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  async function handleLogout() {
    try {
      await logout.mutateAsync()
    } catch {
      /* ignore */
    }
    if (!useAuthStore.getState().user) navigate({ to: '/login', search: { redirect: '' } })
  }

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13.5,
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 4,
        background: 'var(--db-surface)',
        border: '1px solid var(--db-line)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-dialog)',
        padding: 6,
        zIndex: 40,
      }}
    >
      {[
        { icon: 'user' as IconName, label: 'Profile', color: 'var(--db-ink-2)' },
        { icon: 'settings' as IconName, label: 'Settings', color: 'var(--db-ink-2)' },
      ].map(({ icon, label, color }) => (
        <Link
          to="/settings/profile"
          onClick={onClose}
          key={label}
          style={{ ...itemStyle, color }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon name={icon} size={14} />
          {label}
        </Link>
      ))}
      <InviteUsersLink onClick={onClose} />
      <div style={{ height: 1, background: 'var(--db-line)', margin: '5px 4px' }} />
      <div
        onClick={handleLogout}
        style={{ ...itemStyle, color: 'var(--db-rose-t)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Icon name="log-out" size={14} />
        Sign out
      </div>
    </div>
  )
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [subjectsOpen, setSubjectsOpen] = useState(true)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const { data: subjectsData } = useSubjects({ limit: 50 })

  const avatarInitials = user ? initials(user.name) : '?'
  const w = collapsed ? 52 : 264

  const pinnedItems = [
    { icon: 'home' as IconName, label: 'Dashboard', path: '/' as const },
    { icon: 'book' as IconName, label: 'Projects', path: '/projects' as const },
    { icon: 'book' as IconName, label: 'Tags', path: '/tags' as const },
  ]

  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        background: 'var(--db-bg)',
        borderRight: '1px solid var(--db-line)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        fontFamily: 'var(--font-ui)',
        transition: 'width 180ms ease, min-width 180ms ease, max-width 180ms ease',
        overflow: 'hidden',
      }}
    >
      {/* brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '18px 11px 14px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            flexShrink: 0,
            background: 'var(--db-ink)',
            color: 'var(--db-bg)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 22,
            lineHeight: 1,
            boxShadow: 'inset 0 -2px 0 rgba(255,255,255,0.06)',
          }}
        >
          <SiteLogo />
        </div>
        {!collapsed && (
          <div
            style={{
              fontWeight: 600,
              letterSpacing: '-0.01em',
              fontSize: 15,
              color: 'var(--db-ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <SiteName />{' '}
            <span style={{ color: 'var(--db-muted)', fontWeight: 400 }}>/ {user?.role ?? ''}</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            marginLeft: 'auto',
            width: 24,
            height: 24,
            borderRadius: 6,
            flexShrink: 0,
            background: 'transparent',
            border: '1px solid var(--db-line)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--db-muted)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon name={collapsed ? 'chev-right' : 'chev-down'} size={12} stroke={2} />
        </button>
      </div>

      {/* pinned nav */}
      <div
        style={{
          padding: '6px 6px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          flexShrink: 0,
        }}
      >
        {pinnedItems.map(({ icon, label, path }) => {
          const active = pathname === path
          return (
            <Link
              to={path}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '7px 0' : '7px 10px',
                justifyContent: collapsed ? 'center' : undefined,
                borderRadius: 6,
                color: active ? 'var(--db-ink)' : 'var(--db-ink-2)',
                background: active ? 'var(--db-bg-2)' : 'transparent',
                cursor: 'pointer',
                fontSize: 13.5,
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--db-bg-2)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
              title={collapsed ? label : undefined}
            >
              <span style={{ color: active ? 'var(--db-em)' : 'var(--db-muted)', flexShrink: 0 }}>
                <Icon name={icon} size={15} />
              </span>
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </div>

      {/* new page quick-action */}
      {!collapsed && user && user.role !== 'GUEST' && (
        <div style={{ padding: '6px 10px 4px', flexShrink: 0 }}>
          <button
            onClick={() => void navigate({ to: '/new-page' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'var(--db-em-soft)',
              border: '1px solid color-mix(in oklch, var(--db-em) 30%, transparent)',
              color: 'var(--db-em-deep)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-em-soft-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--db-em-soft)')}
          >
            <Icon name="plus" size={13} stroke={2.2} />
            New page
          </button>
        </div>
      )}

      {/* nav tree */}
      <div
        style={{
          marginTop: 10,
          padding: collapsed ? '0 6px' : '0 10px',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--db-line-2) transparent',
        }}
      >
        {!collapsed && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 4px 6px',
                gap: 2,
              }}
            >
              <span
                onClick={() => setSubjectsOpen((v) => !v)}
                style={{
                  width: 18,
                  height: 18,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--db-muted-2)',
                  cursor: 'pointer',
                  borderRadius: 3,
                  flexShrink: 0,
                  transition: 'transform 120ms',
                  transform: subjectsOpen ? 'rotate(90deg)' : 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Icon name="chev-right" size={10} />
              </span>
              <Link
                to="/subjects"
                style={{
                  fontSize: 13.5,
                  color: 'var(--db-ink-2)',
                  fontWeight: 400,
                  cursor: 'pointer',
                  flex: 1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--db-ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--db-ink-2)')}
              >
                Subjects
              </Link>
            </div>
            {subjectsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {subjectsData?.subjects.map((s) => (
                  <SubjectItem key={s.id} subject={s as SubjectNode} />
                ))}
                {subjectsData?.subjects.length === 0 && (
                  <div style={{ padding: '8px 10px', fontSize: 12.5, color: 'var(--db-muted-2)' }}>
                    No subjects yet
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* collapsed subject links */}
        {collapsed &&
          subjectsData?.subjects.slice(0, 8).map((s) => (
            <Link
              to="/subjects/$slug"
              params={{ slug: s.slug }}
              aria-label={s.name}
              key={s.id}
              title={s.name}
              style={{
                padding: '7px 0',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--db-muted)',
                cursor: 'pointer',
                borderRadius: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Icon name="book" size={14} />
            </Link>
          ))}
      </div>

      {/* user profile */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {userMenuOpen && <UserMenu onClose={() => setUserMenuOpen(false)} />}
        <div
          onClick={() => setUserMenuOpen((v) => !v)}
          style={{
            borderTop: '1px solid var(--db-line)',
            padding: collapsed ? '10px 0' : 10,
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : undefined,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title={collapsed ? (user?.name ?? '') : undefined}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              flexShrink: 0,
              background: 'linear-gradient(135deg, oklch(0.7 0.13 30), oklch(0.55 0.15 350))',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 600,
              fontSize: 12.5,
              letterSpacing: '0.02em',
            }}
          >
            {user?.avatar?.url ? (
              <img
                src={user.avatar.url}
                alt=""
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              avatarInitials
            )}
          </div>
          {!collapsed && (
            <>
              <div
                style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}
              >
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: 13,
                    color: 'var(--db-ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.name}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--db-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      background: 'var(--db-em)',
                      borderRadius: '50%',
                      display: 'inline-block',
                    }}
                  />
                  {user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : ''} ·
                  <SiteName />
                </div>
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--db-muted)' }}>
                <Icon name="more" size={16} />
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
