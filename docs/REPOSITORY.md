# Repository e protezione dei branch

Repository: [gigapin/gigawiki-v2](https://github.com/gigapin/gigawiki-v2). Verifica del 13 ottobre 2026: repository pubblico, default `main`, branch di integrazione `dev`, unico collaboratore `gigapin` con permessi Admin. Il task originale descrive un repository privato e `develop`: si mantiene la configurazione esistente; non è stata cambiata la visibilità né rinominato il branch.

La CI è attiva su GitHub: [run 38378305259](https://github.com/gigapin/gigawiki-v2/actions/runs/38378305259) completata con quality, test-api, test-web e build tutti superati. `main` non aveva protezione classica né ruleset.

## Protezione attiva su main

- Pull request obbligatoria, anche per Admin.
- Check richiesti: `quality`, `test-api`, `test-web`, `build`.
- Branch aggiornato rispetto a main prima del merge.
- Conversazioni risolte; push forzato ed eliminazione vietati.
- Zero approvazioni esterne per il repository con un solo collaboratore; nessun bypass Admin. La specifica originale richiede un’approvazione, ma l’autore non può approvare la propria PR: serve un secondo collaboratore per applicare quel requisito senza bloccare i merge.

Configurazione applicata e riletta dall’API GitHub il 13 ottobre 2026 dopo conferma dell’utente: zero approvazioni esterne, obbligo di PR e tutti e quattro i check CI, requisiti applicati anche agli Admin. Non sono stati effettuati push, merge, modifiche alla visibilità o aggiunte di collaboratori. I branch di lavoro e i comandi sono descritti in [CONTRIBUTING.md](../CONTRIBUTING.md).

Aggiornamento 14 ottobre 2026: verificata verde anche la [run 38559849609](https://github.com/gigapin/gigawiki-v2/actions/runs/38559849609) sul commit `af7e030`. Le modifiche locali successive richiedono un nuovo controllo CI dopo il push.
