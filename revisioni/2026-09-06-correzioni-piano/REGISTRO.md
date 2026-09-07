# Correzioni del Piano UDA — 6 settembre 2026

Applicate in locale su richiesta «Correggi tutto», a seguito della verifica precedente. Nessuna pubblicazione o modifica di dati di studenti reali.

## Correzioni

- Identificativi UUID nuovi sia all’inserimento sia all’importazione: eliminate le collisioni del contatore, comprese quelle già presenti nelle bozze importate. Le UDA e i relativi contenuti sono conservati; cambiano soltanto gli identificativi interni di interfaccia.
- Importazione delle competenze di area generale nelle trasversali, con titoli dalla fonte locale `data-area-generale.json`. Prefissi C per SSAS e AG per area generale.
- Quadro 8: una riga e un livello per ciascuna competenza. Livelli salvati nella bozza JSON e riportati nell’export Word. Il vecchio livello complessivo resta conservato come dato storico e, per UDA con più competenze, non viene copiato automaticamente su tutte. È possibile lasciare un esito da valutare.
- Eliminata la frase sulla rosa deliberata dal collegio: il selettore contiene cataloghi e proposte, la scelta nel PFI è da concordare nel consiglio di classe.
- Unificate disponibili esplicitamente come proposte, con U1.1 e U2.1 in seconda. Saperi e abilità importati senza riscrittura; ore da deliberare. Provenienza strutturata e controllo contro doppio inserimento o sovrapposizione alle origini, anche nelle vecchie bozze con riferimento testuale riconoscibile.
- Riepilogo stampato: competenze leggibili, periodo compilabile nella scheda prima della stampa e aspetti essenziali di valutazione. Quando non disponibili, i criteri sono indicati da concordare; nessun valore inventato. Il piano è identificato come bozza e la sequenza segue le righe. I periodi dei cataloghi persistono fra filtri nella stessa pagina, non dopo ricaricamento; questa durata è dichiarata nell’interfaccia. Nel PFI il periodo viene invece salvato con la bozza.
- La progettazione didattica annuale resta vuota come richiesto. Le monografiche non vengono trasformate automaticamente in UDA del PFI.

## Verifiche

`tools/verifica_correzioni_piano.cjs`: competenze C3/C2/AG1/AG2/AG9 nel caso T1.1; livelli distinti e rilettura; export Word completo; identificativi unici dopo importazione; rimozione singola; recupero bozze con ID duplicati; unificate in seconda; blocco del doppio conteggio in entrambe le direzioni, compresi riferimenti delle bozze precedenti; periodo e valutazione nella stampa di sei UDA di seconda.

`tools/verifica_uda_unificate.py`: generazione deterministica, copertura 48/48, saperi e abilità conservati. Il controllo storico di identità del file PFI è stato rimosso da questo test perché la sua modifica è ora esplicitamente autorizzata e coperta dal test dedicato.

Sintassi JavaScript e `git diff --check` superati. Browser Chrome isolato, richieste HTTPS esterne bloccate, dati fittizi. Salvataggio cloud e distribuzione online non verificati in questa revisione.

Il riferimento didattico rimane la distinzione, documentata nella verifica precedente, fra piano sintetico (Box 7), progettazione UDA (Box 8) e personalizzazione nel PFI. Nessuna delibera o conformità complessiva della documentazione scolastica viene attestata dal software.

Superato anche `tools/verifica_stampa.cjs`: PFI autonomo e integrato, tre rubriche, stato originale preservato. PDF di prova nella cartella temporanea `ssas-stampa-EJtyEG`. Il test verifica contenuti e stato; non costituisce revisione tipografica manuale di ogni PDF.
