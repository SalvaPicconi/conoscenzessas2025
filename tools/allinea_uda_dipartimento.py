#!/usr/bin/env python3
"""Riallinea le UDA scelte dal Dipartimento ai cataloghi da cui vengono.

Le dieci unità adottate il 9 settembre 2026 vivono in data-uda-dipartimento.json
come copie autonome: hanno un identificativo proprio, si revisionano per conto
loro e la pagina non rimanda ai cataloghi originali. È una scelta voluta — il
Dipartimento ha adottato quelle schede, non un puntatore che cambia sotto i
piedi — ma senza uno strumento la copia si scollava dall'originale a ogni
correzione del catalogo, e ce ne si accorgeva solo quando la verifica falliva.

Questo script rifà le copie dalle sorgenti dichiarate in
tools/derivazione_dipartimento.json. La scelta d'asse di terza non si tocca:
il Dipartimento l'ha riscritta e non è la copia di nessuna scheda.

    python3 tools/allinea_uda_dipartimento.py            # riallinea
    python3 tools/allinea_uda_dipartimento.py --controlla # dice solo cosa cambierebbe
"""

import json
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
DESTINAZIONE = RADICE / "data-uda-dipartimento.json"
DERIVAZIONE = RADICE / "tools/derivazione_dipartimento.json"


def leggi(percorso):
    return json.loads((RADICE / percorso).read_text(encoding="utf-8"))


def unita_del_file(dati):
    """Ogni UDA del catalogo dipartimentale, ovunque sia annidata."""
    for classe in dati["classi"]:
        for decisione in classe["decisioni"]:
            for indice, unita in enumerate(decisione["unita"]):
                yield decisione["unita"], indice, unita
    for voce in dati["simulazioni"]["voci"]:
        for indice, unita in enumerate(voce["unita"]):
            yield voce["unita"], indice, unita


def main():
    solo_controllo = "--controlla" in sys.argv
    dati = json.loads(DESTINAZIONE.read_text(encoding="utf-8"))
    scelte = leggi("tools/derivazione_dipartimento.json")["scelte"]

    cataloghi = {}
    def originale(rif):
        chiave = rif["file"]
        if chiave not in cataloghi:
            cataloghi[chiave] = leggi(chiave)
        voci = cataloghi[chiave][rif["raccolta"]]
        trovata = next((v for v in voci if v["id"] == rif["id"]), None)
        if trovata is None:
            raise SystemExit(f"Scheda di origine non trovata: {rif['id']} in {chiave}")
        return trovata

    viste, cambiate = set(), []
    for contenitore, indice, unita in unita_del_file(dati):
        chiave = unita["id"]
        viste.add(chiave)
        derivazione = scelte.get(chiave)
        if derivazione is None:
            raise SystemExit(f"UDA senza derivazione dichiarata: {chiave}")
        if "copia" not in derivazione:
            continue
        nuova = json.loads(json.dumps(originale(derivazione["copia"])))
        nuova["id"] = chiave
        if nuova != unita:
            cambiate.append((chiave, derivazione["copia"]["file"], derivazione["copia"]["id"]))
            contenitore[indice] = nuova

    mancanti = set(scelte) - viste
    if mancanti:
        raise SystemExit(f"Derivazioni dichiarate ma non presenti nel catalogo: {sorted(mancanti)}")

    if not cambiate:
        print("Le copie del Dipartimento sono già allineate ai cataloghi.")
        return

    for chiave, file, origine in cambiate:
        print(f"  {chiave} ← {origine} di {file}")
    if solo_controllo:
        print(f"{len(cambiate)} copie da riallineare. Esegui senza --controlla per applicare.")
        raise SystemExit(1)

    DESTINAZIONE.write_text(
        json.dumps(dati, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{len(cambiate)} copie riallineate → {DESTINAZIONE.name}")


if __name__ == "__main__":
    main()
