#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent

data_path = root / 'data.json'
corr_path = root / 'correzioni_competenze.json'

if not data_path.exists():
    print('ERRORE: data.json non trovato')
    raise SystemExit(1)
if not corr_path.exists():
    print('ERRORE: correzioni_competenze.json non trovato')
    raise SystemExit(1)

with data_path.open('r', encoding='utf-8') as f:
    data = json.load(f)
with corr_path.open('r', encoding='utf-8') as f:
    corr = json.load(f)

# Costruisci mappa num -> titolo
if isinstance(corr, list):
    m = {str(e.get('competenzaNum')): e.get('titoloCorretto') for e in corr if e and e.get('competenzaNum') is not None and e.get('titoloCorretto')}
elif isinstance(corr, dict):
    m = {str(k): v for k, v in corr.items() if v}
else:
    print('Formato correzioni non valido')
    raise SystemExit(1)

changed = False
for item in data:
    key = str(item.get('competenzaNum'))
    if key in m:
        if item.get('competenzaTitolo') != m[key]:
            item['competenzaTitolo'] = m[key]
            changed = True

if not changed:
    print('Nessuna modifica necessaria (titoli già allineati).')
    raise SystemExit(0)

with data_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')

print('Aggiornamento completato: data.json salvato con i titoli corretti.')
