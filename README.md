# Curricolo Verticale SSAS

Sito interattivo per la consultazione del curricolo verticale dell'indirizzo **Servizi per la Sanità e l'Assistenza Sociale** — IIS Meucci-Mattei Cagliari, sede di Decimomannu.

Contenuti conformi al D.M. 24 maggio 2018, n. 92, Allegato C. I dati dell'area di indirizzo sono allineati al file ufficiale `definitivo_curricolo_ssas_area_indirizzo.xlsx`.

Sito pubblicato: https://salvapicconi.github.io/conoscenzessas2025/

## Sezioni

- **Area di Indirizzo** — apre con il **Curricolo illustrato per immagini**, un percorso narrativo dal biennio al profilo in uscita; seguono le 10 competenze declinate su Biennio, Terzo, Quarto e Quinto anno (39 schede: competenza intermedia, abilità, conoscenze, insegnamenti coinvolti), con filtri, ricerca, raggruppamento e statistiche per insegnamento calcolate dai dati.
- **Area Generale** — le 12 competenze dell'area generale con assi culturali, abilità e conoscenze.
- **UDA d'asse** — 48 schede del quinquennio, filtrabili per anno, competenza e insegnamento, con area collegiale per annotazioni e proposte.
- **UDA trasversali · Tutte le materie** — catalogo autonomo e progressivo di UDA interdisciplinari, filtrabili per anno, asse e insegnamento, predisposto per modifica, revisione e creazione condivisa.
- **Ripartizione oraria** — in ogni scheda UDA le ore sono divise fra gli insegnamenti coinvolti in proporzione al quadro orario dell'istituto e compaiono accanto a ciascuna materia; l'intestazione indica la durata minima in settimane. A docente autenticato la proposta è modificabile entro il 40% e il sito avvisa quando la somma non copre il monte ore dell'UDA.
- **Scelta delle UDA da attivare** — si vota in due tempi: dopo la consultazione viene messa al voto una rosa di UDA, poi ogni docente esprime due voti per anno di corso e vince chi ne raccoglie di più. La classifica è consultiva e diventa ufficiale quando viene confermata da chi ha i permessi di gestione.
- **Navigazione** — le pagine aperte da sole hanno in alto una barra fissa con il ritorno al curricolo e le sette sezioni; nella pagina principale, quando le linguette escono dallo schermo, compare in basso una barra rapida per cambiare sezione. Gli indirizzi `index.html#uda`, `#trasversali`, `#fsl` e simili aprono direttamente la sezione.
- **UDA FSL** — quattro UDA adattabili alle esperienze del triennio: area minori, disabilità, anziani e preparazione sanitaria/possibile raccordo OSS; coinvolgono solo le quattro discipline d'indirizzo definite dall'istituto.
- **PFI** — progetto formativo individuale compilabile con scelta delle UDA dai tre cataloghi.
- **Piano delle UDA** — pagina del coordinatore: dopo il confronto in consiglio di classe si spuntano le UDA deliberate (o si importa la scelta già confermata dal collegio), si indica il periodo di svolgimento e si stampa l'allegato alla programmazione di classe, completo di deliberazione, prospetto delle unità, ripartizione del monte ore per insegnamento, schede sintetiche, riferimenti normativi e spazio per le firme.
- **Rubriche di Valutazione** — rubriche per competenze con pesi configurabili e calcolo del voto ponderato (disponibili: Metodologie Operative biennio, classe 3ª e classi 4ª-5ª; le altre discipline sono in preparazione).

## Esportazioni

- **Excel** — tabella del curricolo (rispetta i filtri attivi)
- **Word** — modello di Piano di Lavoro individuale precompilato con competenze, abilità e conoscenze
- **Scheda UDA** — ogni scheda dei tre cataloghi si scarica in Word o si stampa in PDF nel format dell'unità di
  apprendimento delle Linee guida (D.M. 766/2019, Box n. 8): le sezioni ricavabili dal curricolo escono compilate,
  quelle su fasi, accompagnamento dei docenti, documentazione e rubrica escono predisposte da completare in consiglio
- **Piano delle UDA** — il documento del coordinatore, in Word o in PDF
- **JSON** — dati grezzi

Il file Word è HTML con le estensioni Office (formato A4, margini e piè di pagina numerato): si apre in Word e in
LibreOffice senza conversioni. La stampa passa da un foglio nascosto, così funziona anche quando la pagina è dentro
l'iframe della pagina principale.

## Riferimenti normativi citati nei documenti

D.Lgs. 13 aprile 2017, n. 61 (art. 2 c. 1 — definizione di UdA; art. 5 c. 1 lett. b, c, d, f); D.M. 24 maggio 2018,
n. 92 (art. 4 c. 6 e c. 7, art. 6 c. 4, Allegati 2-I e 3-I); Linee guida D.M. 23 agosto 2019, n. 766 (Box n. 7 e n. 8,
§ 3.2.2); D.Lgs. 16 aprile 1994, n. 297 art. 5 c. 8 (presidenza del consiglio di classe, base della funzione di
coordinatore); D.P.R. 8 marzo 1999, n. 275 art. 4; D.Lgs. 13 aprile 2017, n. 62; L. 20 agosto 2019, n. 92 e D.M.
7 settembre 2024, n. 183; Raccomandazione del Consiglio UE 22 maggio 2018.

## Struttura del progetto

- `index.html` + `script-main.js` + `style-main.css` — pagina principale con le tab
- `area-indirizzo.html` + `script.js` + `style.css` + `curricolo-illustrato.css` — curricolo area di indirizzo e racconto visuale
- `assets/curricolo-illustrato/` — quattro illustrazioni WebP ottimizzate e prompt di produzione
- `area-generale.html` + `area-generale.js` + `area-generale.css` — curricolo area generale
- `uda.html` + `uda.js` + `data-uda.json` — UDA d'asse
- `uda-trasversali.html` + `uda-trasversali.js` + `data-uda-trasversali.json` — UDA trasversali
- `uda-fsl.html` + `uda-fsl.js` + `data-uda-fsl.json` — UDA per la Formazione scuola-lavoro
- `piano-uda.html` + `piano-uda.js` + `piano-uda.css` — Piano delle UDA del consiglio di classe: dati della seduta,
  scelta delle unità sui tre cataloghi, riepilogo del monte ore e stampa dell'allegato; la bozza resta nel browser
  di chi compila
- `assets/uda-documento.js` — motore documentale condiviso: compone le schede UDA e il Piano, produce il file Word
  e la stampa PDF, e tiene in un solo posto i riferimenti normativi
- `assets/uda-stampa.js` — comandi «Scarica in Word» e «Stampa / PDF» in testa a ogni scheda dei tre cataloghi
- `assets/uda-revisione.js` + `assets/uda-revisione.css` — modifica e revisione collegiale dei tre cataloghi; saperi documentali protetti e integrazioni libere
- `assets/uda-ore.js` — ripartizione oraria delle UDA per insegnamento: proposta proporzionale, modifica del docente entro il 40% e avviso quando il monte ore non torna
- `assets/uda-voto.js` — spazio di votazione separato dalla revisione, accessibile con le stesse credenziali: rosa messa al voto, un voto per docente e due per anno, classifica consultiva e conferma della scelta
- `assets/navigazione.js` + `assets/navigazione.css` — navigazione fra le sette sezioni: barra fissa nelle pagine autonome, barra rapida nella pagina principale, niente quando la pagina è dentro un iframe
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
