# GigaWiki — Claude Design Prompts

Dark, modern UI templates for the GigaWiki frontend, generated with **Claude Design**.
This file contains a shared **Design System Header** plus **20 screen prompts** that cover the
entire application (derived from the `apps/api` backend).

## How to use

1. Open Claude Design.
2. For each screen, paste the **Design System Header** block first, then the body of the screen
   prompt directly underneath it, and run. Each screen is rendered in its own run so it gets full
   attention and a consistent look.
3. **Recommended order:** start with **#7 Dashboard** to lock the app shell (sidebar + top bar),
   then **#13 Page view** (the core reading experience), then work through the rest. Auth screens
   (#1–#6) and admin (#18–#19) can be done anytime.

The backend this maps to: base path `/api/v2`, JWT auth (Bearer + refresh cookie), content
hierarchy `Subject → Project → Section → Page → Revision`, polymorphic Comments/Tags/Favorites/
Views/Activity on Page·Project·Section, full-text page search, and roles `ADMIN | EDITOR | GUEST`
(GUEST read-only, EDITOR create/edit, ADMIN delete + user management + global activity).

---

## Design System Header

> Paste this block at the top of **every** screen prompt.

```
Product: GigaWiki — a collaborative wiki / knowledge base.
Theme: Dark, modern, productivity-tool aesthetic (Linear/Notion density with editorial calm).
Background: near-black #0A0C0D; elevated surfaces #12181A; cards/popovers #161E20; hairline borders #222B2E.
Accent: emerald→teal. Primary #10B981, secondary #14B8A6; subtle emerald→teal gradient for highlights, focus rings, and active states.
Text: primary #E8EEEC, muted #8A9794, disabled #5A6663; accent text in emerald.
Typography: Inter/Geist for UI; a comfortable serif (e.g. Lora) for long-form page CONTENT with line-height 1.7.
Shape & depth: 10px radius, soft low shadows, faint glassy elevation, thin 1px borders, subtle emerald glow on hover.
Reusable components: left sidebar with a collapsible tree (Subject › Project › Section › Page) plus Favorites + Search entries; top bar with breadcrumb + command-palette search (⌘K) + create button + user avatar menu; pill-shaped teal-tinted tag chips; role badges (ADMIN/EDITOR/GUEST); avatars; skeleton loaders; empty states; toast notifications.
Icons: Lucide line icons.
Accessibility: WCAG-AA contrast, visible emerald focus rings, fully keyboard-navigable.
Output: a high-fidelity desktop template (note responsive behavior where relevant). Use realistic knowledge-base placeholder content.
```

---

## Group A — Authentication

These are centered card layouts on the near-black background with a faint emerald radial glow. No app shell (no sidebar/top bar).

### 1. Login

```
Design a Login screen for GigaWiki. A centered card on the near-black background with a faint emerald radial glow behind it. Small GigaWiki wordmark/logo at top. Fields: Email, Password (with show/hide toggle). A "Remember me" checkbox and a "Forgot password?" link on the same row. Primary emerald full-width "Sign in" button. Below: a muted "Don't have an account? Create account" link. Show inline field validation and a distinct error banner state for "Invalid email or password". Keep it clean and tight.
```

### 2. Register

```
Design a Register / Create account screen for GigaWiki, matching the centered-card auth style. Fields: Name, Email, Password (with a strength meter that fills emerald→teal), Confirm password. Primary emerald "Create account" button. Link "Already have an account? Sign in". Also render a SECOND variant of the same card for when self-registration is disabled: an informational state that says registration is invite-only with a "Request an invite" muted action. Show inline validation.
```

### 3. Forgot password

```
Design a Forgot password screen for GigaWiki in the centered-card auth style. A single Email field and a primary emerald "Send reset link" button, with a "Back to sign in" link. Render a SECOND success state of the same card: a checkmark icon, "Check your inbox" heading, and reassuring copy that does NOT reveal whether the email exists, plus a "Resend" secondary action.
```

### 4. Reset password

```
Design a Reset password screen for GigaWiki (reached from an email link), centered-card auth style. Fields: New password (with emerald→teal strength meter), Confirm new password. Primary emerald "Reset password" button. Render a SECOND success state: checkmark, "Password updated" heading, and a "Continue to sign in" button. Show inline validation for mismatched passwords.
```

### 5. Verify email

```
Design an Email verification status screen for GigaWiki in the centered-card auth style. Render THREE states side by side as variants of the same card: (1) Loading — a spinner and "Verifying your email…"; (2) Success — emerald checkmark, "Email verified" heading, and a "Continue to GigaWiki" button; (3) Expired/invalid — a muted warning icon, "This link has expired or is invalid", and a "Resend verification email" button.
```

### 6. Accept invitation

```
Design an Accept invitation screen for GigaWiki, centered-card auth style. Top of the card shows inviter context: an avatar and "Jane Doe invited you to join GigaWiki as EDITOR" with a teal role badge. Fields: Email (pre-filled and read-only/disabled), Name, Password (with strength meter). Primary emerald "Accept & join" button. Render a SECOND variant for an expired invite: a warning state saying "This invitation has expired" with a "Contact your admin" note.
```

---

## Group B — App shell & home

### 7. Dashboard / Home

```
Design the GigaWiki Dashboard / Home screen — this also establishes the GLOBAL APP SHELL used across the whole app. Left sidebar: GigaWiki logo at top, a collapsible navigation tree (Subjects › Projects › Sections › Pages) with expand/collapse chevrons and an active-item emerald highlight, plus pinned entries for "Search" and "Favorites", and a user mini-profile at the bottom. Top bar: breadcrumb on the left, a centered command-palette search box hinting "⌘K", a primary emerald "Create" button with dropdown, and a user avatar menu on the right. Main content: a welcome header ("Welcome back, Alex"), a row of stat tiles (Total pages, Projects, Your contributions, Views this week) with small sparkline/trend hints, a "Recently viewed" horizontal card strip, a "Your favorites" section, and a "Recent activity" feed (avatar + actor + action verb + resource link + timestamp). Realistic knowledge-base content.
```

### 8. Global search & command palette

```
Design GigaWiki search in TWO parts. (A) A ⌘K command-palette overlay: a centered modal with a large search input, results grouped by type (Pages, Projects, Sections, Subjects) each with an icon, title, and breadcrumb path, keyboard-nav highlight in emerald, and a footer hint row (↑↓ navigate, ↵ open, esc close). (B) A full-page search results layout inside the app shell: a query input at top, a result count ("42 results for 'authentication'"), and a vertical list of result cards each showing the page title, full breadcrumb path (Subject › Project › Section › Page), and a content snippet with the matched query terms highlighted in emerald. Include a "no results" empty state variant.
```

---

## Group C — Content browsing

### 9. Subjects browse

```
Design the Subjects browse screen for GigaWiki, inside the app shell. A page header "Subjects" with a primary emerald "New subject" button (shown for EDITOR+), a visibility filter (All / Public / Private) and a sort control. Below: a responsive grid of subject cards — each card has a cover image with a subtle dark gradient overlay, the subject name, a 2-line description, a footer row with project count and a PUBLIC or PRIVATE visibility badge. Include pagination at the bottom and a friendly empty state ("No subjects yet — create your first").
```

### 10. Subject detail

```
Design the Subject detail screen for GigaWiki, inside the app shell. Breadcrumb: Home › Subject. A subject header: cover image banner, subject name (large), description, a PUBLIC/PRIVATE badge, owner avatar + name, created/updated timestamps, and an actions menu (Edit / Delete) gated to owner/ADMIN. Below the header: a "Projects" section with a "New project" button (EDITOR+) and a responsive grid of project cards (cover, name, description, tag chips, project view count, visibility badge). Pagination + empty state.
```

### 11. Project detail

```
Design the Project detail screen for GigaWiki, inside the app shell. Breadcrumb: Home › Subject › Project. Header: project cover, name, description, a row of teal tag chips, a favorite (star) toggle, a view count, owner avatar, and created/updated timestamps, with an Edit/Delete actions menu gated by role. Below the header, a tabbed area with three tabs: (1) Sections — an ordered list/grid of section cards with a "New section" button (EDITOR+); (2) Activity — a project activity feed (actor avatar, action verb, resource, timestamp); (3) Comments — a threaded comment section with a composer and nested replies. Show the Sections tab active.
```

### 12. Section detail

```
Design the Section detail screen for GigaWiki, inside the app shell. Breadcrumb full path to the section. Header: section title, description, a PUBLIC/PRIVATE badge, and (for EDITOR+) a drag-handle reorder affordance hint plus a "New page" button. Main: a list of pages within the section — each row shows the page title, a "Draft" badge when applicable, a visibility badge, the last-updated author avatar + name, and a relative timestamp. Hovering a row reveals quick actions. Include an empty state and pagination.
```

### 13. Page view (reader)

```
Design the Page view / reader screen for GigaWiki — the core reading experience, inside the app shell. Three-column feel: (left) the sidebar navigation tree with the current page highlighted; (center) the article — a full breadcrumb at top, the page title, a byline row (author avatar, "Updated by … · 3 days ago"), then long-form CONTENT set in a comfortable serif at reading width with rendered headings, paragraphs, a code block, and an inline image; (right rail) a sticky panel with an in-page Table of Contents that tracks scroll position (active item in emerald), plus a metadata card showing created-by and updated-by avatars, view count + unique viewers, a list of teal tag chips, a favorite (star) toggle, a "View history" link, and visibility/restricted badges. Above the article, an action bar: Edit (EDITOR+), Favorite, Share. Below the article: a threaded Comments section — a comment composer, top-level comments with avatars and timestamps, nested replies indented, and edit/delete actions on the user's own comments.
```

---

## Group D — Authoring

### 14. Page editor

```
Design the Page editor screen for GigaWiki, inside the app shell (sidebar can be collapsed for focus). A large title input at top. A rich-text/markdown content editor with a sticky formatting toolbar (headings, bold, italic, lists, quote, code block, link, inline image upload). A right settings panel with: a Draft ↔ Published segmented toggle, a Visibility selector (PUBLIC/PRIVATE), a "Restricted" switch, an Owner selector (avatar), and a Tag manager that adds/removes teal tag chips with a "max 10 tags" hint. A sticky footer bar: a "Last saved 2 min ago" indicator on the left, and "Save draft" (secondary) + "Save & publish" (primary emerald) buttons on the right. Show an "Unsaved changes" indicator state on the footer.
```

### 15. Revision history

```
Design the Revision history screen for GigaWiki, inside the app shell, for a single page. TWO parts: (A) a revisions list panel — each entry shows the revision number, author avatar + name, timestamp, an optional summary, and a "current" marker on the latest; entries are selectable, and two can be picked to compare. (B) a side-by-side diff/compare view of the two selected revisions: two columns with a unified header showing each revision number/date, additions highlighted in emerald and deletions in a muted red strike, line-by-line. A "Restore this revision" button (EDITOR+) on the older revision's column, with a confirm affordance.
```

---

## Group E — Personal

### 16. Favorites

```
Design the Favorites screen for GigaWiki, inside the app shell. A header "Favorites" with a type filter (All / Pages / Projects / Sections). A list/grid of favorited items — each shows a type badge (Page/Project/Section), the title, the full breadcrumb path, the favorited date, and an "unfavorite" (filled star) action on hover. Include pagination and a friendly empty state ("Nothing saved yet — star pages to find them here").
```

### 17. Profile / account settings

```
Design the Profile / account settings screen for GigaWiki, inside the app shell. A left vertical tab nav with three tabs: Profile, Security, Activity. (1) Profile tab (active): an avatar with an upload/crop+preview control, and fields for Name, Slug (read-only/auto), Email, plus a role badge (e.g. EDITOR). A "Save changes" button with an inline success toast. (2) Show the Security tab content too: Current password, New password (with strength meter), Confirm — and a "Update password" button. (3) Activity tab: a paginated list of the user's own activity (action verb, resource link + breadcrumb, timestamp). Use clear section cards.
```

---

## Group F — Admin (ADMIN-only)

### 18. Admin — Users management

```
Design the Admin Users management screen for GigaWiki, inside the app shell. A header "Users" with a toolbar: a search input, a role filter (All/Admin/Editor/Guest), and a primary emerald "Invite user" button. A data table with columns: avatar + name, email, role badge, email-verified status (emerald check / muted dot), joined date, and a row actions menu. Row actions: an inline role dropdown to change role, and a Delete action that opens a confirm dialog. Also render the Invite modal: fields for Email, Name, and a Role select, with a "Send invite" primary button. Include a "Pending invites" sub-view/empty state showing invited-but-not-accepted users with expiry. Pagination.
```

### 19. Admin — Global activity log

```
Design the Admin Global activity log screen for GigaWiki, inside the app shell — a full-width audit view. A rich filter bar across the top: filter by User (avatar picker), Activity type (CREATED / UPDATED / DELETED / COMMENTED / REPLIED / RESTORED), Resource type (PAGE / PROJECT / SECTION / SUBJECT), and a date range (From / To). Below: a dense table/timeline where each row shows the actor avatar + name, a colored action-verb chip, the resource title with its breadcrumb path as a link, the IP address (muted, monospace), and an absolute + relative timestamp. Include pagination and an empty/filtered-no-results state.
```

### 20. System / shared states

```
Design a "System & shared states" template for GigaWiki that standardizes polish across the app. Within the app-shell frame where relevant, render these states as a labeled gallery: (1) 404 Not found — friendly illustration + "Page not found" + "Back to home"; (2) 403 Forbidden — a lock icon + "You don't have permission" (e.g. a GUEST attempting an edit) + "Request access"; (3) Generic error — "Something went wrong" + "Try again"; (4) Global empty state — neutral illustration + primary action; (5) Loading skeletons — one for a list/table and one for an article/page; (6) Toast notification stack — success (emerald), error (red), and info (teal) toasts stacked bottom-right. Keep them consistent with the emerald/teal-on-near-black system.
```

---

## Coverage map

| Backend area | Screen(s) |
|---|---|
| Auth: login / register / forgot / reset / verify / invite | 1–6 |
| Search (`/search`, ⌘K) | 8 |
| Subjects (list / detail / CRUD) | 9, 10 |
| Projects (detail, activity, comments) | 11 |
| Sections (list, reorder, CRUD) | 12 |
| Pages (read, views, tags, comments, favorite) | 13 |
| Page authoring (create/edit, draft, visibility, images) | 14 |
| Revisions (list, compare, restore) | 15 |
| Favorites | 16 |
| Users (profile, avatar, password) + per-user activity | 17 |
| Admin: users + invites | 18 |
| Admin: global activity log | 19 |
| App shell / nav / dashboard | 7, 8 |
| Error / empty / loading / toasts | 20 |


### Claude Design commands for claude code:
#7 Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/oDcpSWpwRgf5p-ebbITUMQ?open_file=Dashboard.html
Implement: Dashboard.html