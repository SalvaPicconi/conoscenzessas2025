"""Controlli della proposta; genera solo un file temporaneo, non modifica i cataloghi."""
import hashlib
import json
from pathlib import Path
import runpy
import tempfile

ROOT = Path(__file__).resolve().parent.parent
read = lambda p: json.loads((ROOT / p).read_text())
src = read('data-uda.json')
out = read('data-uda-unificate.json')
by = {u['id']: u for u in src['uda']}
refs = [f['id'] for u in out['uda'] for f in u['fonde']]
supplementi = {'1.10', '1.11', '2.10', '2.11', '3.11', '4.11', '5.11', '5.12', '5.13'}
assert len(refs) == len(set(refs)) == 48
assert set(refs).issubset(by)
assert set(by) - set(refs) == supplementi
assert len(out['uda']) == 27
assert [sum(u['anno'] == y for u in out['uda']) for y in range(1, 6)] == [4,7,5,5,6]
materials = 0
for u in out['uda']:
    originals = [by[f['id']] for f in u['fonde']]
    assert all(o['anno'] == u['anno'] for o in originals) or (u['id'] == 'U1.1' and u['anno'] == 2 and [o['id'] for o in originals] == ['1.1','1.7'])
    assert u['competenze'] == [o['competenza'] for o in originals]
    assert u['traguardiOrigine'] == [{'competenza': o['competenza'], 'testo': o['traguardo'], 'scheda': o['id']} for o in originals]
    for o in originals:
        provenance = next(p for p in u['provenienzaContenuti'] if p['scheda'] == o['id'])
        for field in ['abilita', 'saperi']:
            assert provenance[field] == o[field]
            for v in o[field]:
                assert any(v['t'].strip().lower() == w['t'].strip().lower() and set(v['ins']) <= set(w['ins']) for w in u[field])
    assert u['pianificazione']['oreProgettate'] is None
    assert all(f['ore'] is None for f in u['pianificazione']['fasi'])
    assert u['pianificazione']['oreOrigine'] == [{'scheda': o['id'], 'ore': o['ore']} for o in originals]
    assert [r['competenza'] for r in u['rubrica']] == u['competenze']
    assert all(len(r['livelli']) == 4 and r['indicatore'] and r['evidenzaIndividuale'] for r in u['rubrica'])
    assert [m['riferimento'] for m in u['materialiOrigine']] == [o['sviluppata'] for o in originals if o.get('sviluppata')]
    materials += len(u['materialiOrigine'])
assert materials == 5
assert next(u for u in out['uda'] if u['id']=='U2.1')['anno'] == 2
snapshot = read('revisioni/2026-09-06-uda-unificate/manifest-prima.json')
for p in ['data-uda-fsl.json', 'votazione-uda.js']:
    assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest() == snapshot[p], p
m = runpy.run_path(str(ROOT/'tools/genera_uda_unificate.py'))
with tempfile.TemporaryDirectory() as t:
    m['main'].__globals__['DESTINAZIONE'] = Path(t)/'generated.json'
    m['main']()
    assert json.loads((Path(t)/'generated.json').read_text()) == out
for key, path in [('sha256Fonte','data-uda.json'), ('sha256Revisione','tools/revisione_uda_unificate.json')]:
    assert out['meta']['tracciamento'][key] == hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
print('PASS: copertura 48/48 origini e 9 proposte autonome; 27 schede; contenuti e provenienza; 48 dimensioni con 4 livelli; 5 riferimenti; ore non inventate; FSL/voto invariati; generazione riproducibile; hash coerenti.')
