# Modifiche del Dipartimento — 21 settembre 2026

## Fonte delle richieste

Quattro revisioni salvate nella tabella Supabase `curricolo_uda_revisioni` il 21 settembre 2026, fuso `Europe/Rome`, tutte sulle UDA scelte dal Dipartimento.

| Revisione Supabase | UDA | Contenuto | Decisione |
|---|---|---|---|
| `93cd291d-8d5e-4f78-8391-06583a1f0e56` | DIP3-ASSE | L'unità ripete la scelta FSL della stessa terza: portarla sugli adolescenti, con tribunale per i minorenni e servizi, misure e pene alternative, prevenzione e cura per minori, life skills | Applicata come riscrittura dell'unità |
| `a57d51db-79db-40c9-a35a-13ba937716d4` | DIP3-FSL | Prova esperta a scuola la settimana successiva al tirocinio, su form dei docenti | Applicata |
| `42d92463-9b9d-44e3-99fd-5ce35fe0c811` | DIP4-FSL | Stessa prova esperta, con i criteri già previsti | Applicata |
| `5659dd83-a2b4-4eef-86f6-779a8f0f8868` | DIP4-ASSE | Prodotto riferito a tutti i saperi coinvolti; caso aperto ad altri elementi | Applicata |

## Attuazione

### DIP3-FSL e DIP4-FSL — prova esperta

La prova esperta entra nel `compito` di `FSL3.1` e `FSL4.1` in `data-uda-fsl.json` e da lì nelle copie autonome del Dipartimento. In terza il `prodotto` conserva l'elenco del dossier e vi aggiunge il form: la revisione scriveva «Dossier FSL individuale + form», quindi somma, non sostituzione. In quarta la prova esperta si limita a datare i criteri che c'erano già.

### DIP4-ASSE — prodotto e situazione

Le due modifiche sono entrate in `tools/revisione_uda_unificate.json`, scheda `U4.3`, e `data-uda-unificate.json` è stato rigenerato. Il `prodotto` è ora «PAI con contributi di tutti i saperi e gli insegnamenti coinvolti (ambito sanitario, sociale, metodologico, giuridico)»: sostituisce integralmente il testo precedente, come richiesto, e con esso sparisce il riferimento al contributo individuale identificabile. Quel riferimento resta nella rubrica, alla voce `evidenzaIndividuale` di ogni competenza, che continua a chiedere una prestazione individuale osservabile.

### DIP3-ASSE — dagli anni della prima infanzia agli adolescenti

L'unità era la fusione di quattro schede d'asse costruite sul bambino: `3.4 Crescere insieme`, `3.6 Caccia al rischio`, `3.5 Prevenire è curare`, `3.9 Progetto benessere a scuola`. Puericultura e accudimento ripetevano la scelta FSL della stessa classe, che resta sull'area minori.

La nuova unità si intitola **Adolescenti: prevenzione, tutela, diritti e servizi** e fonde `3.9`, `3.5`, `3.7 La mappa degli accessi` e `3.6`. Esce la competenza 4, che nel profilo parla di bambini e che la scelta FSL già copre; entra la competenza 7, l'informazione e l'orientamento per l'accesso ai servizi, che regge la parte sul tribunale per i minorenni e sui servizi della giustizia minorile. Competenze: **9, 5, 7, 6**. Ore di origine: 52–62, contro le 88–95 di prima, perché escono le 48 ore della scheda 3.4.

Il compito di realtà ha tre esiti: una azione di prevenzione fra pari costruita sulle life skills a partire da una rilevazione bisogni-risorse-vincoli; un repertorio dei servizi e delle misure per i minorenni, dal consultorio ai servizi per le dipendenze fino al tribunale per i minorenni e alle misure alternative; un sopralluogo con rilevazione dei rischi e segnalazione formale negli ambienti di vita e di lavoro.

Abilità e saperi delle quattro schede d'asse sono riportati per intero. I contenuti chiesti dalla revisione non stanno nelle attribuzioni del curricolo verticale e portano perciò la nota di attribuzione già in uso: sono sette saperi e tre abilità su psicopedagogia dell'adolescenza, life skills, programmi di prevenzione con prove di efficacia, servizi per minori e adolescenti, diritti e istituti di tutela, tribunale per i minorenni e misure penali e alternative. **Sono proposte redazionali: competenze, ore e attribuzioni vanno ratificate in dipartimento.**

Rubrica, raccordo al profilo, fasi e ore di origine seguono le nuove quattro competenze. Nel calendario di massima l'etichetta di terza e il dettaglio delle due fasi sono stati riscritti di conseguenza; periodo e mesi restano quelli deliberati, da ottobre a gennaio.

### Letteratura verificata

- Life skills: [OMS, *Life skills education for children and adolescents in schools*, WHO/MNH/PSF/93.7A.Rev.2, 1993](https://iris.who.int/bitstream/handle/10665/63552/WHO_MNH_PSF_93.7A_Rev.2.pdf) — dieci competenze psicosociali.
- Prevenzione con prove di efficacia nella scuola: programma [Unplugged](https://www.oed.piemonte.it/unpluggeditalia/), valutato nello studio europeo EU-Dap, modello dell'influenza sociale e life skills.
- Giustizia minorile: il Tribunale per i minorenni resta l'organo in funzione; il Tribunale per le persone, per i minorenni e per le famiglie previsto dal d.lgs. 149/2022 è stato rinviato a ottobre 2026 ed è ancora soggetto a proroga. Il sapere è scritto come passaggio ordinamentale, non come dato acquisito: va aggiornato quando la data è certa.

## Controlli riproducibili

```sh
python3 tools/genera_uda_unificate.py
python3 tools/genera_ripartizione_ore.py
node tools/verifica_uda_scelte_dipartimento.cjs
node tools/verifica_insegnamenti.cjs
node tools/verifica_pagina_uda_dipartimento.cjs
node tools/verifica_calendario_dipartimento.cjs
node tools/verifica_stampa_cataloghi.cjs
node tools/verifica_ore_libere.cjs
```

Esiti del 21 settembre 2026: tutti `PASS`. La ripartizione oraria si rigenera invariata: le modifiche non toccano monte ore né insegnamenti.

Due controlli sono stati adeguati alla riscrittura, perché verificavano la vecchia scheda:

- `verifica_uda_scelte_dipartimento.cjs`: la scelta d'asse di terza non è più la copia di due UDA unificate. Ora il controllo verifica che fonda le quattro schede dichiarate, che ne riporti per intero abilità, saperi e traguardi, che ogni voce estranea alle schede porti la nota di attribuzione, che la competenza 4 non rientri e che la scheda non torni sulla prima infanzia.
- `verifica_pagina_uda_dipartimento.cjs`: titolo, ordine delle competenze e testi attesi nella scheda pubblicata.

## Da sistemare, fuori da questa revisione

`tools/verifica_uda_unificate.py` fallisce sul confronto fra l'hash di `data-uda-fsl.json` e l'istantanea di `revisioni/2026-09-06-uda-unificate/manifest-prima.json`. Non dipende da queste modifiche: il file era già divergente prima, dalle revisioni FSL dell'8 settembre. L'asserzione «FSL invariato» è superata e va riscritta o rimossa.

## Stato del rilascio

Modifiche applicate e verificate nella copia locale, pubblicate sul ramo `claude/youthful-shannon-a4kihi`. In Supabase le quattro revisioni risultano `applicata`.
