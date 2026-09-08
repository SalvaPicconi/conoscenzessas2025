# Codice del server

Qui dentro c'è la copia di riferimento del codice che gira su Supabase, nel
progetto **«Scuola e presenza online»** (`ruplzgcnheddmqqdephp`).

Non è codice del sito: il sito è statico e non lo esegue. Sta qui perché
altrimenti esisterebbe in un posto solo — dentro Supabase — senza storico e
senza possibilità di tornare indietro dopo una modifica sbagliata.

## `functions/pfi/index.ts`

L'API del PFI, chiamata da [`pfi.js`](../pfi.js) all'indirizzo
`https://ruplzgcnheddmqqdephp.supabase.co/functions/v1/pfi/<azione>`.

Otto azioni, tutte in POST, con il token di sessione nell'header `x-pfi-token`:
`login`, `session`, `classi`, `salva`, `elenco`, `apri`, `archivia`, `elimina`.

Gira con la *service role*: le tabelle `pfi_*` hanno RLS chiusa senza policy
permissive, quindi questa funzione è l'unico modo per leggerle e scriverle.

Nel file non c'è nessuna credenziale: URL e chiave di servizio arrivano dalle
variabili d'ambiente di Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## Tenere allineata la copia

Questa cartella non si aggiorna da sola. Dopo ogni modifica alla funzione
pubblicata, riportare qui il codice e fare commit — altrimenti la copia mente.

Con la CLI di Supabase:

    supabase functions deploy pfi --project-ref ruplzgcnheddmqqdephp

## `functions/curricolo-uda-revisioni/index.ts`

L'API condivisa dalle sezioni **UDA d'asse**, **UDA trasversali**, **UDA FSL** e **UDA Esame di Stato**. Gestisce accesso docente,
sessioni temporanee, elenco delle proposte, salvataggio e stato della revisione. Le proposte
restano separate dai JSON pubblici finché non vengono approvate e applicate ai file sorgente.

Per estendere una banca dati già configurata alle chiavi `T1.1…T5.2`, `FSL3.1…FSL5.2` e alle nuove proposte
trasversali/FSL va prima applicato `consenti-uda-trasversali.sql`; solo dopo si può distribuire
la funzione aggiornata:

    supabase functions deploy curricolo-uda-revisioni --project-ref ruplzgcnheddmqqdephp

Questi passaggi modificano il servizio remoto e non fanno parte della semplice anteprima locale.

Per abilitare le schede `E3.1…E5.2` va applicato `consenti-uda-esame.sql` e poi va
ridistribuita la funzione. Tipologia, nuclei, competenze e insegnamenti di indirizzo
restano protetti nel modulo; le proposte possono intervenire sui campi progettuali
del compito atteso e restano separate da `data-uda-esame.json`.
I permessi di gestione degli stati sono applicati esclusivamente dalla funzione e non vengono
associati pubblicamente a un nominativo. Sono conservati nella tabella privata
`private.curricolo_uda_revision_permissions`, non accessibile ai client. L'assegnazione viene
eseguita direttamente sul database di produzione e non è registrata nel repository; in assenza
di un'autorizzazione esplicita la funzione nega i cambi di stato riservati.

### Ripartizione oraria

Le ore che ogni docente concorda per il proprio insegnamento viaggiano dentro lo
stesso record di revisione, nel campo `modifiche.oreRipartizione`: una mappa da
insegnamento a ore, che registra soltanto gli scostamenti dalla proposta
proporzionale. La proposta di partenza arriva in `originale.oreRipartizione`.
Non esiste una banda percentuale: ogni valore intero positivo può essere
proposto e l'eventuale scostamento dal monte ore complessivo viene mostrato come
informazione, senza bloccare il salvataggio.

Non serve applicare SQL: `modifiche` è già `jsonb` senza vincoli sulle chiavi. Va
però ridistribuita la funzione, perché l'elenco `FIELDS` scarta i campi che non
conosce e senza aggiornamento rifiuterebbe il salvataggio delle ore:

    supabase functions deploy curricolo-uda-revisioni --project-ref ruplzgcnheddmqqdephp

### Monografiche e sospensione voto — rilascio 7 settembre 2026

Lo schema `uda-monografiche.sql` crea `curricolo_uda_idee` e `curricolo_uda_idee_storia`, con RLS e nessun accesso diretto per anon/authenticated. Il trigger registra ogni versione. La funzione include `idee.ts` e le azioni autenticate `ideas-list` / `ideas-save`; gli autori modificano soltanto le proprie idee, con confronto di versione.

La funzione versione 7 conserva le API di revisione e la lettura del voto precedente, ma risponde 423 alle scritture `vote`, `ballot`, `choice`, `rate`. Non riattivare la votazione senza nuova decisione. `votazione-uda.sql` e il client a rosa unica restano un progetto sospeso, non lo schema attivo. Le vecchie tabelle e i dati sono conservati.

Il salvataggio delle revisioni verifica il permesso di gestione anche quando lo stato è inviato nell'azione `upsert`, evitando l'approvazione da parte di un docente senza permesso.

## Non finisce sul sito

`_config.yml` esclude questa cartella dalla pubblicazione: il codice sta nel
repository, ma non viene servito da GitHub Pages.
