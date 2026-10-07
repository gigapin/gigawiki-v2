# Frontend — audit del materiale grafico

**Data:** 2026-09-14 · **Scopo:** stabilire se il materiale di design disponibile basta a completare la Fase 4, e cosa manca da preparare.

> **Aggiornamento 2026-10-07:** questo audit descrive lo stato del 14 settembre. Il tema e le primitive shadcn sono ora unificati, Project detail e gestione sezioni sono implementati senza nuovi template Claude Design. Stato corrente in `SESSION_LOG.md` e `apps/web/README.md`.

---

## Risposta breve

**No, non basta.** I 20 prompt di [`DESIGN_PROMPTS.md`](./DESIGN_PROMPTS.md) coprono bene il backend, ma:

- i **design effettivamente generati sono 3 file per 2 schermate** su 20 (Dashboard ×2 varianti, Login);
- il **design system non esiste come codice**: ci sono tre set di token scollegati fra loro e un quarto (quello scritto nei prompt) che non corrisponde a nessuno dei tre;
- prima di generare altre schermate vanno chiuse **8 decisioni** che nessun prompt può indovinare al posto nostro (§3b).

Le schermate mancanti sono il problema minore: si generano. Il problema vero è che oggi ogni schermata nuova riparte da zero e ricopia gli stessi valori a mano.

---

## 1. Cosa abbiamo davvero

| Materiale | Stato |
|---|---|
| `DESIGN_PROMPTS.md` — header di design system + 20 prompt + coverage map | Completo e coerente col backend |
| Design file generati (link Claude Design registrati in fondo al file) | **3**: Dashboard `oDcpSWpw…`, Dashboard `CcY5Cktg…`, Login `wScRAn_a…` |
| Schermate implementate in codice | 5: Login, Dashboard, Subjects, Subject detail, più app shell (Sidebar/Topbar/SearchModal) |
| Asset di brand | Nessuno (§3b.5) |
| Primitive UI riusabili | Nessuna, tranne `icon.tsx` (§2) |

Subjects e Subject detail sono state **improvvisate** partendo dal sistema visivo della dashboard, senza un design file dedicato. Ha funzionato perché sono griglie di card. Smetterà di funzionare su editor, diff, tabelle dati e stati di errore, che non somigliano a niente di già fatto.

### Le 20 schermate, una per una

Legenda: ✅ fatto · 🟡 parziale · ⬜ niente

| # | Schermata | Design | Codice | Note |
|---|---|---|---|---|
| 1 | Login | ✅ | ✅ | Unica schermata con palette e font propri (§2) |
| 2 | Register | ⬜ | ⬜ | Endpoint pronto; gated su `ALLOW_SELF_REGISTRATION` |
| 3 | Forgot password | ⬜ | ⬜ | Endpoint pronto |
| 4 | Reset password | ⬜ | ⬜ | Endpoint pronto |
| 5 | Verify email | ⬜ | ⬜ | Endpoint pronto |
| 6 | Accept invitation | ⬜ | ⬜ | Endpoint pronto |
| 7 | Dashboard / app shell | ✅ | 🟡 | Manca «Recently visited» (`GET /views`) |
| 8A | Command palette ⌘K | ⬜ | ✅ | `SearchModal.tsx`, fatto senza design file |
| 8B | Risultati ricerca full-page | ⬜ | ⬜ | Nessuna rotta `/search` |
| 9 | Subjects browse | ⬜ | ✅ | Improvvisata dal sistema dashboard |
| 10 | Subject detail | ⬜ | ✅ | Idem |
| 11 | Project detail | ⬜ | ⬜ | Conflitto di specifica (§4) |
| 12 | Section detail | ⬜ | ⬜ | Conflitto di specifica (§4) |
| 13 | **Page view (reader)** | ⬜ | ⬜ | Il cuore del prodotto |
| 14 | **Page editor** | ⬜ | ⬜ | |
| 15 | **Revision history + diff** | ⬜ | ⬜ | |
| 16 | Favorites | ⬜ | ⬜ | Riusa la griglia già fatta |
| 17 | Profile / settings | ⬜ | ⬜ | Conflitto di specifica (§4) |
| 18 | **Admin — users** | ⬜ | ⬜ | Tabella dati: niente di simile in app |
| 19 | Admin — activity log | ⬜ | ⬜ | Barra filtri + tabella densa |
| 20 | **Stati di sistema** | ⬜ | ⬜ | 404/403/errore/empty/skeleton/toast |

**Totale: 2 design su 20, 5 schermate su 20 implementate.**

---

## 2. Il problema strutturale: il design system non è codice

### Quattro palette invece di una

| Dove | Token | Usato da |
|---|---|---|
| `index.css` | `--gw-*` (13 variabili) | Solo `LoginPage` |
| `index.css` | `--db-*` (21 variabili) | Tutto il resto (386 occorrenze) |
| `CreateSubjectModal.tsx` | `COVER_COLORS` (6 tinte × 7 valori, hardcoded) | Modal + duplicato come `toneForColor()` in 2 pagine |
| `index.css` | token shadcn slate (`--background`, `--primary`…) | **Nessuno.** Sono ancora i default light-mode dell'init |

`--gw-*` e `--db-*` sono **quasi identici** — bg `oklch(0.16 0.008 160)` vs `oklch(0.155 0.004 160)`, emerald `0.72 0.15 160` vs `0.72 0.15 158`, testo `0.96` vs `0.965`. Sono due run di Claude Design che hanno ricalcolato la stessa palette. Consolidarli è a rischio quasi zero.

In più, i valori scritti nell'header di `DESIGN_PROMPTS.md` (`#0A0C0D`, `#12181A`, `#10B981`, `#14B8A6`…) **non corrispondono a nessuno dei due**. Chi rigenera una schermata con quell'header oggi ottiene una quinta palette.

### Tre combinazioni tipografiche

`index.html` carica cinque famiglie. In pratica:

- **Login** → Space Grotesk + Inter Tight
- **tutto il resto** → Geist + Instrument Serif + Geist Mono
- **l'header dei prompt dichiara** → Inter/Geist + Lora

Nessuna delle tre coincide con le altre. Il `font-family` è ripetuto **inline ~50 volte** nei componenti, quindi cambiarlo oggi significa 50 modifiche.

### shadcn/ui è installato e inutilizzato

15 componenti in `src/components/ui/` (Button, Card, Dialog, Table, Select…): **zero import** dalle pagine. L'unico file importato da `components/ui/` è `icon.tsx`, che è custom. Anche `App.tsx` è codice morto: il router monta direttamente le pagine.

Il codice applicativo è **5.362 righe con 310 `style={{…}}` inline**: è il porting a mano dell'HTML di Claude Design, non Tailwind.

### Conseguenza già visibile

Senza primitive, le stesse cose sono riscritte ogni volta: `initials()` esiste in 4 file, `timeAgo()` in 2, `toneForColor()` in 2, `Pagination` vive dentro `SubjectDetailPage`. Con 15 schermate ancora da fare, questo si moltiplica per 15.

---

## 3. Cosa manca (da preparare)

### 3a. Design da generare, in ordine di priorità

**P0 — non derivabili da quello che esiste.** Vanno generati:

- **#13 Page view** — definisce la tipografia long-form, cioè il cuore del prodotto
- **#14 Page editor** — toolbar, bubble menu, pannello impostazioni, dropzone immagini
- **#15 Revision history** — diff a due colonne su fondo near-black
- **#20 Stati di sistema** — 404/403/errore/empty/skeleton/toast
- **#18 Admin users** — tabella dati densa, nessun precedente in app

**P1 — derivabili ma con decisioni aperte:** #11 Project detail, #12 Section detail, #17 Profile/settings, #19 Admin activity, #8B risultati ricerca.

**P2 — ricalcabili dal Login già fatto:** #2–#6 (register, forgot, reset, verify, invite) + `AuthLayout`. Sono le uniche che si possono fare **subito**, senza altro materiale grafico.

**P3:** #16 Favorites — è la griglia di card già implementata con un filtro sopra.

### 3b. Le 8 decisioni da prendere prima di generare

1. **Tipografia long-form** — blocca #13, #14, #15 e i task 31/32. Serve stabilire: quale serif da lettura (Instrument Serif è una display face, non regge un articolo: valutare Lora, come da header, o Source Serif), misura della riga, scala H1–H4, stile del code block **e quale tema di syntax highlighting**, tabelle, immagini con didascalia, blockquote/callout. Deve uscirne **un unico foglio «prose»** usato da reader, editor e anteprima revisioni — oggi in tutto il repo non c'è una sola riga di stile per contenuto long-form.
2. **Colori del diff** (#15) — verde/rosso su near-black che non confliggano con l'emerald di sistema e restino in contrasto AA.
3. **Tema chiaro: sì o no?** Il task 34 prevede una pagina «Appearance», il design system è dichiaratamente solo dark, e i colori sono hardcoded inline in 310 punti. Oggi un tema chiaro è impraticabile. Va deciso **prima** di scrivere altre dieci schermate, non dopo.
4. **Progetti: cover image o tinta?** `Subject` ha `color` + `icon` (+ `image` opzionale), `Project` ha solo `imageId`. I prompt #10/#11 mostrano cover image sui progetti; il codice attuale improvvisa una tinta per indice. Delle due: aggiungere `color`/`icon` a `Project` (migrazione Prisma) oppure usare davvero le cover, il che richiede UI di upload e un placeholder.
5. **Logo e brand.** Non esistono. La sidebar disegna una «G» in Instrument Serif dentro un quadrato; `public/favicon.svg` è il logo viola `#863bff` avanzato dal template di partenza e `public/icons.svg` contiene icone social (GitHub, Discord, Bluesky) mai usate; in `src/assets/` restano `hero.png`, `react.svg`, `vite.svg`. Servono: wordmark, mark quadrato, favicon, e la loro collocazione in sidebar e `AuthLayout`.
6. **Illustrazioni per empty state / 404 / 403** (#20). Oggi zero asset. Consiglio: niente illustrazioni, solo icona grande + tipografia — coerente col resto e zero asset da mantenere. Ma va deciso, perché il prompt #20 le chiede.
7. **Set di icone.** `icon.tsx` contiene 34 icone disegnate a mano. L'editor ne chiede ~20 in più (bold, italic, liste, quote, code, link, tabella, immagine, undo/redo), l'admin altre ancora (filtri, calendario, upload, cestino, drag handle). `lucide-react` **è già in dipendenza** ma è usato solo dentro i 3 file shadcn morti. Delle due: passare a lucide (come dice l'header di design) tenendo `icon.tsx` come wrapper, oppure continuare a disegnarle a mano e mettere in conto ~40 icone.
8. **Densità e stile di tabella dati + barra filtri** (#18, #19) — nessun precedente in app.

### 3c. Librerie mancanti (non grafiche, ma bloccanti)

Nessuna di queste è installata in `apps/web`:

| Pacchetto | Serve a |
|---|---|
| `@tiptap/react`, `starter-kit`, `extension-image`, `-link`, `-table`, `-mention`, `-placeholder` | Task 31 |
| `lowlight` (o equivalente) | Syntax highlighting nel code block |
| `@dnd-kit/core`, `@dnd-kit/sortable` | Riordino sezioni (task 30) |
| `@tanstack/react-table` | Tabella utenti admin (task 34) |
| `dayjs` | Timestamp relativi (oggi `timeAgo()` a mano, duplicata) |
| `zod` + `react-hook-form` + `@hookform/resolvers` | Form validati — opzionale, oggi tutto a mano |

Da caricare anche il webfont della serif da lettura, se si sceglie la strada 3b.1.

---

## 4. Conflitti fra i due documenti, da sciogliere prima di generare

| Tema | `DESIGN_PROMPTS.md` | `GIGAWIKI_V2_TASKS.md` |
|---|---|---|
| Section detail | #12 = schermata dedicata | Task 30: «nessuna pagina dedicata, le sezioni sono inline in `ProjectDetailPage`» |
| Project detail | #11 = tre tab (Sections / Activity / Comments) | Task 30: sezioni in sidebar, elenco pagine nel main |
| Profile/settings | #17 = tab Profile / Security / Activity | Task 34: `SettingsLayout` con Profile / Password / Appearance + area admin |
| Palette e font | hex `#0A0C0D`/`#10B981`, Inter+Lora | Non specificato — il codice usa oklch, Geist + Instrument Serif |
| «Appearance» | Non esiste: il sistema è solo dark | Task 34 prevede la pagina, ma non c'è né setting backend (`SITE_NAME`, `ALLOW_SELF_REGISTRATION`, `DEFAULT_USER_ROLE`) né design |

Verifiche fatte sul backend, che invece tornano: `Activity.ip` esiste (serve a #19), `Page` ha `isDraft`/`restricted`/`visibility` (servono a #14), i tag e i preferiti polimorfici ci sono (#13).

---

## 5. Ordine di lavoro consigliato

1. **Consolidare i token** (~mezza giornata). Un solo `src/styles/tokens.css`: `--gw-*` → `--db-*` (sono già quasi identici), `COVER_COLORS` dentro lo stesso file, decidere se shadcn resta o si rimuove. Finché ci sono quattro palette, ogni schermata nuova ne aggiunge una quinta.
2. **Estrarre ~10 primitive** dal codice già scritto: `Surface`, `Card`, `Button`, `Field`, `Badge`, `Avatar`, `Pagination`, `EmptyState`, `Skeleton`, `Menu`. Non è lavoro di design: esistono già, sono solo copiate inline in 5.362 righe.
3. **Aggiornare l'header di `DESIGN_PROMPTS.md`** con i valori reali (oklch) e i font reali, così i run successivi convergono invece di divergere.
4. **Rispondere ai punti 1, 3, 5, 7 di §3b**, poi generare i design **P0** (#13, #14, #15, #20, #18).
5. Solo a quel punto i task 31 → 34.

**Se serve avanzare subito senza aspettare nuovo materiale grafico:** i P2 (le cinque pagine auth + `AuthLayout`, task 28) e #16 Favorites si possono fare oggi, ricalcando Login e la griglia Subjects. Chiudono il task 28 e parte del 30 senza toccare nessuna delle 8 decisioni.
