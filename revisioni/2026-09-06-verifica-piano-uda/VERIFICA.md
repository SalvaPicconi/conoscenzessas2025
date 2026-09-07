# Verifica locale del Piano delle UDA — 6 settembre 2026

Verifica di due funzioni omonime: quadro 7 del PFI e riepilogo «Stampa piano UDA» dei cataloghi. Nessun codice applicativo modificato. Prove con dati fittizi, richieste HTTPS esterne bloccate, nessun salvataggio cloud. Le risultanze non attestano il funzionamento della produzione.

## Esito funzionale

- Il selettore del PFI carica 66 UDA: 48 d’asse, 14 trasversali e 4 FSL. Le unificate non sono integrate, coerentemente con lo stato di proposta dichiarato.
- Inserimento e stampa del piano funzionano nel caso provato. La stampa PFI conserva intestazione, studente, classe, periodo e campi del quadro 7.
- Nel riepilogo dei livelli (quadro 8 e relativo export Word), viene usata soltanto la prima riga del campo competenze. Caso T1.1: C3 e C2 nel piano, solo C3 nel riepilogo. Un livello unico per UDA non distingue gli esiti delle sue diverse competenze.
- L’importazione delle trasversali trasferisce le competenze SSAS ma non quelle dell’area generale. T1.1 ha competenze generali 1, 2, 9, assenti dal campo importato. Le competenze europee sono un campo distinto e non sostituiscono quelle dell’area generale.
- Riproduzione del difetto di identificativi: aggiungere una UDA, estrarre la bozza, ricaricare la pagina, applicare la bozza e aggiungere una scheda. Risultato: due identificativi u1. Una sola rimozione elimina entrambe. Causa: applica() conserva gli ID ma non aggiorna il contatore utilizzato da aggiungiUda().
- Il piano stampato dal catalogo unificato, filtrato in seconda, contiene correttamente sei righe, incluse U1.1 e U2.1. Le colonne sono UDA/durata, insegnamenti/ore, compito/prodotto. Mancano un periodo programmato e una colonna esplicita per obiettivi/evidenze di valutazione; i codici di competenza compaiono nei sottotitoli. Non è presente un salvataggio del piano trasversale ai cataloghi; la selezione riguarda la singola pagina.
- Nessun errore JavaScript nelle prove concluse. Non eseguita una verifica completa del salvataggio cloud o di ogni esportazione.

## Lettura normativa e didattica

Il [D.I. 92/2018, artt. 4 e 6](https://www.istruzioneer.gov.it/wp-content/uploads/2019/02/d_intermin_92.pdf) collega valutazione e PFI alle UDA e attribuisce al consiglio di classe la redazione e l’aggiornamento del percorso individuale. La frase «rosa deliberata dal collegio» non descrive correttamente, da sola, questo processo e non dimostra l’esistenza di una deliberazione: il selettore carica i cataloghi, non una rosa deliberata.

Le [Linee guida, Box 7 e 8](https://www.istruzioneer.gov.it/wp-content/uploads/2022/08/Linee-guida_parte-generale-1-45.pdf) distinguono il piano annuale/biennale dalla progettazione di dettaglio. Per il piano è appropriata una sintesi di competenze-obiettivo, sequenza delle UDA, temi, insegnamenti, compiti e criteri di valutazione. Il formato dettagliato comprende rubriche con descrittori: non occorre riversarle nel riepilogo. I Box sono schemi di riferimento, non un modello grafico unico obbligatorio. L’assenza di una colonna non prova da sola una violazione normativa: occorre verificare anche gli altri documenti adottati dalla scuola.

## Priorità proposte

1. Correggere la generazione degli identificativi dopo importazione, impedendo rimozioni multiple involontarie.
2. Conservare tutte le competenze SSAS e dell’area generale e distinguere la loro valutazione nel riepilogo.
3. Sostituire l’affermazione sulla rosa deliberata con un’indicazione corretta della scelta nel percorso dello studente.
4. Mantenere il piano sintetico: UDA, competenze, periodo, insegnamenti/ore, compito-prodotto ed evidenze essenziali. Identificare la bozza e gli estremi della decisione quando esistenti.
5. Integrare le unificate solo con una scelta esplicita, prevenendo il doppio inserimento delle relative origini.

La sezione «Progettazione didattica annuale» resta intenzionalmente vuota e non va confusa con questi riepiloghi.
