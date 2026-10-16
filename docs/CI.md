# Continuous integration

Il workflow [.github/workflows/ci.yml](../.github/workflows/ci.yml) parte su push e pull request verso `main` e `dev`, oppure manualmente da Actions. Usa Node 22 da `.nvmrc`, pnpm da `packageManager`, installazione con lockfile congelato e generazione Prisma prima dei controlli. Il setup comune è in `.github/actions/setup/action.yml`; cache pnpm e Turbo abilitate.

I quattro job, utilizzabili come status check per la protezione dei branch, sono:

- `quality`: lint e typecheck di API, web e shared.
- `test-api`: PostgreSQL 16 e Redis 7 temporanei, tutte le migrazioni, test ordinari e le tre suite PostgreSQL (API, parità/concorrenza, Settings).
- `test-web`: test Vitest/Testing Library/jsdom.
- `build`: attende gli altri tre, compila API e web e conserva `web-dist` per 7 giorni.

I valori d’ambiente sono credenziali fittizie; non servono secret del database dell’app, SMTP o storage. Il database CI nasce vuoto a ogni job e viene eliminato dal runner. Le integrazioni simulano Redis/coda email come descritto in [DATABASE_TESTS.md](DATABASE_TESTS.md); il workflow non esegue prove browser, invii SMTP o upload reali. `VITE_API_URL` partecipa alla cache Turbo delle build; di default il web usa richieste same-origin.

Verifiche locali del 14 ottobre 2026: lint/typecheck/build di tutti i pacchetti,
343 test API ordinari, 20 PostgreSQL e 218 frontend superati. Sette migrazioni
applicate da zero su PostgreSQL temporaneo dedicato. Build Docker e smoke runtime
health/shared/Prisma/storage dopo riavvio superati. Restano warning console API,
React Compiler/TanStack Table, bundle oltre 500 kB, Browserslist e `pg`.

Verifica del 16 ottobre: la [run 38570737573](https://github.com/gigapin/gigawiki-v2/actions/runs/38570737573)
è verde nei quattro job sul commit `f6be5cac413355159bc02750438b63e265890416`, presente anche sul branch remoto `dev`. Include gli interventi prima descritti come locali. Anche i controlli locali `turbo typecheck lint test build` sono passati (11 task, 6 da cache; test API 343 e frontend 218), insieme ai 20 test PostgreSQL su container temporaneo con sette migrazioni da zero. Le modifiche successive richiedono un nuovo controllo dei quattro job sul proprio SHA; la base verde non le certifica.

Pubblicata anche la guida di collaudo nel commit `b6721e9f249432fd0fb00fe8003c04e387b5b3d6` su `dev`: [run 38873305042](https://github.com/gigapin/gigawiki-v2/actions/runs/38873305042) verificata il 16 ottobre, tutti e quattro i job verdi. Browser e consegna email restano aperti; eventuali commit successivi, inclusa la registrazione degli esiti, richiedono il proprio controllo CI.

Comandi locali dalla root:

```sh
./bin/pnpm turbo typecheck lint
./bin/pnpm --filter gigawiki-v2-api test
./bin/pnpm --filter web test
./bin/pnpm turbo build
```

Le suite PostgreSQL locali sono opzionali: seguire [DATABASE_TESTS.md](DATABASE_TESTS.md). Non copiare il comando di migrazione CI sul database dell’app per eseguire i test.

Per permessi e collaudi reali vedere [V2_RELEASE_CHECKLIST.md](V2_RELEASE_CHECKLIST.md).
