# Un insegnamento è lo stesso comunque sia scritto — 7 settembre 2026

Autorizzazione: indicazione del docente. «Scienze umane e scienze umane, anche se lo scrivi in minuscolo,
è la stessa cosa. È pienamente possibile che nel curricolo ci sia qualche materia scritta in modo
leggermente diverso, ma tu la devi riconoscere». Con la richiesta di sistemare tutto subito.

## Il difetto

Il confronto fra nomi di insegnamento era a stringa esatta, ripetuto in sei punti del sito, ognuno con la
propria tabella di varianti scritta a mano. Bastava una differenza di scrittura perché la materia
sparisse dai conti. Il caso che l'ha reso evidente: la UDA 1.5 *Che cos'è la salute?*, dove una proposta di
revisione aveva scritto «Scienze Umane (II ANNO)». Conseguenze in cascata:

- la ripartizione oraria non riconosceva quel nome, quindi **Scienze umane restava a zero ore** nella UDA 1.5
  e Metodologie operative assorbiva tutte le 8–10 ore;
- il filtro per insegnamento del fascicolo mostrava una quindicesima voce fantasma, e chi filtrava
  «Scienze Umane» non trovava più la UDA 1.5;
- la targhetta perdeva il colore;
- nelle UDA FSL, dove i cataloghi scrivono le materie in maiuscolo e per esteso, avevano colore solo le
  quattro presenti nella tabella scritta a mano di quella pagina.

## La correzione

Nuovo file `assets/insegnamenti.js`: un solo riconoscitore per tutto il sito. Riporta qualunque scrittura
al nome usato dal quadro orario dell'istituto, che resta la sorgente unica.

Come riconosce: toglie le annotazioni fra parentesi, gli accenti e la punteggiatura, porta tutto in
minuscolo e cerca fra i nomi ufficiali, le etichette lunghe del quadro orario e gli alias già previsti in
`data-quadro-orario.json`. Se non trova, prova per prefisso, così passano anche le annotazioni scritte
senza parentesi come «Scienze Umane II ANNO»; le chiavi più lunghe vincono, perché «diritto e ta» non
finisca su «diritto». Espone `canonico`, `stesso`, `classe`, `etichetta`, `elenco` e `annotazione`.

Passano da lì, e non hanno più tabelle proprie:

| File | Cosa faceva a stringa esatta |
|---|---|
| `uda.js` | colore delle targhette, elenco del filtro, confronto del filtro |
| `uda-trasversali.js` | idem |
| `uda-unificate.js` | idem |
| `uda-fsl.js` | colore e confronto del filtro, con i nomi in maiuscolo del catalogo |
| `assets/uda-ore.js` | abbinamento fra targhetta e riga delle ore, etichette, ripristino della proposta |
| `assets/uda-documento.js` | etichetta dell'insegnamento nelle stampe Word e PDF |
| `tools/genera_ripartizione_ore.py` | peso dell'insegnamento nel quadro orario e elenco dei citati |

Nel generatore delle ore la stessa regola è riscritta in Python (`chiave_insegnamento`,
`indice_insegnamenti`, `canonico`) e l'elenco degli insegnamenti citati fonde le scritture diverse della
stessa materia: una UDA che citasse «Scienze Umane» e «Scienze Umane (II ANNO)» ha un insegnamento solo e
prende le ore una volta sola.

Le pagine `uda.html`, `uda-trasversali.html`, `uda-unificate.html`, `uda-fsl.html`, `piano-uda.html` e
`pfi.html` caricano il riconoscitore prima degli altri script.

Il riconoscimento non riscrive i dati: se una scrittura anomala resta nel catalogo, la targhetta continua
a mostrarla come l'ha scritta il docente, con il suo colore e le sue ore accanto. Nel caso della UDA 1.5 la
scrittura è stata poi corretta anche nel dato, come si legge più sotto.

## Effetto sui dati

Rigenerata la ripartizione oraria. Cambia una sola UDA:

| UDA | Prima | Dopo |
|---|---|---|
| 1.5 · Che cos'è la salute? (8–10) | Metodologie operative 8–10, Scienze umane senza ore | Metodologie operative 5–6 · **Scienze umane 3–4** |

Nel biennio Scienze umane passa da 39–49 a **42–53 ore**: sono le ore che la UDA 1.5 le aveva sottratto. Le
altre 65 UDA non cambiano.

Restano senza ore proprie solo insegnamenti che davvero non hanno ore in quell'anno di corso: TIC e
Scienze integrate nel triennio, dove il quadro orario li azzera. Non è un problema di nomi.

## Controlli

- Nuovo `tools/verifica_insegnamenti.cjs`, da eseguire dopo ogni modifica ai cataloghi o al quadro
  orario. Verifica che il riconoscitore e il quadro orario abbiano gli stessi insegnamenti, che etichette
  lunghe e alias tornino al proprio nome, che le scritture che hanno già dato problemi siano riconosciute,
  che **ogni** nome usato nei quattro cataloghi risalga a un insegnamento, e che nessuno resti senza ore
  per un nome scritto male. Esito: PASS — 18 scritture diverse ricondotte a 14 insegnamenti, dopo la correzione del nome nella 1.5.
- `tools/genera_ripartizione_ore.py`: 66 UDA ripartite, somme tutte coincidenti con il monte ore.
- `tools/verifica_uda_unificate.py`: PASS.
- Prove nel browser, sito servito in locale: fascicolo d'asse con filtro a 14 voci senza doppioni, la UDA 1.5
  che compare filtrando «Scienze Umane» e mostra 3–4 ore sulla targhetta; trasversali 506 targhette tutte
  colorate; FSL 113 targhette tutte colorate con le ore; unificate 570 targhette, nessuna senza colore;
  Piano e PFI caricano il riconoscitore. Nessun errore JavaScript in nessuna delle pagine.

## Correzione del nome, nel catalogo e nella banca dati

Su indicazione del docente — «Scienze Umane (II ANNO) è un errore, vuol dire Scienze umane» — il nome è
stato corretto anche nel dato, non solo riconosciuto:

- `data-uda.json`, UDA 1.5: due occorrenze, un sapere e un'abilità, ora «Scienze Umane». Rigenerate
  unificate e ripartizione oraria; nessun'altra UDA cambia. I nomi diversi in circolazione nei cataloghi
  scendono da 19 a 18.
- Banca dati Supabase, tabella `curricolo_uda_revisioni`: una sola riga conteneva la scrittura errata,
  la proposta della Prof.ssa Manca sulla 1.5 (`aceef418-4fbf-466d-913e-a2dc1306bb54`, stato «bozza»).
  Corretto il solo campo `modifiche`, sostituendo «Scienze Umane (II ANNO)» con «Scienze Umane». Il
  campo `nota_generale` è rimasto intatto: «per Scienze Umane argomenti affrontati nel II anno» è
  l'annotazione della collega e va conservata. Controllo successivo: nessuna riga contiene più quella
  scrittura.

Il riconoscimento resta comunque in servizio: serve alla prossima variante, non a questa.

## Da tenere presente

Chi aggiunge un insegnamento al quadro orario lo aggiunge anche in `assets/insegnamenti.js`, con la sua
classe di colore: il controllo fallisce apposta se i due elenchi divergono. Le varianti di scrittura non
vanno inseguite una per una — normalizzazione e alias le assorbono — ma se ne compare una davvero
diversa, il posto è `VARIANTI` in quel file, non le singole pagine.
