# Applicazione modifiche FSL e rimozione del limite orario

Data di lavorazione: 8 settembre 2026.

## Evidenza iniziale

La tabella `public.curricolo_uda_revisioni` del progetto Supabase conteneva 11 revisioni:

- 8 revisioni del 7 settembre 2026 già nello stato `applicata`;
- `FSL4.1`, bozza di Prof. Picconi aggiornata alle 08:37 UTC dell'8 settembre;
- `FSL5.1`, bozza di Prof. Picconi aggiornata alle 08:56 UTC dell'8 settembre;
- `FSL3.1`, bozza di Prof. Picconi priva di una modifica sostanziale (`sviluppata: false` e ripartizione vuota).

Le note di `FSL4.1` e `FSL5.1` chiedevano entrambe la ripartizione: Igiene 15 ore, Psicologia 12 ore, Diritto 12 ore, Metodologie operative 9 ore. La nota di `FSL5.1` chiedeva inoltre di eliminare dal compito la frase autoreferenziale sulle attività osservabili, collaborabili e non consentite. La nota di `FSL4.1` chiedeva di integrare la normativa su disabilità e privacy.

## Decisioni applicate

- Inserita nelle schede `FSL4.1` e `FSL5.1` la ripartizione dipartimentale 15 + 12 + 12 + 9 = 48 ore.
- Eliminata da `FSL5.1` la frase indicata nella nota.
- Integrati in `FSL4.1` Legge 104/1992, D.Lgs. 62/2024, Regolamento (UE) 2016/679 e D.Lgs. 196/2003. Il riferimento scritto nella nota come “d.lgs 68/2024” è stato corretto nel D.Lgs. 62/2024 dopo riscontro sulle fonti ufficiali.
- Non applicata `FSL3.1`, perché la bozza non contiene una variazione effettiva rispetto alla scheda pubblica.
- Rimosso il limite del 40% dall'interfaccia, dai dati, dalla documentazione attiva e dalla funzione Supabase. Restano soltanto i controlli d'integrità: ore espresse come numeri interi positivi e insegnamento già presente nella UDA.
- Lo scostamento dal monte ore indicativo resta un avviso informativo e non blocca il salvataggio.
- La votazione delle UDA resta sospesa.

## Verifiche eseguite

- Rigenerazione completa di 75 ripartizioni UDA con somme coerenti.
- Controllo sintattico dei JavaScript modificati.
- Controllo dei nomi degli insegnamenti: 19 scritture ricondotte a 14 insegnamenti, nessuna perdita.
- Test browser dei quattro cataloghi, dell'area di indirizzo, dell'area generale e del PFI.
- Test browser dedicato: assenza dell'attributo `max`, inserimento di 500 ore e invio della proposta senza blocco percentuale.
- `git diff --check` senza errori.

Gli hash prima e dopo la lavorazione sono conservati nei due manifesti affiancati.
