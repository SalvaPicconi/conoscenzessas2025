# Testi SSAS e nuovi spazi dei docenti — 6 settembre 2026

## Stato

Modifiche locali verificate. Nessuna pubblicazione o attivazione del nuovo servizio condiviso eseguita. Questa revisione segue quella documentata in `revisioni/2026-09-06-uda-unificate/`; i relativi snapshot storici non sono stati modificati.

## Indicazioni del docente

- Spostare U1.1 in seconda mantenendola distinta dai servizi per i coetanei di U2.1: conferma esplicita di conservare entrambe.
- Migliorare i testi rispetto al profilo SSAS, senza modificare i saperi essenziali del curricolo e senza affermare attività pregresse non documentate.
- Aggiungere «UDA monografiche · Proposte dei docenti»: una o più idee per docente, modificabili, senza organizzazione obbligatoria per competenze.
- Aggiungere uno spazio per la progettazione didattica annuale, per ora vuoto.

## Modifiche applicate

**Collocazione.** U1.1 è in seconda; l’identificativo è mantenuto per non rompere la tracciabilità con le schede 1.1 e 1.7. È registrata un’eccezione esplicita nel generatore, limitata a questa scheda: non viene consentito lo spostamento indistinto delle altre. U2.1 resta autonoma. Distribuzione: 4 schede in prima, 6 in seconda, 5 per anno nel triennio. Le 48 origini restano coperte una sola volta. Il catalogo d’asse originario è invariato.

**Testi.** U1.1 riguarda la rete generale dei servizi alla persona e l’informazione alle famiglie; U2.1 si concentra su adolescenti e servizi per i coetanei. Eliminata l’affermazione sulla mappa del primo anno «parziale e su carta» e la dipendenza da quel lavoro. Nelle altre schede le situazioni diventano consegne/casi didattici: niente generalizzazioni presentate come rilevazioni reali. Partner, diffusione esterna e contributi professionali sono possibilità da organizzare, non accordi attestati. I traguardi redazionali di U3.3 e U5.1 esplicitano il lavoro guidato e la collaborazione, senza attribuire allo studente responsabilità professionali autonome non previste dalla consegna.

**Profilo SSAS.** Ogni scheda presenta un raccordo con i testi delle competenze in uscita contenuti in `data-area-indirizzo.json`, con hash della fonte nel JSON generato. Si tratta di un raccordo al curricolo locale, non di una nuova certificazione di conformità normativa. Saperi, abilità, traguardi di origine e attribuzioni sono conservati. L’indicatore della prima dimensione di U2.1 e i relativi descrittori sono riallineati ai servizi per adolescenti documentati, senza imporre di trovare cinque servizi.

**Monografiche.** Pagina autonoma e nuova linguetta nella pagina principale. Campi: tema/titolo, profilo scientifico e culturale, descrizione, attualità, possibile sviluppo individuale/trasversale/da concordare, collaborazioni e riferimenti. Titolo e descrizione obbligatori; nessun anno, competenza, ore o QNQ fittizi. Nessuna idea precaricata.

**Accesso e modifica.** Riutilizzo della sessione docente esistente; lettura per i docenti autenticati e modifica delle proprie idee. L’autore è determinato dalla sessione lato server. Versione progressiva e confronto di versione evitano sovrascritture obsolete. Un errore non cancella il modulo e il frontend annuncia il salvataggio soltanto dopo una risposta coerente. La creazione è bloccata finché il caricamento dell’archivio non riesce. Lo schema SQL prepara uno storico delle versioni, alimentato dal trigger. Non è stato ancora eseguito su Postgres.

**Progettazione annuale.** Pagina e linguetta presenti, con il solo stato «Nessuna proposta inserita». Nessun modulo, piano o modello aggiunto.

## File e riproduzione

- `prima/` e `manifest-prima.json`: base esatta della revisione.
- [MATRICE.md](MATRICE.md) e [confronto-schede.json](confronto-schede.json): collocazione e confronto completo.
- `tools/revisione_uda_unificate.json`, `tools/genera_uda_unificate.py`, `data-uda-unificate.json`: testi e generazione deterministica.
- `uda-monografiche.html`, `uda-monografiche.js`, `idee-docenti.css`: nuovo spazio di idee.
- `progettazione-annuale.html`, `index.html`, `assets/navigazione.js`: sezione vuota e navigazione.
- `supabase/uda-monografiche.sql`: schema di attivazione con RLS, accesso alle tabelle riservato al service role e storico.
- `supabase/functions/curricolo-uda-revisioni/idee.ts`: validazione delle idee.
- `supabase/functions/curricolo-uda-revisioni/index.ts`: azioni `ideas-list` e `ideas-save`, dopo la verifica della sessione.

```sh
python3 tools/genera_uda_unificate.py
python3 tools/verifica_uda_unificate.py
node tools/verifica_idee_server.cjs
node --check uda-monografiche.js
node --check uda-unificate.js
```

Il test handler richiede Node con `node:module.stripTypeScriptTypes`; eseguito con Node 24. Il database è simulato in memoria: verifica il codice reale dell’handler e i suoi vincoli, non il motore Postgres o il trigger.

Con server locale sulla porta 8765, Playwright disponibile e Chrome installato:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/verifica_sezioni_docenti.cjs
UDA_BASE_URL='http://127.0.0.1:8765/' PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/verifica_uda_unificate.cjs
```

Durante la verifica Playwright proviene dal runtime Codex tramite NODE_PATH. Nessuna dipendenza installata nel progetto. Il browser usa un profilo temporaneo; le chiamate del modulo idee sono simulate e i dati di prova restano nel test. Nessuna proposta fittizia salvata online.

## Controlli e limiti

Superati: copertura 48/48; distribuzione 4/6/5/5/5; 25/25 saperi e abilità identici alla revisione precedente; catalogo d’asse identico; cinque riferimenti a schede sviluppate conservati; rigenerazione identica. Le ore restano da deliberare, senza riduzioni inventate.

Handler con archivio simulato: sessione obbligatoria; campi obbligatori; modalità consentite; autore ricavato dalla sessione anche a fronte di un nome contraffatto; creazione; modifica propria; rifiuto modifica altrui e versione obsoleta; lettura condivisa.

Browser locale: U1.1/U2.1 distinte in seconda; nuove linguette; creazione di due idee; rilettura dopo ricaricamento; modifica; mancato salvataggio senza perdita di testo; contenuti HTML trattati come testo; altro docente consulta senza pulsante di modifica; mobile senza eccedenza orizzontale; progettazione annuale vuota. Questi risultati non attestano salvataggi reali nel nuovo archivio.

## Attivazione ancora da effettuare

Per il salvataggio condiviso reale occorre applicare `supabase/uda-monografiche.sql`, distribuire la funzione aggiornata includendo `idee.ts`, verificare accesso, creazione, rilettura da una seconda sessione, modifica e storico delle versioni, infine pubblicare e controllare le pagine. I cataloghi e il voto restano distinti dalle idee. Nessuna di queste operazioni di produzione è stata eseguita in questa revisione locale.

Riferimenti tecnici consultati: [autenticazione delle Edge Functions](https://supabase.com/docs/guides/functions/auth). Il recupero dell’indice changelog Markdown non è riuscito; non sono stati aggiornati SDK o modelli di autenticazione. È stata mantenuta la verifica della sessione già presente nel progetto.

## Evidenze

[Mobile monografiche con dati fittizi di test](evidenze/monografiche-mobile-test.png) · [Mobile UDA](evidenze/unificate-mobile.png) · [Stampa campione U5.4](evidenze/stampa-U5.4.pdf). Il contatore delle idee è stato poi corretto nel singolare/plurale e aggiornato dopo il salvataggio. Nessun dato di prova è stato scritto nel servizio reale.

Il test di stampa conferma l’apertura delle rubriche nella sola copia, la preservazione dello stato originale e l’assenza di errori JavaScript; non equivale a una revisione tipografica di ogni pagina di ogni UDA.
