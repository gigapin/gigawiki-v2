# Continuous integration

Il workflow [.github/workflows/ci.yml](../.github/workflows/ci.yml) parte su push e pull request verso `main` e `dev`, oppure manualmente da Actions. Usa Node 22 da `.nvmrc`, pnpm da `packageManager`, installazione con lockfile congelato e generazione Prisma prima dei controlli. Il setup comune è in `.github/actions/setup/action.yml`; cache pnpm e Turbo abilitate.

I quattro job, utilizzabili come status check per la protezione dei branch, sono:

- `quality`: lint e typecheck di API, web e shared.
- `test-api`: PostgreSQL 16 e Redis 7 temporanei, tutte le migrazioni, test ordinari e le due suite PostgreSQL.
- `test-web`: test Vitest/Testing Library/jsdom.
- `build`: attende gli altri tre, compila API e web e conserva `web-dist` per 7 giorni.

I valori d’ambiente sono credenziali fittizie; non servono secret del database dell’app, SMTP o storage. Il database CI nasce vuoto a ogni job e viene eliminato dal runner. Le integrazioni simulano Redis/coda email come descritto in [DATABASE_TESTS.md](DATABASE_TESTS.md); il workflow non esegue prove browser, invii SMTP o upload reali. `VITE_API_URL` partecipa alla cache Turbo delle build; di default il web usa richieste same-origin.

Verifiche locali del 13 ottobre 2026: lint/typecheck su tutti e tre i pacchetti, build API/web, 200 test frontend e 334 test API superati. Le 6 migrazioni sono state applicate da zero su un container PostgreSQL 16 temporaneo separato dall’app, con ambiente test e credenziali CI. YAML e formattazione verificati. Rimangono warning preesistenti (console API, TanStack Table, dimensione bundle, Browserslist e pg). Dopo il push dell’utente, verificata anche la [run GitHub 38378305259](https://github.com/gigapin/gigawiki-v2/actions/runs/38378305259): quality, test-api, test-web e build tutti superati. Non sono stati effettuati push o modifiche alla protezione dei branch dall’assistente.

Comandi locali dalla root:

```sh
./bin/pnpm turbo typecheck lint
./bin/pnpm --filter gigawiki-v2-api test
./bin/pnpm --filter web test
./bin/pnpm turbo build
```

Le suite PostgreSQL locali sono opzionali: seguire [DATABASE_TESTS.md](DATABASE_TESTS.md). Non copiare il comando di migrazione CI sul database dell’app per eseguire i test.
