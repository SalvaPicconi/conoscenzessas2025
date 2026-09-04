#!/usr/bin/env python3
"""Ripartisce il monte ore di ogni UDA fra gli insegnamenti coinvolti.

Il peso di un insegnamento è il numero di ore settimanali che ha in quell'anno di
corso, secondo il quadro orario dell'istituto (data-quadro-orario.json). Il
calcolo è fatto una UDA per volta: non esistono vincoli cumulativi sull'anno.

Dove il monte ore dell'UDA è indicato come intervallo, la ripartizione è
calcolata su entrambi gli estremi, così le due somme restano esatte.

Il risultato va in data-ripartizione-ore.json, che i tre cataloghi leggono
accanto ai propri dati, e in RIPARTIZIONE-ORE-UDA.md, la versione stampabile per
i dipartimenti. I file delle UDA non vengono toccati.

    python3 tools/genera_ripartizione_ore.py
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
QUADRO = RADICE / "data-quadro-orario.json"
USCITA = RADICE / "data-ripartizione-ore.json"
DOCUMENTO = RADICE / "RIPARTIZIONE-ORE-UDA.md"
CATALOGHI = (
    ("data-uda.json", "asse"),
    ("data-uda-trasversali.json", "trasversale"),
    ("data-uda-fsl.json", "fsl"),
)
NOMI_GENERE = {"asse": "UDA d'asse", "trasversale": "UDA trasversale", "fsl": "UDA FSL"}


def estremi_monte_ore(valore) -> tuple[int, int] | None:
    """Primo e ultimo numero del campo «ore»: «12–15» → (12, 15), «48» → (48, 48)."""
    numeri = [int(n) for n in re.findall(r"\d+", str(valore or ""))]
    if not numeri:
        return None
    return numeri[0], numeri[-1]


def riparto(pesi: dict[str, int], totale: int) -> dict[str, int]:
    """Ripartizione proporzionale con il metodo dei resti maggiori.

    Ogni insegnamento riceve la parte intera della propria quota; le ore
    avanzate vanno a chi ha il resto più alto, così la somma coincide sempre con
    il totale. A parità di resto vince chi ha più ore settimanali.
    """
    somma_pesi = sum(pesi.values())
    quote = {ins: totale * peso / somma_pesi for ins, peso in pesi.items()}
    ore = {ins: int(quota) for ins, quota in quote.items()}
    avanzo = totale - sum(ore.values())
    graduatoria = sorted(quote, key=lambda ins: (-(quote[ins] % 1), -pesi[ins], ins))
    for ins in graduatoria[:avanzo]:
        ore[ins] += 1
    return ore


def insegnamenti_citati(uda: dict) -> list[str]:
    """Insegnamenti che compaiono in abilità e saperi, nell'ordine di comparsa."""
    elenco: list[str] = []
    for campo in ("abilita", "saperi"):
        for voce in uda.get(campo) or []:
            for ins in voce.get("ins") or []:
                if ins not in elenco:
                    elenco.append(ins)
    return elenco


def durata_settimane(voci: list[dict]) -> tuple[int, str]:
    """Settimane di lezione necessarie e insegnamento che le detta.

    Gli insegnamenti procedono in parallelo, quindi il tempo lo impone quello
    che deve ricavare più ore dal proprio orario settimanale. È la durata
    minima, a piena dedizione.

    ATTENZIONE — convenzione ancora aperta. Il numero presuppone che la materia
    più carica dedichi all'UDA tutte le proprie ore settimanali, cosa che nella
    pratica non succede: la 3.4 «Crescere insieme», 48 ore, risulta di 3
    settimane, ma a due ore a settimana per materia sarebbero 8. Finché la
    scelta non arriva, il testo prodotto deve dire «almeno», o il dato inganna
    chi mette l'UDA in calendario. Se si passa alla stima realistica il divisore
    diventa min(ore_dedicate, voce["oreSett"]) e va cambiata anche durata() in
    assets/uda-ore.js.

    Stessa formula in assets/uda-ore.js, dove si aggiorna con le ore concordate.
    """
    peggiore = max(voci, key=lambda voce: voce["max"] / voce["oreSett"])
    settimane = math.ceil(peggiore["max"] / peggiore["oreSett"])
    return max(1, settimane), peggiore["ins"]


def etichetta_totale(voce: dict) -> str:
    if voce["totaleMin"] == voce["totaleMax"]:
        return f"{voce['totaleMax']}"
    return f"{voce['totaleMin']}–{voce['totaleMax']}"


def scrivi_documento(ripartizioni: dict[str, dict], quadro: dict, monte_fsl: int) -> None:
    """Versione stampabile per i dipartimenti, dalla stessa sorgente dell'applicativo."""
    regola = quadro["meta"]["regola"]
    righe = [
        "# Proposta di assegnazione oraria per insegnamento",
        "",
        "Le ore di ciascuna UDA sono ripartite fra gli insegnamenti coinvolti in proporzione",
        "alle ore settimanali che ognuno ha nel quadro orario dell'istituto. Il calcolo è fatto",
        "una UDA per volta.",
        "",
        f"Dove il monte ore dell'UDA è un intervallo, lo è anche la ripartizione: la cifra a",
        "sinistra somma al minimo, quella a destra al massimo. " + regola["arrotondamento"],
        "",
        f"Le UDA di Formazione scuola-lavoro sono calcolate su un monte convenzionale di {monte_fsl} ore,",
        "da sostituire con quello deliberato nel piano FSL d'istituto.",
        "",
        "La durata indicata è il minimo: la impone l'insegnamento che deve ricavare più ore dal",
        "proprio orario settimanale, ipotizzando che vi dedichi tutte le sue ore. Se gli insegnamenti",
        "dedicano all'UDA metà delle proprie ore, il tempo raddoppia.",
        "",
        "Nell'applicativo ogni docente può modificare le proprie ore entro il "
        f"{round(regola['tolleranzaDocente'] * 100)}% in più o in meno rispetto a questa proposta.",
        "",
        "> Documento generato da `tools/genera_ripartizione_ore.py`. Non modificarlo a mano: rigenerarlo.",
        "",
        "---",
    ]
    for anno in range(1, 6):
        del_anno = [(chiave, voce) for chiave, voce in ripartizioni.items() if voce["anno"] == anno]
        if not del_anno:
            continue
        orario_anno = " · ".join(
            f"{dati['etichetta']} {dati['ore'][anno - 1]}"
            for dati in sorted(quadro["insegnamenti"].values(), key=lambda d: -d["ore"][anno - 1])
            if dati["ore"][anno - 1]
        )
        righe += ["", f"## Classe {anno}ª", "", f"Ore settimanali: {orario_anno}."]
        for chiave, voce in del_anno:
            settimane, piu_lungo = durata_settimane(voce["voci"])
            righe += [
                "",
                f"### {chiave} · {voce['titolo']}",
                "",
                f"*{NOMI_GENERE[voce['genere']]} — monte ore {etichetta_totale(voce)} — durata almeno "
                f"{settimane} {'settimana' if settimane == 1 else 'settimane'}, dettata da {piu_lungo}*",
                "",
                "| Insegnamento | Ore settimanali | Ore nell'UDA |",
                "|---|---:|---:|",
            ]
            for riga in voce["voci"]:
                ore = f"{riga['min']}–{riga['max']}" if riga["min"] != riga["max"] else str(riga["max"])
                righe.append(f"| {riga['ins']} | {riga['oreSett']} | **{ore}** |")
            righe.append(f"| **Totale** | | **{etichetta_totale(voce)}** |")
            if voce.get("senzaOre"):
                elenco = ", ".join(voce["senzaOre"])
                righe += [
                    "",
                    f"> {elenco}: concorre ai contenuti dell'UDA ma non ha ore proprie, perché non è",
                    f"> presente nel quadro orario di {anno}ª. I relativi compiti restano agli insegnamenti elencati sopra.",
                ]
    DOCUMENTO.write_text("\n".join(righe) + "\n", encoding="utf-8")


def main() -> None:
    quadro = json.loads(QUADRO.read_text(encoding="utf-8"))
    regola = quadro["meta"]["regola"]
    alias = quadro["alias"]
    ore_settimanali = quadro["insegnamenti"]
    monte_fsl = regola["monteConvenzionaleFSL"]

    def peso(ins: str, anno: int) -> int:
        voce = ore_settimanali.get(alias.get(ins, ins))
        return voce["ore"][anno - 1] if voce else 0

    ripartizioni: dict[str, dict] = {}
    saltate: list[str] = []
    for nome_file, genere in CATALOGHI:
        catalogo = json.loads((RADICE / nome_file).read_text(encoding="utf-8"))
        for uda in catalogo["uda"]:
            anno = int(uda["anno"])
            estremi = estremi_monte_ore(uda.get("ore"))
            convenzionale = estremi is None
            if convenzionale:
                estremi = (monte_fsl, monte_fsl)
            citati = insegnamenti_citati(uda)
            pesi = {ins: peso(ins, anno) for ins in citati if peso(ins, anno) > 0}
            senza_ore = [ins for ins in citati if peso(ins, anno) == 0]
            if not pesi:
                saltate.append(str(uda["id"]))
                continue
            minimi = riparto(pesi, estremi[0])
            massimi = riparto(pesi, estremi[1])
            voci = sorted(pesi, key=lambda ins: (-massimi[ins], -pesi[ins], ins))
            ripartizioni[str(uda["id"])] = {
                "genere": genere,
                "anno": anno,
                "titolo": uda.get("titolo") or "",
                "ore": uda.get("ore") or "",
                "totaleMin": estremi[0],
                "totaleMax": estremi[1],
                **({"convenzionale": True} if convenzionale else {}),
                "voci": [
                    {"ins": ins, "oreSett": pesi[ins], "min": minimi[ins], "max": massimi[ins]}
                    for ins in voci
                ],
                **({"senzaOre": senza_ore} if senza_ore else {}),
            }

    uscita = {
        "meta": {
            "titolo": "Ripartizione oraria delle UDA per insegnamento",
            "sottotitolo": "Proposta proporzionale calcolata sul quadro orario dell'istituto",
            "fonte": "Generato da tools/genera_ripartizione_ore.py a partire da data-quadro-orario.json e dai tre cataloghi delle UDA. Non modificare a mano: rigenerare.",
            "metodo": regola["metodo"],
            "arrotondamento": regola["arrotondamento"],
            "tolleranzaDocente": regola["tolleranzaDocente"],
            "notaTolleranza": regola["notaTolleranza"],
            "monteConvenzionaleFSL": monte_fsl,
            "notaFSL": regola["notaFSL"],
            "settimaneAnno": quadro["meta"]["settimaneAnno"],
        },
        "uda": ripartizioni,
    }
    USCITA.write_text(json.dumps(uscita, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    scrivi_documento(ripartizioni, quadro, monte_fsl)

    print(f"{USCITA.name} e {DOCUMENTO.name}: {len(ripartizioni)} UDA ripartite")
    if saltate:
        print("senza insegnamenti in orario, escluse:", ", ".join(saltate))
    for chiave, voce in ripartizioni.items():
        assert sum(v["min"] for v in voce["voci"]) == voce["totaleMin"], chiave
        assert sum(v["max"] for v in voce["voci"]) == voce["totaleMax"], chiave
    print("verifica somme: tutte coincidenti con il monte ore dell'UDA")


if __name__ == "__main__":
    main()
