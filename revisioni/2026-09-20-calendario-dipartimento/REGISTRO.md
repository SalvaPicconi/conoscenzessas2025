# Calendario di massima delle UDA scelte dal Dipartimento — 20 settembre 2026

## Fonte della richiesta

Proposta di calendario delle UDA interdisciplinari del corso SSAS, classi dalla prima alla quinta: tabella dei periodi di svolgimento, diagramma di Gantt mensile, punti da deliberare e prerequisiti da verificare nella programmazione di materia. Il documento riguarda le dieci unità già adottate nella seduta del 9 settembre 2026 e non ne aggiunge né toglie nessuna.

## Attuazione

### Dove è finito il calendario

Il calendario è una decisione del Dipartimento sullo svolgimento, non un contenuto della singola scheda: sta in `data-uda-dipartimento.json`, nel blocco `calendario`, accanto al calendario delle simulazioni che era già registrato lì. Il blocco contiene i dieci mesi dell'anno scolastico con il quadrimestre di appartenenza, una voce per ciascuna delle dieci unità adottate — simulazioni comprese — e i punti da deliberare.

Ogni voce riporta mese iniziale e finale per il diagramma, il periodo per esteso, le fasi, gli insegnamenti coinvolti con le ore e il monte ore. Le voci con una collocazione incerta portano `daConfermare` e la motivazione: nel diagramma la barra è tratteggiata e nella scheda compare il riquadro «Da confermare».

### Cosa resta modificabile

Il campo `periodo` della singola unità resta quello dell'area docenti: l'editor delle revisioni mostra i campi presenti nella scheda, quindi le tre unità che ne erano prive — la scelta d'asse di terza, quella di quarta e quella di quinta — ora lo hanno e diventano modificabili come le altre. Il valore usa il vocabolario del piano UDA del consiglio di classe (`1° quadrimestre`, `2° quadrimestre`, `Intero anno scolastico`), così il piano stampato dal coordinatore parte già dal periodo giusto invece che dal valore di ripiego.

Le copie autonome del fascicolo del Dipartimento restano identiche alle schede di origine: il periodo di `U4.3` è stato aggiunto nel generatore delle UDA unificate, quello di `5.12` nel fascicolo d'asse. Nel generatore il campo `periodo` è ora parte dello schema di tutte le ventisette schede unificate, vuoto finché una delibera non lo fissa.

### Collocazioni riportate

| Unità | Periodo | Note |
|---|---|---|
| 1ª · Educazione civica | Settembre – maggio | Fase intensiva da settembre a dicembre |
| 2ª · Fiaba e racconto | Ottobre – gennaio | Laboratorio fra dicembre e gennaio |
| 3ª · Minori: accudimento, sicurezza e prevenzione | Ottobre – gennaio | Da confermare: fasi ricondotte all'intervallo dichiarato |
| 3ª · Area minori (FSL) | Febbraio – aprile | Da confermare: preparazione anticipata a febbraio |
| 4ª · Area disabilità (FSL) | Novembre – gennaio | Da confermare: la proposta indicava anche febbraio – aprile |
| 4ª · Vivere con la disabilità · Abitare sicuro | Febbraio – aprile | — |
| 5ª · Area anziani (FSL) | Novembre – prima settimana di maggio | Da confermare: consegne attese entro metà aprile |
| 5ª · Parole che curano | Ottobre – aprile | Lancio intorno al 10 ottobre |
| 5ª · Prima simulazione | Inizio marzo | Da confermare: la scheda la colloca nel primo quadrimestre |
| 5ª · Seconda simulazione | Inizio maggio | — |

### Punti da deliberare e prerequisiti

I tre punti della proposta — monte ore dell'unità di terza, campagna sulla salute mentale legata al 10 ottobre, date dell'esperienza in struttura — sono riportati integralmente. Se ne sono aggiunti tre, nati dal confronto fra le parti della proposta e fra il calendario e le unità adottate: la collocazione della formazione scuola-lavoro di quarta, il carico della classe quinta fra novembre e maggio, l'Educazione civica oltre la classe prima.

I prerequisiti sono per anno di corso e stanno in testa a ciascuna classe, non dentro l'UDA: sono ciò che la programmazione di materia deve aver svolto prima. In quarta il termine «entro gennaio» è annotato con l'anticipo a ottobre richiesto dalla collocazione novembre – gennaio della formazione scuola-lavoro.

## Rilievi non risolti

1. **Formazione scuola-lavoro di quarta.** La proposta indica due collocazioni incompatibili per la stessa unità: novembre – gennaio nella colonna del periodo e nel diagramma, aula da febbraio a marzo ed esperienza fra marzo e aprile nel dettaglio delle fasi. È riportata la prima, perché la seconda si sovrappone per intero all'unità d'asse di febbraio – aprile, con gli stessi quattro insegnamenti di indirizzo. La scelta resta da deliberare: novembre – gennaio obbliga ad anticipare i prerequisiti a ottobre e mette le due settimane in struttura a ridosso delle vacanze di Natale.
2. **Unità di terza.** Le fasi indicate nella proposta — settembre – dicembre e gennaio – febbraio — non rientrano nel periodo dichiarato, ottobre – gennaio, e la seconda si sovrappone all'avvio della formazione scuola-lavoro di febbraio. Le fasi sono state ricondotte a ottobre – dicembre e gennaio.
3. **Formazione scuola-lavoro di terza.** La preparazione era collocata a marzo con periodo che parte da febbraio: il primo mese restava vuoto e preparazione, esperienza e relazione si concentravano in due mesi. La preparazione in aula parte ora da febbraio.
4. **Formazione scuola-lavoro di quinta.** Il periodo si chiude con la prima settimana di maggio, ma tutte le consegne sono attese entro la prima metà di aprile e in quella settimana cade la seconda simulazione della seconda prova.
5. **Simulazioni della seconda prova.** Il diagramma della proposta non le riporta, mentre sono due delle dieci unità adottate e pesano 16 ore ciascuna sugli stessi insegnamenti di indirizzo della quinta. Sono state aggiunte al calendario. La prima resta da chiarire: la scheda la colloca nel primo quadrimestre, il calendario delle simulazioni fissa la prova all'inizio di marzo.
6. **Educazione civica.** Il calendario prevede l'unità di Educazione civica solo in prima; le 33 ore annuali sono dovute in ogni anno di corso.
7. **Monte ore della formazione scuola-lavoro.** Le tre unità adottate valgono 30 + 48 + 48 ore convenzionali: il piano d'istituto deve mostrare come si raggiungono le 210 ore del triennio previste per gli istituti professionali.
8. **Ripartizione oraria della quinta.** Nella proposta l'unità sulla salute mentale risulta senza ripartizione oraria; la ripartizione proporzionale calcolata sul quadro orario esiste ed è di 42 ore su quattro insegnamenti.

## Controlli riproducibili

```sh
python3 tools/genera_uda_unificate.py
python3 tools/genera_ripartizione_ore.py
node tools/verifica_uda_scelte_dipartimento.cjs
node tools/verifica_calendario_dipartimento.cjs
node tools/verifica_pagina_uda_dipartimento.cjs
node tools/verifica_uda_unificate.cjs
node tools/verifica_insegnamenti.cjs
```

Esiti del 20 settembre 2026:

- rigenerazione delle UDA unificate e della ripartizione oraria: nessuna differenza oltre al campo `periodo`;
- catalogo autonomo con dieci UDA integrali e scelta d'asse di terza fusa: `PASS`;
- calendario: dieci voci, cinque da confermare, prerequisiti su cinque anni, barre nei mesi dichiarati, nessun overflow orizzontale su mobile: `PASS`;
- pagina delle UDA adottate, revisione per singola unità e layout mobile: `PASS`;
- ventisette UDA unificate, stampa e iframe: `PASS`;
- riconoscimento degli insegnamenti e somme orarie: `PASS`.

## Stato del rilascio

Le modifiche sono applicate e verificate nella copia locale del ramo `claude/uda-criteri-dipartimentali-z896n3`. Alla data di questo registro non sono state pubblicate sul sito live.
