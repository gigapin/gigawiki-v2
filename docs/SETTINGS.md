# Settings — task 34

Le pagine sono disponibili sotto `/settings`: Profile, Password e Appearance per tutti gli account autenticati; Users, Invites e App Settings solo per Admin. I controlli API verificano il ruolo corrente dal database.

## Stato delle migrazioni

La migrazione è in `apps/api/prisma/migrations/20261011000000_user_auth_version/migration.sql`:

```sql
ALTER TABLE "users" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
```

La verifica del 14 ottobre 2026 ha confermato tutte le sette migrazioni già applicate al database dell'app, inclusa questa. Non ripetere SQL manuali, reset, seed o revoche massive per il collaudo. Stato operativo in [V2_RELEASE_CHECKLIST.md](V2_RELEASE_CHECKLIST.md).

Solo per installazioni con migrazioni pendenti, dopo backup e verifica della destinazione, dalla root:

```sh
./bin/pnpm --filter gigawiki-v2-api exec prisma migrate deploy
./bin/pnpm --filter gigawiki-v2-api exec prisma generate
```

I JWT precedenti non hanno `authVersion`: vengono sostituiti tramite refresh o richiedono login. Il cambio/reset password incrementa la versione e revoca tutti i refresh token, anche in development. Il cambio password richiede quella attuale e termina la sessione corrente.

## Contratti API

- `PATCH /api/v2/users/me`: profilo oppure `{ currentPassword, newPassword }`, senza combinare password e altri campi. Il vecchio campo `password` è rifiutato.
- `GET /api/v2/users`: `page`, `limit` (1–100), `search`, `role`; risposta `{ users, total, page, limit }`.
- `GET /api/v2/users/:id/deletion-preview`: account, conteggi e `fingerprint`. `DELETE /api/v2/users/:id` richiede `{ fingerprint }`; 409 quando il contenuto è cambiato. Nessuna cancellazione del proprio account o retrocessione dell'ultimo Admin.
- `GET /api/v2/users/invites`: elenco paginato non accettati, inclusi scaduti, senza token. `POST /api/v2/users/invites/:id/resend` rinnova token/scadenza (sette giorni); `DELETE /api/v2/users/invites/:id` cancella solo inviti non accettati. L'accettazione verifica anche il token corrente per impedire l'uso del vecchio link durante un reinvio.
- `PUT /api/v2/settings/:key`: `{ value: string }`; validazione di `ALLOW_SELF_REGISTRATION`, `DEFAULT_USER_ROLE` (Guest/Editor), `SITE_NAME` (1–100 caratteri) e `SITE_LOGO_IMAGE_ID` (immagine esistente o stringa vuota per rimuovere il logo). Il ruolo riguarda solo nuove autoregistrazioni; nome e logo si applicano al branding UI e alle email. `SITE_LOGO_URL` è derivato dal server, non modificabile direttamente.

## Eliminazione utenti

L'anteprima e la cancellazione usano transazioni Serializable con retry dei conflitti. Le pagine **create** dall'utente vengono eliminate definitivamente, anche se soft-deleted, insieme ai loro dati dipendenti. I contributi personali (commenti, revisioni, tag, preferiti, visite e attività) vengono rimossi.

Le pagine create da altri conservano contenuto e autore; proprietà e ultimo editor riferiti all'account eliminato passano all'Admin che esegue l'azione. Le revisioni dell'account eliminato vengono rimosse anche da queste pagine, senza riscrivere il contenuto corrente o rinumerare le revisioni rimanenti. Le risposte di altri sotto commenti dell'utente diventano commenti radice.

Subject/Project con pagine o contenitori di altri, oppure commenti/tag altrui nel Project/Section, vengono conservati e trasferiti quando necessario; quelli senza contenuti altrui vengono eliminati. Asset immagine e inviti inviati vengono conservati e i riferimenti trasferiti. Non vengono cancellati file dallo storage, poiché potrebbero essere condivisi o incorporati nell'HTML. Un account eliminato può ricevere un nuovo invito, con token nuovo.

## Verifiche PostgreSQL opzionali

Usare esclusivamente un PostgreSQL temporaneo dedicato chiamato `gigawiki_test`, con `DATABASE_URL` esplicita nella shell. Preparare il database e applicare lì le migrazioni seguendo [DATABASE_TESTS.md](DATABASE_TESTS.md), poi eseguire:

```sh
./bin/pnpm --filter gigawiki-v2-api test:settings:db
```

La suite crea account/risorse temporanei con identificatori casuali e annulla **tutte** le scritture al termine di ciascun test, anche in caso di errore. Non esegue migrazioni, truncate o pulizia delle tabelle esistenti. Le prove su DB sono disattivate nella suite standard. Il rollback non autorizza a usare il database dell'app: la procedura corrente prescrive un database temporaneo isolato per tutte e tre le suite. La suite può emettere un warning non bloccante di `pg` sulle query concorrenti sullo stesso client.

Appearance usa il tema light/dark locale, condiviso con la Topbar, senza modificare il profilo. Il logo si gestisce in App Settings: upload/selezione, rimozione e fallback; gli asset condivisi non vengono cancellati automaticamente.
