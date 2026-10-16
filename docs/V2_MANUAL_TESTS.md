# Collaudo manuale V2

Guida operativa per la [checklist di chiusura](V2_RELEASE_CHECKLIST.md).
I casi sotto sono **da eseguire dall'utente**: la presenza della guida non certifica il collaudo.
Obiettivo: versione verificata su `dev`; import V1/password, PDF, redesign e deployment esclusi.

## Preparazione e registrazione

1. Annotare SHA (`git rev-parse HEAD`), data, browser/versione, URL e dimensioni dello schermo. Il candidato iniziale è `f6be5ca`; ripetere i casi interessati se cambia il codice.
2. Confermare che l'API usi la policy attiva `ENFORCE_CONTENT_ACCESS=true`. Non cambiare proprietà o visibilità di contenuti esistenti. Se la policy non è attiva, fermare i casi di accesso e registrare il prerequisito mancante.
3. Usare profili browser separati per Admin, Editor proprietario, altro Editor e Guest; due sessioni Editor separate per il conflitto. Non pubblicare credenziali, cookie, token o URL email completi negli esiti.
4. Creare via UI una gerarchia di prova con prefisso univoco, per esempio `V2-QA-<data>-<sigla>`. Predisporre due Subject pubblici, Project/Section pubblici, pagina pubblicata e bozza dell'Editor proprietario. Creare anche antenati privati e pagina restricted. Annotare gli URL in un registro locale privato.
5. Prima delle prove Settings, annotare nome/logo, registrazione autonoma e ruolo predefinito per ripristinarli al termine. Per invii e gestione account usare solo caselle controllate dal proprietario e account di prova. Non usare seed, reset, SQL manuali o revoche massive.
6. Eseguire prima i casi senza eliminazione, poi soft delete e cancellazione account. Annotare ciascun esito: `PASS`, `FAIL`, `BLOCCATO` o `DA ESEGUIRE`; un caso bloccato non è superato.

Per ogni difetto registrare: ID caso, SHA, ruolo, prerequisiti, passi esatti, atteso, osservato e riproducibilità. Allegare solo evidenze prive di dati sensibili. Conservare localmente metadati dei contenuti reali; nel repository pubblico usare descrizioni anonime.

## Casi browser

| ID | Passi | Risultato atteso |
| --- | --- | --- |
| B01 | Login per ciascun ruolo; reload; logout; riaprire un URL protetto. Nello stesso profilo passare da Admin a Guest. | Sessione ripristinata al reload; dopo logout serve login; nessun dato del precedente account resta visibile. |
| B02 | Aprire pagine PUBLIC e PRIVATE con i quattro ruoli; rendere privato a turno un antenato di prova e riprovare URL diretti. | PUBLIC leggibile agli autenticati; PRIVATE proprietario/Admin; proprietà del discendente non supera privacy degli antenati. |
| B03 | Aprire bozza e pagina restricted; tentare lettura e modifica con i quattro ruoli. | Guest senza bozze; restricted proprietario/Admin; scrittura soltanto Editor/Admin autorizzati. Un Guest proprietario non può scrivere. |
| B04 | Cercare il titolo univoco di una pagina di prova; salvarla tra preferiti/visite, poi limitarne l'accesso e riprovare come altro Editor/Guest. Controllare ricerca, sidebar, feed, preferiti, visite e commenti. | Nessun titolo, risultato o contenuto non accessibile; stessi vincoli della lettura diretta. |
| B05 | Espandere Subject → Project → Section, aprire la sezione, ricaricare l'URL, usare indietro/avanti. Spostare il Project di prova nel secondo Subject. | Sezione ripristinata dall'URL; liste, sidebar e conteggi aggiornati in entrambi i Subject. |
| B06 | Su Project e Section aggiungere tag, preferito, commento e risposta; modificare/eliminare i propri commenti. Chiudere il pannello con una bozza e riaprirlo. | Controlli coerenti col ruolo; preferiti personali; commenti inizialmente chiusi e bozza conservata alla chiusura. |
| B07 | Con un form commento già aperto mettere offline il solo browser, inviare, poi tornare online e riprovare. | Errore leggibile, rollback dell'aggiornamento ottimistico, testo recuperabile e nessun duplicato dopo retry. |
| B08 | Creare pagina: titolo, H1–H4, enfasi/strike/code, liste, link, citazione, separatore, tabella e blocco codice. Save draft due volte, poi Publish; aprire reader e modifica tramite URL diretto. | Un'unica pagina; Save draft mantiene editor e bozza; Publish apre reader con contenuto corretto e toolbar funzionante. |
| B09 | Modificare una pagina salvata, attendere autosave, ricaricare; fare un'altra modifica e tentare navigazione con dati ancora non salvati. | Autosave conserva contenuto e stato bozza/pubblicato; navigazione protetta quando ci sono modifiche non salvate. |
| B10 | Aprire la stessa revisione in due sessioni Editor. Salvare nella prima, quindi nella seconda prima che abbia caricato la nuova revisione. | Secondo salvataggio 409; testo locale conservato, errore comprensibile e nessuna sovrascrittura silenziosa. |
| B11 | Con Editor/Admin aprire cronologia, anteprima e ripristinare una revisione di prova con titolo/slug diversi. Riprovare con Guest. | Restore confermato e contenuto corretto; navigazione allo slug ripristinato; Guest senza pulsante e senza accesso alla cronologia. |
| B12 | Eliminare come Admin un antenato di prova; aprire l'URL di un suo discendente e cercarlo con gli altri ruoli. | Discendente nascosto senza cancellazione automatica; nessuna fuga in liste, ricerca o relazioni. |
| B13 | Caricare avatar, cover e immagini inline da pulsante/incolla/drop; provare file non supportato e oltre 10 MB; salvare e ricaricare. | Immagini persistenti, errori leggibili e contenuto preservato; upload pendente impedisce un salvataggio incompleto. |
| B14 | In App Settings caricare/selezionare logo, controllare login/sidebar, rimuoverlo e ripristinare il valore iniziale. Dopo un riavvio pianificato dell'API verificare asset locali e precedenti S3. | Logo coerente e fallback alla rimozione; file ancora leggibili dopo riavvio. Se il riavvio non è disponibile, registrare quella parte come bloccata. |
| B15 | Con account di prova aggiornare profilo e password, poi provare vecchia e nuova password. Come Editor/Guest aprire direttamente le aree Admin. | Profilo aggiornato; cambio password richiede quella corrente e termina la sessione; vecchia password rifiutata e aree Admin negate. |
| B16 | Come Admin cercare/filtrare/paginare utenti, cambiare ruolo a un account di prova e ricaricare come quell'account. Su un account eliminabile di prova controllare anteprima, annullare, poi confermare eliminazione. | Ruolo corrente rispettato; annullamento non cancella; anteprima e cancellazione coerenti; eliminato senza accesso. Non cancellare account reali. |
| B17 | Provare nome sito, registrazione autonoma e ruolo predefinito su account di prova; ripristinare i valori annotati. | Branding aggiornato e policy applicata alle nuove registrazioni; i ruoli esistenti non cambiano. |
| B18 | Ripetere login, Project, reader, editor e Settings in light/dark, desktop e viewport mobile di circa 390 px; usare Tab, Escape e conferme. | Testi e controlli leggibili, azioni raggiungibili, nessuna sovrapposizione che impedisce un flusso; preferenza tema conservata al reload. |

## Email — invii effettuati dall'utente

Eseguire con API e worker email attivi, URL frontend corretto e caselle di prova del proprietario. Verificare nome sito, oggetto, mittente, logo e destinazione dei link in ogni messaggio. Connessione/autenticazione SMTP non dimostrano consegna; il logo deve essere raggiungibile dal client email per verificarne il rendering.

| ID | Passi | Risultato atteso |
| --- | --- | --- |
| E01 | Invitare un account nuovo, ricevere il messaggio e accettare il link; ricaricare l'app. | Consegna effettiva, ruolo previsto, accettazione e sessione funzionanti. |
| E02 | Inviare un secondo invito, reinviarlo, tentare il vecchio link e poi quello nuovo; riusare un link già accettato. Su un altro invito di prova verificare annullamento. | Solo token corrente e non usato accettato; invito annullato inutilizzabile; errori comprensibili. |
| E03 | Se abilitata, registrare un account di prova, verificare blocco login prima della conferma, reinviare verifica e completare dal messaggio corrente. | Consegna e verifica complete; login disponibile dopo conferma; messaggio di benvenuto coerente. Ripristinare registrazione se abilitata solo per la prova. |
| E04 | Richiedere reset password, ricevere il messaggio, cambiare password e provare vecchia/nuova; riusare il token. | Reset riuscito, vecchia password e token riusato respinti; sessioni precedenti revocate anche in development. |
| E05 | Provare link malformati e realmente scaduti di verifica/reset/invito. Non alterare timestamp nel database dell'app. | Errore leggibile senza modifica dell'account; possibilità di richiedere un nuovo messaggio. Se non ci sono token scaduti disponibili, mantenere il caso aperto fino a scadenza o collaudo in ambiente isolato. |

Errori di accodamento/invio sono coperti dai test automatici pertinenti; eventuali nuove simulazioni vanno eseguite nei test o in ambiente isolato, senza spegnere Redis/SMTP dell'app. Non segnare la consegna reale come superata sulla base di mock o log del worker.

## Registro degli esiti e chiusura

Duplicare una riga per ogni caso B01–B18 ed E01–E05, distinguendo i sottocasi non completati:

| Caso/sottocaso | Data | SHA | Ruolo/browser/viewport | Esito | Evidenza o difetto anonimo |
| --- | --- | --- | --- | --- | --- |
| Da compilare | — | — | — | DA ESEGUIRE | Nessun collaudo manuale ancora registrato |

Correggere prima accessi impropri, perdita di contenuto e flussi bloccati; aggiungere test di regressione per i difetti funzionali e ripetere i casi coinvolti sul candidato finale. La V2 resta aperta finché un caso obbligatorio è fallito, bloccato o non eseguito.

Al termine ripristinare impostazioni e preferenze iniziali e rimuovere solo account/contenuti di prova identificati nel registro; non eliminare file condivisi dallo storage. Annotare fixture soft-deleted rimaste, senza forzare cancellazioni SQL. Riportare esiti e difetti nella checklist e nel session log. La chiusura richiede anche i quattro job CI verdi sullo SHA finale di `dev`; nessun merge in `main` o deployment fa parte di questo ciclo.
