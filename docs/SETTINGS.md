# Settings — task 34

Le pagine sono disponibili sotto `/settings`: Profile, Password e Appearance per tutti gli account autenticati; Users, Invites e App Settings solo per Admin. I controlli API verificano il ruolo corrente dal database.

## Migrazione da applicare prima di usare il codice aggiornato

La migrazione è in `apps/api/prisma/migrations/20261011000000_user_auth_version/migration.sql`:

```sql
ALTER TABLE "users" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
```

L'applicazione è lasciata all'utente. Non eseguire reset del database. Dopo la migrazione, Prisma Client deve essere rigenerato e l'API riavviata (il client è già stato generato nella workspace durante l'implementazione).

Per applicare la migrazione con Prisma, dalla root:

```sh
./bin/pnpm --filter gigawiki-v2-api exec prisma migrate deploy
./bin/pnpm --filter gigawiki-v2-api exec prisma generate
```

Se invece si esegue il SQL manualmente, registrare successivamente la migrazione come applicata, senza rieseguire il SQL:

```sh
./bin/pnpm --filter gigawiki-v2-api exec prisma migrate resolve --applied 20261011000000_user_auth_version
```

I JWT precedenti non hanno `authVersion`: vengono sostituiti tramite refresh o richiedono login. Il cambio/reset password incrementa la versione e revoca tutti i refresh token, anche in development. Il cambio password richiede quella attuale e termina la sessione corrente.

## Contratti API

- `PATCH /api/v2/users/me`: profilo oppure `{ currentPassword, newPassword }`, senza combinare password e altri campi. Il vecchio campo `password` è rifiutato.
- `GET /api/v2/users`: `page`, `limit` (1–100), `search`, `role`; risposta `{ users, total, page, limit }`.
- `GET /api/v2/users/:id/deletion-preview`: account, conteggi e `fingerprint`. `DELETE /api/v2/users/:id` richiede `{ fingerprint }`; 409 quando il contenuto è cambiato. Nessuna cancellazione del proprio account o retrocessione dell'ultimo Admin.
- `GET /api/v2/users/invites`: elenco paginato non accettati, inclusi scaduti, senza token. `POST /api/v2/users/invites/:id/resend` rinnova token/scadenza (sette giorni); `DELETE /api/v2/users/invites/:id` cancella solo inviti non accettati. L'accettazione verifica anche il token corrente per impedire l'uso del vecchio link durante un reinvio.
- `PUT /api/v2/settings/:key`: `{ value: string }`; validazione di `ALLOW_SELF_REGISTRATION`, `DEFAULT_USER_ROLE` (Guest/Editor) e `SITE_NAME` (1–100 caratteri). Il ruolo riguarda solo nuove autoregistrazioni; il nome si applica a branding UI, titolo browser, template, oggetti e nome mittente email.

## Eliminazione utenti

L'anteprima e la cancellazione usano transazioni Serializable con retry dei conflitti. Le pagine **create** dall'utente vengono eliminate definitivamente, anche se soft-deleted, insieme ai loro dati dipendenti. I contributi personali (commenti, revisioni, tag, preferiti, visite e attività) vengono rimossi.

Le pagine create da altri conservano contenuto e autore; proprietà e ultimo editor riferiti all'account eliminato passano all'Admin che esegue l'azione. Le revisioni dell'account eliminato vengono rimosse anche da queste pagine, senza riscrivere il contenuto corrente o rinumerare le revisioni rimanenti. Le risposte di altri sotto commenti dell'utente diventano commenti radice.

Subject/Project con pagine o contenitori di altri, oppure commenti/tag altrui nel Project/Section, vengono conservati e trasferiti quando necessario; quelli senza contenuti altrui vengono eliminati. Asset immagine e inviti inviati vengono conservati e i riferimenti trasferiti. Non vengono cancellati file dallo storage, poiché potrebbero essere condivisi o incorporati nell'HTML. Un account eliminato può ricevere un nuovo invito, con token nuovo.

## Verifiche PostgreSQL opzionali

Dopo aver applicato la migrazione, usare il database configurato dell'app come richiesto dall'utente:

```sh
./bin/pnpm --filter gigawiki-v2-api test:settings:db
```

La suite crea solo account/risorse temporanei con identificatori casuali e annulla **tutte** le scritture al termine di ciascun test, anche in caso di errore. Non esegue migrazioni, truncate o pulizia delle tabelle esistenti. Le prove su DB sono disattivate nella suite standard. Il 13 ottobre 2026, dopo la migrazione applicata dall’utente, tutti e tre i test sono superati sul database dell’app. La suite emette un warning non bloccante di `pg` sulle query concorrenti sullo stesso client.

Appearance usa il tema light/dark locale già esistente, condiviso con la Topbar. Nessuna modifica del profilo per il tema; gestione logo esclusa.
