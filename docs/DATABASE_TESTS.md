# Test API su PostgreSQL

Dalla root del repository, con infrastruttura attiva e `DATABASE_URL` configurato:

```sh
./bin/pnpm --filter gigawiki-v2-api test:integration:db
./bin/pnpm --filter gigawiki-v2-api test:settings:db
```

Il 13 ottobre 2026 sono passati tutti gli 8 test API e i 3 Settings sul database dell’app, dopo la migrazione `authVersion` applicata dall’utente. Questo intervento non richiede nuove migrazioni. Il comando standard `test` salta entrambe le suite PostgreSQL.

La suite API verifica login con Argon2 reale, sessione autenticata, refresh/rotazione/revoca/scadenza, registrazione e policy, risposta neutra del recupero password, creazione/modifica pagina, snapshot e ripristino revisioni, aggiornamento della ricerca full-text, soft delete e permessi correnti dal database. Usa le rotte Fastify tramite `app.inject()` e query Prisma/PostgreSQL reali.

Ogni test crea fixture con identificatori casuali dentro una transazione sempre annullata, anche se fallisce. Dopo il rollback controlla da una connessione esterna che le fixture siano assenti. Le policy singleton sono lette da chiavi temporanee; le impostazioni dell’app restano intatte. Nessun truncate, seed, reset o migrazione automatica.

Redis e accodamento email sono simulati: SMTP, storage e browser non sono coperti. Le transazioni interne alle rotte usano savepoint nella transazione esterna di prova; non si verificano commit concorrenti, retry di serializzazione o migrazioni da zero. `pg` può emettere un warning non bloccante sulle query concorrenti sul medesimo client.

La CI esegue entrambe le suite su PostgreSQL 16 temporaneo dopo tutte le migrazioni. Il 13 ottobre 2026 sono state verificate da zero le 6 migrazioni e sono passati tutti i 334 test API (323 ordinari e 11 integrazioni) in quell’ambiente separato dall’app. Vedere [CI.md](CI.md).

Le verifiche browser sono eseguite dall’utente. Per le Settings e la suite dedicata vedere [SETTINGS.md](SETTINGS.md).
