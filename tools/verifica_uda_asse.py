"""Controlli del catalogo d'asse; genera solo un file temporaneo, non modifica i cataloghi."""
import hashlib
import json
from pathlib import Path
import runpy
import tempfile

ROOT = Path(__file__).resolve().parent.parent
read = lambda p: json.loads((ROOT / p).read_text())
src = read('data-uda.json')
out = read('data-uda-asse.json')
by = {u['id']: u for u in src['uda']}
# Il catalogo tiene insieme due nature: le unità nate dall'accorpamento delle
# schede di origine e quelle autonome, proposte dai docenti, che si portano
# dentro se stesse come unica fonte.
accorpate = [u for u in out['uda'] if [f['id'] for f in u['fonde']] != [u['id']]]
proposte = [u for u in out['uda'] if [f['id'] for f in u['fonde']] == [u['id']]]
refs = [f['id'] for u in accorpate for f in u['fonde']]
supplementi = {'1.10', '1.11', '2.10', '2.11', '3.11', '4.11', '5.11', '5.12', '5.13'}
assert len(refs) == len(set(refs)) == 48
assert set(refs).issubset(by)
assert set(by) - set(refs) == supplementi
assert {u['id'] for u in proposte} == supplementi
assert len(accorpate) == 27
assert len(out['uda']) == 36
assert [sum(u['anno'] == y for u in out['uda']) for y in range(1, 6)] == [6,9,6,6,9]
# Le proposte autonome entrano nel catalogo senza essere riscritte: titolo,
# ore, periodo deliberato e competenza portante restano quelli della scheda.
for u in proposte:
    o = by[u['id']]
    for campo in ['anno', 'titolo', 'qnq', 'traguardo', 'compito', 'ore', 'abilita', 'saperi',
                  'situazione', 'prodotto', 'beneficiari', 'ambito', 'competenza']:
        assert u[campo] == o[campo], (u['id'], campo)
    assert u['periodo'] == o.get('periodo', '')
    assert u['competenze'] == (o.get('competenze') or [o['competenza']])
    assert u['rubrica'] == [] and u['materialiOrigine'] == [] and u['provenienzaContenuti'] == []
materials = 0
for u in accorpate:
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
assert hashlib.sha256((ROOT/'votazione-uda.js').read_bytes()).hexdigest() == snapshot['votazione-uda.js']
# Le UDA FSL sono cambiate dopo lo snapshot del 6 settembre: il 21 settembre e
# poi il 22, quando il monte ore e' entrato nelle schede. Il controllo resta,
# ma sul valore attuale, cosi' una modifica non voluta si vede lo stesso.
assert hashlib.sha256((ROOT/'data-uda-fsl.json').read_bytes()).hexdigest() == \
    '809a513e0489889f3e41508913609ee5881f9014aad6022c5c3811b1374cc051', 'data-uda-fsl.json'
m = runpy.run_path(str(ROOT/'tools/genera_uda_asse.py'))
with tempfile.TemporaryDirectory() as t:
    m['main'].__globals__['DESTINAZIONE'] = Path(t)/'generated.json'
    m['main']()
    assert json.loads((Path(t)/'generated.json').read_text()) == out
for key, path in [('sha256Fonte','data-uda.json'), ('sha256Revisione','tools/revisione_uda_asse.json')]:
    assert out['meta']['tracciamento'][key] == hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
print('PASS: 36 UDA d\'asse — 27 da accorpamento con copertura 48/48 origini e 9 proposte autonome riprese senza riscritture; contenuti e provenienza; 48 dimensioni con 4 livelli; 5 riferimenti; ore non inventate; FSL/voto invariati; generazione riproducibile; hash coerenti.')
