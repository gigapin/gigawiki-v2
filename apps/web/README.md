# GigaWiki frontend

React + Vite, TanStack Router/Query, Zustand and shadcn/ui. All commands below run from the repository root.

```sh
./bin/pnpm --filter web dev
./bin/pnpm --filter web build
./bin/pnpm --filter web test
```

In development, Vite proxies `/api` to `http://localhost:3001`. Start the API separately or run `./bin/pnpm dev` for both apps. Set `VITE_API_URL` in `apps/web/.env.local` when using another API origin. Production hosting must proxy `/api` or provide this environment variable at build time.

## UI foundation

- `src/styles/tokens.css` contains the canonical dark and light themes. shadcn uses semantic OKLCH tokens; legacy `--db-*` and `--gw-*` variables are compatibility aliases.
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
- Settings will use Profile, Password, Appearance and the admin Users, Invites, App Settings areas. Dark is the default; a sun/moon button in the topbar and auth screens switches to light. The choice is stored locally in the browser and applied before React loads, including toast notifications.
- Use Lucide for new icons and icon/typography based empty states. Existing custom icons remain during migration.

Page rows open `/pages/:slug`; `/new-page` selects a subject, project and section before creating a page. Contextual creation uses `/projects/:projectSlug/sections/:sectionSlug/pages/new`; editing uses `/pages/:slug/edit`. Tiptap supports formatting, headings, lists, quotes, code and tables, with draft/publish actions, visibility and an unsaved-changes guard. Content is saved as HTML; reader/editor also recognize serialized Tiptap JSON documents and preserve plain text as text nodes. Unsupported JSON nodes/marks show an error and disable saving. Reader/editor share `styles/wiki-content.css` (Georgia for prose, Geist for headings, Geist Mono for code).

Breadcrumb ancestors are links; a section links to `/projects/:slug?section=:sectionSlug`, restoring the originating section. Editing also links back to the reader. Cover uploads and subject reassignment are not implemented by these project forms. The backend does not currently support project reassignment in its update contract.

Advanced editor features (30-second autosave, mentions and bubble menu), password recovery, invitation acceptance, revisions, comments, favorites and settings remain to be implemented. Tags/favorite controls are also pending in the reader. Saving uses POST for creation and PATCH for content/title/publication settings in one request; title changes preserve unique slugs. The shared schema validates legacy JSON before editing; supported documents retain their formatting. Existing Dashboard/Subject markup is migrated incrementally; it still includes inline layout styles.

## Verification

The latest checks passed: 35 frontend tests in 7 files, frontend lint/build, 234 API tests in 17 files and API typecheck. Vite reports a bundle-size warning; code splitting is pending. Registration with Mailtrap was confirmed by the user.

`test` runs Vitest in Node: registration validation and API contracts, registration/verification UI states, project API contracts, section ordering, API error formats, session/settings response shapes, legacy page-content conversion, breadcrumb destinations and server-rendered role-dependent project controls. It does not exercise browser interactions or replace future Testing Library/end-to-end coverage for dialogs, dragging and navigation.

## Theme verification — 2026-10-08

Dark/light tokens also cover legacy aliases, card bodies, skeletons, shadows and wiki content. Colored cover banners retain their artwork colors. The preference key is `gigawiki-theme`; blocked storage does not prevent toggling. The theme is local to the browser, not an account setting. Six tests cover startup, invalid preferences, switching, persistence and unavailable storage. Frontend lint, build and all 41 tests pass; visual browser verification remains pending.

## Page deletion — 2026-10-08

Admins can delete a page from the reader after confirmation. The dialog stays open on API errors and blocks duplicate submissions while pending. Success returns to the originating project section, invalidates resource lists and counts, and removes the cached page. Backend section/project page counts exclude soft-deleted pages. Editors retain creation/editing; guests can read. Frontend tests cover roles, DELETE failures and navigation/cache updates; browser interaction verification remains pending.

## Editor enhancements — 2026-10-08

The toolbar uploads inline images (also paste/drop), adds/edits/removes links with a selection-preserving dialog, and selects code language. CodeBlockLowlight powers highlighting in editor and reader, with theme-aware colors. Image files are validated before multipart POST `/api/v2/images?type=INLINE`; only persistent URLs are inserted. The parent form disables saving during upload or unsupported content, and warns before leaving an upload in progress.

The API serves recorded asset paths through `/uploads/*`, streaming WebP from MinIO/S3; the existing public-read policy applies. Real MinIO upload/read/delete was verified with a temporary fixture. Editor interaction tests now use Testing Library with jsdom (links, upload states/errors, paste/drop, language, legacy content); they do not replace real browser verification. All 75 frontend tests and 237 API tests pass, as do frontend lint/build and API typecheck. Bundle code splitting remains pending.

## Image sizing

Hover or select an image in the editor to reveal four corner resize handles. Drag a corner to change size while preserving proportions. Width and height are saved with the page and retained in the reader; images remain constrained to the available width on narrow screens. The reader has no resize handles. This uses the existing Tiptap Image extension, with no new dependency or database migration. The resize and reader persistence test brings the frontend total to 76 passing tests.
