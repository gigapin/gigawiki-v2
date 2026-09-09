export type IconName =
  | 'chev-right'
  | 'chev-left'
  | 'chev-down'
  | 'search'
  | 'star'
  | 'star-fill'
  | 'book'
  | 'folder'
  | 'doc'
  | 'hash'
  | 'bell'
  | 'plus'
  | 'more'
  | 'home'
  | 'users'
  | 'eye'
  | 'edit'
  | 'spark'
  | 'msg'
  | 'tag'
  | 'history'
  | 'globe'
  | 'lightning'
  | 'external'
  | 'trend-up'
  | 'trend-down'
  | 'check'
  | 'log-out'
  | 'user'
  | 'settings'
  | 'menu'
  | 'lock'
  | 'clock'
  | 'dots-h'
  | 'pencil'

export function Icon({
  name,
  size = 16,
  stroke = 1.6,
}: {
  name: IconName
  size?: number
  stroke?: number
}) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'chev-right':
      return (
        <svg {...p}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
      )
    case 'chev-left':
      return (
        <svg {...p}>
          <polyline points="15 6 9 12 15 18" />
        </svg>
      )
    case 'chev-down':
      return (
        <svg {...p}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )
    case 'search':
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      )
    case 'star':
      return (
        <svg {...p}>
          <polygon points="12 3 14.6 9.1 21 9.7 16 14 17.6 20.5 12 17 6.4 20.5 8 14 3 9.7 9.4 9.1" />
        </svg>
      )
    case 'star-fill':
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <polygon points="12 3 14.6 9.1 21 9.7 16 14 17.6 20.5 12 17 6.4 20.5 8 14 3 9.7 9.4 9.1" />
        </svg>
      )
    case 'book':
      return (
        <svg {...p}>
          <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" />
          <path d="M19 19v2" />
        </svg>
      )
    case 'folder':
      return (
        <svg {...p}>
          <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
        </svg>
      )
    case 'doc':
      return (
        <svg {...p}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <polyline points="14 3 14 8 19 8" />
        </svg>
      )
    case 'hash':
      return (
        <svg {...p}>
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="15" x2="20" y2="15" />
          <line x1="10" y1="3" x2="8" y2="21" />
          <line x1="16" y1="3" x2="14" y2="21" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...p}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...p}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )
    case 'more':
      return (
        <svg {...p}>
          <circle cx="5" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="19" cy="12" r="1.4" />
        </svg>
      )
    case 'home':
      return (
        <svg {...p}>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </svg>
      )
    case 'users':
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 21c.5-4 3.5-6 7-6s6.5 2 7 6" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M22 19c-.3-2.5-1.8-4-4-4" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...p}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'edit':
      return (
        <svg {...p}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      )
    case 'spark':
      return (
        <svg {...p}>
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <path d="M12 8c1.5 0 4 2.5 4 4s-2.5 4-4 4-4-2.5-4-4 2.5-4 4-4z" />
        </svg>
      )
    case 'msg':
      return (
        <svg {...p}>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
        </svg>
      )
    case 'tag':
      return (
        <svg {...p}>
          <path d="M20.6 12.6 12 21 3 12V3h9z" />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      )
    case 'history':
      return (
        <svg {...p}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <polyline points="3 4 3 9 8 9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'globe':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c3 3.5 3 14.5 0 18" />
          <path d="M12 3c-3 3.5-3 14.5 0 18" />
        </svg>
      )
    case 'lightning':
      return (
        <svg {...p}>
          <polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" />
        </svg>
      )
    case 'external':
      return (
        <svg {...p}>
          <path d="M14 4h6v6" />
          <path d="M10 14L20 4" />
          <path d="M20 14v6H4V4h6" />
        </svg>
      )
    case 'trend-up':
      return (
        <svg {...p}>
          <polyline points="3 17 9 11 13 15 21 7" />
          <polyline points="14 7 21 7 21 14" />
        </svg>
      )
    case 'trend-down':
      return (
        <svg {...p}>
          <polyline points="3 7 9 13 13 9 21 17" />
          <polyline points="14 17 21 17 21 10" />
        </svg>
      )
    case 'check':
      return (
        <svg {...p}>
          <polyline points="4 12 10 18 20 6" />
        </svg>
      )
    case 'log-out':
      return (
        <svg {...p}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      )
    case 'user':
      return (
        <svg {...p}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    case 'menu':
      return (
        <svg {...p}>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...p}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 15" />
        </svg>
      )
    case 'dots-h':
      return (
        <svg {...p}>
          <circle cx="5" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="19" cy="12" r="1.4" />
        </svg>
      )
    case 'pencil':
      return (
        <svg {...p}>
          <path d="M17 3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      )
    default:
      return null
  }
}
