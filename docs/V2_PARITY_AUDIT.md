# Audit funzionale V2: copertura delle specifiche e parità con la V1

> **16 ottobre 2026 — confronto con il codice V1 ora disponibile:** il checkout originale `GiGaWiki` è stato analizzato alla revisione `0a1a08d`. Il nuovo riferimento per differenze V1/V2, PDF e requisiti di import è [V1_V2_FEATURE_COMPARISON.md](V1_V2_FEATURE_COMPARISON.md). Le affermazioni sotto sulla V1 non disponibile sono storiche; questo audit continua a descrivere lo stato V2 del 13 ottobre, precedente a F01–F14.

> Aggiornamento: gli interventi F01–F14 sono implementati. Esito, policy concordate, test e comandi di migrazione/attivazione in [PARITY_IMPLEMENTATION.md](PARITY_IMPLEMENTATION.md). Questo audit conserva lo stato del codice prima degli interventi; import/PDF e confronto con la V1 restano aperti.

> **14 ottobre 2026:** il codice post-audit è nel commit `af7e030` e il database dell’app ha già tutte le migrazioni. Policy locale attivata e quattro account disconnessi dopo conferma dell’utente; dati invariati verificati contro backup. Manutenzione/verifiche aggiornate e collaudi aperti in [V2_RELEASE_CHECKLIST.md](V2_RELEASE_CHECKLIST.md). Il resto di questo documento conserva gli esiti del 13 ottobre.

Data: 13 ottobre 2026. Revisione analizzata: `d35300c` (`docs: add contributing guide and repository policy`).

## Stato successivo all’implementazione — 13 ottobre 2026

| Rilievi | Stato attuale |
|---|---|
| F01–F02 | Attività atomiche e feed personale implementati. |
| F03/F05 | Accesso gerarchico, filtri soft delete e includeDeleted Admin implementati; gate privacy ancora disattivato sull’app. |
| F04 | Validazione shared a runtime ed errori uniformi; successi diretti e page/limit mantenuti come concordato. |
| F06–F09 | Statistiche reali, metadati/commenti contenitori, sidebar Section, ricerca raggruppata e spostamento Project implementati. |
| F10–F11 | Logo UI/email e storage locale persistente implementati; asset condivisi conservati per scelta concordata. |
| F12–F14 | Salvataggi/revisioni atomici, conflitti, summary, toolbar completa e configurazione/rate limit refresh implementati. |
| F15–F16 | Import V1 e PDF/export restano da definire sulla base della V1. |

Verifiche completate: 343 test API ordinari, 20 PostgreSQL, 214 frontend; lint/typecheck/build e smoke Docker superati. Nuova migrazione non applicata al database dell’app; attivazione privacy e invalidazione sessioni non eseguite. Restano prove browser/SMTP/S3 e verifica della nuova CI dopo il push. Dettagli e comandi in [PARITY_IMPLEMENTATION.md](PARITY_IMPLEMENTATION.md); stato dei 40 task in [GIGAWIKI_V2_TASKS.md](GIGAWIKI_V2_TASKS.md).

## Audit originale precedente agli interventi

Le lacune, i conteggi e la matrice sotto riportano lo stato osservato prima dell’implementazione e sono conservati come evidenza storica. Per lo stato attuale usare il riepilogo precedente.

## Esito e limiti del confronto

**La V2 copre i flussi principali, ma non implementa integralmente tutti i dettagli della roadmap. Il conteggio storico “40/40” indica milestone chiuse, non piena conformità funzionale.** Sono presenti lacune concrete in attività, Dashboard, navigazione, integrazioni UI e gestione dei contratti API.

Fonti: [GIGAWIKI_V2_TASKS.md](GIGAWIKI_V2_TASKS.md), [GIGAWIKI_V2_TECH_STACK.md](GIGAWIKI_V2_TECH_STACK.md), session log, codice API/web/shared e configurazione CI. Il documento tech stack aggiunge requisiti che non sono entrati nei 40 task, per esempio la generazione PDF.

**Non è possibile certificare che tutte le funzionalità della V1 siano state riportate.** Questi due documenti descrivono la ricostruzione V2; non costituiscono un inventario completo dell’app originale. Il codice V1 non è presente nella workspace né nei progetti locali individuati. Il riferimento al suo repository/percorso è stato chiesto all’utente. Le lacune sotto sono verificabili rispetto alla specifica V2; non vengono presentate come regressioni V1 accertate.

Metodo: lettura statica di implementazione, rotte registrate, chiamate UI, schema e suite di test. Nessuna modifica funzionale, test browser, migrazione o scrittura al database durante questo audit. I 334 test API e 200 frontend già superati e la CI verde confermano i casi coperti, non tutte le funzionalità descritte.

## Funzioni principali presenti

Sono presenti autenticazione e refresh, registrazione e verifica email, reset password, inviti; ruoli Admin/Editor/Guest e profilo/password/avatar; gerarchia Subject → Project → Section → Page con CRUD, cover e ordine delle sezioni; bozze/pubblicazione/autosave; editor Tiptap con immagini, link, codice, tabelle, menzioni e menu contestuale; revisioni con anteprima/ripristino; commenti e risposte sulle pagine; tag e preferiti delle pagine; ricerca PostgreSQL; visite recenti; Settings e gestione utenti/inviti; email in coda, migrazioni, test e CI.

## Lacune e differenze verificabili

| ID | Priorità | Area | Risultato |
|---|---|---|---|
| F01 | Alta | Attività | API e helper presenti, ma nessuna rotta richiama il logger: le modifiche ordinarie non alimentano il registro. |
| F02 | Alta | Dashboard attività | Usa l’endpoint globale riservato agli Admin invece di quello personale; Editor/Guest ricevono 403, mostrato come assenza di attività. |
| F03 | Alta, decisione | Accesso PUBLIC/PRIVATE e bozze | Le letture PUBLIC richiedono login; i dettagli non applicano una policy differenziata per PRIVATE/bozze/restricted. |
| F04 | Alta | Compatibilità API | Envelope e paginazione reali differiscono dal contratto dichiarato; gli schemi shared non sono la fonte unica di validazione. |
| F05 | Media | Soft delete e includeDeleted | Non esiste il filtro Admin includeDeleted previsto; l’eliminazione di un contenitore non nasconde automaticamente i discendenti nelle letture dirette. |
| F06 | Media | Dashboard statistiche | Mancano totali utenti/pagine Admin; “Views this week” è un valore fisso a zero. |
| F07 | Media | Funzioni Project/Section | Tag, commenti e preferiti supportati dall’API ma senza controlli UI su progetti/sezioni. |
| F08 | Media | Navigazione e ricerca | Sidebar senza livello Section; risultati ricerca non raggruppati per progetto. |
| F09 | Media | Project form | Subject imposto dal contesto, senza selector; aggiornamento progetto non consente cambio Subject. |
| F10 | Media | Branding logo | SITE_LOGO_IMAGE_ID è memorizzabile, ma non viene utilizzato nel branding UI/email. |
| F11 | Media | Storage | STORAGE_DRIVER=local è accettato dalla configurazione ma non cambia il backend S3. Avatar precedente conservato invece di eliminato. |
| F12 | Media | Revisioni e affidabilità | PUT/PATCH separano snapshot e aggiornamento; summary non viene prodotto. PUT e PATCH differiscono anche nella gestione degli slug. |
| F13 | Bassa | Editor comandi | Schema supporta più formati dei comandi esposti: toolbar con H2/H3, senza selettore H1–H4 e comandi strike/hr/inline code. |
| F14 | Bassa | Auth/configurazione | Refresh senza limite auth 10/min; durata refresh configurabile dichiarata ma 30 giorni hardcoded. |
| F15 | Da definire | Migrazione V1 → V2 | Nessun importatore dati/file/password V1 verificato; migrare schema non trasferisce i dati originali. |
| F16 | Da definire | PDF/export | Citato nel tech stack, assente dai task e dall’app; presenza nella V1 da verificare. |

### F01–F02: attività e feed Dashboard

Il task 18 richiede `logActivity` richiamato dalle altre rotte; il task 17 prevede la registrazione di COMMENTED. In [activitiesRoute.ts](../apps/api/src/routes/activities/activitiesRoute.ts) l’helper esiste, ma la ricerca di `logActivity` e `activity.create` nel codice applicativo trova soltanto la sua definizione. Creazione/modifica/eliminazione di risorse, commenti e restore non lo chiamano. Gli endpoint possono leggere righe già presenti, ma il normale uso della V2 non ne crea.

Il task 29 richiede `/users/me/activities`. [DashboardPage.tsx](../apps/web/src/pages/DashboardPage.tsx) usa `useActivities`; [api/activities.ts](../apps/web/src/api/activities.ts) chiama `/activities`, riservato ad Admin. Il feed converte anche gli errori in “No activity to display”, quindi per Editor/Guest il problema appare come un elenco vuoto.

Intervento: registrazione coerente delle azioni, feed personale per tutti e gestione esplicita degli errori; test che una modifica produca una nuova attività visibile.

### F03: visibilità, bozze e autorizzazione delle letture

I task 12–17 indicano letture pubbliche. In [routes/index.ts](../apps/api/src/routes/index.ts) quel blocco è commentato: subjects/projects/sections/pages/revisioni/commenti/tag/views sono dietro autenticazione. Anche la SPA protegge le relative pagine con `_auth` in [router.tsx](../apps/web/src/router.tsx).

Nei dettagli di Subject, Project, Section e Page si filtra essenzialmente per slug e `deletedAt`, senza policy sulla visibilità del contenuto per il richiedente. Le pagine con `isDraft=true` non sono escluse automaticamente dai dettagli e dalle liste dei Guest; la ricerca filtra PUBLIC ma non `isDraft`. `restricted` e `ownedById` sono memorizzati/aggiornabili, ma non sono usati per limitare le modifiche alle pagine: PUT/PATCH autorizzano Editor/Admin.

Questo è un comportamento accertato del codice, **non prova della policy corretta per la V1**: la semantica di PRIVATE/restricted richiede conferma. Non basta riattivare le rotte pubbliche; prima occorre definire e verificare i filtri di accesso. La cronologia riservata a Editor/Admin è invece una scelta esplicita dell’utente da conservare.

### F04: contratti API, paginazione e shared

I task 4–5 dichiarano `{ success, data }`, errori strutturati e `{ data, meta }` con `perPage`, max 100, sort/order. Le rotte restituiscono prevalentemente oggetti diretti oppure `{ subjects|projects|pages|..., total, page, limit }`; molti errori sono `{ error: string }`. Il global error handler usa l’envelope, ma le risposte inviate dai singoli handler lo aggirano.

[PaginationSchema](../packages/shared/src/schemas/pagination.schema.ts) e [tipi pagination](../packages/shared/src/types/pagination.ts) esistono; molti handler utilizzano `parseInt(page/limit)` senza quello schema, limiti uniformi e sort/order. Esistono schemi shared, ma auth/page/subject/project adottano anche schemi locali e altre rotte validazioni manuali. Il frontend corrente è adattato al contratto reale; un consumer costruito sulla specifica non è automaticamente compatibile.

Intervento: scegliere il contratto canonico, uniformare validazione e adapter, evitando modifiche breaking senza aggiornare UI e test.

### F05: contenuti eliminati e gerarchia

Il task 12 prevede `includeDeleted=true` per Admin. È dichiarato negli schemi shared Subject/Project ma non consumato dai rispettivi handler, che impongono `deletedAt: null`. Non c’è UI per vedere/ripristinare risorse eliminate; il ripristino del cestino non era un task esplicito.

`deleteSubject`, `deleteProject` e `deleteSection` marcano solo il contenitore. I dettagli dei discendenti e la ricerca sulle pagine non controllano sistematicamente gli antenati eliminati: un figlio ancora attivo può rimanere leggibile via URL diretto dopo la scomparsa del padre dalle liste. Definire se applicare cascata logica oppure filtri sugli antenati; verificare la policy V1 prima di scegliere.

### F06–F09: Dashboard e UI della gerarchia

- Il task 29 chiede statistiche Admin totali utenti/pagine/subjects. `StatCards` mostra Subject, Favorites, Activity e “Views this week”; quest’ultima è `0` con “coming soon”, non una misura reale.
- Il task 13 richiede supporto Project per tag/commenti/preferiti. API e relazioni ci sono; [ProjectDetailPage.tsx](../apps/web/src/pages/projects/ProjectDetailPage.tsx) non monta CommentSection, tag editor o toggle preferito. Le sezioni inline non espongono queste funzioni. Sulle pagine sono invece integrate. [CommentSection](../apps/web/src/components/comments/CommentSection.tsx) è riutilizzabile su tutti e tre i tipi di risorsa.
- Il task 27 descrive Subject → Project → Section. [Sidebar.tsx](../apps/web/src/components/layout/Sidebar.tsx) si ferma ai Project. I Subject sono limitati ai primi 50 e i progetti caricati ai primi 20 con rimando alla pagina Subject; i livelli non sono un albero completo della wiki.
- [SearchModal.tsx](../apps/web/src/components/layout/SearchModal.tsx) ha debounce, frecce, Enter, Escape, loading e retry; i risultati sono piatti, senza raggruppamento per Project richiesto. La query full-text usa lingua inglese, come nella specifica; l’adeguatezza ai contenuti italiani va valutata.
- Il task 30 descrive un selector Subject nel Project form. [ProjectFormDialog.tsx](../apps/web/src/components/projects/ProjectFormDialog.tsx) riceve `subjectId` dal contesto; PATCH Project non permette di cambiarlo. La creazione nel Subject è disponibile, ma lo spostamento non è implementato.

Le voci fittizie Search/Favorites/Recent/Inbox/Drafts/Shared with me/Tags della sidebar sono state rimosse su richiesta dell’utente. Questo non elimina ricerca topbar, preferiti e recenti Dashboard; non è una regressione da reinserire automaticamente.

### F10–F11: logo, immagini e storage

Il task 20 prevede `SITE_LOGO_IMAGE_ID`; l’API lo legge/salva, ma nessun consumer lo applica in logo UI o [BaseLayout email](../apps/api/src/emails/layouts/BaseLayout.tsx). App Settings espone i tre campi richiesti dal task 34, non il logo. Il nome sito dinamico è implementato.

`STORAGE_DRIVER` ammette local/s3 in [config/env.ts](../apps/api/src/config/env.ts), ma [storage.ts](../apps/api/src/lib/storage.ts) usa sempre S3. Serve implementare il driver locale oppure togliere l’opzione dalla configurazione/documentazione.

Il task 11 prevede cancellazione dell’avatar precedente. [uploadAvatar](../apps/api/src/routes/users/usersRoutes.ts) conserva esplicitamente i vecchi asset per riferimenti condivisi; anche la rimozione cover scollega senza garbage collection. È una differenza di lifecycle degli asset, con possibile accumulo. L’upload immagini generico richiede Editor/Admin; quello avatar consente anche Guest sul proprio profilo. Il task 19 richiedeva genericamente utenti autenticati.

### F12–F14: revisioni, editor, auth

In [pagesRoute.ts](../apps/api/src/routes/pages/pagesRoute.ts), PUT/PATCH creano Revision e poi aggiornano Page senza un’unica transazione. Un errore successivo allo snapshot può lasciare una revisione anche senza salvataggio; salvataggi concorrenti non sono coperti dalle integrazioni rollback. Il restore usa una transazione. La differenza fra PUT (snapshot sempre) e PATCH (solo titolo/contenuto) è prevista; l’UI usa PATCH per bozza/autosave evitando revisioni inutili. PUT e updateSection usano slug semplice, mentre PATCH Page/Subject/Project gestisce anche collisioni.

`Revision.summary` esiste e viene mostrato se presente, ma nessun salvataggio/API/UI lo valorizza. La lista mostra il nome dell’autore senza avatar. Preview, corrente, restore e diff opzionale sono presenti.

[PageEditor.tsx](../apps/web/src/components/pages/PageEditor.tsx) espone H2/H3, bold/italic/liste/quote/code block/link/image/table, incluse rimozione riga/colonna/tabella e undo/redo. StarterKit supporta altri formati ma mancano i relativi controlli visibili e il dropdown H1–H4 della specifica. Questo è un limite della toolbar, non assenza di supporto del documento.

Quasi tutti i POST auth applicano il limite 10/min, ma `/auth/refresh` usa quello globale 100/min. `JWT_REFRESH_EXPIRES_IN` è dichiarato/configurato ma le nuove sessioni usano 30 giorni hardcoded. Cookie su `/api/v2/auth` anziché solo `/refresh` è una correzione intenzionale per consentire logout; token senza scadenza in development è una scelta dell’utente, production/test mantengono scadenza.

### F15–F16: punti fuori dalla roadmap da chiarire sulla V1

Le migrazioni Prisma ricreano/evolvono lo schema e il seed crea dati demo; non sono un importatore di database e asset V1. Il file chiamato `all_tables_from_v1` non dimostra il trasferimento dei dati originali. Il login usa `argon2.verify` senza fallback bcrypt: se la V1 usa bcrypt, importare le password tal quali non basta. Occorre verificare anche ID/FK, ruoli, slug/vecchi URL, HTML/JSON dell’editor, revisioni, riferimenti immagini, timezone, sessioni e impostazioni. Il supporto a Tiptap JSON/HTML/testo già presente non dimostra compatibilità con ogni nodo/mark della V1: i documenti JSON non supportati vengono bloccati per preservare il contenuto.

Il tech stack cita Puppeteer per PDF/export; non risulta una dipendenza/runtime, rotta o azione UI corrispondente. I 40 task non includono l’export. Va stabilito se fosse una funzionalità dell’originale e se sia obbligatoria per la parità.

Collaborazione realtime/Socket.io/Yjs e Meilisearch sono descritti come evoluzioni future, non requisiti della prima fase. Non vanno conteggiati come funzionalità mancanti della V1 senza evidenza.

## Matrice dei 40 task

“Coperto” indica obiettivo principale presente da lettura del codice, non equivalenza certificata alla V1. “Scostamento” indica una scelta implementativa diversa; “Parziale” indica un requisito concreto assente o incompleto.

| Task | Esito | Osservazione |
|---|---|---|
| 1 Monorepo | Coperto | Workspace, Turbo, Node, script e README presenti. |
| 2 Compose | Scostamento | Servizi presenti; Meilisearch aggiuntivo e override API automatico documentati. |
| 3 Qualità | Coperto | ESLint/Prettier/Husky/Commitlint, wrapper pnpm. |
| 4 Shared | Parziale | Tipi/schemi presenti; envelope/paginazione e validazione non uniformi, F04. |
| 5 Fastify | Parziale | Bootstrap/health/error handler presenti; envelope non uniforme, F04. |
| 6 Plugin | Parziale | Plugin presenti; rate limit auth non applicato a refresh, F14. |
| 7 Prisma | Coperto con differenze | 15 modelli; authVersion, colore/icona e regole di cancellazione evolute. Nessuna prova di import V1. |
| 8 Ricerca SQL | Coperto | search_vector/GIN e ranking, verificati su PostgreSQL. |
| 9 Singletons | Scostamento | Client presenti; Prisma non usa global hot-reload/query logging. Driver local non implementato, F11. |
| 10 Auth | Scostamento | Flussi presenti; ruolo da setting anziché fisso Guest, cookie e development intenzionali; F14. |
| 11 Utenti | Scostamento | Flussi presenti; cancellazione protetta/anteprima e conservazione avatar, F11. |
| 12 Subject | Parziale | CRUD presente; letture non pubbliche e includeDeleted assente, F03/F05. |
| 13 Project | Scostamento | API principali presenti; letture protette e contatore preferiti personale. UI incompleta F07. |
| 14 Section | Scostamento | CRUD/ordine presenti; letture protette, F03. |
| 15 Page | Coperto con limiti | CRUD/bozze/ricerca/snapshot presenti; F03/F12. |
| 16 Revisioni | Scostamento approvato | Guest esclusi; preview/restore disponibili per Editor/Admin. |
| 17 Commenti | Parziale | Thread/permessi presenti; evento COMMENTED non generato, F01. |
| 18 Supporto | Parziale | Tag/favorite/view e letture attività presenti; logger mai richiamato, F01. |
| 19 Immagini | Scostamento | Pipeline WebP/S3 presente; permessi upload e avatar trasformato invece di doppia variante. |
| 20 Settings API | Coperto con limite | Cache/chiavi presenti; logo non consumato dall’app, F10. |
| 21 Worker | Coperto | Email con retry e image worker placeholder previsto. |
| 22 Email | Coperto con limite | Quattro template, branding nome; logo resta testuale. |
| 23 Seed | Coperto | Account/contenuti/settings demo, distinto dall’import V1. |
| 24 Web bootstrap | Coperto | React 19, Vite, Tailwind/shadcn; versioni evolute rispetto al documento. |
| 25 Router/Query/client | Coperto | Routing, refresh coordinato, cache/sessione. |
| 26 Store | Coperto | Auth/settings e tema locale. |
| 27 Layout | Parziale | Sidebar Subject/Project senza Section; ricerca non raggruppata, F08. |
| 28 Auth UI | Coperto | Tutti i flussi richiesti e gestione errori. |
| 29 Dashboard | Parziale | F01/F02/F06; preferiti e visite recenti presenti. |
| 30 Gerarchia UI | Parziale | CRUD/cover/ordine presenti; selector Subject mancante F09; drag nativo anziché dnd-kit. |
| 31 Editor/reader | Parziale accessoria | Funzioni principali presenti; toolbar incompleta F13; UI salva con PATCH intenzionalmente. |
| 32 Drawer revisioni | Coperto con limiti | Preview/restore/diff; autore senza avatar, summary non prodotto F12. |
| 33 Comment component | Coperto | Ottimismo/retry/thread; montato sulle pagine, F07 sulle altre risorse. |
| 34 Settings UI | Coperto | Profilo/password/tema/users/invites/tre App Settings richiesti. |
| 35 Hook API | Coperto | Transport e hook tipizzati, cache/invalidazioni e guardie lint. |
| 36 Test backend | Scostamento approvato | 323 ordinari + 11 DB; rollback anziché truncate, migrazioni in CI. Non coprono commit concorrenti. |
| 37 Test frontend | Scostamento | 200 test, vero Tiptap/jsdom; layout test e mock router diversi dalla specifica. Browser manuale. |
| 38 Docker API | Coperto | Build/packaging runtime Prisma; implementazione più elaborata. |
| 39 CI | Coperto | Quattro job verificati verdi su GitHub, DB temporaneo e artifact web. |
| 40 Repository | Scostamento | CONTRIBUTING/main protetto; zero review esterne approvate, dev e repo pubblico mantenuti. |

## Ordine suggerito degli interventi

1. Recuperare inventario/codice V1 e definire accesso pubblico/privato, bozze, restricted e lifecycle dei contenitori. Verificare strategia di import e password prima di una sostituzione della V1.
2. Implementare eventi attività e feed personale; coprire con test un’azione reale e l’accesso Editor/Guest.
3. Completare statistiche Dashboard e UI tag/commenti/preferiti dei progetti/sezioni.
4. Uniformare validazione/query API e rendere atomici snapshot+salvataggio; verificare concorrenza e collisioni slug.
5. Completare navigazione, selector/spostamento Project e toolbar; decidere logo, driver locale, retention asset e PDF.

Il miglioramento grafico generale rimane rimandato come richiesto dall’utente. Il primo obiettivo è chiudere lacune funzionali misurabili. Le prove browser/SMTP/storage residue restano distinte dalla presenza del codice.
