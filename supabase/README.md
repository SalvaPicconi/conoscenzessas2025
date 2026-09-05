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

Vale anche al contrario, ed è già successo: fra settembre 2026 e la votazione a
preferenze la copia nel repository era **avanti** di tre modifiche mai
distribuite — i controlli che una UDA appartenga davvero all'anno e alla
categoria indicati, il numero esatto di UDA nella scelta finale e l'insegnamento
assente dalla proposta oraria. Chi commette una modifica alla funzione la
distribuisca subito, o la prossima distribuzione porterà con sé cambiamenti che
nessuno si aspetta.

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

### Votazione per la scelta delle UDA

Si vota in due tempi. Prima chi ha i permessi di gestione mette al voto una rosa
di UDA, dopo la consultazione: senza quel passaggio si voterebbe su dieci schede
che nessuno ha discusso. Poi ogni docente assegna una **preferenza da 1 a 5** a
quante UDA della rosa vuole, e può riscriverla finché la votazione resta aperta.

Il voto era binario, con un tetto di due preferenze per anno. Contare quante
volte una UDA era stata scelta non diceva però quanto la si volesse, e obbligava
a spendere i due voti alla cieca su una rosa appena discussa. Ora la riga porta
un `punteggio` fra 1 e 5, il tetto non esiste più e la classifica si legge sulla
somma dei punti.

L'ordine della classifica è deciso dal client (`votazione-uda.js`), non dalla
funzione: vince chi somma più punti, a parità di punti conta la media e poi il
numero di preferenze. Ordinare per media sola premierebbe una UDA con un solo 5
rispetto a una votata 5 e 4 da due docenti.

L'appartenenza alla rosa, la scala 1–5 e la chiusura dopo la conferma sono
verificate dalla funzione; il vincolo `punteggio between 1 and 5` sta anche nel
database. Le UDA FSL restano fuori: sono già una per anno e area di tirocinio.

La classifica è consultiva. Diventa la scelta ufficiale solo quando chi gestisce
la conferma, e tutto lo stato — rosa, scelta, chi ha aperto e chi ha confermato —
sta in `curricolo_uda_votazione`. Cambiare la rosa azzera la scelta e cancella le
preferenze date a UDA che ne sono uscite: non possono restare a gonfiare conteggi
che nessuno vede più.

Le tre azioni sono `ballot` per aprire la votazione, `vote` per la singola
preferenza (`punteggio` da 1 a 5, oppure `rimuovi: true` per ritirarla) e
`choice` per confermare la scelta.

Qui servono entrambi i passaggi, nell'ordine. Prima le tabelle:

    psql "$DATABASE_URL" -f supabase/votazione-uda.sql

poi la funzione, che espone le azioni `votes`, `ballot`, `vote` e `choice`:

    supabase functions deploy curricolo-uda-revisioni --project-ref ruplzgcnheddmqqdephp

Attenzione: `votazione-uda.sql` **rifà** `curricolo_uda_voti` invece di
migrarla. Va bene finché la tabella è vuota; se un giorno contenesse preferenze
da conservare, servirà un `alter table` al posto del `drop`.

Finché mancano, il sito non mostra nulla della votazione: `votazione-uda.js`
disegna i comandi solo dopo che il server ha risposto, così una distribuzione
incompleta non lascia in pagina comandi che falliscono.

L'elenco mostrato nelle tre interfacce è definito una sola volta in
`assets/uda-revisione.js`. La stessa anagrafica deve restare allineata con
`AUTHORS` nella funzione e con i vincoli `author_name` delle due tabelle SQL.
Per aggiungere docenti a un database già esistente bisogna quindi applicare anche
la parte dedicata ai docenti di `consenti-uda-trasversali.sql`, prima di distribuire
la funzione aggiornata.

## Non finisce sul sito

`_config.yml` esclude questa cartella dalla pubblicazione: il codice sta nel
repository, ma non viene servito da GitHub Pages.
