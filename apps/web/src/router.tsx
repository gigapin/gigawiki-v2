import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'

import { PasswordPage } from '@/pages/settings/PasswordPage'
import { AppearancePage } from '@/pages/settings/AppearancePage'
import { UsersPage } from '@/pages/settings/UsersPage'
import { AppSettingsPage } from '@/pages/settings/AppSettingsPage'
import { SettingsLayout } from '@/pages/settings/SettingsLayout'
import { ProfilePage } from '@/pages/settings/ProfilePage'
import { InvitesPage } from '@/pages/settings/InvitesPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage'
import { NewPageLocationPage } from '@/pages/pages/NewPageLocationPage'
import { AppInit } from '@/components/AppInit'
import { AppShell } from '@/components/layout/AppShell'
import { verifyEmailToken } from '@/api/auth'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyEmailPage, VerifyEmailPending } from '@/pages/auth/VerifyEmailPage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SubjectsPage } from '@/pages/subjects/SubjectsPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { SubjectDetailPage } from '@/pages/subjects/SubjectDetailPage'
import { useAuthStore } from '@/stores/auth.store'

const rootRoute = createRootRoute({
  beforeLoad: async () => {
    await useAuthStore.getState().initAuth()
  },
  component: AppInit,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect: string; passwordChanged?: boolean } => ({
    redirect: (search.redirect as string) ?? '',
    passwordChanged: search.passwordChanged === true || search.passwordChanged === 'true',
  }),
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => verifyEmailToken(deps.token),
  staleTime: Infinity,
  pendingMs: 0,
  pendingComponent: VerifyEmailPending,
  component: VerifyEmailPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
})
const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
})
const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accept-invite',
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: AcceptInvitePage,
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

const subjectsRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/subjects',
  staticData: { title: 'Subjects' },
  component: SubjectsPage,
})

const subjectDetailRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/subjects/$slug',
  staticData: { title: 'Subject' },
  component: SubjectDetailPage,
})

const projectDetailRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/projects/$slug',
  validateSearch: (search: Record<string, unknown>): { section?: string } => ({
    section: typeof search.section === 'string' && search.section ? search.section : undefined,
  }),
  staticData: { title: 'Project' },
  component: ProjectDetailPage,
})

const newPageLocationRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/new-page',
  staticData: { title: 'New page' },
  component: NewPageLocationPage,
})

const newPageRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/projects/$projectSlug/sections/$sectionSlug/pages/new',
  staticData: { title: 'New page' },
  component: lazyRouteComponent(() => import('@/pages/pages/PageEditorPage'), 'NewPagePage'),
})
const pageRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/pages/$slug',
  staticData: { title: 'Page' },
  component: lazyRouteComponent(() => import('@/pages/pages/PageReaderPage'), 'PageReaderPage'),
})
const editPageRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/pages/$slug/edit',
  staticData: { title: 'Edit page' },
  component: lazyRouteComponent(() => import('@/pages/pages/PageEditorPage'), 'EditPagePage'),
})

const settingsRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/settings',
  component: SettingsLayout,
})
const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/settings/profile' })
  },
})
const profileRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/profile',
  staticData: { title: 'Profile' },
  component: ProfilePage,
})
const passwordRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/password',
  staticData: { title: 'Password' },
  component: PasswordPage,
})
const appearanceRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/appearance',
  staticData: { title: 'Appearance' },
  component: AppearancePage,
})
const usersRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/users',
  staticData: { title: 'Users' },
  beforeLoad: () => {
    if (useAuthStore.getState().user?.role !== 'ADMIN') throw redirect({ to: '/settings/profile' })
  },
  component: UsersPage,
})
const appSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/app',
  staticData: { title: 'App Settings' },
  beforeLoad: () => {
    if (useAuthStore.getState().user?.role !== 'ADMIN') throw redirect({ to: '/settings/profile' })
  },
  component: AppSettingsPage,
})
const invitesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/invites',
  staticData: { title: 'Invitations' },
  beforeLoad: () => {
    if (useAuthStore.getState().user?.role !== 'ADMIN') throw redirect({ to: '/' })
  },
  component: InvitesPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  verifyEmailRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  acceptInviteRoute,
  authLayout.addChildren([
    indexRoute,
    settingsRoute.addChildren([
      settingsIndexRoute,
      profileRoute,
      passwordRoute,
      appearanceRoute,
      usersRoute,
      invitesRoute,
      appSettingsRoute,
    ]),
    subjectsRoute,
    subjectDetailRoute,
    projectDetailRoute,
    newPageLocationRoute,
    newPageRoute,
    pageRoute,
    editPageRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
