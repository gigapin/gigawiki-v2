import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'

import { AppInit } from '@/components/AppInit'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { useAuthStore } from '@/stores/auth.store'

const rootRoute = createRootRoute({
  component: AppInit,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) ?? '',
  }),
  component: LoginPage,
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
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/',
  staticData: { title: 'Dashboard' },
  component: DashboardPage,
})

const routeTree = rootRoute.addChildren([loginRoute, authLayout.addChildren([indexRoute])])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
