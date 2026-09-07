# Revisione della proposta UDA unificate — 6 settembre 2026

**Esito: revisione locale completata e verificata. Proposta didattica da validare collegialmente, non pubblicata da questa revisione.**

## Mandato e perimetro

Richiesta: applicare le modifiche importanti emerse dalla verifica dell’accorpamento, con rigore e tracciabilità. Sono stati modificati esclusivamente la proposta unificata, il suo generatore, la relativa presentazione e documentazione. Non sono stati cambiati i cataloghi d’asse, trasversali e FSL, il PFI, la rosa o il sistema di voto.

Il progetto presentava già numerose modifiche locali, comprese modifiche a sei schede del catalogo d’asse rispetto a HEAD. Il riferimento di questa revisione è lo stato locale acquisito in `prima/`, non il commit HEAD. Non si attribuiscono tali modifiche pregresse a un autore in assenza di evidenze. Il controllo di integrità dimostra la conservazione rispetto a questa base, non certifica la conformità di tutto il curricolo alle fonti ministeriali.

## Base e tracciamento

- `prima/`: copia dei file rilevanti acquisita prima dell’intervento.
- `manifest-prima.json`: SHA-256 della base.
- [MATRICE.md](MATRICE.md): tutte le 25 schede e le rispettive origini.
- [confronto-schede.json](confronto-schede.json): valori prima/dopo dei campi modificati o aggiunti.
- `manifest-dopo.json`: SHA-256 degli artefatti finali elencati, escluso il manifest stesso.
- `esito-controlli.txt`: esiti e condizioni dei controlli.

Sorgenti della proposta: `data-uda.json` per i contenuti ereditati, `tools/genera_uda_unificate.py` per l’accorpamento iniziale e le fasi, `tools/revisione_uda_unificate.json` per le correzioni narrative e le rubriche. Il JSON generato include gli hash dei due file dati e la provenienza per competenza di abilità e saperi, così da non perdere le attribuzioni anche dopo la deduplicazione delle voci visualizzate.

## Decisioni redazionali

| ID | Problema | Modifica e motivazione |
|---|---|---|
| R01 | In U3.5 repertorio dei servizi e animazione erano affiancati | Un solo percorso di accesso a un laboratorio per gli stessi minori e famiglie. Informazioni verificate, fonti e dati mancanti espliciti. |
| R02 | In U4.5 orientamento e animazione riguardavano destinatari differenti | Colloquio, orientamento e animazione riferiti allo stesso gruppo di anziani. La simulazione preparatoria non viene equiparata all’evidenza in contesto reale richiesta dal traguardo C8. |
| R03 | In U5.5 la carta dei servizi veniva soltanto presentata durante l’evento | Diritti, accessibilità e qualità diventano requisiti di progettazione e criteri di valutazione dell’evento dello stesso servizio. |
| R04 | U4.3 e U4.4 rischiavano di duplicare il PAI | U4.3 lavora su routine e ambiente partendo da un PAI fornito; U4.4 collega assistenza, prevenzione e partecipazione, usando il lavoro ambientale come prerequisito. |
| R05 | U5.4 sovrapponeva emergenza, assistenza continuativa e terminalità | Tre moduli distinti, stesso dossier con scenari successivi, evidenze separate e restituzione integrata. Prove pratiche soltanto simulate, con supervisione competente da organizzare. |
| R06 | Il traguardo U5.2 attribuiva il coordinamento dell’équipe | Sostituito con la partecipazione all’équipe, coerente con il traguardo di origine sulla cooperazione. |
| R07 | Rubriche soltanto dichiarate | 48 dimensioni, una per competenza/annualità presente, ciascuna con indicatore, evidenza individuale e quattro livelli descrittivi proposti. Nessuna media automatica fra competenze o conversione in voto/certificazione. «Non osservato» distinto dal livello iniziale; supporti previsti non penalizzanti. |
| R08 | La somma delle ore appariva come nuova durata | Conservata e rinominata somma delle ore originarie. `oreProgettate` e ore delle fasi sono null; attività, insegnamenti e periodo da deliberare. Vietato il doppio conteggio fra proposta e origini nel piano. |
| R09 | Perdita del raccordo alle UDA già sviluppate | Recuperati tutti i cinque riferimenti testuali presenti nelle origini. Non sono presentati come allegati già adattati o verificati: nessun collegamento a documenti è stato inventato. |
| R10 | Due competenze presentate quasi come vincolo normativo; incoerenze sul numero di schede | Chiarito che le coppie sono una scelta progettuale: 23 accorpamenti e 2 autonome, cinque per anno. Più prodotti possono concorrere allo stesso compito. Il numero 25 non vincola la futura scelta collegiale. |
| R11 | PFI e voto citati senza integrazione effettiva della proposta | Limite reso esplicito nella pagina e nella documentazione. Nessuna attivazione implicita. |

## Criterio didattico e fonte

Le [Linee guida ministeriali, Box 8](https://www.istruzioneer.gov.it/wp-content/uploads/2022/08/Linee-guida_parte-generale-1-45.pdf) suggeriscono un numero limitato di competenze e un monte ore adeguato alle attività; non prescrivono due competenze per UDA. Fonte consultata durante la verifica preliminare del 6 settembre 2026. Le rubriche e le riscritture sono elaborazioni progettuali, non citazioni ministeriali. Non è stata svolta in questa revisione una nuova verifica normativa integrale o un confronto testuale di tutti i documenti Word originari.

Le situazioni delle schede sono presentate come scenari didattici proposti: non attestano bisogni rilevati sul territorio né accordi esistenti con partner. La disponibilità di persone, servizi e laboratori deve essere confermata.

## Ore: dato, decisione e limite

| Annualità | Somma delle ore di origine, invariata | Ore del piano accorpato |
|---|---|---|
| 1 | 92–113 | Da deliberare |
| 2 | 107–132 | Da deliberare |
| 3 | 174–200 | Da deliberare |
| 4 | 183–208 | Da deliberare |
| 5 | 161–190 | Da deliberare |

Non sono state applicate percentuali di riduzione arbitrarie. La pianificazione propone quattro fasi per scheda, specifiche per U3.3, U4.3 e U5.4; negli altri casi costituiscono una traccia da articolare sul compito. Ogni consiglio di classe deve attribuire attività, ore, insegnamenti e periodo, individuando le attività comuni da contare una sola volta. In U3.3 (58–60 ore originarie) e U4.3 (63–66) va verificata in particolare la sostenibilità del calendario.

## Verifica e riproduzione

Dalla radice del progetto:

```sh
python3 tools/genera_uda_unificate.py
python3 tools/verifica_uda_unificate.py
node --check uda-unificate.js
python3 -m http.server 8766 --bind 127.0.0.1
```

In un secondo terminale, con Playwright disponibile e un Chromium installato:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/verifica_uda_unificate.cjs
```

Nel controllo eseguito Playwright è stato caricato dal runtime Codex tramite `NODE_PATH`, usando Chrome installato con profilo temporaneo isolato. Il browser incluso nella versione corrente di Playwright non era installato; non sono state installate dipendenze nel progetto. Il controllo blocca le richieste HTTPS esterne: non verifica i font remoti o la produzione.

Controlli superati: 48 origini presenti una sola volta; 25 schede; nessun cambio di annualità; traguardi, abilità, saperi e attribuzioni conservati; rubriche complete; cinque riferimenti; assenza di ore inventate; cataloghi/PFI/voto invariati rispetto allo snapshot; rigenerazione identica; hash coerenti; sintassi Python/JavaScript; `git diff --check`. Nel browser: filtro anche sulla seconda competenza, anno, ricerca, reset, 25 schede nel contenitore principale, assenza di errori JavaScript, nessuna eccedenza orizzontale a 390 px; stampa singola U5.4 con rubriche aperte nella sola copia e stato originale preservato. Screenshot mobile ispezionato visivamente. Il controllo di stampa riguarda struttura e apertura dei contenuti della scheda campione, non una revisione tipografica di tutte le pagine di tutte le UDA.

## Decisioni collegiali ancora necessarie

Confermare gli accorpamenti scheda per scheda, anche sciogliendo quelli non sostenibili; attribuire e deliberare le ore; confermare partner e laboratori; validare indicatori, livelli e prove rispetto alla classe e ai supporti previsti; controllare e adattare i materiali estesi già sviluppati; concordare successivamente l’eventuale integrazione nel PFI e nella rosa di voto. Nessuna di queste decisioni è presentata come già assunta.

## Evidenze conservate

[Schermata desktop](evidenze/desktop.png) · [Schermata mobile](evidenze/mobile.png) · [Stampa campione U5.4](evidenze/U5.4.pdf).
