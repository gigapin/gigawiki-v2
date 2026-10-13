import { Link, Outlet } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth.store'

export function SettingsLayout() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN')
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-9">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <nav aria-label="Settings" className="flex flex-wrap gap-2 md:flex-col">
          <Link
            to="/settings/profile"
            className="rounded-md px-3 py-2 text-sm"
            activeProps={{ className: 'bg-muted font-semibold', 'aria-current': 'page' }}
          >
            Profile
          </Link>
          <Link
            to="/settings/password"
            className="rounded-md px-3 py-2 text-sm"
            activeProps={{ className: 'bg-muted font-semibold', 'aria-current': 'page' }}
          >
            Password
          </Link>
          <Link
            to="/settings/appearance"
            className="rounded-md px-3 py-2 text-sm"
            activeProps={{ className: 'bg-muted font-semibold', 'aria-current': 'page' }}
          >
            Appearance
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/settings/users"
                className="rounded-md px-3 py-2 text-sm"
                activeProps={{ className: 'bg-muted font-semibold', 'aria-current': 'page' }}
              >
                Users
              </Link>
              <Link
                to="/settings/invites"
                className="rounded-md px-3 py-2 text-sm"
                activeProps={{ className: 'bg-muted font-semibold', 'aria-current': 'page' }}
              >
                Invites
              </Link>
              <Link
                to="/settings/app"
                className="rounded-md px-3 py-2 text-sm"
                activeProps={{ className: 'bg-muted font-semibold', 'aria-current': 'page' }}
              >
                App Settings
              </Link>
            </>
          )}
        </nav>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
