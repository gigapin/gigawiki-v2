import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { useEffect } from 'react'

import { useAuthStore } from '@/stores/auth.store'
import { useSettingsStore } from '@/stores/settings.store'

function AppInit() {
  const initAuth = useAuthStore((s) => s.initAuth)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  useEffect(() => {
    initAuth()
    fetchSettings()
  }, [initAuth, fetchSettings])

  return <Outlet />
}

const rootRoute = createRootRoute({
  component: AppInit,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Login page (task 28)</p>
    </div>
  ),
})

const authLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  beforeLoad: ({ location }) => {
    const { accessToken } = useAuthStore.getState()
    if (!accessToken) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/',
  component: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">GiGaWiki</h1>
        <p className="text-muted-foreground">Your collaborative knowledge base</p>
      </div>
    </div>
  ),
})

const routeTree = rootRoute.addChildren([loginRoute, authLayout.addChildren([indexRoute])])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
