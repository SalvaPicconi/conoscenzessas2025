# Servizi e utenza: due conoscenze distinte — 7 settembre 2026

Autorizzazione e criterio, dal docente, in due passaggi. Prima: «Nel biennio Scienze umane non si occupa
né di utenza né di servizi, ma sono cose che riguardano solo Metodologie operative», con richiesta di
verificare, correggere e completare per primo il biennio, tenendo conto che l'errore poteva essere finito
anche nell'accorpamento. Poi, dopo la verifica: «Vale il curricolo, ma più per l'utenza che per i servizi
e loro analisi», insieme al principio generale che a una conoscenza e a un'abilità concorrono più
insegnamenti e che non si escludono insegnamenti dalle conoscenze.

## Il problema

Il curricolo d'indirizzo tiene distinte due conoscenze del biennio, nella competenza 1:

| Conoscenza del curricolo | Insegnamenti |
|---|---|
| Tipologia dei servizi sociali, socio-educativi, sociosanitari, sanitari | METODOLOGIE OPERATIVE |
| Tipologia di utenza dei servizi sociali, socio-educativi, sociosanitari e sanitari | METODOLOGIE OPERATIVE, SCIENZE UMANE |

Le schede UDA le avevano fuse in una voce sola — «Tipologie di servizi e di utenza» in 1.1, «Tipologie di
servizi e utenza» in 2.1, «Tipologie di servizi sociali, socio-educativi, socio-sanitari e relative
utenze» nella trasversale T2.2 — con Metodologie operative e Scienze umane insieme. La fusione estendeva
Scienze umane anche all'analisi dei servizi, che nel curricolo è di sole Metodologie operative.

Il curricolo non attribuisce insegnamenti alle abilità: indica gli insegnamenti coinvolti nella
competenza. Per la competenza 1 del biennio sono Metodologie operative, Scienze umane, Diritto e Storia.

## Che cosa è stato fatto

Le voci fuse sono state sdoppiate, come nel curricolo:

| Scheda | Voce risultante | Insegnamenti |
|---|---|---|
| 1.1 · Il mio paese che aiuta | Tipologie di servizi | Metodologie operative |
| 1.1 | Tipologie di utenza dei servizi | Metodologie operative, Scienze umane |
| 2.1 · Conosci il tuo territorio | Tipologie di servizi | Metodologie operative |
| 2.1 | Tipologie di utenza dei servizi | Metodologie operative, Scienze umane |
| T2.2 · Leggere il territorio | Tipologie di servizi sociali, socio-educativi e socio-sanitari | Metodologie operative |
| T2.2 | Utenze dei servizi e loro caratteristiche | Metodologie operative, Scienze umane |

Le abilità restano come erano: «Identificare le tipologie di servizi» a sole Metodologie operative,
«Individuare le opportunità offerte per rispondere ai bisogni» e «Individuare le opportunità del
territorio» a Metodologie operative e Scienze umane, perché mettono in relazione i servizi con i bisogni
dell'utenza. Nella T2.2 l'abilità «Identificare le diverse tipologie di servizi, le prestazioni e le
utenze cui si rivolgono» conserva entrambe le materie per la stessa ragione.

Nessun insegnamento è stato escluso da una conoscenza. L'analisi dei servizi è ora una voce a sé, di
Metodologie operative; l'utenza resta condivisa come nel curricolo.

### Passaggio intermedio, poi rientrato

Nella prima esecuzione dell'indicazione Scienze umane era stata tolta da sei voci, comprese le due
abilità. Quella soluzione escludeva la materia anche dalla conoscenza sull'utenza e le sottraeva ore:
3–4 nella 1.1, 2 nella T2.2, con il totale del biennio da 39–49 a 34–43 ore. Fissato il criterio, è stata
sostituita dallo sdoppiamento e le ore sono tornate ai valori precedenti. Nel repository resta soltanto
l'esito finale.

## Perché le attribuzioni pesano

La ripartizione oraria divide il monte ore di ogni UDA fra gli insegnamenti che compaiono almeno una
volta nella scheda, in proporzione alle ore settimanali del quadro orario; il numero di voci non conta.
Togliere un insegnamento dall'ultima voce in cui compare gli azzera le ore in quella UDA. Sdoppiare una
voce, invece, non cambia nulla nel calcolo: le materie presenti restano le stesse.

## Propagazione e controlli

- `data-uda-unificate.json` rigenerato con `tools/genera_uda_unificate.py`: cambiano solo U1.1 e U2.1,
  nei campi `saperi` e `provenienzaContenuti`. Le altre 25 schede sono identiche.
- `data-ripartizione-ore.json` e `RIPARTIZIONE-ORE-UDA.md` rigenerati: **identici alla versione
  pubblicata**, nessuna ora cambia in nessuna delle 66 UDA. Somme tutte coincidenti con il monte ore.
- `tools/verifica_uda_unificate.py`: PASS — copertura 48/48, 27 schede, distribuzione 4/7/5/5/6,
  contenuti e provenienza, 48 dimensioni di rubrica con 4 livelli, ore non inventate, generazione
  riproducibile, hash delle fonti coerenti. Saltato il solo blocco «cataloghi invariati», che confronta i
  cataloghi con l'istantanea del 6 settembre in
  `revisioni/2026-09-06-uda-unificate/manifest-prima.json`: serviva a dimostrare che l'intervento
  precedente non li toccava, mentre questo li cambia di proposito.
- Prima di ogni modifica entrambi i generatori sono stati eseguiti su una copia di lavoro con gli input
  invariati e hanno riprodotto i file in repository byte per byte: le differenze sono imputabili solo a
  questo intervento.
- Prova a video con il sito servito in locale: schede d'asse, unificate e trasversali mostrano le due
  voci distinte con le materie attese.

## Nel triennio non c'era nulla da correggere

Scienze umane e sociali ha ore soltanto in prima e in seconda (`data-quadro-orario.json`, `[4, 4, 0, 0,
0]`) e non compare in nessuna scheda dal terzo anno. Le voci su servizi, prestazioni e utenze del
triennio sono attribuite a Metodologie operative, Diritto e tecniche amministrative, Psicologia, Igiene,
Matematica e TIC.

## Avvertenza sul generatore delle trasversali

Le voci di T2.2 su servizi e utenze non esistono in `tools/genera_trasversali.py`, che a quella UDA non
le associa: sono state aggiunte al JSON in un intervento precedente, insieme ad altre revisioni. Il
generatore si difende da solo — eseguito senza argomenti si ferma con l'avviso che
`data-uda-trasversali.json` è il catalogo revisionato e riscrive solo con `--legacy-write` — ma resta
disallineato dal catalogo in uso: quel flag riporterebbe le dieci schede originarie, perdendo le
revisioni successive.

## Resta aperto

- ~~1.5 · Che cos'è la salute?~~ — **risolto lo stesso giorno**: il problema non era l'etichetta «Scienze
  Umane (II ANNO)» ma il confronto fra nomi di insegnamento, che avveniva a stringa esatta. Ora il
  riconoscimento è condiviso e la materia riprende le sue 3–4 ore nella scheda, conservando a video la nota
  del docente. Vedi [riconoscimento degli insegnamenti](../2026-09-07-riconoscimento-insegnamenti/REGISTRO.md).
- **2.1 e 2.2** — le due annotazioni della Prof.ssa Manca sui contenuti di Scienze umane più funzionali in
  prima restano senza decisione. Applicate alla lettera cancellerebbero dalla 2.2 tre voci che hanno
  Scienze umane come unica materia.
- **Stati in banca dati** — le otto proposte di revisione risultano ancora «bozza», comprese le sei già
  recepite nei file il 6 settembre.

## File

Copie precedenti in `prima/`, impronte in `manifest-prima.json` e `manifest-dopo.json`.
