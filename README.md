# Curricolo Verticale SSAS

Sito interattivo per la consultazione del curricolo verticale dell'indirizzo **Servizi per la Sanità e l'Assistenza Sociale** — IIS Meucci-Mattei Cagliari, sede di Decimomannu.

Contenuti conformi al D.M. 24 maggio 2018, n. 92, Allegato C. I dati dell'area di indirizzo sono allineati al file ufficiale `definitivo_curricolo_ssas_area_indirizzo.xlsx`.

Sito pubblicato: https://salvapicconi.github.io/conoscenzessas2025/

## Sezioni

- **Area di Indirizzo** — apre con il **Curricolo illustrato per immagini**, un percorso narrativo dal biennio al profilo in uscita; seguono le 10 competenze declinate su Biennio, Terzo, Quarto e Quinto anno (39 schede: competenza intermedia, abilità, conoscenze, insegnamenti coinvolti), con filtri, ricerca, raggruppamento e statistiche per insegnamento calcolate dai dati.
- **Area Generale** — le 12 competenze dell'area generale con assi culturali, abilità e conoscenze.
- **UDA d'asse unificate** — 27 schede proposte per il dipartimento nella navigazione principale. Le 57 schede precedenti (48 di base e 9 proposte interdisciplinari della collega) restano come catalogo storico, raggiungibile dalla proposta ma non esposto come percorso parallelo. Le indicazioni della Prof.ssa Manca, le attribuzioni integrative di Metodologie operative e i relativi effetti sulle ore sono documentati nel [registro del 7 settembre](revisioni/2026-09-07-indicazioni-manca/REGISTRO.md).
- **UDA unificate** — proposta di 21 accorpamenti e 6 schede autonome: quattro in prima, sette in seconda, cinque in terza e quarta, sei in quinta, derivata da tutte le 48 UDA d’asse. Revisione del 6 settembre 2026: compiti integrati, rubriche proposte per ciascuna competenza, riferimenti ai materiali originari e pianificazione da deliberare. Le ore visualizzate sono la somma di origine, non una nuova durata validata. Il catalogo è disponibile nel PFI come proposta, con controllo del doppio conteggio delle origini; non è inserito automaticamente nella votazione. Dati generati da `tools/genera_uda_unificate.py` con `tools/revisione_uda_unificate.json`. [Registro, motivazioni e controlli](revisioni/2026-09-06-riordino-applicato/REGISTRO.md).
- **UDA monografiche · Proposte dei docenti** — idee libere, una o più per docente, con tema, profilo scientifico e culturale, descrizione, attualità e possibile sviluppo individuale o trasversale. Nessun vincolo di competenza, annualità o ore. Archivio condiviso con storico e servizio Supabase attivati nel rilascio del 7 settembre 2026. Gli autori modificano le proprie idee, gli altri docenti autenticati le consultano. Controllo di versione contro le sovrascritture e storico nel database.
- **Progettazione didattica annuale** — nuova sezione inizialmente vuota, senza proposte o modelli precompilati.
- **UDA trasversali · Tutte le materie** — catalogo autonomo e progressivo di UDA interdisciplinari, filtrabili per anno, asse e insegnamento, predisposto per modifica, revisione e creazione condivisa.
- **Ripartizione oraria** — in ogni scheda UDA le ore sono divise fra gli insegnamenti coinvolti in proporzione al quadro orario dell'istituto e compaiono accanto a ciascuna materia; l'intestazione indica la durata minima in settimane. A docente autenticato la proposta è modificabile entro il 40% e il sito avvisa quando la somma non copre il monte ore dell'UDA.
- **Votazione UDA** — temporaneamente sospesa: nessun ingresso nei menu, URL diretto con avviso e scritture di voto bloccate sul server.
- **Navigazione** — le pagine aperte da sole hanno in alto una barra fissa con il ritorno al curricolo e le sezioni disponibili; nella pagina principale, quando le linguette escono dallo schermo, compare in basso una barra rapida per cambiare sezione. Gli indirizzi `index.html#unificate`, `#trasversali`, `#fsl`, `#esame` e simili aprono direttamente la sezione.
- **UDA FSL** — quattro UDA adattabili alle esperienze del triennio: area minori, disabilità, anziani e preparazione sanitaria/possibile raccordo OSS; coinvolgono solo le quattro discipline d'indirizzo definite dall'istituto.
- **UDA Esame di Stato** — struttura di lavoro autonoma per due UDA in terza, due in quarta e due in quinta. Assume le indicazioni RE.NA.I.SAN.S. 2024 come base metodologica del compito atteso, mantiene separate le tipologie A-D e distingue quadro d'esame, curricolo e successive scelte progettuali. Le sei schede sono predisposte ma non ancora compilate e non alimentano il PFI o la votazione.
- **Piano delle UDA** — pagina del coordinatore con cataloghi originari e 27 unificate come proposte, periodi, bozza nel browser, controllo del doppio conteggio ed esportazione Word/PDF. La compilazione non attesta una delibera.
- **PFI** — progetto formativo individuale compilabile con scelta delle UDA dai cataloghi, incluse le unificate come proposte.
- **Rubriche di Valutazione** — rubriche per competenze con pesi configurabili e calcolo del voto ponderato (disponibili: Metodologie Operative biennio, classe 3ª e classi 4ª-5ª; le altre discipline sono in preparazione).

## Esportazioni

- **Excel** — tabella del curricolo (rispetta i filtri attivi)
- **Word** — modello di Piano di Lavoro individuale precompilato con competenze, abilità e conoscenze
- **JSON** — dati grezzi

Tutte le esportazioni Office producono veri pacchetti `.docx` / `.xlsx` mediante `assets/documento-office.js`.

## Stampa e PDF

Tutte le sezioni dispongono di stampa A4 dedicata, utilizzabile anche dalla
pagina principale. I pannelli chiusi vengono aperti soltanto nella copia di
stampa; testi, valori e filtri del documento originale restano invariati.

Nei tre cataloghi UDA sono disponibili:

- **Stampa questa UDA**, su ogni scheda: contenuti completi e ripartizione oraria.
- **Stampa UDA visualizzate**: tutte le schede corrispondenti ai filtri attivi.
- **Stampa UDA selezionate**: le schede spuntate, anche dopo un cambio di filtro.
  La selezione vale nella pagina corrente e si azzera ricaricandola.
- **Stampa piano UDA**: riepilogo di titoli, durata, insegnamenti, ore, compiti
  e prodotti delle schede selezionate, oppure di quelle visualizzate se nessuna
  è selezionata.

Nel PFI, **Stampa / PDF** esporta tutto il documento, inclusi i testi lunghi e
tutte le annualità. **Stampa piano UDA** esporta soltanto intestazione, classe,
nome dello studente e piano delle UDA inserite nel PFI, anche da cataloghi diversi.
Le aree di indirizzo e generale hanno **Stampa / PDF — sezione corrente**;
le rubriche conservano **Stampa Scheda** per il risultato della valutazione.
La medesima preparazione interviene con il comando Stampa del browser.

La gestione condivisa è in `assets/stampa.js` e `assets/stampa.css`.
I controlli richiedono Node, Playwright, un browser Chromium installato e un
server locale sulla porta 8765. Producono PDF con dati fittizi nella cartella
temporanea di sistema, senza scritture sul backend.

    python3 -m http.server 8765 --bind 127.0.0.1
    node tools/verifica_stampa.cjs
    node tools/verifica_stampa_cataloghi.cjs
    node tools/verifica_uda_esame.cjs

Il primo controllo copre PFI e rubriche. Il secondo copre i 75 elementi dei
cataloghi, stampa singola e selezione fra filtri, piani, pagina principale e
aree del curricolo. Il terzo verifica la nuova sezione Esame, le quattro tipologie
separate, i sei spazi di progettazione, la 5.13 e le UDA con più competenze.
Sono configurabili `STAMPA_BASE_URL`, `UDA_BASE_URL` e
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Struttura del progetto

- `index.html` + `script-main.js` + `style-main.css` — pagina principale con le tab
- `area-indirizzo.html` + `script.js` + `style.css` + `curricolo-illustrato.css` — curricolo area di indirizzo e racconto visuale
- `assets/curricolo-illustrato/` — quattro illustrazioni WebP ottimizzate e prompt di produzione
- `area-generale.html` + `area-generale.js` + `area-generale.css` — curricolo area generale
- `uda.html` + `uda.js` + `data-uda.json` — UDA d'asse
- `uda-trasversali.html` + `uda-trasversali.js` + `data-uda-trasversali.json` — UDA trasversali
- `uda-fsl.html` + `uda-fsl.js` + `data-uda-fsl.json` — UDA per la Formazione scuola-lavoro
- `uda-esame.html` + `uda-esame.js` + `uda-esame.css` + `data-uda-esame.json` — struttura delle UDA per la preparazione progressiva alla prova professionale
- `assets/uda-revisione.js` + `assets/uda-revisione.css` — modifica e revisione collegiale dei tre cataloghi; saperi documentali protetti e integrazioni libere
- `assets/insegnamenti.js` — riconoscimento dei nomi degli insegnamenti: la stessa materia scritta in maiuscolo, per esteso, abbreviata o con un'annotazione fra parentesi resta una sola, per colori, filtri, stampe e ripartizione oraria; `tools/verifica_insegnamenti.cjs` controlla che nessun nome usato nei cataloghi resti fuori
- `assets/uda-ore.js` — ripartizione oraria delle UDA per insegnamento: proposta proporzionale, modifica del docente entro il 40% e avviso quando il monte ore non torna
- `votazione-uda.html` + `votazione-uda.js` + `votazione-uda.css` — area autonoma di voto: accesso docente condiviso, rosa collegiale unica, valutazione 1–5 stelle e un solo salvataggio
- `assets/navigazione.js` + `assets/navigazione.css` — navigazione fra le sezioni: barra fissa nelle pagine autonome, barra rapida nella pagina principale, niente quando la pagina è dentro un iframe
- `data-quadro-orario.json` — quadro orario dell'istituto, sorgente unica dei pesi della ripartizione
- `data-ripartizione-ore.json` + `RIPARTIZIONE-ORE-UDA.md` — ripartizione calcolata e sua versione stampabile, generate da `tools/genera_ripartizione_ore.py`
- `data-area-indirizzo.json` — dati area di indirizzo (fonte: Excel definitivo)
- `data-area-generale.json` — dati area generale
- `correzioni_competenze.json` — correzioni opzionali ai titoli delle competenze
- `rubrica.html` — rubrica di valutazione multi-materia (parametro `?materia=`)
- `rubrica_metodologie_3.html`, `rubrica_metodologie_4_5.html` — rubriche Metodologie Operative triennio
- `tools/` — script di supporto e modello di programmazione

## Aggiornamento dei dati

I contenuti del curricolo vivono nei due file JSON: modificando quelli, statistiche e contatori del sito si aggiornano automaticamente. Per l'area di indirizzo la fonte di riferimento è il file Excel definitivo.

La ripartizione oraria non si scrive a mano. Dopo ogni modifica al quadro orario o al monte ore di una UDA va rigenerata:

    python3 tools/genera_ripartizione_ore.py


## Pubblicazione

Il sito è statico (HTML/CSS/JS, nessuna dipendenza esterna) ed è pubblicato con GitHub Pages dal branch `main`, cartella root. Ogni push su `main` aggiorna il sito.

## Rilascio integrato del 7 settembre 2026

Integra il main remoto `0605bde` con le revisioni locali delle UDA, del PFI e delle stampe. Archivio `revisioni/` escluso da GitHub Pages insieme a strumenti, backend e materiali interni. Il PFI conserva la modalità dimostrativa: non inserire dati di studenti reali. La progettazione annuale rimane vuota su richiesta.
