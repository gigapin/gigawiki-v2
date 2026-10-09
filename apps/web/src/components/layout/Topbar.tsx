import { useEffect, useRef, useState } from 'react'
import { useNavigate, useMatches } from '@tanstack/react-router'

import { SearchModal } from './SearchModal'

import { InviteUsersLink } from '@/components/auth/InviteUsersLink'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import apiClient from '@/api/client'
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

function AvatarDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  async function handleLogout() {
    try {
      await apiClient.post('/api/v2/auth/logout')
    } catch {
      /* ignore */
    }
    clearAuth()
    navigate({ to: '/login', search: { redirect: '' } })
  }

  const itemStyle: React.CSSProperties = {
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
        right: 0,
        top: 'calc(100% + 8px)',
        background: 'var(--db-surface)',
        border: '1px solid var(--db-line)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-dialog)',
        padding: 6,
        minWidth: 180,
        zIndex: 30,
      }}
    >
      {[
        { icon: 'user' as IconName, label: 'Profile', color: 'var(--db-ink-2)' },
        { icon: 'settings' as IconName, label: 'Settings', color: 'var(--db-ink-2)' },
      ].map(({ icon, label, color }) => (
        <div
          key={label}
          style={{ ...itemStyle, color }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon name={icon} size={14} />
          {label}
        </div>
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

function CreateMenu({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const items = [
    { icon: 'doc' as IconName, label: 'New page', sub: 'Blank page in current space', tone: 'em' },
    {
      icon: 'folder' as IconName,
      label: 'New project',
      sub: 'Group pages by initiative',
      tone: 'amber',
    },
    {
      icon: 'book' as IconName,
      label: 'New subject',
      sub: 'Top-level area, e.g. "Security"',
      tone: 'indigo',
    },
    null,
    {
      icon: 'lightning' as IconName,
      label: 'From template',
      sub: 'Runbook, RFC, retro, glossary…',
      tone: 'rose',
    },
    {
      icon: 'external' as IconName,
      label: 'Import',
      sub: 'Notion, Confluence, Markdown',
      tone: '',
    },
  ]

  const toneStyles: Record<string, { bg: string; color: string }> = {
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
    '': { bg: 'var(--db-bg-2)', color: 'var(--db-ink-2)' },
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 8px)',
        background: 'var(--db-surface)',
        border: '1px solid var(--db-line)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-dialog)',
        padding: 6,
        minWidth: 240,
        zIndex: 30,
      }}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} style={{ height: 1, background: 'var(--db-line)', margin: '5px 4px' }} />
        ) : (
          <div
            key={item.label}
            role={item.label === 'New page' ? 'button' : undefined}
            tabIndex={item.label === 'New page' ? 0 : undefined}
            onClick={() => {
              if (item.label === 'New page' && user?.role !== 'GUEST') {
                onClose()
                void navigate({ to: '/new-page' })
              }
            }}
            onKeyDown={(e) => {
              if (
                item.label === 'New page' &&
                (e.key === 'Enter' || e.key === ' ') &&
                user?.role !== 'GUEST'
              ) {
                e.preventDefault()
                onClose()
                void navigate({ to: '/new-page' })
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13.5,
              color: 'var(--db-ink-2)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                display: 'grid',
                placeItems: 'center',
                background: toneStyles[item.tone].bg,
                color: toneStyles[item.tone].color,
              }}
            >
              <Icon name={item.icon} size={14} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span>{item.label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--db-muted)' }}>{item.sub}</span>
            </span>
          </div>
        ),
      )}
    </div>
  )
}

interface TopbarProps {
  onMenuToggle?: () => void
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const user = useAuthStore((s) => s.user)
  const [createOpen, setCreateOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const matches = useMatches()
  const avatarInitials = user ? initials(user.name) : '?'

  // Cmd+K opens search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Build breadcrumb from route matches
  const crumbs = matches
    .filter((m) => (m.staticData as { title?: string })?.title)
    .map((m) => (m.staticData as { title: string }).title)

  return (
    <>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          alignItems: 'center',
          gap: 16,
          padding: '14px 20px',
          borderBottom: '1px solid var(--db-line)',
          background: 'color-mix(in srgb, var(--db-bg) 80%, transparent)',
          backdropFilter: 'saturate(140%) blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
          fontFamily: 'var(--font-ui)',
        }}
      >
        {/* breadcrumbs */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--db-muted)',
            fontSize: 13,
            minWidth: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                display: 'grid',
                placeItems: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--db-muted)',
                cursor: 'pointer',
                flexShrink: 0,
                marginRight: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--db-bg-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Icon name="menu" size={14} />
            </button>
          )}
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'var(--db-surface)',
              border: '1px solid var(--db-line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--db-ink-2)',
              flexShrink: 0,
            }}
          >
            <Icon name="home" size={12} stroke={1.8} />
          </span>
          {crumbs.map((title, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--db-muted-2)', fontSize: 11 }}>
                <Icon name="chev-right" size={11} />
              </span>
              <span
                style={{
                  color: i === crumbs.length - 1 ? 'var(--db-ink)' : 'var(--db-ink-2)',
                  fontWeight: i === crumbs.length - 1 ? 500 : 400,
                }}
              >
                {title}
              </span>
            </span>
          ))}
          {crumbs.length === 0 && (
            <>
              <span style={{ color: 'var(--db-muted-2)', fontSize: 11 }}>
                <Icon name="chev-right" size={11} />
              </span>
              <span style={{ color: 'var(--db-ink)', fontWeight: 500 }}>Dashboard</span>
            </>
          )}
        </nav>

        {/* search */}
        <div
          onClick={() => setSearchOpen(true)}
          style={{
            width: 'clamp(280px, 42vw, 520px)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--db-surface)',
            border: '1px solid var(--db-line)',
            borderRadius: 8,
            padding: '7px 10px 7px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
            cursor: 'text',
            minWidth: 0,
          }}
        >
          <span style={{ color: 'var(--db-muted)', flexShrink: 0 }}>
            <Icon name="search" size={14} stroke={1.8} />
          </span>
          <span
            style={{
              flex: 1,
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              color: 'var(--db-muted)',
              userSelect: 'none',
            }}
          >
            Search pages, projects, people…
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--db-muted)',
              background: 'var(--db-bg-2)',
              border: '1px solid var(--db-line)',
              padding: '1px 6px',
              borderRadius: 4,
              flexShrink: 0,
            }}
          >
            ⌘K
          </span>
        </div>

        {/* right actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'flex-end',
            minWidth: 0,
          }}
        >
          <ThemeToggle />
          <button
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--db-surface)',
              border: '1px solid var(--db-line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--db-ink-2)',
              cursor: 'pointer',
            }}
            title="Notifications"
          >
            <Icon name="bell" size={15} />
          </button>
          <button
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--db-surface)',
              border: '1px solid var(--db-line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--db-ink-2)',
              cursor: 'pointer',
            }}
            title="What's new"
          >
            <Icon name="spark" size={15} />
          </button>

          {/* create button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setCreateOpen((o) => !o)
                setAvatarOpen(false)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--db-em)',
                backgroundImage:
                  'linear-gradient(180deg, color-mix(in oklch, var(--db-em) 88%, white), var(--db-em))',
                color: 'oklch(var(--primary-foreground))',
                fontWeight: 500,
                fontSize: 13.5,
                padding: '7px 8px 7px 12px',
                borderRadius: 8,
                border: '1px solid color-mix(in oklch, var(--db-em-deep) 60%, transparent)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 1px 2px rgba(20,20,15,0.1)',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              <Icon name="plus" size={14} stroke={2.2} />
              Create
              <span
                style={{
                  borderLeft: '1px solid color-mix(in oklch, var(--db-em-deep) 70%, transparent)',
                  paddingLeft: 8,
                  marginLeft: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Icon name="chev-down" size={12} stroke={2} />
              </span>
            </button>
            {createOpen && <CreateMenu onClose={() => setCreateOpen(false)} />}
          </div>

          {/* avatar */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setAvatarOpen((o) => !o)
                setCreateOpen(false)
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, oklch(0.7 0.13 30), oklch(0.55 0.15 350))',
                color: 'white',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 600,
                fontSize: 12.5,
                cursor: 'pointer',
                border: '2px solid var(--db-surface)',
                boxShadow: '0 0 0 1px var(--db-line)',
                fontFamily: 'var(--font-ui)',
              }}
              title={user?.name ?? ''}
            >
              {avatarInitials}
            </button>
            {avatarOpen && <AvatarDropdown onClose={() => setAvatarOpen(false)} />}
          </div>
        </div>
      </div>
    </>
  )
}
