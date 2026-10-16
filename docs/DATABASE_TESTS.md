# Test API su PostgreSQL

Usare un PostgreSQL 16 temporaneo e dedicato chiamato `gigawiki_test`. Impostare
`DATABASE_URL` nell'ambiente della shell prima dei comandi: deve puntare al database
temporaneo, mai a quello dell'app. L'ambiente esplicito prevale sul `.env`.

```sh
./bin/pnpm --filter shared build
./bin/pnpm --filter gigawiki-v2-api exec prisma generate
./bin/pnpm --filter gigawiki-v2-api exec prisma migrate deploy
./bin/pnpm --filter gigawiki-v2-api test:integration:db
./bin/pnpm --filter gigawiki-v2-api test:settings:db
./bin/pnpm --filter gigawiki-v2-api test:parity:db
./bin/pnpm --filter gigawiki-v2-api test:features:db
```

Il comando standard `test` salta tutte e tre le suite PostgreSQL; la CI le esegue
dopo le migrazioni su un servizio temporaneo separato dall'app.

| Suite | Casi | Isolamento e copertura |
| --- | --- | --- |
| `test:integration:db` | 8 | Rollback; Argon2, login/refresh/revoca, registrazione, pagine, revisioni, ricerca e soft delete. |
| `test:settings:db` | 3 | Rollback; gestione account e permessi Settings. |
| `test:parity:db` | 9 | Commit reali e pulizia delle proprie fixture; accesso gerarchico, concorrenza, attività e atomicità. Richiede `gigawiki_test`. |

Le prime due suite usano savepoint nella transazione esterna e verificano l'assenza
delle fixture dopo il rollback. La suite di parità può lasciare fixture se il
processo viene interrotto: eliminare il database temporaneo al termine. Non usare
un database condiviso con l'app o altri servizi.

Verifica del 14 ottobre 2026: sette migrazioni applicate da zero su PostgreSQL
16 temporaneo; tutti i 20 casi superati. Anche i 343 test API ordinari sono passati.
Nessuna migrazione o fixture scritta nel database dell'app durante queste prove.

Verifica ripetuta il 16 ottobre 2026 sulla base `f6be5ca`: sette migrazioni applicate da zero e tutti i 20 casi superati (8 API, 3 Settings, 9 parità/concorrenza) su un container PostgreSQL 16 temporaneo dedicato, senza volumi persistenti. Il database dell'app non è stato usato.

Redis e accodamento email sono simulati nei test pertinenti; SMTP, storage e
browser non sono coperti. `pg` segnala query concorrenti sullo stesso client nelle
suite con rollback. Vedere [CI.md](CI.md) e la
[checklist dei collaudi reali](V2_RELEASE_CHECKLIST.md).

Incremento funzionale del 16 ottobre: ottava migrazione verificata sul database temporaneo e nuova suite `test:features:db` con 10 casi (PDF autorizzato coperto separatamente, tag Subject, cataloghi, restore, commenti, navigazione, descrizioni, cancellazione account e password iniziale). Le suite PostgreSQL sono ora quattro, per 30 casi complessivi. Nessuna migrazione applicata al database dell’app.
