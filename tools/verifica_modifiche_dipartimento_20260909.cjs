const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const leggi = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

const asse = leggi('data-uda.json');
const unificate = leggi('data-uda-unificate.json');
const trasversali = leggi('data-uda-trasversali.json');
const civica = leggi('data-uda-civica.json');
const ripartizione = leggi('data-ripartizione-ore.json');

assert.equal(trasversali.uda.length, 13);
assert.equal(trasversali.uda.some(uda => uda.id === 'T1.1'), false, 'T1.1 non deve restare nel catalogo trasversale');

const t12 = trasversali.uda.find(uda => uda.id === 'T1.2');
assert.ok(t12, 'T1.2 deve restare nel catalogo trasversale');
assert.equal(Object.hasOwn(t12, 'oreRipartizione'), false, 'La bozza vuota T1.2 non deve essere applicata');

assert.equal(civica.uda.length, 1);
const t11 = civica.uda[0];
assert.equal(t11.id, 'T1.1');
assert.equal(t11.titolo, 'Conoscersi e collaborare: dalle regole quotidiane al regolamento di classe');
assert.equal(t11.nucleoEducazioneCivica, 'Costituzione');
assert.equal(t11.competenzaEducazioneCivica, 3);
assert.equal(Number(t11.ore), 33);
assert.equal(Object.values(t11.oreRipartizione).reduce((totale, ore) => totale + ore, 0), 33);

const ripT11 = ripartizione.uda['T1.1'];
assert.equal(ripT11.genere, 'civica');
assert.equal(ripT11.assegnazioneConcordata, true);
assert.equal(ripT11.totaleMin, 33);
assert.equal(ripT11.totaleMax, 33);

for (const [nome, catalogo] of [['data-uda.json', asse], ['data-uda-unificate.json', unificate]]) {
    const nonConformi = catalogo.uda.filter(uda => uda.anno >= 3 && JSON.stringify(uda).includes('Scienze Integrate'));
    assert.deepEqual(nonConformi.map(uda => uda.id), [], `${nome}: Scienze Integrate non deve ricorrere nel triennio`);
}

console.log('PASS: U4.3 applicata; T1.1 spostata in Educazione civica con 33 ore ed EC3; T1.2 vuota ignorata.');
