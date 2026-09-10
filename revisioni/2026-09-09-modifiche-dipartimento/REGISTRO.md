# Modifiche del Dipartimento — 9 settembre 2026

## Fonte delle richieste

Controllo eseguito sulle revisioni salvate nella tabella Supabase `curricolo_uda_revisioni`, limitate alla giornata del 9 settembre 2026 nel fuso `Europe/Rome`.

| Revisione Supabase | UDA | Contenuto rilevato | Decisione |
|---|---|---|---|
| `4ed2337c-74cd-4515-bb41-648335dacc6b` | U4.3 | Eliminare Scienze integrate dalle annualità 3, 4 e 5, compresa la matrice | Applicata alla sorgente d'asse e rigenerata nelle UDA unificate |
| `7b6697dd-247b-469e-834e-cb1e08a650f5` | T1.1 | Nuovo titolo; sezione autonoma di Educazione civica; distribuzione fino a 33 ore; collocazione nel curricolo ministeriale | Applicata |
| `8e346206-cf33-472b-a4a4-4d4bba89c8f3` | T1.2 | `oreRipartizione: {}` senza nota generale | Non applicata: bozza vuota, mantenuta in stato `bozza` |

Al termine dei controlli, in Supabase U4.3 e T1.1 risultano `applicata`; T1.2 risulta ancora `bozza`.

## Attuazione

### U4.3 — Scienze integrate nel triennio

La ricorrenza era nella sorgente d'asse 4.6, assorbita dalla UDA unificata U4.3. `Scienze Integrate` è stata rimossa dalla voce sui detergenti, disinfettanti e antisettici; la materia `Igiene e Cultura M.S.` è rimasta. La rigenerazione di `data-uda-unificate.json` ha propagato la correzione. Il controllo ricorsivo non trova più `Scienze Integrate` nelle UDA d'asse o unificate degli anni 3, 4 e 5.

### T1.1 — Educazione civica

- Titolo: **Conoscersi e collaborare: dalle regole quotidiane al regolamento di classe**.
- Rimossa dal catalogo generale delle UDA trasversali e inserita nel nuovo catalogo autonomo `data-uda-civica.json`.
- Nucleo concettuale: **Costituzione**.
- Competenza nazionale: **n. 3** delle Linee guida allegate al D.M. 183/2024.
- Monte annuale proposto: **33 ore**, ripartite fra sette insegnamenti e verificate in somma.
- La pagina precisa che le 33 ore sono il minimo annuale dell'insegnamento trasversale, non un obbligo per ogni singola UDA, e che ripartizione e adozione restano da deliberare.

Fonti ufficiali:

- [Legge 20 agosto 2019, n. 92, testo vigente](https://www.normattiva.it/eli/stato/LEGGE/2019/08/20/92/CONSOLIDATED)
- [Linee guida per l'Educazione civica allegate al D.M. 183/2024](https://www.mim.gov.it/documents/20182/0/Linee%2Bguida%2BEducazione%2Bcivica.pdf/9ffd1e06-db57-1596-c742-216b3f42b995)

## Dati derivati e integrazione

Sono stati rigenerati `data-uda-unificate.json`, `data-ripartizione-ore.json` e `RIPARTIZIONE-ORE-UDA.md`. Il catalogo civico è disponibile nella pagina principale, nella navigazione autonoma, nel Piano delle UDA, nel PFI, nelle revisioni condivise e nelle esportazioni/stampe.

## Controlli riproducibili

```sh
python3 tools/genera_uda_unificate.py
python3 tools/genera_ripartizione_ore.py
node tools/verifica_modifiche_dipartimento_20260909.cjs
node tools/verifica_insegnamenti.cjs
node tools/verifica_stampa_cataloghi.cjs
```

Esiti del 9 settembre 2026:

- 27 UDA unificate rigenerate da 48 schede d'asse;
- 75 UDA con somme orarie coincidenti;
- controllo specifico U4.3, T1.1 e T1.2: `PASS`;
- riconoscimento degli insegnamenti: `PASS`;
- quattro cataloghi: scheda singola, filtri, selezione, piano, iframe e mobile: `PASS`;
- PFI e aree curricolari incluse nel controllo browser: `PASS`.

## Stato del rilascio

Le modifiche sono applicate e verificate nella copia locale. Alla data di questo registro non sono state né committate né pubblicate sul sito live.
