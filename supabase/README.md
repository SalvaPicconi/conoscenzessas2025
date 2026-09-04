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

## Non finisce sul sito

`_config.yml` esclude questa cartella dalla pubblicazione: il codice sta nel
repository, ma non viene servito da GitHub Pages.
