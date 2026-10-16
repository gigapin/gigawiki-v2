# Confronto V1 → V2 e interventi per la parità funzionale

**Aggiornamento implementazione:** gli incrementi scelti sono descritti in [V1_FEATURE_IMPLEMENTATION.md](V1_FEATURE_IMPLEMENTATION.md), inclusi R09 conservazione revisioni, cestino solo restore e audit immagini senza cancellazione. Migrazione dati V1 esclusa. Le lacune sotto sono la fotografia della base `47cee08`, non lo stato del working tree successivo.

Data: 16 ottobre 2026. Documento di riferimento per scegliere e implementare i prossimi incrementi; nessuna delle proposte sotto è già implementata o approvata automaticamente.

## 1. Base del confronto e conclusioni

| Versione | Sorgente analizzata | Revisione |
| --- | --- | --- |
| V1 | Checkout locale `/Users/pino/Projects/GiGaWiki`, repository `gigapin/GiGaWiki` | `0a1a08d614844233878591887f2c07a5f27da88e` del 24 marzo 2023 |
| V2 | Questo repository, branch `dev` | `47cee084bc066eb3ff6b0f0d9cc4bfbd8f3839b9` |

**La V2 copre i flussi principali, ma non è ancora equivalente alla V1.** Le differenze concrete più importanti sono PDF della singola pagina, cestino con ripristino, tag sui Subject e catalogo dei tag, descrizioni formattate, navigazione tra pagine e accesso all'elenco completo dei preferiti. La sostituzione di una V1 con dati reali richiede inoltre un importatore e una strategia password/contenuti: le migrazioni Prisma non svolgono questo lavoro.

Metodo: confronto statico di rotte registrate, controller/servizi, viste, modelli, migrazioni e test V1 con API, router, componenti, schemi e policy V2. Una dipendenza, una colonna o una schermata isolata non dimostrano da sole un flusso funzionante. La V1 non è stata avviata e non sono stati generati PDF; nessun database o asset reale è stato letto/importato/modificato. I test V1 non sono stati eseguiti e le prove V2 precedenti non dimostrano parità V1.

La precedente impossibilità di confrontare il codice originale, descritta in [V2_PARITY_AUDIT.md](V2_PARITY_AUDIT.md), è ora superata per questo checkout. Restano da verificare dati, configurazione e comportamento dell'installazione V1 effettivamente utilizzata: il codice scaricato può differirne.

Legenda: **coperto** = capacità equivalente presente nel codice; **parziale** = capacità presente con una lacuna identificata; **manca** = flusso attivo V1 non disponibile in V2; **scelta V2** = differenza da preservare finché non viene decisa una modifica; **da verificare** = codice V1 incompleto/incoerente o comportamento dipendente dai dati.

## 2. Inventario funzionale

I riferimenti V1 usano permalink alla revisione analizzata; quelli V2 puntano ai file locali. Le evidenze di dettaglio e le proposte di intervento seguono la tabella.

| Area | Evidenza V1 e comportamento | Stato V2 | Riferimento/intervento |
| --- | --- | --- | --- |
| Login, recupero password, verifica e invito | Rotte auth e controller dedicati; invito legacy con ID/ruolo nell'URL | Coperto, con token e revoca sessioni V2 | [auth V2](../apps/api/src/routes/auth/authRoutes.ts); migrazione §5 |
| Ruoli | Admin/Editor/Guest nelle migrazioni; tabella ruoli e pagina descrittiva | Coperto con enum; manca solo pagina descrittiva | Differenza accessoria; nessun editor di permessi custom funzionante individuato nella V1 |
| Subject → Project → Section → Page | CRUD, cover, appartenenza e navigazione | Coperto, con sezioni inline e ordinamento aggiunto | [router](../apps/web/src/router.tsx), [schema](../apps/api/prisma/schema.prisma) |
| Elenco globale dei progetti | `/admin/projects`, elenco paginato dei progetti dell'utente | Parziale: progetti per Subject e sidebar, nessuna rotta SPA globale `/projects` | R12 |
| Tag su Page/Project | Form, elenco e modifica associazioni | Coperto per associazione; rinomina diretta assente | [tags API](../apps/api/src/routes/tags/tagsRoute.ts); R04 |
| Tag su Subject | Create/update e viste Subject; test dedicati V1 | Manca: nessun `Tag.subjectId` e nessuna UI | R03 |
| Catalogo tag e risorse associate | `/admin/tags`, `/admin/tags/{name}` | Manca: `/tags?name=` V2 è autocomplete, non catalogo né risultati per tag | R04 |
| Commenti e risposte | Page/Project/Section, modifica ed eliminazione | Coperto, con filtri di accesso e rollback UI | [comments API](../apps/api/src/routes/comments/commentsRoute.ts) |
| Disabilitazione globale commenti | Setting `disable-comments` consumato dalle viste | Manca | R05; il blocco delle scritture sarebbe un miglioramento rispetto al solo nascondimento V1 |
| PDF pagina | Rotta, pulsante, servizio Dompdf e template attivi | Manca completamente | R01 e §3 |
| Cestino pagine | Elenco `onlyTrashed`, restore, eliminazione definitiva e svuotamento | Manca: soft delete presente, senza flusso di recupero | R02 |
| Cestino di tutti i contenitori | Testo UI lo promette, ma handler opera solo su `Page` | Non è una capacità V1 completa dimostrata | Eventuale estensione di R02, non requisito minimo di parità |
| Precedente/successiva | Reader e API V1, ordine per ID entro lo stesso Project | Manca nel reader/API V2 | R06 |
| Albero pagine nel reader | Project → Section → Page nella vista pagina | Parziale: sidebar V2 termina a Section, pagine nel Project | R06; sezioni inline V2 da mantenere |
| Preferiti | Pagina completa personale con rimozione | Parziale: API paginata e toggle; Dashboard mostra solo sei risultati senza navigazione all'elenco completo | R07 |
| Descrizioni formattate | Summernote `#note`, HTML visualizzato per Subject/Project/Section | Manca la capacità rich text; form e visualizzazione V2 usano testo | R08 |
| Editor pagine | Summernote con colori, allineamento, sorgente HTML e fullscreen nella configurazione | Parziale: Tiptap copre i formati principali, ma non colori/allineamento/sorgente/fullscreen | R08; inizializzazione `#post` V1 anomala, comportamento runtime da verificare |
| Revisioni: elenco, anteprima, restore | Controller e viste collegati | Coperto, con snapshot atomici/conflitti e Guest esclusi per scelta V2 | [revisioni](../apps/api/src/routes/revisions/revisionsRoute.ts) |
| Eliminare una revisione | DELETE e pulsante V1 | Manca | R09; non aggiungere senza politica di conservazione |
| Attività sui contenuti | Feed personale e log azioni | Coperto e migliorato per atomicità | [activity helper](../apps/api/src/lib/activity.ts) |
| Attività di login | `AuthenticatedSessionController::store` registra `login` | Manca: enum V2 senza LOGIN, auth non registra attività | R10 |
| Visite Subject e più visitati | V1 registra visite Subject/Project e ordina per numero visite | Parziale: V2 supporta Page/Project/Section, non Subject; Dashboard ordina per recenza | R11; contatori V1 non equivalgono a cronologia personale affidabile |
| Ultime pagine aggiornate e contributi profilo | Widget Dashboard e contatori profilo V1 | Non esposti come viste dedicate equivalenti | R13, priorità bassa |
| Creazione diretta account Admin | Form con password/ruolo, invito opzionale | Parziale: V2 offre invito, non creazione diretta con password scelta da Admin | R14, decisione di prodotto |
| Password altrui impostata da Admin | `SettingController::updateUser` | Assente: V2 richiede cambio personale con password corrente o reset | R14, preservare il flusso attuale salvo nuova decisione |
| Pulizia immagini | Schermata e azioni filesystem V1 | Manca uno strumento di manutenzione equivalente; V2 conserva asset condivisi per scelta concordata | R15; non replicare gli handler distruttivi V1 |
| Accesso anonimo | API library/document registrate senza auth; viste web pubbliche commentate | Scelta V2: login obbligatorio, anche per PUBLIC | D01, non riattivare automaticamente |
| Registrazione configurabile | Setting V1 esiste, ma il controller registrato non lo consulta | V2 coperto e applicato dal server | Non importare il difetto V1 |
| Verifica email opzionale | Setting V1 `email-confirmation`, uso parziale nei flussi account | Scelta V2: login richiede email verificata; inviti confermano l'account | D02 |
| Ricerca full text | SearchController V1 vuoto, nessuna rotta ricerca registrata | Funzionalità aggiuntiva V2 implementata | Non è una lacuna V2 |
| Bozze/autosave/conflitti/tema/logo | Non individuati flussi V1 equivalenti completi | Funzionalità aggiuntive V2 | Preservare; il logo V1 è un asset fisso |
| Import dati e password | Nessun importatore V1→V2 nel progetto corrente | Manca uno strumento di transizione, non una feature interna V1 | M01–M03, §5 |

## 3. PDF: cosa esiste e cosa implementare

### 3.1 Funzionamento effettivo della V1

- [Rotta attiva](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/routes/web.php#L96): `GET /admin/{slug}/export/pdf`, nel gruppo autenticato, richiamata da “Export PDF” nel [reader](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/resources/views/pages/show.blade.php#L87).
- La rotta usa **`App\Services\PDFController`**, non l'omonimo controller Dashboard. Il [servizio](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Services/PDFController.php#L13) cerca la pagina per slug **e `updated_by = Auth::id()`**: esporta solo chi risulta ultimo modificatore. Non è una policy da trasferire nella V2.
- Generazione sincrona tramite `barryvdh/laravel-dompdf` (`composer.lock`: wrapper 0.9.0, Dompdf 1.2.2), [template](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/resources/views/exports/pdf.blade.php) con titolo e HTML del contenuto, download `<titolo>.pdf`. Il default configurato è A4; il codice dichiara opzioni 150 DPI/sans-serif dopo `loadView`, la loro resa non è stata verificata.
- Nessuna esportazione Project/Section/Subject, archivio ZIP, selezione di revisioni o coda PDF individuata. L'import `PDFExportJob` è inutilizzato e il relativo file non è presente: non prova una generazione asincrona.
- Il template non include commenti, tag, cronologia, breadcrumb, logo o indice. La configurazione abilita risorse remote, ma caricamento immagini, font e impaginazione reali richiedono una prova runtime.

### 3.2 R01 — incremento PDF proposto

**Priorità alta per parità; nessuna migrazione dati necessaria per il solo export.**

| Aspetto | Proposta per V2 |
| --- | --- |
| UI | Pulsante “Export PDF” nel reader della pagina salvata, stato pending, errore con retry; nessun salvataggio implicito della bozza locale |
| API | Nuovo `GET /api/v2/pages/:slug/export/pdf`, autenticato, risposta binaria `application/pdf`, `Content-Disposition: attachment` con nome sicuro e supporto ai titoli Unicode |
| Autorizzazione | Stessa leggibilità della pagina e dei suoi antenati, incluse bozze/restricted/eliminati. Proposta: download anche Guest per pagine che può leggere; **da confermare**, senza vincolo sull'ultimo editor |
| Contenuto | Titolo come testo escapato e corpo persistito, stesso supporto del reader per HTML/Tiptap JSON/testo; niente sidebar/commenti/storia o dati di altre pagine |
| Resa | A4, tema stampa chiaro, font locali e caratteri italiani; immagini, tabelle multipagina, blocchi codice e link leggibili. Branding/indice/header-footer avanzati sono estensioni, non parità minima |
| Cache e file | Risposta privata senza cache condivisa; generazione inizialmente temporanea, senza aggiungere PDF pubblici allo storage immagini |
| Errori | 401 senza sessione; accesso/contenuto non disponibile secondo policy esistente; errore strutturato prima di iniziare lo stream per timeout o indisponibilità renderer |

**Implementazione candidata:** Puppeteer/Chromium, coerente con il tech stack V2, con un piccolo spike prima dell'integrazione. La documentazione ufficiale espone [`Page.pdf()` e attesa dei font](https://pptr.dev/guides/pdf-generation); la [guida Docker](https://pptr.dev/guides/docker) richiede di valutare dipendenze, sandbox e gestione processi. Non basta aggiungere il pacchetto al Dockerfile Alpine attuale. Proposta: renderer isolato, versioni browser/libreria fissate e smoke runtime in CI; packaging finale da scegliere nello spike, senza disabilitare automaticamente la sandbox né aggiungere privilegi al container API.

Il renderer deve ricevere contenuto già autorizzato, non un URL arbitrario fornito dal client o una sessione Admin per visitare la SPA. Escapare il titolo, sanitizzare il corpo e disabilitare gli script del documento; risolvere solo immagini registrate attraverso i driver storage esistenti, senza fetch arbitrari verso rete interna o filesystem. Imporre limiti a durata, dimensioni e concorrenza; chiudere pagina/context e file temporanei anche su errore. Questi vincoli derivano dall'uso di HTML e asset utente e vanno verificati nello spike.

**Accettazione R01:** autorizzazioni per tutti i ruoli e antenati; nessun leak di titoli su errori; titolo con accenti/Unicode; testo, tabelle, codice e immagini locali/S3; pagina lunga; formato JSON non supportato rifiutato senza perdere il contenuto; asset mancante segnalato senza un PDF incompleto silenzioso; script/link/URL asset ostili non eseguiti o scaricati; timeout concorrenti e pulizia; download UI con sessione JWT; smoke reale che produca un PDF valido nel runtime Docker. Export aggregati e asincrono da pianificare solo dopo esigenze misurate.

## 4. Backlog delle differenze funzionali

Le priorità sono proposte. “Alta” indica perdita di una capacità importante o rischio nel trasferimento dati; non autorizza scritture sull'app né rende tutti gli interventi prerequisiti del collaudo browser corrente.

### R02 — Cestino e ripristino pagine · alta

Evidenza V1: [SettingController](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Http/Controllers/Dashboard/SettingController.php) e [vista cestino](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/resources/views/settings/recycle-bin.blade.php). V2: `deletedAt` e filtri antenati esistono, ma nessuna API restore delle risorse eliminate; il restore revisioni non ripristina una pagina cancellata. `includeDeleted` riguarda liste Subject/Project, non un cestino Page.

Proposta: pagina Admin con elenco paginato e ripristino tramite POST, preservando contenuto/revisioni/tag/commenti e registrando l'attività atomicamente. Rifiutare restore se antenati eliminati, salvo un distinto flusso esplicito di ripristino antenati. Nessun riuso automatico di slug né modifica della privacy. Separare il recupero dalla cancellazione definitiva/svuotamento: queste ultime richiedono anteprima, conferma e scelta di retention; non cancellare file condivisi.

Accettazione: soft delete → lista → restore; accessi dopo restore, antenati eliminati, concorrenza e cache; solo Admin; dati dipendenti preservati. Per eventuale purge verificare separatamente cascata e riferimenti immagini. Non promettere cestino Subject/Project/Section come feature V1 già completa: i modelli V1 Subject/Section non usano `SoftDeletes`, pur avendo la colonna.

### R03 — Tag sui Subject · alta prima dell'import

Evidenza V1: [SubjectController](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Http/Controllers/Dashboard/SubjectController.php) e [test Subject](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/tests/Feature/SubjectTest.php). V2: `Tag` permette solo Page/Project/Section.

Proposta: aggiungere FK/indice/relazione `subjectId`, migrazione non distruttiva, target nei tipi/schemi shared, policy di lettura/scrittura gerarchiche e UI Subject riusando i controlli esistenti. Estendere guardie, query extension e importatore: non basta aggiungere una colonna. Mantenere esattamente un target per associazione.

Accettazione: CRUD associazione Subject per ruoli autorizzati; Subject privato/eliminato escluso da suggerimenti/conteggi; contratti esistenti compatibili; migrazione da zero e su schema corrente; import senza tag persi.

### R04 — Catalogo tag, risorse collegate e rinomina · media

Evidenza V1: [TagController](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Http/Controllers/Dashboard/TagController.php), `tags/index` e `tags/show`. V2: suggerimenti al massimo 20 e associazioni per risorsa; nessuna rotta SPA catalogo. La V1 modifica il nome dell'associazione, non dimostra una rinomina globale atomica della tassonomia.

Proposta: elenco nomi normalizzati con conteggi delle sole risorse accessibili, risultati paginati per nome e link dalle etichette; endpoint dedicati senza cambiare la risposta autocomplete già consumata. Aggiungere rinomina della singola associazione o mantenere rimozione+aggiunta con risultato equivalente, esplicitandolo. Dipende da R03 per includere Subject.

Accettazione: stesso nome su più tipi, privacy/soft delete, nomi accentati/escapati, duplicati e case, conteggi senza leak e pagine oltre il primo limite. Non replicare i join V1 basati solo su ID senza tipo.

### R05 — Disabilitare i commenti globalmente · media, decisione richiesta

V1: [displayComments](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Http/Controllers/GigawikiController.php) legge `disable-comments`; le viste nascondono i thread, ma i controller di scrittura non verificano il setting. V2 non ha questa chiave.

Proposta da confermare: setting Admin `COMMENTS_ENABLED` con default true, letto da UI ed API, senza eliminare dati. Definire se la disattivazione nasconde anche letture o blocca solo nuovi contributi; per equivalenza del comportamento visivo V1 nascondere i thread e, come miglioramento esplicito, bloccare create/reply/update. Decidere separatamente la moderazione Admin di commenti già presenti. Testare cache, tutti e tre i target e richieste HTTP dirette.

### R06 — Navigazione precedente/successiva e albero pagine · media

V1: [Page model](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Models/Page.php) e reader. V2 non espone vicini e si ferma a Section nella sidebar.

Proposta: vicini nell'intero Project, usando ordine deterministico compatibile con `Section.position`/`Page.position` V2 e spareggio stabile, non gli ID numerici V1. Se si mantiene l'ordine legacy per import, tradurlo in posizioni esplicite. Aggiungere links reader e caricamento paginato delle pagine espandendo Section, senza introdurre una nuova pagina Section.

Accettazione: prima/ultima pagina, passaggio tra sezioni, molte pagine, filtri prima del calcolo dei vicini, URL diretti e account con accessi diversi. Nessun titolo di bozza/risorsa privata suggerito al Guest.

### R07 — Tutti i preferiti · media

V1: [FavoriteController](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Http/Controllers/Dashboard/FavoriteController.php) e pagina personale. V2 ha API paginata; il widget Dashboard usa `limit: 6`, senza elenco completo.

Proposta: rotta `/favorites`, paginazione e rimozione dalla lista, link “View all” nel widget o menu personale. Non ripristinare automaticamente le vecchie voci fittizie della sidebar rimosse su richiesta. Usare tutti i target già supportati V2 e invalidazioni/cache personali esistenti.

Accettazione: almeno sette preferiti, Page/Project/Section, rimozione/retry, preferiti non più accessibili nascosti, passaggio tra account senza dati residui.

### R08 — HTML legacy e descrizioni formattate · alta per migrazione, media per nuovi comandi

V1: [layout Summernote](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/resources/views/layouts/app.blade.php), [textarea descrizioni](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/resources/views/components/textarea.blade.php) e rendering HTML nei dettagli. V2: [ResourceFields](../apps/web/src/components/shared/ResourceFields.tsx) e descrizioni mostrate come testo; [wikiExtensions](../apps/web/src/lib/wiki-extensions.ts) non configura colori/allineamento, [parser](../apps/web/src/lib/page-content.ts) riconosce HTML solo con alcuni tag iniziali.

Rischi verificabili dal codice, da quantificare con fixture: HTML V1 può includere wrapper `html/body` prodotti da `DOMDocument`, colori/background, allineamenti, immagini e stili non rappresentati dallo schema Tiptap. La validazione dei nodi JSON non certifica la conservazione degli attributi HTML: un ciclo apri/salva va confrontato semanticamente, non soltanto provato senza errori. HTML che inizia con wrapper/doctypes/tag esclusi può essere trattato come testo letterale.

Proposta: inventario delle strutture effettive, normalizzazione esplicita e report delle conversioni; descrizioni rich text sanitizzate riusando il renderer, con estratto testuale per card; supportare attributi legacy utili oppure segnalarne la perdita prima di import/edit. Sorgente HTML e fullscreen sono opzioni UI da confermare; non aggiungere HTML arbitrario o embed solo perché una libreria legacy li supporta.

Accettazione: fixture Summernote con UTF-8, wrapper, colori, allineamento, link, tabelle e immagini; lettura → modifica senza interventi → salvataggio conserva le strutture approvate. Nessuno script eseguito; originali sempre conservati nell'archivio di migrazione; descrizioni HTML non visualizzate come codice e non eseguite senza sanitizzazione.

### R09 — Eliminazione revisioni · bassa, decisione richiesta

V1: [RevisionController::delete](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Http/Controllers/Dashboard/RevisionController.php) e pulsante nella lista. V2 non espone DELETE revisioni.

Valutare esigenza di retention e audit prima di aggiungere UI/API Admin con conferma. Preservare contenuto corrente e numerazione stabile senza rinumerare revisioni esistenti; definire trattamento dello snapshot corrente e degli asset referenziati. Guest restano esclusi. Nessuna pulizia automatica come parte dell'import.

### R10 — Eventi di autenticazione · media per audit

V1 registra `login` con target nullo; V2 ha solo eventi su contenuti e richiede `resourceType`. Proposta: eventi auth separati o estensione esplicita del modello/feed con LOGIN; non fingere un target Page e non registrare JWT/password. Definire visibilità personale/Admin e retention. Migrare attività legacy senza target conservandone il significato. Testare login riuscito/fallito e assenza di eventi per ogni refresh, salvo requisito distinto.

### R11 — Visite Subject e più visitati · bassa; dati da preservare nell'import

V1: [ViewService](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Services/ViewService.php). V2: [View model](../apps/api/prisma/schema.prisma) privo di Subject, elenco `/views` ordinato per `lastSeenAt`.

Valutare `View.subjectId`, unicità e policy correlate, registrazione nel dettaglio Subject e un filtro esplicito “più visitati” anziché sostituire i recenti. Il servizio V1 cerca una riga per risorsa senza filtrare l'utente e poi sovrascrive `user_id`: non ricostruire una cronologia personale inesistente. Importare le righe disponibili con avvertenza, o archiviarle secondo scelta esplicita. Testare isolamento account, aggregazione e assenza di duplicati.

### R12 — Elenco globale progetti · bassa/media

V1: [ProjectController::index](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Http/Controllers/Dashboard/ProjectController.php) elenca i propri progetti. V2 ha dettaglio e liste per Subject, non indice globale.

Se utile, nuova vista `/projects` con API paginata e filtri “miei/accessibili”, sempre con policy gerarchica. Non confondere la vista V1 dei propri progetti con un inventario globale di ogni proprietario. Testare più Subject, paginazione e privacy.

### R13 — Contributi profilo e ultime modifiche · bassa

V1: `UserController::show` mostra conteggi Subject/Project/pagine create/aggiornate e Dashboard espone tre pagine aggiornate dall'utente. V2 ha profilo modificabile, statistiche Admin, feed e recenti; non widget equivalenti di contributi personali.

Estensione opzionale con query aggregate autorizzate e lista personale paginata. Non copiare il difetto V1 che calcola i conteggi con `Auth::id()` anche quando visualizza il profilo di un altro account. Nessun conteggio inventato o risorsa privata rivelata.

### R14 — Provisioning account senza email · decisione di prodotto

V1: [UserController::store](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Http/Controllers/Dashboard/UserController.php) e `SettingController::updateUser` permettono password amministrativa. V2 espone invito e reset personale, non un account Admin creato con password scelta dall'operatore.

Non estendere automaticamente `PATCH /users/:id` aggirando password corrente/verifica email. Se esiste un uso offline concreto, progettare un distinto flusso Admin con password temporanea/obbligo di cambio, audit e semantica di verifica esplicita. In assenza di richiesta mantenere inviti/reset V2 e annotare la differenza.

### R15 — Manutenzione immagini · bassa, non copiare il comportamento V1

La [vista manutenzione](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/resources/views/settings/maintenance.blade.php) descrive una scansione di pagine/revisioni; **`cleanupImages` non la esegue**: cancella immagini del corrente utente se il path esiste, mentre la variante forzata tenta cancellazioni filesystem. L'assenza di questo comando nella V2 non giustifica replicarlo.

Eventuale sostituto: audit dry-run di riferimenti da cover/avatar/logo, pagine, descrizioni e revisioni, distinto per driver locale/S3, report dei soli candidati orfani e quarantena/backup prima di una cancellazione esplicita. Nessuna modifica alla scelta concordata di conservare asset condivisi. Testare riferimenti solo in revisioni, URL legacy, immagini condivise e mancanze DB/file.

## 5. Migrazione dati/password: requisiti emersi dal codice V1

**Priorità alta solo se la V2 deve sostituire un'installazione V1 con dati reali.** Il checkout non contiene un dump applicativo o un archivio degli upload utilizzabile per certificare la conversione. MySQL è il default della configurazione V1; il motore reale e lo schema live vanno rilevati da un export di sola lettura, senza dedurli dal default.

### M01 — Inventario e importatore ripetibile

Primo incremento proposto: comando CLI offline con modalità dry-run, manifest di input, mappa persistente ID legacy→ID V2 e report di conteggi/anomalie. Scritture iniziali soltanto in PostgreSQL temporaneo e storage isolato; nessun seed o inserimento sulle tabelle dell'app corrente. Un re-run non deve duplicare dati. L'unione con dati V2 esistenti richiede una decisione esplicita, non un upsert per nome/email.

| Dato V1 | Differenza V2 e trattamento richiesto |
| --- | --- |
| ID numerici, FK snake_case | ID CUID/stringa e FK esplicite; mantenere mapping per entità e validare riferimenti prima del commit |
| `role_user` / `roles` | Mappare admin/editor/guest per significato; segnalare utenti senza ruolo o ruoli multipli, nessuna promozione automatica |
| `visibility` tinyint, `restricted`, proprietari | `1` è usato come pubblico nelle query V1; validare tutti i valori reali prima della conversione e mappare 0/1 in PRIVATE/PUBLIC. Conservare proprietari ma applicare gli antenati V2; report preventivo dei cambi di accesso |
| Bozze | V1 non ha `isDraft`; proposta: importare come pubblicato solo dopo conferma dello stato reale, senza rendere PUBLIC ciò che era PRIVATE |
| Slug non unici nello schema V1 | Unicità V2: rilevare collisioni, determinare slug e produrre mappa URL legacy→nuovo. Non scegliere silenziosamente una risorsa omonima |
| Titoli/nomi | Limiti V2 anche più corti, per esempio titolo Page 190 e nome Project 100 contro stringhe V1 più ampie; segnalare eccedenze, non troncare |
| `page_id` + `page_type` | FK polimorfiche V2; allowlist e normalizzazione esplicita per valori come `page`, `pages`, `Page`, `subject`, ecc.; validare tipo e ID insieme. Subject tag/visite richiedono R03/R11 o archivio dichiarato |
| Revisioni | V1 `createRevision` assegna 0 e il restore scrive l'ID in `current_revision`; non fidarsi della numerazione. Preservare ID/provenienza, ordinare deterministicamente per dati disponibili, ricostruire la sequenza V2 senza confondere ID e numero, senza modificare il contenuto corrente |
| Commenti | Verificare coppia tipo/ID, autori e `parent_id`, orfani e risposte trasversali. Non importare collisioni derivanti da query V1 che ignorano `page_type` |
| Preferiti/visite | Gestire duplicati contro vincoli unici V2; preservare conteggi senza inventare storia, segnalare visite Subject e aggregazioni inattendibili |
| Attività | Stringhe libere (`login`, `replyed comment`, ecc.) contro enum e target V2: mappare esplicitamente o archiviare; mai scartare silenziosamente record non rappresentabili |
| Settings | `enable-registration` → `ALLOW_SELF_REGISTRATION`; `disable-comments` dipende da R05; `allow-public-access` e `email-confirmation` richiedono D01/D02. Non sovrascrivere la configurazione concordata della V2 durante l'import |
| Soft delete e date | Preservare `deleted_at`, date e timezone verificata; Subject/Section V1 hanno colonna ma model senza trait. Non dedurre presenza/assenza dal solo uso dei model |
| Sessioni e inviti pendenti | Non trasferire sessioni Laravel o token/password-reset/inviti legacy; richiedere nuovo login e nuovi token V2 |

Accettazione: conteggi per entità e stato attivo/eliminato, zero FK orfane introdotte, report completo dei record non importabili, re-run idempotente e prove restore/migrazione su DB temporaneo. Conservare dump e report dettagliati fuori dal repository pubblico.

### M02 — Password bcrypt → Argon2

Evidenze: [hashing V1](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/config/hashing.php) usa bcrypt; seed V1 contiene hash `$2y$`. [Login V2](../apps/api/src/routes/auth/authRoutes.ts) usa soltanto `argon2.verify`: avere `bcrypt` tra le dipendenze non abilita compatibilità.

Non è possibile convertire offline un hash bcrypt in un hash Argon2 equivalente senza password in chiaro. Due strategie da scegliere prima dell'import:

- **Default proposto: reset obbligatorio/invito di riattivazione** per account importati, usando token V2 e caselle verificate, senza password fittizie utilizzabili. Trattare separatamente account senza hash/password e email non verificate.
- **Alternativa: compatibilità temporanea bcrypt**, riconoscimento rigoroso dei prefissi effettivi inclusi `$2y$`, verifica con libreria testata nel runtime Node e rehash Argon2 solo dopo login riuscito. Aggiornare anche il cambio password personale, non solo il login; migrazione concorrente atomica, errori di credenziali uniformi, nessuna modifica ai privilegi o bypass email. Definire quando rimuovere il fallback.

Accettazione: hash reali di prova PHP per i prefissi presenti, password errata, hash malformato, utente non verificato, login simultanei, reset/cambio password/revoca e password lunghe. Il test non deve usare password degli utenti reali.

### M03 — HTML, immagini e vecchi URL

Evidenza V1: [HasUploadFile](https://github.com/gigapin/GiGaWiki/blob/0a1a08d614844233878591887f2c07a5f27da88e/app/Traits/HasUploadFile.php) trasforma immagini base64 in file e URL `/storage/uploads/<utente>/<file>`, tipi `post`/`cover`/`avatar`. V2 usa INLINE/COVER/AVATAR, WebP e driver per asset; gli URL incorporati non vengono riscritti dalle migrazioni.

Proposta: copiare file con checksum e mappa URL, registrare driver/path/type corretti, riscrivere riferimenti in **contenuti correnti, revisioni e descrizioni**, preservare originali e non ricomprimere distruttivamente. Rilevare base64 residui, asset mancanti, URL esterni e immagini presenti solo nello storage. Associare una strategia di compatibilità/redirect per `/admin/pages/:slug` e altri URL usati realmente; non riattivare pagine/API anonime tramite redirect. V2 `/uploads/*` serve soltanto path registrati: copiare la directory non basta.

Accettazione: V1 scollegata, immagini ancora leggibili in reader/editor/revisioni/PDF, URL non accessibili a filesystem arbitrario, nomi e formati conservati o conversioni riportate. Nessun salvataggio che cancelli stili HTML non supportati senza avviso (R08).

## 6. Scelte da preservare e decisioni da confermare

| ID | Differenza | Indicazione |
| --- | --- | --- |
| D01 | V1 API anonime vs V2 login obbligatorio | Conservare il login V2. Le API document V1 non applicano coerentemente privacy e setting, e library verifica valori opposti nei due handler. Se serve una biblioteca pubblica, progettarla come incremento separato con policy completa |
| D02 | Verifica email opzionale e inviti legacy | Conservare token monouso, verifica e revoca V2. Non importare URL che affidano ruolo/utente a parametri modificabili |
| D03 | Permessi differenti | V1 Editor può cancellare pagine; V2 DELETE è Admin, mentre V2 consente più operazioni Subject agli Editor. La parità dei nomi ruolo non implica stessa matrice: mantenere le regole concordate finché il proprietario non chiede di cambiarle |
| D04 | Guest e cronologia | Restano esclusi dalle revisioni in V2 per richiesta esplicita; il codice V1 meno restrittivo non è una ragione per riaprire l'accesso |
| D05 | Lifecycle asset e contenitori | Preservare asset condivisi e soft delete gerarchico V2; non riprodurre pulizie indiscriminate o cancellazioni non filtrate della V1 |
| D06 | Architettura UI | Sezioni inline, drawer revisioni, tema dark/light, comportamento Save draft/Publish e sidebar semplificata restano le scelte V2. Le capacità nuove vanno integrate senza ricostruire l'interfaccia Laravel |

Punti prodotto da decidere quando si apre il relativo intervento: export consentito a ogni lettore autorizzato; necessità del trasferimento dati e strategia password; descrizioni rich text e formati HTML da conservare; semantica commenti disattivati; retention/purge/cancellazione revisioni; reale esigenza di provisioning senza email. La sola creazione di questo documento non cambia alcuna policy.

## 7. Sequenza di lavoro proposta e verifica finale

1. **Prioritizzazione:** scegliere quali differenze sono obbligatorie per sostituire la V1. PDF pagina è una lacuna confermata; import è necessario solo se ci sono dati reali da trasferire. Non dichiarare la V2 equivalente sulla base del solo conteggio 40/40.
2. **Preparazione migrazione, se richiesta:** M01 dry-run e corpus HTML/asset M03; definire M02. Risolvere R03 e le parti R08 necessarie prima di trasferire dati, preservando in archivio record ancora non rappresentabili.
3. **Primi incrementi funzionali:** R01 PDF con spike runtime, R02 recupero pagine, R03/R04 tag. Ordinarli secondo l'uso effettivo, senza aspettare un redesign.
4. **Completamenti navigazione e policy:** R06/R07, R05 se confermato, poi R10/R11. R09 e R12–R15 restano incrementi selettivi, senza introdurre operazioni distruttive soltanto per uguagliare la V1.
5. **Validazione per incremento:** test API/contratti e regressioni mirate, migrazioni da zero e su schema V2 in DB temporaneo; smoke PDF reale nel container quando introdotto; test fixture import per mapping/HTML/password e riconciliazione conteggi. Nessun test di import/purge sul database dell'app.
6. **Collaudo browser:** mantenere [B01–B18 ed E01–E05](V2_MANUAL_TESTS.md), aggiungendo casi per PDF/cestino/cataloghi e import soltanto dopo aver implementato gli incrementi scelti. Le prove già aperte restano necessarie anche con confronto statico completato.

La chiusura di questo audit significa che le differenze sono documentate, non che la parità è raggiunta. Aggiornare lo stato di ogni R/M/D in questo documento quando una decisione o un'implementazione cambia la base analizzata, con commit e prove effettive.
