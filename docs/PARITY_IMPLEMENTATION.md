# Interventi di conformità implementati — 13 ottobre 2026

Implementazione del piano successivo a [V2_PARITY_AUDIT.md](V2_PARITY_AUDIT.md). Il rapporto originale rimane una fotografia precedente agli interventi. La parità con la V1 non è certificabile finché non è disponibile il codice/inventario originale; import dati/password e PDF restano esclusi, come concordato.

## Aggiornamento operativo — 14 ottobre 2026

Interventi inclusi nel commit utente `af7e030`, CI verde ([run 38559849609](https://github.com/gigapin/gigawiki-v2/actions/runs/38559849609)). Verificato in sola lettura: il database dell’app ha tutte le sette migrazioni già applicate. Nessuna migrazione dell’app necessaria in questa sessione. Dopo conferma dell’utente, policy attivata nel `.env` locale e sessioni dei quattro account revocate. Backup aggiornato e ripristinato per confronto: contenuti, proprietà e visibilità invariati. Vecchio JWT respinto (401), versione corrente accettata (200), zero refresh token; bozze escluse dalle liste Guest. Per manutenzione, verifiche aggiornate e collaudi aperti vedere [V2_RELEASE_CHECKLIST.md](V2_RELEASE_CHECKLIST.md).

## Interventi

| Audit | Risultato |
|---|---|
| F01–F02 | Attività CRUD di Subject/Project/Section/Page, riordino, commenti/risposte e restore registrate nella stessa transazione delle modifiche; Dashboard usa il feed personale, accessibile anche a Editor/Guest. |
| F03/F05 | Policy comune per liste, dettagli, ricerca SQL, revisioni, commenti, tag, preferiti, visite e relazioni annidate. Un contenitore eliminato nasconde i discendenti senza eliminarli. `includeDeleted=true` riservato agli Admin nelle liste Subject/Project. |
| F04 | Schemi shared usati nella validazione effettiva; query con `page`/`limit` e massimo 100, booleani `false` corretti. Successi mantengono gli oggetti diretti e le raccolte esistenti. Errori uniformi `{error: string, code, details?}`; frontend compatibile con errori legacy. |
| F06 | Endpoint Admin `/api/v2/dashboard/stats` con utenti, pagine e Subject; eliminati contatori e grafici inventati. |
| F07 | Commenti, tag e preferiti nei progetti e nelle sezioni, con hook tipizzati e invalidazione della cache. |
| F08–F09 | Sidebar Subject → Project → Section, caricamento su espansione; ricerca raggruppata per Project, con navigazione da tastiera. Selector Subject e spostamento progetto con controlli del server e invalidazione di entrambi i Subject. |
| F10–F11 | Logo selezionabile/rimuovibile nelle impostazioni, usato in login/sidebar/email. Driver locale persistente, protezione da traversal/symlink, driver salvato per immagine; gli asset S3 precedenti mantengono il proprio driver. Nessuna cancellazione automatica di asset. |
| F12 | PUT/PATCH/restore condividono snapshot, salvataggio e attività atomici; slug senza collisioni, summary automatici. `expectedRevision` facoltativo per client precedenti, inviato dall’editor; 409 conserva la bozza locale. |
| F13 | Paragraph, H1–H4, strike, inline code e horizontal rule; toggle restricted e selector proprietario Admin. |
| F14 | Refresh limitato a 10 richieste/minuto; durata da `JWT_REFRESH_EXPIRES_IN`. In development rimangono le sessioni persistenti richieste. |

## Policy di accesso

Il wiki richiede il login. PUBLIC è leggibile dagli utenti autenticati; PRIVATE richiede il proprietario o Admin. I vincoli di tutti gli antenati si sommano: possedere una pagina non supera la privacy di Subject/Project/Section. Una Section privata usa il proprietario del Project. Le bozze sono escluse per Guest; restricted consente lettura/scrittura solo a proprietario/Admin, con scrittura contenuti comunque riservata a Editor/Admin. Solo Admin trasferisce la proprietà; proprietario/Admin cambia restricted. Anche Guest proprietario può leggere, ma non modificare contenuti.

Le nuove regole PRIVATE/restricted/bozze mantengono **default false per nuove installazioni**. Sull’app locale sono state attivate dopo audit e conferma il 14 ottobre: `ENFORCE_CONTENT_ACCESS=true`. Il filtro per contenitori eliminati è sempre applicato. Gli Admin mantengono l’audit completo delle attività e la gestione account, compresi dati eliminati. Le immagini restano pubbliche, come concordato.

## Migrazione dell’app

La nuova migrazione è `20261013000000_activity_subject_storage_driver`: aggiunge Activity.subjectId/FK/indice e Image.storageDriver con default `s3`. Le sette migrazioni sono state verificate da zero su PostgreSQL temporaneo. Il 14 ottobre sono risultate **già tutte applicate al database dell’app**; nessuna migrazione dell’app eseguita dall’assistente. I comandi seguenti restano validi per installazioni da aggiornare.

Per installazioni con migrazioni pendenti, dopo backup e verifica della destinazione, dalla radice del repository:

```bash
./bin/pnpm --filter shared build
./bin/pnpm --filter gigawiki-v2-api exec prisma migrate deploy
./bin/pnpm --filter gigawiki-v2-api exec prisma generate
```

Il primo comando è necessario anche quando si avvia direttamente l’API senza Turbo, perché shared fornisce schemi runtime compilati. Turbo e CI lo eseguono come dipendenza di build/typecheck/test/dev.

## Verifica e attivazione dei permessi

Audit in sola lettura, senza attivare policy né cambiare proprietari/contenuti:

```bash
./bin/pnpm --filter gigawiki-v2-api content-access:audit
```

L’audit eseguito sul database dell’app ha contato 2 Subject, 2 Project, 3 Section e 4 Page; 3 pagine sono segnalate: due bozze attive e una pagina già eliminata. Nessun Subject/Project/Section risulta interessato. Il rapporto aggiornato del 14 ottobre è `/tmp/gigawiki-content-access-audit-20261014.txt`, fuori dal repository per non pubblicare metadati dei contenuti.

Dopo aver verificato proprietà e accessi:

1. Preparare un backup verificato, sospendere l’API in una finestra senza utilizzo e impostare `ENFORCE_CONTENT_ACCESS=true` nel suo ambiente.
2. Con API sospesa, invalidare le sessioni; poi avviare il servizio e richiedere un nuovo login, così non rimane una cache di contenuti precedente al cambio di policy:

   ```bash
   ./bin/pnpm --filter gigawiki-v2-api sessions:invalidate
   ```

   Questo comando **scrive nel database**: revoca i refresh token e incrementa authVersion, aggiornando anche il timestamp automatico degli account. Eseguito sull’app il 14 ottobre dopo conferma: quattro account aggiornati e zero refresh token residui.

Per storage locale usare `STORAGE_DRIVER=local`; `LOCAL_STORAGE_PATH` relativo è risolto dalla radice del repository, default `data/uploads`, ignorato da Git. Docker usa `/app/data/uploads` con volume persistente. Le credenziali AWS servono con S3 e per leggere asset S3 conservati quando il default passa a local.

## Verifiche

343 test API ordinari, 20 test PostgreSQL (8 integrazioni precedenti + 3 Settings + 9 nuovi casi di policy/concorrenza) e 218 test frontend superati (verifica 14 ottobre). Typecheck, lint e build API/shared/web superati; immagine Docker compilata e smoke test runtime di shared/Prisma/storage locale superato; restano i warning preesistenti bundle >500 kB, React Compiler/TanStack Table e query concorrenti `pg`. CI del commit af7e030 verde; le modifiche locali del 14 ottobre richiedono un nuovo commit/push e controllo dello stesso SHA.

Le suite PostgreSQL della nuova policy effettuano commit/concorrenza e richiedono **esclusivamente un database temporaneo chiamato `gigawiki_test`**; cancellano solo le proprie fixture. Non eseguirle sul database dell’app, né su un database di test condiviso con altri servizi. Le suite precedenti mantengono il rollback.

```bash
RUN_PARITY_DB_TESTS=1 ./bin/pnpm --filter gigawiki-v2-api exec vitest run src/__tests__/parity.integration.test.ts
```

CI esegue la nuova suite dopo le migrazioni nel servizio PostgreSQL temporaneo. Test browser affidati all’utente: espansione sidebar/selezione Section, Project spostato, commenti/tag/preferiti sui due contenitori, toolbar e proprietà/restricted, 409 con due editor, upload/rimozione logo e riavvio dello storage locale. La verifica S3 dei test unitari usa un client simulato; upload/lettura/cancellazione MinIO reali e autenticazione SMTP sono stati verificati il 14 ottobre. Restano consegna email completa e collaudo UI degli upload; nessuna email inviata.
