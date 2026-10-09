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

**Aggiornato al:** 2026-10-09

| | |
|---|---|
| Branch di lavoro | `dev` (il default remoto è `main`) |
| Remote | `git@github.com:gigapin/gigawiki-v2.git` |
| Task completati | 32 / 40 completati; 7 parziali; 1 non iniziato (conteggio dalla tabella sotto) |
| Fase corrente | **Fase 4 — Frontend**, task 29–30, 34 e 35 parziali. Base shadcn, Project detail e registrazione implementati; reader/editor con immagini ridimensionabili, autosave, revisioni, menzioni e menu contestuale |
| Backend | Completo (task 5–23). 18 file di test, 273 test verdi |
| Frontend | Login, Register, Verify email, ForgotPassword, ResetPassword, AcceptInvite, Dashboard, Subjects, Project detail, scelta destinazione nuova pagina, reader ed editor Tiptap. Bozza/pubblicazione, breadcrumb, tema light/dark, upload e resize immagini, link, syntax highlighting, autosave, drawer revisioni, menzioni e menu contestuale implementati. Tag/preferiti nelle pagine implementati; commenti riusabili integrati nel reader; restano settings |
| CI/CD | Non iniziata (task 39) |

**Codice della sessione committato dall’utente in `c12f73a`** (`feat: add first implementation of frontend`), su branch `dev`. Il working tree era pulito prima di questo aggiornamento documentale; questa modifica non è stata committata. `.claude/settings.local.json` è ancora tracciato, anche se ora escluso da `.gitignore`.

**Ultime verifiche eseguite:** build e lint frontend, typecheck API, 273 test backend e 133 test frontend superati. Test frontend in ambiente Node e jsdom: non equivalgono a una prova delle interazioni nel browser. Autosave confermato funzionante dall’utente. Registrazione con Mailtrap confermata funzionante dall’utente; ruolo di un utente cambiato manualmente in Prisma Studio per provare creazione/modifica.

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
| 25 | TanStack Router + Query + client axios | ✅ | Rotte auth, dashboard, subject/project, `/new-page`, `/projects/$projectSlug/sections/$sectionSlug/pages/new`, `/pages/$slug`, `/pages/$slug/edit`. Query `section` per ripristinare la sezione nel Project |
| 26 | Store Zustand | ✅ | `auth.store.ts`, `settings.store.ts` |
| 27 | Componenti di layout | ✅ | AppShell, Sidebar, Topbar, SearchModal |
| 28 | Pagine auth | ✅ | Login, Register, VerifyEmail, AuthLayout, reinvio verifica, ForgotPassword, ResetPassword e AcceptInvite. Inviti avviano la sessione; errori e validazione coperti in jsdom. Resta verifica browser/SMTP |
| 29 | Dashboard | 🟡 | Attività recenti, preferiti e statistiche ci sono. Manca la sezione «Recently visited» (`GET /views`) |
| 30 | Pagine Subjects / Projects / Sections | 🟡 | Prima implementazione in `c12f73a`. Fatti: Subjects/Subject detail, Project detail, ProjectFormDialog riusato in creazione/modifica, SectionFormDialog, eliminazione admin con conferma, riordino nativo + pulsanti accessibili, lista pagine paginata. Collegamenti a reader/editor e breadcrumb completati. Restano CRUD completo Subject e upload cover |
| 31 | Page view + editor Tiptap | ✅ | Reader, creazione/modifica, toolbar, tabelle, visibilità, bozza/pubblicazione, guardia modifiche non salvate. Fatti anche upload e ridimensionamento immagini, link, syntax highlighting e contenuti legacy JSON. Autosave dopo 30s di inattività sulle pagine esistenti. Menzioni e bubble menu implementati. Tag/preferiti e commenti nel reader completati; resta la prova nel browser |
| 32 | Drawer revisioni | ✅ | Cronologia e anteprima riservate a Editor/Admin; ripristino con conferma Editor/Admin e navigazione allo slug ripristinato |
| 33 | Componente commenti | ✅ | Thread paginati e risposte espandibili, avatar, markdown-lite sicuro, modifica propria, eliminazione propria/Admin con conferma, cache ottimistica e rollback. Integrato nel reader; riusabile per Project/Section |
| 34 | Pagine settings | 🟡 | Creazione inviti Admin in `/settings/invites`, link Invite users nei menu avatar/utente, email/ruolo, validazione e gestione errori/conferma. Restano elenco/reinvio/cancellazione inviti e altre pagine settings |
| 35 | Hook TanStack Query | 🟡 | Adapter tipizzati per auth/project/page/revisions/comments/tags/favorites; hook `usePages`, `useSections`, `useSectionMutations`, `useRevisions`, `useRevision` e `useRestoreRevision`. Restano hook uniformi per gli altri moduli; diverse `useQuery` sono ancora nei componenti |

### Fase 5 — Test, CI/CD, GitHub

| # | Task | Stato | Note |
|---|---|---|---|
| 36 | Test backend | 🟡 | 234 test verdi su 17 file, ma con un approccio diverso dalla specifica (vedi sotto) |
| 37 | Test componenti frontend | 🟡 | 35 test Vitest Node su registrazione/verifica, contratti API, sessione/settings, riordino, contenuto legacy, breadcrumb e rendering UI per ruoli. Restano i test browser/Testing Library per le interazioni |
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

8. **Cronologia riservata a Editor/Admin.** Su richiesta dell’utente, i Guest non possono vedere né interrogare lista/dettaglio revisioni: 403 API, pulsante nascosto e drawer non montato. Questa scelta prevale sulle letture pubbliche descritte nel task 16.

## Prossimi passi

1. Provare nel browser il ciclo pagina completo: scelta sezione, creazione bozza, pubblicazione, modifica, avviso di uscita e ritorno tramite breadcrumb. Registrazione già confermata dall’utente; per creare/editare pagine occorre EDITOR/ADMIN e, dopo un cambio ruolo da Prisma Studio, aggiornare la sessione.
2. **Prossimo incremento: Recently visited nella Dashboard (task 29).** Reader/editor condividono lo schema HTML/JSON; upload e resize immagini, link, syntax highlighting, autosave, revisioni, menzioni e menu contestuale sono completati. Tag, preferiti e commenti nel reader completati.
3. Completare Dashboard (recently visited), poi CRUD Subject/upload cover.
4. Provare nel browser commenti, tag/preferiti, drawer revisioni e ripristino.
5. Favorites e Settings sulla stessa base shadcn. Allineare prima i contratti inviti (elenco/reinvio/cancellazione) e cambio password, non completi nel backend.
6. Completare test delle interazioni frontend e CI. Valutare caricamento differito dell’editor: la build passa, ma segnala un bundle superiore a 500 kB.
7. A fine prove riportare `ALLOW_SELF_REGISTRATION` a `false` se non si vuole consentire la registrazione libera; valutare rimozione dal tracking di `.claude/settings.local.json`.

Auth restante completata: link reset/inviti collegati ai template email. Verificare i flussi reali con Mailtrap e browser.

Scelte adottate: dark iniziale e light selezionabile; sezioni inline nel Project; revisioni drawer, diff opzionale; settings secondo task 34; nuove icone Lucide, empty state con icona/testo. Non sono necessari nuovi template Claude Design.

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

### 2026-10-09 — Sessione persistente per test locali

- `NODE_ENV=development`: JWT di accesso senza scadenza, refresh persistente con data lontana e controllo scadenza disattivato solo in sviluppo. Revoca/logout e verifica dell’utente restano attivi. Cookie HttpOnly conservato per ripristinare la sessione al reload e alla riapertura del browser.
- `production` e `test`: durata JWT configurata e refresh a 30 giorni invariati; cookie Secure in produzione. Nessun nuovo parametro richiesto: `.env` locale già impostato a development, `.env.example` documentato.
- Verifiche: 273 test API su 18 file e typecheck superati. Nuovi test su JWT nei tre ambienti, cookie persistente locale, scadenze/Secure produzione e recupero di vecchi refresh locali. Frontend invariato (ultima verifica: 133 test).

**Lasciato aperto:** conferma browser della persistenza locale. La nuova durata cookie viene emessa al prossimo login/refresh; un cookie già rimosso dal browser richiede un login iniziale.


### 2026-10-09 — Contatori preferiti personali e token al cambio login

- Corretto un secondo punto: il pulsante pagina mostrava `_count.favorites` globale, anche quando l’utente non aveva salvato la pagina. Rimosso il numero dal toggle; conteggi favorites di dettaglio pagina/progetto filtrati per richiedente, cache toggle impostata a 0/1 per lo stato personale.
- Il client axios conserva l’Authorization esplicita: il GET me dopo un nuovo login non può essere sovrascritto dal token del precedente account ancora nello store. Le richieste ordinarie continuano a usare il token corrente.
- Verifiche: 133 test frontend e 266 API, build/lint frontend e typecheck API. Test con conteggio altrui 99 e stato personale false, filtro API del conteggio e nuovo token con precedente account nello store.

**Lasciato aperto:** conferma nel browser del punto segnalato dall’utente (Dashboard/sidebar/pulsante pagina).


### 2026-10-09 — Permessi cronologia e isolamento cache per account

- Reader: View history visibile solo Editor/Admin; drawer non montato per Guest, senza richieste revisioni. API lista/dettaglio/ripristino revisioni riservate a Editor/Admin.
- Preferiti: API già filtrata per `req.user.id`; corretta la cache frontend che riusava chiavi globali dopo logout/login. Hook `useFavorites` con ID utente e paginazione nelle chiavi, richieste annullabili, adottato in Dashboard e Sidebar.
- Cache applicativa cancellata al cambio account, logout o cambio ruolo, mantenuta al solo rinnovo token dello stesso account. Risposte tardive del toggle preferito ignorate dopo cambio utente; anche il dettaglio pagina personalizzato viene rimosso.
- Verifiche: 130 test frontend e 266 API, build/lint frontend e typecheck API superati. Test per cambio account, logout, cambio ruolo, rinnovo token, risposta tardiva, filtro API Guest e rifiuto cronologia Guest.

**Lasciato aperto:** prova browser reale con passaggio Admin/Editor → logout → Guest. Prossimo incremento roadmap invariato.


### 2026-10-09 — Nome scelto dall’utente invitato

- Rimosso nome dal form Admin e dal contratto shared/API di creazione inviti: si inviano solo email e ruolo. Il nome continua a essere richiesto nel form di accettazione e viene usato per creare account e slug.
- Email invito con saluto generico; job senza nome del destinatario. Per compatibilità con la colonna obbligatoria già esistente, il record invito conserva `name` vuoto; non occorre migrazione e gli inviti già creati restano validi.
- Verifiche: 124 test frontend e 263 API, build/lint frontend e typecheck API; adattati i test per verificare assenza del campo e creazione senza nome.

**Lasciato aperto:** elenco/reinvio/cancellazione inviti e prova browser/SMTP reale.


### 2026-10-09 — Creazione inviti dalla UI Admin

- Aggiunta pagina `/settings/invites` con form nome/email/ruolo, Guest di default, validazione e normalizzazione; successo con indirizzo/ruolo e azione per un altro invito. Hook tipizzato `useInviteUser` sul POST già esistente.
- Link “Invite users” visibile agli Admin nei menu avatar della Topbar e utente della Sidebar. Guardia rotta per non Admin e controllo nel componente; autorizzazione API invariata.
- Errori inline con campi conservati e possibilità di riprovare. Nel caso `INVITE_DELIVERY_FAILED`, esplicitato che l’invito è salvato e bloccata una seconda creazione per lo stesso form.
- Verifiche: build/lint frontend e 124 test superati. Test jsdom per accesso/menu, validazione, normalizzazione, scelta ruolo, conferma, conflitti, fallimento parziale e richieste duplicate.

**Lasciato aperto:** elenco/reinvio/cancellazione inviti e altre schermate Settings (task 34 resta parziale). Prova browser/SMTP reale da eseguire. Il prossimo incremento della roadmap resta Recently visited nella Dashboard.


### 2026-10-09 — Recupero password, reset e accettazione inviti

- Completato task 28: rotte pubbliche `/forgot-password`, `/reset-password?token=…`, `/accept-invite?token=…`, link Forgot password nel Login e form shadcn condiviso con conferma/visibilità password. Validazione, token mancanti/scaduti, errori inline, controlli bloccati durante le richieste e conferme con ritorno al login.
- Accettazione invito: email e ruolo derivano solo dall’invito; caricamento profilo con il nuovo token, pulizia cache dell’eventuale account precedente, sessione e navigazione Dashboard. Se il caricamento profilo fallisce, si riprova senza consumare nuovamente l’invito.
- Backend: validazione prima di consumare token reset/invito, normalizzazione email e risposta neutra del recupero anche con coda indisponibile. Corretto job reset con template e URL completo; implementato accodamento email invito. Account e accettazione invito sono in transazione con controllo contro doppia accettazione.
- Verifiche: 116 test frontend e 263 API, build/lint frontend e typecheck API superati. Test jsdom per form, errori, retry, sessione; test API per validazione/token/ruoli/job e doppia accettazione; rendering reale dei template reset/invito con mailer mockato.

**Lasciato aperto:** browser e invio SMTP reali non verificati. Reinvio/cancellazione inviti resta parte di Settings: se l’accodamento fallisce dopo la creazione, l’API espone `INVITE_DELIVERY_FAILED` e l’invito resta salvato. Prossimo incremento: Recently visited nella Dashboard (task 29). Warning bundle invariato.



### 2026-10-09 — Commenti riusabili e integrazione reader

- Completati task 33 e integrazione task 31: thread paginati, risposte espandibili su un livello, avatar/data, testo con grassetto/corsivo/codice senza HTML eseguibile. Guest autenticati possono scrivere; modifica solo propria, cancellazione propria o Admin con conferma e avviso sulla rimozione delle risposte.
- Hook tipizzati per pagine/progetti/sezioni; cache ottimistica per creazione/modifica/eliminazione, rollback sugli errori, bozze conservate e controlli bloccati durante le mutazioni. Aggiornamento dettaglio risorsa e attività; nuove radici sulla pagina finale, ritorno alla precedente dopo eliminazione dell’ultima radice.
- Backend: inclusi avatar nelle risposte; respinti corpi vuoti/spazi e risposte a risposte, coerentemente con il limite di un livello della specifica.
- Verifiche: 105 test frontend e 247 API superati, lint/build frontend e typecheck API. Nuovi test per permessi, conferma, formattazione sicura, errori/rollback, bozze, risposte e paginazione.

**Lasciato aperto:** prova nel browser reale; le schermate Project/Section possono riusare il componente ma non lo montano ancora. Prossimo incremento: auth restante (task 28). Resta il warning sulla dimensione bundle.


### 2026-10-09 — Tag e preferiti nelle pagine

- Reader: tag, aggiunta Editor/Admin con suggerimenti, normalizzazione, blocco duplicati e limite di 10; rimozione per autore del tag o Admin. Errori inline e controlli disabilitati durante le richieste.
- Preferiti: toggle disponibile anche ai Guest, stato personale e conteggio dal dettaglio pagina; aggiornamento cache pagina e invalidazione liste/contatori dashboard. GET pagina filtra i preferiti per il richiedente e restituisce solo `favorited`, senza esporre i record.
- Hook tipizzati per ricerca/creazione/rimozione tag e toggle preferito. Le modifiche ai metadati non passano dal salvataggio contenuto e non creano revisioni.
- Verifiche: 95 test frontend e 244 API superati; build/lint frontend e typecheck API superati. Aggiunti test jsdom su ruoli, limiti, duplicati, errori e cache, più test API sullo stato personale del preferito.

**Lasciato aperto:** integrazione commenti (task 33) e verifica nel browser. Resta il warning sulla dimensione bundle.

### 2026-10-08 — Riepilogo del lavoro completato

- Allineati stato attuale e tabella task con le funzionalità editor completate: upload e resize immagini, link, codice con syntax highlighting, compatibilità JSON, autosave, revisioni, menzioni e menu contestuale.
- Task 32 completato; task 31 ancora parziale per tag/preferiti e commenti. Totale: 29 task completati, 8 parziali e 3 non iniziati.
- Ultima verifica: 95 test frontend e 243 backend superati, build/lint frontend e typecheck API riusciti. Autosave verificato anche dall’utente; le prove dell’agente sulle interazioni sono in jsdom.
- Prossimo intervento: tag e preferiti nelle pagine, poi commenti. Restano le verifiche nel browser di menzioni, menu contestuale e revisioni.


### 2026-10-08 — Menzioni e menu contestuale

- Digitando `@` nell’editor si cercano utenti per nome: selezione con mouse o frecce/Invio, chiusura Escape, stati vuoto/errore. Menzione persistita con ID e nome, supportata dallo schema condiviso per reader e revisioni.
- Endpoint autenticato `GET /api/v2/users/mentions`: massimo 8 risultati, solo ID e nome; l’elenco amministrativo utenti resta riservato agli Admin.
- Menu contestuale sulle selezioni di testo con grassetto, corsivo e aggiunta/modifica link; esclusi blocchi codice e selezioni immagine.
- Verifiche: 95 test frontend e 243 backend, lint, build frontend e typecheck API. Interazioni verificate in jsdom; prova browser reale ancora da eseguire.
- Autosave confermato funzionante dall’utente. Prossimo incremento: tag/preferiti per le pagine.


### 2026-10-08 — Autosave editor

- Pagine esistenti salvate dopo 30 secondi di inattività, mantenendo bozza/pubblicazione e visibilità; l’editor resta aperto. La prima creazione è manuale.
- Indicatore salvataggio/orario; modifiche non salvate ed errore conservati in caso di fallimento. Upload, contenuto invalido e titolo vuoto sospendono l’autosave.
- Cambio titolo: aggiornamento dello slug nell’editor e uso del nuovo indirizzo per le richieste successive. Salvataggio manuale annulla il timer; protezione uscita durante modifiche e richieste pendenti.
- Verifiche: 88 test frontend, build e lint. Test autosave con timer controllati in jsdom; verifica browser reale da eseguire.
- Prossimi interventi del task 31: mentions e menu contestuale.


### 2026-10-08 — Drawer revisioni

- Pulsante `View history` nel reader: versione corrente, cronologia paginata e anteprima con lo stesso renderer della pagina.
- Editor/Admin possono ripristinare una revisione dopo conferma; errori visibili e retry, aggiornamento delle cache e navigazione al nuovo slug quando cambia il titolo.
- Backend: snapshot e aggiornamento atomici, slug univoci e controllo della revisione corrente per impedire un ripristino su una pagina modificata nel frattempo.
- Verifiche: 83 test frontend, 240 backend, lint/build frontend e typecheck API. Interazioni coperte in jsdom; prova nel browser reale ancora da eseguire.
- Prossimo incremento: autosave nell'editor. Diff delle revisioni opzionale, non implementato.


### 2026-10-08 — Ridimensionamento immagini nell'editor

- Ripristinata su richiesta la visibilità originale delle maniglie (hover/selezione): la segnalazione riguardava il reader, che correttamente non le mostra.

- Attivato il resize nativo Tiptap Image: quattro maniglie agli angoli, proporzioni conservate e dimensioni minime. Width/height persistono nel contenuto HTML/JSON e sono rispettate nel reader, che non mostra maniglie.
- Stili condivisi per tema light/dark; larghezza massima limitata al contenitore e altezza automatica per schermi piccoli. Maniglie visibili su hover/selezione e sui dispositivi senza hover.
- Verifiche: 76 test frontend, lint e build. Test di trascinamento da 400×200 a 600×300 e riapertura nel reader. Nessuna modifica backend o migrazione necessaria; verifica visiva in browser reale ancora da eseguire.


### 2026-10-08 — Reader/editor: immagini, link, codice e contenuti legacy

- Schema condiviso reader/editor con supporto a documenti Tiptap JSON, HTML e testo semplice. JSON non documentale resta testo; nodi/mark non supportati vengono segnalati, bloccando il salvataggio invece di perdere il contenuto originale.
- Upload immagini via pulsante, incolla e drop (JPEG/PNG/WebP/GIF, massimo 10 MB), errori e stato di attesa. Salvataggio sospeso durante upload, inserimento dell'URL persistente e protezione navigazione. Aggiunta rotta pubblica `/uploads/*` che legge da storage solo percorsi registrati in DB, coerente con bucket public-read; header CORP adatto a frontend/API su origini diverse.
- Dialog link: aggiunta/modifica/rimozione, selezione preservata, URL web/email/locali e rifiuto protocolli eseguibili. Lowlight condiviso per codice, selettore linguaggio e colori adattati al tema.
- Invalidata anche la query del dettaglio pagina dopo salvataggio, per mostrare subito il contenuto aggiornato nel reader.
- Verifiche: 75 test frontend (inclusi test interazione Testing Library/jsdom), 237 API, lint/build frontend e typecheck API. Prova MinIO reale: upload 201, lettura 200 di WebP valido e pulizia 200. Nessuna pagina esistente modificata dalla prova. Browser reale ancora da verificare; warning dimensione bundle resta aperto.
- Prossimo incremento: drawer revisioni con anteprima/ripristino, poi autosave.


### 2026-10-08 — Eliminazione pagine dal reader

- Aggiunto pulsante Delete page solo ADMIN, conferma con titolo pagina, blocco durante la richiesta ed errore inline con possibilità di riprovare. Annullare non invia DELETE.
- Successo: ritorno a `/projects/:slug?section=:sectionSlug`, invalidazione liste/contatori e rimozione cache della pagina. Il backend continua a usare soft delete e a rifiutare utenti non Admin.
- Corretti i conteggi pagine di sezioni e progetti per escludere `deletedAt` valorizzato.
- Verifiche: 46 test frontend, 234 API, lint/build frontend e typecheck API superati. Nuovi test su permessi reader, contratto DELETE/errori e navigazione/cache dopo successo. Prova delle interazioni nel browser ancora da eseguire: annullamento, conferma, errore e intero ciclo CRUD.


### 2026-10-08 — Login: conflitto porta PostgreSQL

- Riprodotto 500 al login; log Prisma P1000 anche su refresh/settings. La porta 5433 era occupata da `postgres_db`, mentre `gigawiki-v2-postgres-1` era fermo.
- Porta Compose parametrizzata con `POSTGRES_PORT` (default 5433). Configurazione locale impostata a 5434 e DATABASE_URL allineata; riavviato solo PostgreSQL GigaWiki conservando `gigawiki-v2_postgres_data`. Verifica lettura riuscita: 3 utenti, 2 pagine.
- Corretto il percorso del cookie refresh a `/api/v2/auth` per includere logout; rimozione del vecchio cookie su login/refresh/logout. 234 test API e typecheck superati. Trigger riavvio nodemon per caricare il nuovo ambiente.


### 2026-10-08 — Tema light e selettore

- Aggiunti token light, bottone sole/luna nella Topbar e nelle schermate auth, preferenza locale persistente e applicazione prima del caricamento React. Anche i toast seguono il tema.
- Adattati login, corpi delle card Subject/Project, tag, skeleton e ombre ai token. I banner colorati restano invariati. Corretti i colori del contenuto wiki che usavano direttamente i canali OKLCH invece di `oklch(var(...))`.
- Verifiche: 41 test frontend (inclusi 6 nuovi sul tema), lint e build. Restano verifica visiva nel browser e warning bundle già presente. La preferenza non viene sincronizzata con il profilo utente.
- Prossimo incremento: eliminazione pagine nell'interfaccia (solo Admin) e verifica browser del ciclo CRUD, poi compatibilità contenuti, funzioni editor, revisioni e autosave.


### 2026-10-07 — Riepilogo completo della sessione frontend

- **Specifiche e template:** esaminati documenti, prompt, schermate e contratti backend. I template esistenti non coprono da soli l’intera app, ma le schermate mancanti possono essere costruite con shadcn e il tema comune. Non sono stati creati nuovi template Claude Design; l’audit resta una fotografia storica, con nota sullo stato attuale.
- **Fondazione UI e Project:** unificati token dark, font e palette cover; introdotti form e stati condivisi, dettaglio progetto, sezioni inline con CRUD secondo i permessi, riordino drag/pulsanti e lista pagine paginata. Corretti contratti auth/settings, errori API e proxy Vite.
- **Ambiente locale:** diagnosticato `EADDRINUSE` sulla porta 3001 in presenza di API Docker e processo locale. Documentato che `docker compose up` carica anche l’override API, mentre `docker compose -f docker-compose.yml up -d` avvia l’infrastruttura. Chiarito l’uso di Prisma Studio per consultare il database; nessun reset o migrazione distruttiva effettuati.
- **Registrazione Mailtrap:** aggiunti Register, Verify email e reinvio, validazione e gestione errori; corretti template/job/URL di verifica e configurazione SMTP. Creato comando mirato `registration:enable` con invalidazione cache. La registrazione è stata confermata dall’utente; il ruolo EDITOR/ADMIN è stato assegnato manualmente da Prisma Studio.
- **Pagine wiki:** implementati scelta subject/progetto/sezione, creazione, reader e modifica Tiptap, formattazione, tabelle, bozza/pubblicazione, visibilità e protezione delle modifiche non salvate. Collegati lista e ricerca; validate POST/PATCH; corretti slug invariato e collisioni alla rinomina. Nessuna nuova migrazione Prisma necessaria.
- **Navigazione:** breadcrumb condivisi e accessibili; sezione selezionata conservata nell’URL. Le API includono i dati degli antenati per evitare richieste aggiuntive.
- **Git:** ampliato `.gitignore` per env/log/cache/file locali, mantenendo esempi e documentazione; verificati 20 percorsi. Nessun `.env` con credenziali tracciato. `.claude/settings.local.json` resta nell’indice. Codice incluso nel commit utente `c12f73a`; questo aggiornamento riguarda solo documentazione.
- **Verifiche finali:** 234 test API (17 file), 35 test frontend (7 file), typecheck API, lint e build frontend superati. Tiptap 3.31.4 installato dall’utente dopo il blocco npm dell’ambiente agente. Prova browser del ciclo pagine non eseguita dall’agente; warning bundle Vite non bloccante.

**Restano aperti:** dettagli avanzati del task 31 e test browser; recupero password/inviti; CRUD Subject e cover; revisioni/commenti/favorites/settings; CI. Nessun task parziale è dichiarato completo solo per la presenza del flusso base.

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

**Aggiornamento finale:** l’utente ha confermato che la registrazione funziona dopo la configurazione Mailtrap e ha cambiato il ruolo tramite Prisma Studio per provare le pagine. L’ambiente dell’agente non ha verificato direttamente il valore live di `ALLOW_SELF_REGISTRATION` né l’invio SMTP; il precedente EPERM non è un blocco attuale per il test locale confermato. Restano le altre pagine auth.

### 2026-10-07 — Base shadcn e dettaglio Project

- Tema dark unificato in `styles/tokens.css`, alias `--db-*`/`--gw-*`, font condivisi e palette cover estratta. Componenti shadcn ora usati dalla UI.
- Aggiunte primitive condivise per form risorse, stati vuoti/errore/caricamento, paginazione e conferme di eliminazione. Il dialog di creazione Project riusa quello di modifica.
- Nuova rotta `/projects/$slug`, sezioni inline, creazione/modifica/eliminazione secondo i permessi API, riordino e lista pagine paginata. Sidebar con caricamento progetti su espansione.
- Impossibile scaricare `@dnd-kit` e Testing Library (registro npm non raggiungibile). Riordino implementato con drag nativo e pulsanti per tastiera/touch; Vitest già presente nel workspace riutilizzato come dipendenza frontend, senza download.
- Corretti contratti sessione/settings (refresh `{ accessToken }`, me `{ user }`, settings dizionario diretto), errore API strutturato, retry 401 del login e due errori TypeScript preesistenti. Proxy Vite `/api` per sviluppo senza URL configurato.
- Build frontend e lint verdi; 17 test passati su contratti, sessione/settings, ordine e visibilità azioni per Guest/Editor/Owner/Admin. Nessuna modifica agli handler backend. Dettagli e limiti in `apps/web/README.md`.

**Lasciato aperto:** reader/editor (le righe pagina mostrano solo metadati), upload cover, CRUD completo Subject, auth restante, revisioni/commenti e settings. Verifica browser delle interazioni ancora da eseguire.

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

## Template per una nuova voce

```markdown
### AAAA-MM-GG — Titolo breve

- Cosa è cambiato, in punti. Un punto per decisione o per modifica sostanziale.
- Le scelte non ovvie vanno motivate: fra sei mesi il «perché» è l'unica parte non ricostruibile dal diff.

**Lasciato aperto:** cosa resta da fare e dove ci si è fermati.
```
