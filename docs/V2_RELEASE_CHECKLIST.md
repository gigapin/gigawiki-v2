# Chiusura operativa V2

Aggiornamento: 16 ottobre 2026. F01–F14 implementati; parità V1, import dati/password,
PDF e revisione grafica restano fuori da questo ciclo.

**Stato: chiusura ancora aperta.** Collaudo manuale browser e consegna email non ancora eseguiti in questo ciclo. Seguire [V2_MANUAL_TESTS.md](V2_MANUAL_TESTS.md) e registrare ogni caso, inclusi i sottocasi bloccati. Traguardo concordato: versione verificata su `dev`, senza merge in `main` o deployment.

## Verifiche del 16 ottobre 2026

- [x] Base applicativa `f6be5cac413355159bc02750438b63e265890416` su `dev`, identica al branch remoto verificato in lettura. Include le modifiche del 14 ottobre precedentemente descritte come locali.
- [x] CI della base: [run 38570737573](https://github.com/gigapin/gigawiki-v2/actions/runs/38570737573), `quality`, `test-api`, `test-web`, `build` tutti verdi sul medesimo SHA.
- [x] `./bin/pnpm turbo typecheck lint test build`: 11 task riusciti (6 da cache), 343 test API ordinari e 218 frontend superati; 20 test DB esclusi dal comando standard, eseguiti separatamente sotto.
- [x] Tutte le sette migrazioni applicate da zero su PostgreSQL 16 temporaneo `gigawiki_test`; suite API 8/8, Settings 3/3 e parità/concorrenza 9/9 superate. Nessuna scrittura sul database dell'app. Container temporaneo rimosso al termine, senza volumi persistenti.
- [x] Guide Settings e Contributing allineate a database temporaneo, logo e servizi attuali; procedura manuale con casi B01–B18 ed E01–E05 pronta.
- [ ] Eseguire e registrare tutti i casi browser/email sul candidato finale; correggere e ricollaudare gli eventuali difetti.
- [x] Guida e aggiornamenti pubblicati su `dev` nel commit `b6721e9f249432fd0fb00fe8003c04e387b5b3d6`; [run 38873305042](https://github.com/gigapin/gigawiki-v2/actions/runs/38873305042) completata con `quality`, `test-api`, `test-web`, `build` tutti verdi sullo stesso SHA. Questo risultato non chiude i collaudi manuali e non certifica commit successivi.

Log locali temporanei: `/tmp/gigawiki-v2-validation-20261016.log` e `/tmp/gigawiki-v2-db-validation-20261016.log`; i risultati sintetici sono conservati qui. Warning non bloccanti: console API, React Compiler/TanStack Table, Browserslist, chunk oltre 500 kB, query concorrenti `pg` e output coverage assente per i task Turbo test.

## Verifiche precedenti — 14 ottobre 2026

- [x] Base: `dev`, commit `af7e030`; interventi post-audit già committati dall'utente.
- [x] Database app: sette migrazioni già applicate, compresa `20261013000000_activity_subject_storage_driver`; nessuna nuova migrazione necessaria.
- [x] Audit accessi in sola lettura: 2 Subject, 2 Project, 3 Section, 4 Page; due bozze attive e una pagina eliminata segnalate. Proprietà e contenuti invariati.
- [x] 343 test API ordinari, 20 PostgreSQL su database temporaneo, 218 frontend; lint, typecheck e build superati.
- [x] Quattro nuovi test di apertura diretta delle rotte reader/editor e navigazione reader → editor.
- [x] Build Docker e smoke runtime health/shared/Prisma su database temporaneo.
- [x] Storage locale: lettura dopo nuovo processo e persistenza dopo riavvio del container con volume.
- [x] MinIO/S3 configurato: upload, lettura e cancellazione di un solo asset temporaneo.
- [x] SMTP: connessione e autenticazione riuscite; nessun messaggio inviato.
- [x] CI di `af7e030` verde: [run 38559849609](https://github.com/gigapin/gigawiki-v2/actions/runs/38559849609). La verifica della base più recente è riportata sopra.

## Attivazione permessi — completata il 14 ottobre 2026

`ENFORCE_CONTENT_ACCESS=true` nell’ambiente locale dell’app, dopo conferma esplicita del proprietario. Il default per nuove installazioni rimane false. Rapporto dettagliato fuori dal
repository: `/tmp/gigawiki-content-access-audit-20261014.txt`. Backup e rapporto sono temporanei: conservarli altrove prima di riavviare la macchina. Se il rapporto non è disponibile,
rieseguire `./bin/pnpm --filter gigawiki-v2-api content-access:audit`.

- [x] Il proprietario ha confermato proprietà/visibilità attuali e bozze nascoste ai Guest.
- [x] Backup aggiornato: `/tmp/gigawiki-v2-policy-activation.bXEL9x/database.dump`; verificati elenco e ripristino integrale in PostgreSQL temporaneo. Confronto prima/dopo passato; temporaneo rimosso.
- [x] API non in esecuzione al cambio; impostato `ENFORCE_CONTENT_ACCESS=true` nel `.env` locale.
- [x] Eseguito `sessions:invalidate`: quattro account aggiornati, zero refresh token residui. API/web avviati con `./bin/pnpm dev`.
- [x] Token valido prima della revoca ora respinto con 401; JWT della versione corrente accettato con 200. Filtri Guest e liste API verificati senza bozze. Verifica HTTP sul server avviato: health/web 200, vecchia sessione e contenuti senza login 401.
- [x] Contenuti, proprietà e visibilità identici al backup. Oltre a refresh token e authVersion cambia soltanto il timestamp automatico di modifica degli account.
- [ ] Completare nuovo login nel browser, confermare cache vuota e collaudare la matrice sotto.

Non cambiare automaticamente proprietà o visibilità. In caso di difetti mantenere
l'app sospesa e correggere; riaprire con policy disattivata richiede una decisione
esplicita sugli accessi. La revoca sessioni resta valida anche dopo rollback della
configurazione. Non occorre annullare la migrazione già applicata.

## Collaudo browser — a cura dell'utente

Usare Admin, Editor proprietario, altro Editor e Guest. Creare contenuti di prova
riconoscibili e rimuovere solo quelli al termine. Registrare data, ruolo, esito e
passi per riprodurre eventuali difetti. Passi dettagliati e registro esiti in [V2_MANUAL_TESTS.md](V2_MANUAL_TESTS.md); non segnare come PASS casi solo documentati o verificati in jsdom.

| Caso | Risultato atteso | Esito |
| --- | --- | --- |
| Login, reload e logout | Sessione ripristinata al reload; logout revoca l'accesso. | Da verificare |
| PUBLIC/PRIVATE e antenati | PUBLIC per autenticati; PRIVATE proprietario/Admin; proprietà del discendente non supera privacy degli antenati. | API verificata; browser aperto |
| Bozze e restricted | Guest senza bozze; restricted proprietario/Admin; scrittura contenuti solo Editor/Admin autorizzati. | API verificata; browser aperto |
| Ricerca, sidebar, preferiti, visite, commenti | Stessi limiti delle letture dirette, senza titoli o risultati non accessibili. | API verificata; browser aperto |
| Antenati eliminati e revisioni | Discendenti nascosti; Guest senza cronologia; revisioni/restore solo Editor/Admin autorizzati. | Da verificare |
| Sidebar e spostamento Project | Espansione fino a Section e ripristino da URL; spostamento aggiorna entrambi i Subject. | Da verificare |
| Commenti/tag/preferiti Project e Section | Controlli presenti, preferiti personali, rollback UI in caso di errore. | Da verificare |
| Editor | Toolbar completa; Save draft mantiene editor e stessa pagina; Publish apre reader; autosave conserva lo stato. | Da verificare |
| Due editor | Secondo salvataggio con revisione superata riceve 409 e conserva testo locale. | Da verificare |
| Logo/avatar/cover/immagini | Upload e lettura corretti, rimozione logo con fallback, asset persistenti dopo riavvio e S3 precedenti leggibili. | Da verificare nella UI |
| Aspetto | Light/dark leggibili nelle schermate toccate. | Da verificare |

## Email e consegna — ancora aperte

- [ ] Con casella di prova del proprietario: invito → consegna → accettazione → sessione; verifica account e reset password completi.
- [ ] Verificare URL, nome/logo, token usati/scaduti, reinvio ed errori di accodamento/invio senza perdita del form.
- [ ] Dopo commit e push: `quality`, `test-api`, `test-web`, `build` verdi sullo SHA pubblicato.
- [ ] Registrare gli esiti nel session log; chiusura V2 dopo completamento dei collaudi residui.

L'autenticazione SMTP non dimostra consegna o correttezza dei link. Lo smoke S3
riguarda MinIO configurato, non AWS esterno. I test rotte usano jsdom e schermate
isolate; non sostituiscono il browser con l'editor completo.

## Manutenzione e limiti

Configurazione centralizzata in `apps/api/src/config/env.ts`; re-export inutilizzato
eliminato. Servizio e dichiarazione volume Meilisearch rimossi dal Compose senza
eliminare i volumi dati esistenti. Impostazioni locali Claude tolte dall'indice Git,
conservate sul disco e già escluse da ignore.

Reader/editor caricati su richiesta: JavaScript iniziale circa 789 kB minificati
complessivi contro 1.465 kB prima (circa 236 contro 443 kB gzip), inclusi i chunk
precaricati dall'HTML. Il chunk wiki da circa 632 kB arriva aprendo una pagina.
Non è una misura di latenza nel browser. Restano warning bundle oltre 500 kB,
console API, React Compiler/TanStack Table, Browserslist e `pg`.
