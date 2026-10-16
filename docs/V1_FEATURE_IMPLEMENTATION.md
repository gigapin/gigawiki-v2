# Incrementi funzionali dopo il confronto V1/V2

16 ottobre 2026. Implementazione del piano concordato dopo [V1_V2_FEATURE_COMPARISON.md](V1_V2_FEATURE_COMPARISON.md), sulla base V2 `47cee08`. Il confronto rimane evidenza dello stato precedente; questa pagina descrive il codice risultante e le operazioni necessarie per usarlo.

## Funzionalità e scelte applicate

| Riferimento | Implementazione |
| --- | --- |
| R01 PDF | Export della pagina salvata per ogni lettore autorizzato, Guest compresi; renderer Puppeteer/Chromium in container separato, sandbox attiva, A4 e download privato. Non esporta commenti o cronologia. |
| R02 Cestino | Elenco paginato e ripristino pagine solo Admin; 409 se antenati eliminati, contenuto/revisioni/metadati preservati e attività atomica. Nessuna eliminazione definitiva o restore implicito degli antenati. |
| R03–R04 Tag | Subject come quarto target, catalogo nomi/conteggi e risorse accessibili, link dalle etichette, rinomina della singola associazione autore/Admin. Il catalogo conta risorse distinte; autocomplete esistente conservato. |
| R05 Commenti | `COMMENTS_ENABLED`, default true. False nasconde thread e restituisce liste vuote; create/reply/update bloccati, DELETE di moderazione consentito solo Admin. Dati conservati. |
| R06 Navigazione | Precedente/successiva entro Project e pagine espandibili sotto Section nella sidebar, con paginazione; ordine Section.position, Section.id, Page.position, Page.id, dopo i filtri di accesso. |
| R07 Preferiti | `/favorites`, elenco completo paginato e rimozione; “View all” dalla Dashboard. Rimangono personali per account. |
| R08 Contenuti | Pacchetto `wiki-content` comune per schema HTML/JSON/testo, stili colore/highlight/allineamento e conversione PDF. Editor fullscreen, descrizioni rich text attivabili nei form e estratti testuali nelle card. Nessuna modalità sorgente HTML. |
| R09 Revisioni | Scelta confermata: conservazione, senza nuovi DELETE o retention automatica. |
| R10 Auth audit | Activity categoria AUTH con LOGIN, ACCOUNT_CREATED e TEMP_PASSWORD_ISSUED; eventi personali dell'attore e audit globale Admin. Nessuna password/token nei dettagli. |
| R11 Visite | Visite personali Subject e selettore Recenti/Più visitati; recenti rimane il default. |
| R12 Progetti | `/projects`, elenco paginato con ricerca e filtro Miei/Accessibili, default Miei, soggetto agli accessi gerarchici. |
| R13 Contributi | Contatori personali e ultime pagine modificate in Dashboard/Profile. “Pages last edited by you” indica l'ultimo editor corrente, non ogni contributo storico. |
| R14 Account | Admin crea con attestazione email esplicita e password temporanea generata dal server, mostrata una volta, valida 24 ore. Challenge da 10 minuti senza sessione wiki, cambio obbligatorio e successivo login ordinario. Riemissione solo per account ancora in attesa. |
| R15 Immagini | Audit Admin asincrono BullMQ, report paginato di riferimenti, asset mancanti/non registrati/candidati, locale/S3; nessuno spostamento o cancellazione. |

Le descrizioni esistenti hanno `descriptionFormat=text`: non vengono reinterpretate o convertite in HTML. Il form può attivare la descrizione formattata; l'API sanitizza l'HTML esplicito. L'editor pagina blocca strutture/stili HTML non supportati anziché salvare una conversione silenziosa. Reader, editor, revisioni e PDF condividono lo schema dei formati supportati. Il vecchio testo letterale rimane testo.

Restano login obbligatorio, privacy gerarchica, Guest senza cronologia, sezioni inline e drawer revisioni; bozze/autosave, Save draft/Publish e conservazione asset condivisi. Import V1, password bcrypt, copie upload e redirect legacy non sono inclusi. La parità totale con la V1 non è certificata.

## API e dati

Tutte le API seguenti sono sotto `/api/v2`. Paginazione `page/limit`, successi diretti ed errori uniformi restano le convenzioni correnti.

| Metodo e percorso | Contratto |
| --- | --- |
| `GET /pages/:slug/export/pdf` | Binario PDF con filename Unicode sicuro e `Cache-Control: private, no-store`; stessi accessi del reader. |
| `GET /admin/trash/pages` | Admin, `{pages,total,page,limit}`. |
| `POST /admin/trash/pages/:id/restore` | Admin, `{id,slug,title}`; 409 con antenati eliminati, 404 se pagina non eliminata. |
| `GET /tags/catalog` | `{tags:[{name,count}],total,page,limit}`, filtro `search`. |
| `GET /tags/catalog/:name` | Associazioni con destinazioni autorizzate, risorse distinte e paginazione. |
| `PATCH /tags/:id` | `{name}`, normalizzato; autore/Admin con accesso alla risorsa. |
| `POST /tags` | Anche `subjectId`, esattamente un target; limite di dieci tag per risorsa conservato. |
| `GET /pages/:slug/navigation` | `{previous,next}`, ciascuno nullo o `{id,title,slug}`. |
| `GET /projects` | `{projects,total,page,limit}`, `scope=mine|accessible`, `search`. |
| `GET /users/me/contributions` | Contatori personali, `pages` recenti e paginazione. |
| `GET /views` | Include `subject`; parametro opzionale `ranking=popular`, default recenti. |
| `POST /users` | Admin, `{name,email,role,attestEmail:true}`; restituisce utente ridotto, password temporanea e scadenza. Nessun invio email automatico. |
| `POST /users/:id/temporary-password` | Admin, riemissione solo se `mustChangePassword=true`; revoca challenge precedenti incrementando authVersion. |
| `POST /auth/complete-initial-password` | Pubblico ma richiede `{passwordChangeToken,newPassword}`; verifica challenge firmata/scaduta/versione/stato DB. Nessuna sessione automatica dopo il cambio. |
| `POST /admin/images/audits` | Admin, 202 `{id}`; job read-only. |
| `GET /admin/images/audits/:id` | Admin, stato e risultato paginato; report conservati al massimo un giorno, ultimi cento completati. |

Il login ordinario conserva `{accessToken}`. Per credenziali temporanee valide restituisce invece `{requiresPasswordChange:true,passwordChangeToken}` senza refresh token. La challenge vive solo in memoria nella UI, non in URL/localStorage; il reload richiede nuovo login. Il middleware rifiuta challenge e account pending sulle API ordinarie. Scadenze temporanee/challenge si applicano anche in development, indipendentemente dalle sessioni ordinarie persistenti.

L'attestazione Admin imposta `emailConfirmed=true`, lasciando `emailVerifiedAt=null`: non rappresenta una verifica della casella. Inviti e reset normali conservano i flussi esistenti. Il reset con token valido completa anche l'obbligo iniziale; non viene aggiunta la possibilità di impostare password amministrative di account già attivi.

La nuova migrazione `20261016000000_v1_feature_parity` aggiunge campi account temporanei, formato descrizioni, tag/visite Subject, indici/FK e valori enum auth. Il cancellatore account preserva e trasferisce anche Subject con tag di altri utenti. Nessun dato V1 viene trasferito.

## Attivazione sull'app

**La migrazione dell'app non è stata eseguita durante l'implementazione.** Verificare destinazione e backup prima di aggiornare un'installazione esistente. Il codice aggiornato richiede l'ottava migrazione; non avviarlo su uno schema con soltanto le sette precedenti. Non eseguire reset o seed.

```sh
./bin/pnpm --filter wiki-content build
./bin/pnpm --filter shared build
./bin/pnpm --filter gigawiki-v2-api exec prisma migrate deploy
./bin/pnpm --filter gigawiki-v2-api exec prisma generate
```

Rigenerare Prisma e riavviare l'API dopo l'aggiornamento; gli account esistenti non richiedono cambio password. Il nuovo gate iniziale si applica soltanto agli account creati dal nuovo flusso Admin.

### Renderer PDF

Configurare nel `.env` locale un nuovo segreto casuale di almeno 32 caratteri in `PDF_RENDERER_SECRET`, condiviso soltanto da API e renderer. `PDF_RENDERER_URL` in sviluppo è `http://127.0.0.1:3002`; l'override API Docker usa `http://pdf:3002`.

```sh
docker compose -f docker-compose.yml --profile pdf up -d --build
./bin/pnpm dev
```

Il file Compose esplicito avvia l'infrastruttura e il renderer senza occupare la porta API locale. Il renderer espone solo loopback per sviluppo e usa una rete interna dedicata; l'API Docker vi è collegata insieme alla propria rete normale. Non pubblicare la porta del renderer su Internet. Il container browser usa `init` e la capacità `SYS_ADMIN` richiesta dall'immagine Puppeteer ufficiale per la sandbox; l'API non riceve nuovi privilegi né Chromium.

Senza segreto/configurazione o renderer disponibile, export restituisce 503 senza influire sugli altri flussi. Consegna solo la pagina salvata e non avvia un salvataggio dell'editor. Il renderer non dispone di credenziali DB/S3: l'API risolve soltanto asset registrati e li incorpora, senza fetch arbitrari. Script documento disabilitati e richieste di rete bloccate; massimo due elaborazioni, timeout 30 secondi, immagini singole massimo 10 MB e totale asset massimo 20 MB. Asset mancanti o non registrati producono un errore esplicito.

L'API avvia anche il worker `image-audit`, concorrenza uno. I report richiedono Redis e credenziali del driver configurato; errori di storage compaiono come `unavailable`/warning, non come prova che un file sia assente. La scansione filesystem/S3 riguarda il prefisso gestito `uploads/`, mentre le verifiche dei record usano i loro path registrati. Riferimenti in pagine/revisioni/contenitori eliminati vengono conservati nell'audit. Un candidato può essere usato anche da consumer esterni: non viene mai cancellato.

## Verifica e collaudo

Le prove automatiche includono il runtime Docker PDF, test API/unitari e UI, le suite PostgreSQL precedenti e una nuova suite di flussi HTTP con database reale. Quest'ultima richiede esclusivamente `gigawiki_test` temporaneo e rimuove le proprie fixture nell'ordine delle FK; le altre suite mantengono i rispettivi meccanismi di isolamento.

```sh
# DATABASE_URL deve essere già impostata al PostgreSQL temporaneo dedicato.
./bin/pnpm --filter gigawiki-v2-api test:features:db
```

CI compila lo schema wiki durante il setup, esegue le quattro suite DB e aggiunge `test-pdf` con smoke Chromium reale. Il job `build`, già richiesto dalla protezione main, attende anche `test-pdf`; nessuna modifica alle protezioni. In CI/installazioni che non eseguono Chromium sull'host usare `PUPPETEER_SKIP_DOWNLOAD=true`; il browser del renderer è già incluso nell'immagine fissata.

Per le prove manuali mantenere B01–B18/E01–E05 e aggiungere i casi B19–B26 della [guida](V2_MANUAL_TESTS.md). Browser, resa visiva del PDF, consegna email e attestazioni sono verifiche dell'utente, non sostituite da jsdom o dal solo PDF smoke.

Verifica locale conclusa: 350 test API, 225 frontend, 3 renderer, 30 PostgreSQL, typecheck/lint/build superati. Smoke Docker reale: login iniziale Guest, cambio password, upload, export PDF con immagine e audit BullMQ superati su dipendenze temporanee. Pubblicazione e CI sono registrate nel session log/checklist. La presenza del codice non certifica collaudi manuali non eseguiti.
