# Nove UDA d'asse dalle proposte interdisciplinari — 7 settembre 2026

Le otto unità di apprendimento redatte dalla collega sono state portate nel fascicolo
delle UDA d'asse, più una nona nata dalla proposta di lavoro condiviso sulla ricerca
sociale. Il fascicolo passa da 48 a 57 schede.

Le nove proposte sono mostrate anche nella pagina delle UDA unificate, accanto alle 27
schede consolidate e con il badge **NUOVA**. La collocazione è espositiva: i dati e lo
status delle proposte restano distinti da quelli delle UDA già unificate.

Gli originali in formato ODT sono in `originali-collega/`; le copie dei file del sito
prima dell'intervento sono in `prima/`.

## Che cosa è stato creato

| id | titolo | anno | competenza | ore |
| --- | --- | --- | --- | --- |
| 1.10 | Diventare parte della società: i percorsi della socializzazione | 1 | C3 | 28 |
| 1.11 | Imparare a lavorare insieme: dinamiche di gruppo e comunicazione | 1 | C2 | 32 |
| 2.10 | La famiglia ieri e oggi: leggere le relazioni del contesto umano | 2 | C3 | 28 |
| 2.11 | Le famiglie nei racconti: modelli familiari nei prodotti culturali | 2 | C3 | 32 |
| 3.11 | Imparare giocando: il gioco come strumento di sviluppo | 3 | C4 | 32 |
| 4.11 | Conoscere per orientare: bisogni e servizi per la disabilità | 4 | C4, C7 | 38 |
| 5.11 | L'anziano nella società: dalla percezione al ruolo attivo | 5 | C4, C9 | 38 |
| 5.12 | Parole che curano: raccontare la salute mentale, superare lo stigma | 5 | C3, C9 | 42 |
| 5.13 | Ricerca quantitativa e ricerca qualitativa. Dai dati le informazioni, dalle informazioni al progetto | 5 | C10 | 20–25 |

Per le otto UDA provenienti dagli ODT il monte ore è quello indicato dalla collega, non
modificato. La 5.13 non ha un originale ODT: titolo, impianto e intervallo di 20–25 ore
sono stati autorizzati espressamente dall'utente il 7 settembre 2026.

Le competenze dichiarate negli originali sono conservate anche quando sono due: C4 e C7
per la 4.11, C4 e C9 per la 5.11, C3 e C9 per la 5.12. Il campo `competenza` resta come
riferimento primario per compatibilità tecnica; il campo `competenze` rappresenta la
dichiarazione completa usata da filtri, schede ed esportazioni.

Le unità dichiarate «Biennio · Classe I / II» sono state distribuite fra primo e secondo
anno: in prima il sé e il gruppo (socializzazione, lavoro di gruppo), in seconda la
famiglia letta con i dati e con i prodotti culturali, così che l'indagine della 2.10
possa poggiare sul metodo già acquisito con la 1.9.

## Attribuzione agli insegnamenti

Abilità e saperi sono attribuiti agli insegnamenti che il curricolo d'indirizzo indica
per quella competenza (`data-area-indirizzo.json`, Allegato C), non secondo la
ripartizione oraria proposta nei documenti originali. Le ore per materia sono ricalcolate
da `tools/genera_ripartizione_ore.py` in proporzione al quadro orario dell'istituto.

Dove la collega assegna un contenuto a un insegnamento che l'Allegato C non prevede per
quella competenza, la voce resta ma porta la dicitura **«(attribuzione di dipartimento)»**.
La convenzione è spiegata in `meta.notaPiano` di `data-uda.json`.

Le attribuzioni di dipartimento introdotte:

- **1.10** — Italiano sull'intervista e sul testo espositivo. La C3 del biennio prevede
  Scienze umane, Storia, TIC e Diritto.
- **1.11** — Metodologie operative sulla conduzione dell'attività e TIC sulla
  presentazione multimediale. La C2 del biennio prevede Scienze umane, Italiano, Inglese
  e Spagnolo.
- **2.10** — Diritto sugli istituti giuridici della famiglia. Nella C3 Diritto compare
  solo per la privacy e i dati sensibili.
- **2.11** — Italiano sull'analisi del testo narrativo e filmico, Inglese sul confronto
  interculturale.
- **3.11** — Psicologia sul gioco come funzione dello sviluppo e sulle tipologie di gioco
  per fascia evolutiva. La C4 del terzo anno si ferma alle tecniche di osservazione e
  accudimento in età evolutiva.
- **4.11** — Igiene e Psicologia sulla classificazione ICF; Diritto e T.A. sui requisiti
  di accesso ai servizi. La C7 del quarto anno prevede Psicologia, Metodologie operative,
  TIC e Matematica.
- **5.11** — Psicologia sul pregiudizio di età e l'invecchiamento attivo.
- **5.12** — Italiano sullo stigma linguistico e sui testi di campagna; Diritto e T.A. sui
  servizi per la salute mentale. La C9 del quinto anno prevede solo Psicologia e
  Metodologie operative.
- **5.13** — Psicologia sulla costruzione del campione e del questionario, sul gruppo di
  discussione e sull'etica della ricerca. La C10 del quinto anno prevede Matematica,
  Metodologie operative e Diritto e T.A.

## Dove il curricolo colloca la ricerca quantitativa e qualitativa

La coppia compare due volte nel curricolo d'indirizzo:

- **C10, biennio** — nella competenza intermedia: «raccogliere e organizzare dati
  qualitativi e quantitativi di una realtà sociale o relativi ad un servizio».
- **C10, terzo anno** — come conoscenza: «Tecniche di base per la rielaborazione
  quantitativa e qualitativa dei dati», attribuita a **Matematica e TIC**.

Negli anni successivi la statistica prosegue ma cambia oggetto: inferenza previsionale al
quarto anno, correlazione e regressione in contesti operativi al quinto, entrambe
attribuite a Matematica. Il versante qualitativo, nel triennio, sta altrove: le tecniche
dell'intervista e del colloquio sono conoscenza della **C7 del quarto anno**, attribuita a
**Psicologia generale ed applicata e Metodologie operative**.

Ne segue che l'assetto proposto — Psicologia sulla parte quantitativa, Metodologie
operative su quella qualitativa — inverte l'attribuzione del curricolo, che affida i
numeri a Matematica e mette Psicologia sul colloquio. Nella 5.13 Psicologia c'è su
entrambi i versanti, ma sul quantitativo la voce è segnata come attribuzione di
dipartimento e Matematica resta titolare della statistica.

Il posizionamento in quinta è una ripresa a livello 4 di una conoscenza che il curricolo
colloca in terza: legittima, perché la competenza intermedia del quinto anno chiede la
padronanza piena, e perché la 5.13 aggiunge il passaggio che in terza non c'è, dalle
informazioni al progetto (C1 del quinto anno, «La progettazione nei servizi»,
Metodologie operative).

## Sovrapposizioni note

- **1.11** ripete in gran parte la **2.2** «Un'iniziativa per la scuola», che ha già
  l'accoglienza delle classi prime con ruoli e verbali. Se il collegio non le vuole
  entrambe, questa è la prima da lasciare.
- **4.11** e la **4.7** «Sportello orienta-servizi» condividono il colloquio di
  orientamento; la 4.11 aggiunge l'ICF e il confronto fra bisogni rilevati e servizi
  esistenti.
- **5.13** e la **5.10** «Monitorare e valutare» stanno entrambe sulla C10 del quinto
  anno: la 5.10 guarda alla qualità e all'accreditamento, la 5.13 alla ricerca che precede
  il progetto.

## Da valutare

La ripartizione automatica delle ore segue il quadro orario, non il peso didattico. Nella
3.11 il risultato è Igiene 10 ore e Diritto e T.A. 8 contro le 8 di Psicologia e le 6 di
Metodologie operative, mentre la collega proponeva Metodologie operative 12 e Psicologia
10. Il sito consente al docente autenticato di correggere la proposta entro il 40%.

Restano fuori dalle schede, perché il fascicolo non ha i campi corrispondenti, gli
argomenti svolti, le competenze chiave europee e le griglie di valutazione per singola
UDA. Le griglie della collega sono le più concrete disponibili — con soglie osservabili —
e meritano di essere recuperate accanto alle rubriche generali.

## File toccati

- `data-uda.json` — nove schede nuove, nota sulla convenzione in `meta.notaPiano`
- `data-ripartizione-ore.json` e `RIPARTIZIONE-ORE-UDA.md` — rigenerati (75 UDA ripartite)
- `uda.html`, `uda.js`, `pfi.html`, `pfi.js`, `README.md` — conteggio del catalogo
- `uda-unificate.html`, `uda-unificate.js`, `uda-unificate.css` — visualizzazione delle
  27 UDA unificate insieme alle nove proposte riconoscibili dal badge `NUOVA`
