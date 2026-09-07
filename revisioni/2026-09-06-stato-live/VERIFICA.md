# Cosa resta da pubblicare — 6 settembre 2026

Verifica in sola lettura di chat Codex pertinenti, registri locali, GitHub Pages, ultimi commit remoti e Supabase. Nessun push, deploy, migrazione o modifica dei contenuti del sito eseguito. Questo registro è l'unico documento aggiunto dalla verifica.

## Risultato decisivo

La cartella non è una copia completa dell'attuale produzione. HEAD locale: `3c6648e`, branch `verifica-votazione-uda`; ultimo commit restituito dall'API GitHub: `0605bde12fc9`, «I file Word e Excel adesso si aprono davvero (#10)». Il riferimento locale origin/main è arretrato: la sua coincidenza con HEAD non prova l'allineamento remoto.

Prima del rilascio occorre integrare il lavoro locale con la versione remota, conservando entrambe le serie di miglioramenti. In particolare mancano localmente `assets/documento-office.js`, `piano-uda.html` e `piano-uda.js`; il sito pubblico richiama i primi due, e il commit remoto documenta la correzione delle esportazioni. Il Piano delle UDA del coordinatore è distinto dalla stampa del piano nel PFI: i test locali di quest'ultima non verificano automaticamente la pagina autonoma online.

## Da portare online

| Lavoro | Evidenza e passaggio mancante |
|---|---|
| UDA unificate | Pagina, JS, CSS e JSON restituiscono 404 sul sito pubblico. Versione locale finale: 27 schede, 21 accorpamenti e 6 autonome, 48 origini coperte una volta; distribuzione 4/7/5/5/6. Pubblicare il riordino finale e l'integrazione PFI, non le precedenti versioni a 25 schede. |
| UDA monografiche | Pagina, JS e CSS assenti online. Mancano nel database le tabelle `curricolo_uda_idee` e `curricolo_uda_idee_storia`. Applicare lo schema dedicato e distribuire il servizio con `idee.ts`, poi collaudare salvataggio, rilettura da seconda sessione, modifica e storico. Le precedenti prove erano simulate. |
| Progettazione annuale | Pagina assente online. Pubblicare la sezione vuota come richiesto, insieme alla navigazione. |
| PFI | Le versioni pubbliche di HTML e JS differiscono dalle locali. Integrare UUID, recupero ID duplicati, competenze generali, livelli per competenza, provenienza, unificate e blocco del doppio conteggio, periodi e riepilogo. Conservare contemporaneamente le esportazioni Office già corrette online. |
| Stampe | `assets/stampa.js` e `assets/stampa.css` restituiscono 404. Portare il sistema comune e i collegamenti/versioni delle pagine coinvolte, integrandolo con le esportazioni e il Piano del coordinatore già online. Il registro delle correzioni del 6 settembre documenta PASS di PFI autonomo/integrato e tre rubriche; nessun nuovo test funzionale è stato eseguito in questo audit. |
| Oscuramento votazione | Online sono ancora presenti linguetta e pagina con ingresso nella votazione e caricamento del relativo JS. La sospensione locale non è pubblicata. Pubblicare la sospensione; la riapertura resta rinviata. |
| Modifiche del catalogo d'asse e ore | `data-uda.json` e `data-ripartizione-ore.json` live coincidono con HEAD ma differiscono dai file locali. Sono modifiche ulteriori da includere consapevolmente: testi/attribuzioni disciplinari e ripartizione della 1.5 con “Scienze Umane (II ANNO)” senza ore associate. Non sono soltanto modifiche grafiche. |

## Già online / da conservare

- Cataloghi esistenti d'asse, trasversali e FSL, revisione docenti e ripartizione oraria sono già presenti. Il JSON delle trasversali coincide esattamente con la copia locale: non è una nuova sezione ancora da attivare.
- Le correzioni Office del commit remoto `0605bde12fc9`, il Piano delle UDA del coordinatore e miglioramenti mobile della ripartizione oraria non sono tutti nella cartella. Non sovrascriverli con file locali più vecchi.
- Il servizio Supabase `curricolo-uda-revisioni` è ACTIVE, versione 6. Contiene già il salvataggio delle ore e i controlli su discipline e anno/categoria nel voto. Le vecchie note sulla versione 5 da distribuire sono superate.
- La funzione attiva conserva le azioni del sistema precedente `votes`, `vote`, `ballot`, `choice`; non contiene `ideas-list` / `ideas-save`. Le tabelle del nuovo voto `curricolo_uda_votazione_stelle` / `curricolo_uda_valutazioni` non sono presenti. La riapertura del nuovo sistema richiede un lavoro distinto, non necessario per oscurarlo.

## Ordine operativo per un futuro rilascio

1. Conservare una copia delle modifiche locali e integrare l'ultimo main remoto, risolvendo i conflitti di PFI, esportazioni, stampe e navigazione.
2. Preparare un insieme coerente con UDA unificate definitive, monografiche, progettazione annuale vuota e voto sospeso.
3. Attivare e verificare il backend delle idee prima di presentare la sezione come funzionante; collaudare nuovamente le funzioni condivise di revisione dopo il deploy.
4. Verificare PFI e sue bozze, Word/Excel reali, stampe, Piano autonomo del coordinatore, menu e mobile sulla versione integrata.
5. Pubblicare e confrontare i file live, evitando la riapertura del voto e la pubblicazione involontaria degli archivi `revisioni/*/prima/`. L'attuale `_config.yml` esclude solo `supabase/` e `tools/`: verificare la configurazione effettiva del pacchetto prima del rilascio.

## Fonti e limiti

Chat: «Verifica accorpamento UDA d'asse», «Completa stampe Claude bloccate», «Individua le UDA trasversali», «Aggiorna UDA con accesso docenti». Per la chat odierna il lettore dell'app restituiva turni vuoti: le richieste sono state recuperate dal registro di sessione locale e confrontate con i registri degli interventi. Non si attesta di aver letto chat Claude non disponibili.

Registri principali: `../2026-09-06-riordino-applicato/REGISTRO.md`, `../2026-09-06-correzioni-piano/REGISTRO.md`, `../2026-09-06-testi-sezioni/REGISTRO.md`; verifica votazione in `interventi/VERIFICA-VOTAZIONE-UDA-2026-09-05.md`.

Confrontati 50 file pubblici corrispondenti a file locali: 17 identici, 23 disponibili ma diversi, 10 assenti (404). Confronto byte per byte con curl e verifica TLS attiva. Elenco allegato in `confronto-file.json`. Controllo browser della homepage pubblica e lettura metadati/schema Supabase senza dati di studenti o docenti.

Destinazione verificata: https://salvapicconi.github.io/conoscenzessas2025/ . Non è stato identificato né verificato un eventuale indirizzo Netlify. La menzione dei crediti Netlify nella chat non dimostra l'allineamento di un secondo ambiente.
