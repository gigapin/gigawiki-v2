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

**Aggiornato al:** 2026-10-07

| | |
|---|---|
| Branch di lavoro | `dev` (il default remoto è `main`) |
| Remote | `git@github.com:gigapin/gigawiki-v2.git` |
| Task completati | 32 / 40 |
| Fase corrente | **Fase 4 — Frontend**, task 30 parziale. Base shadcn e Project detail implementati; vedi `apps/web/README.md` |
| Backend | Completo (task 5–23). 17 file di test, 228 test verdi |
| Frontend | Impalcatura, Login, Register, Verify email, Dashboard, Subjects e Project detail con sezioni inline/lista pagine. Tema shadcn unificato. Reader/editor, commenti, revisioni e settings non iniziati. |
| CI/CD | Non iniziata (task 39) |

**Working tree con modifiche frontend e documentazione.** Il lavoro sul task 30 che la voce precedente dava «in staging» è stato committato in `2b2373d` (13 file, 2.920 righe). `.DS_Store` è rimasto fuori; `.claude/settings.local.json` invece è finito nel commit — da valutare se toglierlo dal tracking.

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
| 24 | Bootstrap React + Vite + Tailwind + shadcn | ✅ | shadcn usato nei nuovi form Project/Section, Project detail e primitive condivise; tema dark unico con alias per i vecchi componenti. Migrazione del resto incrementale |
| 25 | TanStack Router + Query + client axios | ✅ | Rotte attive: `/login`, `/`, `/subjects`, `/subjects/$slug`, `/projects/$slug` |
| 26 | Store Zustand | ✅ | `auth.store.ts`, `settings.store.ts` |
| 27 | Componenti di layout | ✅ | AppShell, Sidebar, Topbar, SearchModal |
| 28 | Pagine auth | 🟡 | Login, Register, VerifyEmail, AuthLayout e reinvio verifica implementati. Restano ForgotPassword, ResetPassword e AcceptInvite |
| 29 | Dashboard | 🟡 | Attività recenti, preferiti e statistiche ci sono. Manca la sezione «Recently visited» (`GET /views`) |
| 30 | Pagine Subjects / Projects / Sections | 🟡 | Committato in `2b2373d`. Fatti: Subjects/Subject detail, Project detail, ProjectFormDialog riusato in creazione/modifica, SectionFormDialog, eliminazione admin con conferma, riordino nativo + pulsanti accessibili, lista pagine paginata. Restano CRUD completo Subject, upload cover e collegamenti a reader/editor |
| 31 | Page view + editor Tiptap | ⬜ | |
| 32 | Drawer revisioni | ⬜ | |
| 33 | Componente commenti | ⬜ | |
| 34 | Pagine settings | ⬜ | |
| 35 | Hook TanStack Query | 🟡 | `src/api/` contiene funzioni fetch semplici (`fetchSubjects`, `createSubject`, `fetchProjectsBySubject`, `fetchActivities`, `fetchFavorites`), non gli hook `useX` previsti. Le `useQuery` stanno nei componenti |

### Fase 5 — Test, CI/CD, GitHub

| # | Task | Stato | Note |
|---|---|---|---|
| 36 | Test backend | 🟡 | 212 test verdi su 15 file, ma con un approccio diverso dalla specifica (vedi sotto) |
| 37 | Test componenti frontend | 🟡 | 29 test Vitest Node su registrazione/verifica, contratti API, sessione/settings, riordino e rendering UI per ruoli. Restano i test browser/Testing Library per le interazioni |
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
6. **Design system — migrazione avviata.** Tema e font unificati il 2026-10-07 in `styles/tokens.css`, con alias per il codice esistente e palette cover condivisa. shadcn è usato nelle nuove schermate; restano stili inline e icone custom nelle vecchie pagine. L'audit del 14 settembre fotografa lo stato precedente.
7. **`bin/pnpm` invece di corepack.** Il Dockerfile usa `corepack enable`, che funziona su `node:22-alpine` ma si romperà quando si alzerà la base image: corepack non è più incluso nelle versioni recenti di Node. In locale il problema è già stato aggirato con il wrapper `bin/pnpm` (vedi sessione del 2026-09-09).

---

## Prossimi passi

1. Per testare la registrazione: eseguire `./bin/pnpm --filter gigawiki-v2-api registration:enable` nel terminale locale (qui il DB rifiuta connessioni con EPERM), poi aprire `/register`, verificare da Mailtrap e accedere.
2. Reader/editor Tiptap: apertura e creazione pagine dalla lista Project, tipografia long-form e salvataggio.
3. Completare auth restante (task 28), Dashboard (recently visited) e CRUD Subject/upload cover.
4. Revisioni come drawer anteprima/ripristino; commenti riusabili.
5. Favorites e Settings sulla stessa base shadcn. Allineare prima i contratti inviti (elenco/reinvio/cancellazione) e cambio password, non completi nel backend.
6. Completare test delle interazioni frontend e CI.

Scelte adottate: dark come primo tema; sezioni inline nel Project; revisioni drawer, diff opzionale; settings secondo task 34; nuove icone Lucide, empty state con icona/testo. Non sono necessari nuovi template Claude Design.

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

### 2026-10-07 — Revisione .gitignore

- Aggiunte esclusioni globali per varianti `.env`, log, cache pnpm/Vite, artefatti locali ed editor; mantenuti versionabili gli esempi `.env`.
- Rimossa la regola inefficace `./docs`: la documentazione resta versionabile. Conservate le esclusioni preesistenti dei due file di riferimento.
- Verificate le regole con `git check-ignore --no-index` su 20 percorsi, compresi migrazioni Prisma, asset, lockfile e documentazione. Nessun `.env` con credenziali risulta tracciato.
- `.claude/settings.local.json` è già tracciato: la nuova regola non lo rimuove dall’indice; nessun file è stato rimosso o modificato nello staging.

### 2026-10-07 — Registrazione e verifica email con Mailtrap

- Aggiunte pagine `/register` e `/verify-email`, AuthLayout shadcn, form validati, conferma registrazione e reinvio verifica. Il link Create account del Login è attivo e gli errori API sono leggibili.
- Corretto il contratto email: template `verify` e URL completo con token nel job BullMQ. SMTP usa le credenziali del `.env`, TLS implicito su porta 465 e timeout di connessione. Il worker è verificato con rendering reale del messaggio e mailer mockato.
- Registrazione valida i dati, normalizza l’email e gestisce duplicati; account GUEST con email non confermata. Login bloccato finché la verifica non è completata. Token monouso con scadenza 24 ore; nuova rotta per reinvio con conferma neutra.
- Gestito il caso parziale in cui l’account viene creato ma il job non può essere accodato: il frontend propone reinvio senza una seconda registrazione.
- Creato `registration:enable`: upsert mirato `ALLOW_SELF_REGISTRATION=true` e invalidazione cache Redis. Tentativo di esecuzione bloccato dall’ambiente con EPERM sulla connessione locale a PostgreSQL, pur attivo; **valore live non verificato né aggiornato da questa sessione**.
- Test: 228 backend e 29 frontend verdi; typecheck API e lint frontend verdi. Verifica reale SMTP e browser non eseguita da questo ambiente.

**Lasciato aperto per il test locale:** eseguire il comando di abilitazione, riavviare il backend se necessario per il `.env`, creare un account da `/register`, aprire l’email nella inbox Mailtrap e seguire il link di verifica. Restano le altre pagine auth e le aree frontend precedentemente indicate.

### 2026-10-07 — Base shadcn e dettaglio Project

- Tema dark unificato in `styles/tokens.css`, alias `--db-*`/`--gw-*`, font condivisi e palette cover estratta. Componenti shadcn ora usati dalla UI.
- Aggiunte primitive condivise per form risorse, stati vuoti/errore/caricamento, paginazione e conferme di eliminazione. Il dialog di creazione Project riusa quello di modifica.
- Nuova rotta `/projects/$slug`, sezioni inline, creazione/modifica/eliminazione secondo i permessi API, riordino e lista pagine paginata. Sidebar con caricamento progetti su espansione.
- Impossibile scaricare `@dnd-kit` e Testing Library (registro npm non raggiungibile). Riordino implementato con drag nativo e pulsanti per tastiera/touch; Vitest già presente nel workspace riutilizzato come dipendenza frontend, senza download.
- Corretti contratti sessione/settings (refresh `{ accessToken }`, me `{ user }`, settings dizionario diretto), errore API strutturato, retry 401 del login e due errori TypeScript preesistenti. Proxy Vite `/api` per sviluppo senza URL configurato.
- Build frontend e lint verdi; 17 test passati su contratti, sessione/settings, ordine e visibilità azioni per Guest/Editor/Owner/Admin. Nessuna modifica agli handler backend. Dettagli e limiti in `apps/web/README.md`.

**Lasciato aperto:** reader/editor (le righe pagina mostrano solo metadati), upload cover, CRUD completo Subject, auth restante, revisioni/commenti e settings. Verifica browser delle interazioni ancora da eseguire.

Voce più recente in cima.

### 2026-09-14 — Audit del materiale grafico prima di riprendere il frontend

Nessuna modifica al codice. Sessione di sola analisi, su richiesta: capire se il materiale di design basta a completare la Fase 4. Esito completo in [`FRONTEND_DESIGN_AUDIT.md`](./FRONTEND_DESIGN_AUDIT.md).

- **Cosa è stato analizzato:** `DESIGN_PROMPTS.md` (20 prompt + header di design system) contro il codice reale di `apps/web` (5.362 righe di pagine e layout), `index.css`, `tailwind.config.ts`, `index.html`, le dipendenze di `apps/web/package.json`, gli asset in `public/` e `src/assets/`, lo schema Prisma per i campi che le schermate richiedono (cover, `color`/`icon`, `Activity.ip`) e le specifiche dei task 24–35.
- **Copertura:** 2 schermate su 20 hanno un design generato (Dashboard ×2, Login); 5 su 20 sono implementate. Subjects e Subject detail sono state improvvisate senza design file — regge finché sono griglie di card, non reggerà su editor, diff e tabelle.
- **Il problema non sono le schermate mancanti, è che il design system non è codice.** Quattro palette (`--gw-*` solo per Login, `--db-*` per tutto il resto, `COVER_COLORS` hardcoded nel modal, i token shadcn slate ancora ai default light-mode) e tre combinazioni tipografiche, nessuna uguale a quella scritta nell'header dei prompt. `--gw-*` e `--db-*` sono però quasi identici come valori: consolidarli è a rischio quasi zero.
- **shadcn è installato e inutilizzato:** 15 componenti, zero import dalle pagine; anche `App.tsx` è codice morto. Il codice applicativo ha 310 `style={{…}}` inline e ripete `initials()` in 4 file, `timeAgo()` in 2, `toneForColor()` in 2.
- **Otto decisioni da prendere prima di generare altro design** (audit §3b): tipografia long-form, colori del diff, tema chiaro sì/no, cover o tinta per i progetti, logo/brand (oggi il favicon è ancora quello viola del template di partenza), illustrazioni per gli empty state, set di icone (lucide è già in dipendenza ma inutilizzato), densità delle tabelle dati.
- **Librerie mancanti** per i task 30–34: tiptap e estensioni, lowlight, `@dnd-kit/*`, `@tanstack/react-table`, `dayjs`.
- **Conflitti fra `DESIGN_PROMPTS.md` e `GIGAWIKI_V2_TASKS.md`** su Project detail, Section detail e Settings (audit §4): vanno sciolti prima di generare quelle schermate, altrimenti si progetta due volte.
- Verificato di passaggio che il lavoro sul task 30 dato per «in staging» nella voce precedente è in realtà committato (`2b2373d`). `.claude/settings.local.json` è finito nel commit.

**Lasciato aperto:** le 8 decisioni di §3b, in particolare tipografia long-form e tema chiaro, che bloccano i task 31–33. Il percorso a basso attrito, se si vuole avanzare subito senza nuovo materiale grafico, è il task 28 (pagine auth, ricalcabili dal Login) e la schermata Favorites.

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

Materiale di riferimento non ancora incorporato qui: [`API_TEST_RESULTS.md`](./API_TEST_RESULTS.md) (esiti dei test API, 2026-05-27). I prompt di design stanno in [`DESIGN_PROMPTS.md`](./DESIGN_PROMPTS.md), il loro stato di copertura in [`FRONTEND_DESIGN_AUDIT.md`](./FRONTEND_DESIGN_AUDIT.md).

---

### 2026-10-07 — Creazione, modifica e lettura delle pagine

- Aggiunte rotte di creazione nella sezione, lettura e modifica; collegati lista del progetto, ricerca e azioni globali “New page”. Le azioni globali permettono di scegliere subject, progetto e sezione con paginazione.
- Preparato editor Tiptap con formattazione, titoli, liste, citazioni, codice e tabelle; form shadcn per titolo e visibilità, bozza/pubblicazione e avviso per modifiche non salvate. Il contenuto viene salvato come HTML e letto tramite lo schema Tiptap; i contenuti legacy di testo restano nodi di testo.
- GET pagina include progetto e sezione per la navigazione. POST/PATCH validano i campi. PATCH conserva lo slug quando il titolo è invariato e risolve collisioni quando viene rinominato.
- Verificati backend (234 test e typecheck) e test frontend; lint frontend superato. Non eseguita prova nel browser.

**Aggiornamento:** pacchetti Tiptap installati dall’utente; build frontend verificata con successo durante il successivo incremento sui breadcrumb. Upload immagini, autosalvataggio, commenti e cronologia UI non fanno parte di questo incremento.

---

### 2026-10-07 — Breadcrumb navigabili

- Breadcrumb condivisi per progetto, lettura pagina e editor: Home → Subjects → subject → progetto → sezione → pagina. La posizione corrente è testo con `aria-current="page"`; gli antenati sono link con focus visibile.
- Il link alla sezione usa `/projects/:slug?section=:sectionSlug`. La selezione delle sezioni aggiorna l’URL e si ripristina aprendo un link o tornando indietro.
- Le API di dettaglio progetto/pagina includono nome e slug del subject per costruire la gerarchia senza richieste aggiuntive.
- Verificata build frontend dopo l’installazione Tiptap; aggiunti controlli sui link ai livelli superiori e sul ritorno alla sezione.

---

## Template per una nuova voce

```markdown
### AAAA-MM-GG — Titolo breve

- Cosa è cambiato, in punti. Un punto per decisione o per modifica sostanziale.
- Le scelte non ovvie vanno motivate: fra sei mesi il «perché» è l'unica parte non ricostruibile dal diff.

**Lasciato aperto:** cosa resta da fare e dove ci si è fermati.
```
