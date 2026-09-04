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

L'API condivisa dalle sezioni **UDA d'asse**, **UDA trasversali** e **UDA FSL**. Gestisce accesso docente,
sessioni temporanee, elenco delle proposte, salvataggio e stato della revisione. Le proposte
restano separate dai JSON pubblici finché non vengono approvate e applicate ai file sorgente.

Per estendere una banca dati già configurata alle chiavi `T1.1…T5.2`, `FSL3.1…FSL5.2` e alle nuove proposte
trasversali/FSL va prima applicato `consenti-uda-trasversali.sql`; solo dopo si può distribuire
la funzione aggiornata:

    supabase functions deploy curricolo-uda-revisioni --project-ref ruplzgcnheddmqqdephp

Questi passaggi modificano il servizio remoto e non fanno parte della semplice anteprima locale.
I permessi di gestione degli stati sono applicati esclusivamente dalla funzione e non vengono
associati pubblicamente a un nominativo. Sono conservati nella tabella privata
`private.curricolo_uda_revision_permissions`, non accessibile ai client. L'assegnazione viene
eseguita direttamente sul database di produzione e non è registrata nel repository; in assenza
di un'autorizzazione esplicita la funzione nega i cambi di stato riservati.

### Ripartizione oraria

Le ore che ogni docente concorda per il proprio insegnamento viaggiano dentro lo
stesso record di revisione, nel campo `modifiche.oreRipartizione`: una mappa da
insegnamento a ore, che registra soltanto gli scostamenti dalla proposta
proporzionale. La proposta di partenza arriva in `originale.oreRipartizione` e
delimita la banda ammessa: la funzione rifiuta le ore che si allontanano più del
40% da quella cifra, come fa l'interfaccia in `assets/uda-ore.js`.

Non serve applicare SQL: `modifiche` è già `jsonb` senza vincoli sulle chiavi. Va
però ridistribuita la funzione, perché l'elenco `FIELDS` scarta i campi che non
conosce e senza aggiornamento rifiuterebbe il salvataggio delle ore:

    supabase functions deploy curricolo-uda-revisioni --project-ref ruplzgcnheddmqqdephp

L'elenco mostrato nelle tre interfacce è definito una sola volta in
`assets/uda-revisione.js`. La stessa anagrafica deve restare allineata con
`AUTHORS` nella funzione e con i vincoli `author_name` delle due tabelle SQL.
Per aggiungere docenti a un database già esistente bisogna quindi applicare anche
la parte dedicata ai docenti di `consenti-uda-trasversali.sql`, prima di distribuire
la funzione aggiornata.

## Non finisce sul sito

`_config.yml` esclude questa cartella dalla pubblicazione: il codice sta nel
repository, ma non viene servito da GitHub Pages.
