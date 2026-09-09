# GiGaWiki V2 — Session Log

> **Scopo:** dare a una nuova sessione un punto di partenza senza rileggere tutto.
> Il documento di riferimento per *cosa* va fatto resta [`GIGAWIKI_V2_TASKS.md`](./GIGAWIKI_V2_TASKS.md);
> qui si registra *cosa è già stato fatto*, *cosa è in corso* e *dove ci si è fermati*.

**Come usarlo**

- All'inizio di una sessione: leggi «Stato attuale», «Scostamenti dalla specifica» e «Prossimi passi». Il resto è storico.
- Alla fine di una sessione: aggiungi una voce in cima a «Log delle sessioni» e aggiorna la tabella di stato se qualche task è avanzato.
- Regola: una riga di log deve dire *cosa è cambiato* e *cosa resta aperto*, non raccontare il procedimento.

---

## Stato attuale

**Aggiornato al:** 2026-09-09

| | |
|---|---|
| Branch di lavoro | `dev` (il default remoto è `main`) |
| Remote | `git@github.com:gigapin/gigawiki-v2.git` |
| Task completati | 32 / 40 |
| Fase corrente | **Fase 4 — Frontend**, task 30 in corso |
| Backend | Completo (task 5–23). 15 file di test, 212 test verdi |
| Frontend | Impalcatura, auth di base, dashboard e sezione Subjects. Editor, commenti, revisioni e settings non iniziati |
| CI/CD | Non iniziata (task 39) |

**Lavoro non committato su `dev`** — 14 file, ~2.470 righe, tutte in staging. È l'implementazione in corso del task 30 (Subjects/Projects):

```
apps/web/src/pages/subjects/SubjectsPage.tsx          (nuovo, 402 righe)
apps/web/src/pages/subjects/SubjectDetailPage.tsx     (nuovo, 751 righe)
apps/web/src/components/subjects/CreateSubjectModal.tsx (nuovo, 898 righe)
apps/web/src/components/subjects/CreateProjectModal.tsx (nuovo, 256 righe)
apps/web/src/api/projects.ts                          (nuovo)
apps/web/src/components/ui/icon.tsx                   (nuovo)
apps/web/src/{api/subjects,components/AppInit,components/layout/Sidebar,
              pages/LoginPage,router,stores/auth.store}.ts(x)  (modificati)
.DS_Store, .claude/settings.local.json                (da valutare: non dovrebbero stare in staging)
```

---

## Stato per task

Legenda: ✅ fatto · 🟡 parziale · ⬜ non iniziato

### Fase 1 — Repo & Tooling

| # | Task | Stato | Note |
|---|---|---|---|
| 1 | Monorepo Turborepo + pnpm | ✅ | |
| 2 | `docker-compose.yml` | ✅ | Aggiunto anche **meilisearch**, non previsto dalla specifica e attualmente non usato da nessuna parte del codice |
| 3 | ESLint, Prettier, Husky, Commitlint | ✅ | |

### Fase 2 — Shared

| # | Task | Stato | Note |
|---|---|---|---|
| 4 | `packages/shared` — types + schemi Zod | ✅ | 12 types, 9 schemi |

### Fase 3 — Backend

| # | Task | Stato | Note |
|---|---|---|---|
| 5 | Bootstrap Fastify | ✅ | |
| 6 | Plugin Fastify | ✅ | helmet → cors → cookie → rate-limit → jwt → multipart |
| 7 | Schema Prisma + migrazione iniziale | ✅ | 5 migrazioni applicate |
| 8 | Migrazione full-text search Postgres | ✅ | `add_search_vector` + `restore_search_vector` |
| 9 | Singleton `lib/` | ✅ | Aggiunto anche `lib/slugify.ts` (con test) |
| 10 | Modulo Auth | ✅ | login, logout, refresh, register, forgot/reset password, verify email, accept invite, me |
| 11 | Modulo Users | ✅ | incluso upload avatar e invito |
| 12 | Modulo Subjects | ✅ | + `color` e `icon` |
| 13 | Modulo Projects | ✅ | |
| 14 | Modulo Sections | ✅ | incluso riordino |
| 15 | Modulo Pages | ✅ | incluso `GET /search` |
| 16 | Modulo Revisions | ✅ | |
| 17 | Modulo Comments | ✅ | |
| 18 | Tags, favorites, views, activities | ✅ | |
| 19 | Modulo Images | ✅ | |
| 20 | Modulo Settings | ✅ | `GET /settings` è pubblico, serve al frontend prima della sessione |
| 21 | Worker BullMQ | ✅ | `email.worker.tsx`, `image.worker.ts` |
| 22 | Template React Email | ✅ | Invite, ResetPassword, VerifyEmail, Welcome |
| 23 | Seed Prisma | ✅ | |

### Fase 4 — Frontend

| # | Task | Stato | Note |
|---|---|---|---|
| 24 | Bootstrap React + Vite + Tailwind + shadcn | ✅ | 15 componenti shadcn + `icon.tsx` custom |
| 25 | TanStack Router + Query + client axios | ✅ | Rotte attive: `/login`, `/`, `/subjects`, `/subjects/$slug` |
| 26 | Store Zustand | ✅ | `auth.store.ts`, `settings.store.ts` |
| 27 | Componenti di layout | ✅ | AppShell, Sidebar, Topbar, SearchModal |
| 28 | Pagine auth | 🟡 | **Solo `LoginPage`.** Mancano Register, ForgotPassword, ResetPassword, VerifyEmail, AcceptInvite e `AuthLayout` — anche se i relativi endpoint API esistono già |
| 29 | Dashboard | 🟡 | Attività recenti, preferiti e statistiche ci sono. Manca la sezione «Recently visited» (`GET /views`) |
| 30 | Pagine Subjects / Projects / Sections | 🟡 | **In corso, non committato.** Fatti: SubjectsPage, SubjectDetailPage, CreateSubjectModal, CreateProjectModal. Mancano: ProjectDetailPage, ProjectFormDialog, SectionFormDialog e il riordino drag-and-drop con `@dnd-kit/core` |
| 31 | Page view + editor Tiptap | ⬜ | |
| 32 | Drawer revisioni | ⬜ | |
| 33 | Componente commenti | ⬜ | |
| 34 | Pagine settings | ⬜ | |
| 35 | Hook TanStack Query | 🟡 | `src/api/` contiene funzioni fetch semplici (`fetchSubjects`, `createSubject`, `fetchProjectsBySubject`, `fetchActivities`, `fetchFavorites`), non gli hook `useX` previsti. Le `useQuery` stanno nei componenti |

### Fase 5 — Test, CI/CD, GitHub

| # | Task | Stato | Note |
|---|---|---|---|
| 36 | Test backend | 🟡 | 212 test verdi su 15 file, ma con un approccio diverso dalla specifica (vedi sotto) |
| 37 | Test componenti frontend | ⬜ | Nessun test nel frontend, nessuna config Vitest in `apps/web` |
| 38 | Dockerfile per l'API | ✅ | Implementato meglio della specifica: `pnpm deploy --prod` + rimozione mirata di dipendenze non raggiungibili a runtime |
| 39 | GitHub Actions CI | ⬜ | `.github/` non esiste |
| 40 | Init repo GitHub | 🟡 | Repo e remote esistono. Manca `CONTRIBUTING.md`; il branch di sviluppo si chiama `dev`, non `develop` come da specifica; la branch protection su `main` è da verificare |

---

## Scostamenti dalla specifica

Punti in cui il codice si discosta da `GIGAWIKI_V2_TASKS.md`. Vanno **letti prima** di «completare» il task corrispondente, altrimenti si rischia di riscrivere scelte già prese di proposito.

1. **Test backend (task 36) — mockati, non su database reale.** La specifica chiede `src/__tests__/`, un database `gigawiki_test`, `prisma migrate deploy` in `beforeAll` e truncate dopo ogni test. L'implementazione usa invece file `*.test.ts` accanto alle rotte, con Prisma e argon2 mockati via `vi.mock` e `app.inject()`. È più veloce e non richiede infrastruttura, ma non copre le query SQL reali — in particolare la full-text search del task 8, che è proprio ciò che un test su DB vero verificherebbe. Il canone da seguire per nuovi test è `usersRoutes.test.ts`.
2. **Doppio file di env.** Esistono sia `apps/api/src/config/env.ts` (previsto dal task 5) sia `apps/api/src/lib/env.ts` (quello effettivamente documentato in `CLAUDE.md` e importato per primo in `server.ts`). Da consolidare in uno solo.
3. **Rotte pubbliche disabilitate.** In `src/routes/index.ts` il blocco delle rotte pubbliche è commentato: letture di subjects, projects, sections, pages, revisioni, commenti, tag e view sono tutte dietro autenticazione. Va deciso se `Visibility.PUBLIC` deve essere davvero raggiungibile senza login — al momento non lo è.
4. **Meilisearch nel compose ma inutilizzato.** La ricerca è implementata con la full-text search di Postgres (task 8). Il servizio `meilisearch` in `docker-compose.yml` non è previsto dalla specifica e non è referenziato da alcun codice: o si usa o si rimuove.
5. **Dockerfile più elaborato della specifica (task 38).** La versione reale usa `pnpm deploy --prod --legacy`, ricopia a mano `.prisma/client` e rimuove sottoalberi non raggiungibili a runtime per dimezzare l'immagine. I commenti nel file spiegano il perché di ogni passaggio: non semplificarlo senza rileggerli.
6. **`bin/pnpm` invece di corepack.** Il Dockerfile usa `corepack enable`, che funziona su `node:22-alpine` ma si romperà quando si alzerà la base image: corepack non è più incluso nelle versioni recenti di Node. In locale il problema è già stato aggirato con il wrapper `bin/pnpm` (vedi sessione del 2026-09-09).

---

## Prossimi passi

In ordine di priorità.

1. **Chiudere il task 30.** Committare il lavoro in staging (escludendo `.DS_Store`), poi ProjectDetailPage, ProjectFormDialog, SectionFormDialog e il riordino drag-and-drop.
2. **Completare il task 28.** Le pagine auth mancanti sono a basso rischio: gli endpoint esistono già e sono testati.
3. **Task 39 — CI.** Non serve aspettare che il frontend sia finito: il job `quality` e `test-api` sono già utili così come sono, e proteggono il resto del lavoro.
4. **Task 31 (editor Tiptap)** è il blocco più grosso che resta e sblocca 32 e 33.

### Toolchain — come i git hook trovano Node

Non c'è più un `node` sul `PATH` di default: Homebrew non lo fornisce e fnm è agganciato alle sole shell interattive via `~/.zshrc`. I git hook girano in una shell non interattiva che non legge `.zshrc`, quindi senza intervento fallirebbero con `husky - command not found`.

Risolto così (2026-09-09):

- **`~/.config/husky/init.sh`** — husky 9 lo carica prima di ogni hook (vedi `.husky/_/h`). Inizializza fnm e applica `.nvmrc`. Sta fuori dal repo perché vale per qualsiasi progetto sulla macchina, e per la stessa ragione non contiene percorsi di questo progetto.
- **`.husky/pre-commit` e `.husky/commit-msg`** ora invocano `./bin/pnpm` invece del `pnpm` globale, che su questa macchina non esiste.

Come rete di sicurezza è stato reinstallato anche il Node di Homebrew (26.8.1) su `/usr/local/bin`. Le precedenze risultanti, verificate:

| Contesto | Node usato |
|---|---|
| Shell interattiva | v22.23.2 (fnm, da `.nvmrc`) |
| Git hook, con `init.sh` | v22.23.2 (fnm) |
| Qualsiasi shell senza fnm | v26.8.1 (Homebrew) |

Nota: su questo Mac Intel x86_64 Homebrew non distribuisce più bottle precompilati, quindi `brew install node` **compila V8 da sorgente**. Da mettere in conto prima di aggiornarlo di nuovo.

Chi clona il repo su una macchina nuova deve ricreare `init.sh` (o avere Node sul `PATH` di sistema): il file non è versionato.

---

## Log delle sessioni

Voce più recente in cima.

### 2026-09-09 — Ambiente di sviluppo: pnpm locale + fnm

Nessuna modifica al codice applicativo. Sessione dedicata a rendere il progetto indipendente da cosa è installato sulla macchina.

- La macchina non aveva `pnpm` e girava su Node 26.7.0 (Homebrew), mentre `.nvmrc` chiede la 22. Node 26 non include più `corepack`, quindi il percorso di bootstrap documentato non funzionava.
- Aggiunto **pnpm locale al progetto**: `.tools/` (in `.gitignore`) con pnpm 10.33.0, la versione fissata in `packageManager`, installato con `npm install --prefix .tools`. Non tocca `package.json` né `pnpm-lock.yaml`.
- Aggiunto **`bin/pnpm`**: wrapper che legge la versione da `packageManager`, la installa in `.tools/` se manca, mette `.tools/node_modules/.bin` nel `PATH` (necessario a Turborepo, che invoca `pnpm run` nei sotto-pacchetti) e delega. Su una macchina nuova basta `./bin/pnpm install`.
- **Reinstallate tutte le dipendenze.** Il `node_modules` presente veniva da un'altra macchina (`storeDir: /Users/giga/…`, inesistente qui), quindi pnpm l'ha ricreato da zero: 904 pacchetti. Dopo il reinstall è servito `prisma generate`.
- **Configurato fnm** (`brew install fnm`, Node 22.23.2 come default) con `eval "$(fnm env --use-on-cd --version-file-strategy recursive --shell zsh)"` in `~/.zshrc`. `recursive` serve perché `.nvmrc` sta in root e si lavora spesso da `apps/api`. Backup in `~/.zshrc.bak-*`.
- `argon2`, `bcrypt` e `sharp` non hanno richiesto rebuild passando da Node 26 a 22: sono N-API, quindi ABI-stabili tra major.
- Valutata e **scartata** l'idea di spostare l'ambiente Node di sviluppo in Docker. Motivi: i moduli nativi obbligherebbero a tenere `node_modules` in un volume interno al container, lasciando l'IDE senza type resolution (due installazioni invece di zero); il watch di Vite/nodemon su bind mount macOS richiede polling; e gli hook husky girerebbero comunque sull'host. Il Dockerfile esistente copre già build di produzione e CI, che è il caso in cui Docker serve davvero.
- Verifiche finali: `typecheck` verde, 212 test passati, `prisma generate` senza più l'avviso di versione Node.

- Rimosso il Node di Homebrew, che dopo fnm sembrava ridondante. Questo però ha rotto i git hook: il ragionamento teneva conto solo delle shell interattive, non di quelle non interattive in cui girano gli hook. Sistemato con `~/.config/husky/init.sh` e facendo puntare gli hook a `./bin/pnpm` — vedi «Toolchain» sopra. Verificato end-to-end: `commit-msg` rifiuta `bad message` e accetta un messaggio convenzionale, `lint-staged` si risolve.
- Reinstallato poi il Node di Homebrew (26.8.1) come fallback di sistema, verificando che fnm mantenga la precedenza sia in shell interattiva sia negli hook.

**Lasciato aperto:** il lavoro sul task 30 resta in staging, non committato.

### Sessioni precedenti

> Ricostruite dalla cronologia git: prima di questo documento non esisteva un registro per sessione, quindi il raggruppamento è per data di commit, non per sessione reale.

| Data | Commit | Contenuto | Task |
|---|---|---|---|
| 2026-08-30 | `fb1c8ea` → `0239d2d` | `color`/`icon` su Subject, fix `searchVector` sul model Page, estrazione di `lib/slugify`, modulo Settings, Dockerfile API + override compose di produzione | 20, 38 |
| 2026-05-31 | `d348893` | Login e layout della dashboard | 27, 28, 29 |
| 2026-05-28 | `7863ef0` → `cb26186` | `DESIGN_PROMPTS.md`, migrazione search vector, init frontend, React Query + Zustand | 8, 24, 25, 26 |
| 2026-05-27 | `5e4eddd`, `36474b2` | Autenticazione migliorata, seed e inviti via email | 10, 22, 23 |
| 2026-05-21 | `f5d7230`, `476b46c` | Tutte le rotte, tutti i plugin | 6, 12–20 |
| 2026-05-15 | `9b89a66` | Types e schemi condivisi | 4 |
| 2026-05-12 | `ebb4893` | Rotte protette | 6 |
| 2026-05-07 | `0071a3d` | CRUD users | 11 |
| 2026-05-03 | `f8c225b` | Fix TypeScript nelle rotte projects | — |
| 2026-04-18 | `0d8a6c9` → `8a32505` | Scaffold del monorepo, porta MinIO, pulizia del tracking | 1, 2, 3 |

Materiale di riferimento non ancora incorporato qui: [`API_TEST_RESULTS.md`](./API_TEST_RESULTS.md) (esiti dei test API, 2026-05-27) e [`DESIGN_PROMPTS.md`](./DESIGN_PROMPTS.md) (prompt di design per il frontend, 2026-05-31).

---

## Template per una nuova voce

```markdown
### AAAA-MM-GG — Titolo breve

- Cosa è cambiato, in punti. Un punto per decisione o per modifica sostanziale.
- Le scelte non ovvie vanno motivate: fra sei mesi il «perché» è l'unica parte non ricostruibile dal diff.

**Lasciato aperto:** cosa resta da fare e dove ci si è fermati.
```
