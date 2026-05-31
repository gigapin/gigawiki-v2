import { useState } from 'react'
import { Outlet } from '@tanstack/react-router'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <style>{`
        .db-app {
          display: grid;
          grid-template-columns: var(--db-sidebar-w, 264px) 1fr;
          min-height: 100vh;
          background: var(--db-bg);
          color: var(--db-ink);
          font-family: 'Geist', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .db-app::before {
          content: "";
          position: fixed; inset: 0;
          pointer-events: none;
          background:
            radial-gradient(1200px 600px at 85% -15%, color-mix(in oklch, var(--db-em) 10%, transparent), transparent 62%),
            radial-gradient(1000px 560px at -10% 115%, color-mix(in oklch, var(--db-indigo) 9%, transparent), transparent 60%);
          z-index: -1;
        }
        @media (max-width: 880px) {
          .db-app { grid-template-columns: 1fr; }
          .db-sidebar-desktop { display: none; }
          .db-sidebar-drawer {
            position: fixed; inset: 0; z-index: 40;
          }
          .db-sidebar-drawer-overlay {
            position: absolute; inset: 0; background: rgba(0,0,0,0.55);
          }
          .db-sidebar-drawer-panel {
            position: absolute; left: 0; top: 0; bottom: 0;
          }
        }
        @media (min-width: 881px) {
          .db-sidebar-drawer { display: none; }
        }
      `}</style>

      <div
        className="db-app"
        style={{ '--db-sidebar-w': collapsed ? '52px' : '264px' } as React.CSSProperties}
      >
        {/* desktop sidebar */}
        <div className="db-sidebar-desktop">
          <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
        </div>

        {/* mobile drawer */}
        {mobileOpen && (
          <div className="db-sidebar-drawer">
            <div className="db-sidebar-drawer-overlay" onClick={() => setMobileOpen(false)} />
            <div className="db-sidebar-drawer-panel">
              <Sidebar collapsed={false} onToggleCollapse={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar onMenuToggle={() => setMobileOpen((v) => !v)} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}
