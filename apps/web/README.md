# GigaWiki frontend

React + Vite, TanStack Router/Query, Zustand and shadcn/ui. All commands below run from the repository root.

```sh
./bin/pnpm --filter web dev
./bin/pnpm --filter web build
./bin/pnpm --filter web test
```

In development, Vite proxies `/api` to `http://localhost:3001`. Start the API separately or run `./bin/pnpm dev` for both apps. Set `VITE_API_URL` in `apps/web/.env.local` when using another API origin. Production hosting must proxy `/api` or provide this environment variable at build time.

## UI foundation

- `src/styles/tokens.css` is the canonical dark theme. shadcn uses semantic OKLCH tokens; legacy `--db-*` and `--gw-*` variables are compatibility aliases.
- UI typography: Geist; display headings: Instrument Serif; code: Geist Mono. Fonts are loaded in `index.html`.
- `src/styles/cover-colors.ts` holds the six subject cover tones shared by cards and the creation preview.
- Reuse components in `src/components/ui/` for controls, dialogs and surfaces. Shared resource forms, states, pagination and delete confirmations live in `src/components/shared/`.
- New features use typed API adapters and TanStack Query hooks. Preserve the response shapes actually returned by the API; it does not consistently use a `data` envelope.

## Implemented project flow

`/subjects/:slug` links to `/projects/:slug`. The sidebar loads projects when a subject is expanded.

Project detail has inline sections and a paginated page list. Editors/admins can create sections and reorder them by dragging or with move buttons; project owners/admins can edit the project and its sections. Only admins can delete them, after confirmation. Creation of projects from Subject detail now uses the same shadcn form as editing.

The reorder operation sends all section positions to `PATCH /api/v2/sections/:slug/position`. Native drag-and-drop is accompanied by keyboard/touch buttons. `@dnd-kit` is not required by the current implementation.

## Registration and verification

`/register` submits a validated name, email, password and confirmation. Registration is gated by the public `ALLOW_SELF_REGISTRATION` setting. New accounts have the `GUEST` role and cannot sign in until email verification.

The backend queues a verification email with a full `/verify-email?token=…` URL using `FRONTEND_URL`. The email worker renders it and sends it through the SMTP credentials in the root `.env`. When using Mailtrap Email Sandbox, open the message in the Mailtrap inbox rather than the recipient's real inbox. Tokens expire after 24 hours and can be used once.

`/verify-email` handles success, expired/used/missing links and resending. Verification runs in the route loader, avoiding duplicate POST requests from React Strict Mode effects. `/auth/resend-verification` returns the same neutral confirmation for unknown and already verified accounts. If queueing fails after account creation, the signup screen offers resend rather than asking the user to register again.

To enable registration temporarily for local tests, with PostgreSQL and Redis running:

```sh
./bin/pnpm --filter gigawiki-v2-api registration:enable
```

This upserts `ALLOW_SELF_REGISTRATION=true` in PostgreSQL and clears the Redis public-settings cache. It does not rerun the seed or reset existing users. Restart the API after changing SMTP credentials. Set the setting back to `false` in Prisma Studio when testing is complete.

## Design decisions and remaining work

The implementation follows tasks 30–34 when older design prompts conflict:

- Sections are inline in Project detail; no Section detail route.
- Project starts with sections and pages; Activity/Comments tabs are not part of this first iteration.
- Revision history will use a drawer with preview/restore. A side-by-side diff is an optional later extension.
- Settings will use Profile, Password, Appearance and the admin Users, Invites, App Settings areas. The first theme is dark; light mode is not implemented.
- Use Lucide for new icons and icon/typography based empty states. Existing custom icons remain during migration.

Page rows currently display metadata; opening, creating and editing page content belong to the next reader/Tiptap iteration. Cover uploads and subject reassignment are not implemented by these project forms. The backend does not currently support project reassignment in its update contract.

Reader/editor, password recovery, invitation acceptance, revisions, comments, favorites and settings remain to be implemented. Existing Dashboard/Subject markup is migrated incrementally; it still includes inline layout styles.

## Verification

`test` runs Vitest in Node: registration validation and API contracts, registration/verification UI states, project API contracts, section ordering, API error formats, session/settings response shapes, and server-rendered role-dependent project controls. It does not exercise browser interactions or replace future Testing Library/end-to-end coverage for dialogs, dragging and navigation.
