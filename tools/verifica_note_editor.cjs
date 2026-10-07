const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const codice = fs.readFileSync(path.join(root, 'assets/uda-revisione.js'), 'utf8');
const funzioni = codice.slice(codice.indexOf('function ripristinaNoteRighe('), codice.indexOf('async function apriElenco('));
const sandbox = {};
vm.runInNewContext(funzioni, sandbox);
const { formattaValore, leggiValore, ripristinaNoteRighe } = sandbox;
const plain = valore => JSON.parse(JSON.stringify(valore));
const dati = JSON.parse(fs.readFileSync(path.join(root, 'data-uda-dipartimento.json'), 'utf8'));
const unita = dati.classi.flatMap(classe => classe.decisioni.flatMap(voce => voce.unita));

// Nessuna voce invariata deve diventare una modifica solo per l'apertura
// dell'editor: vale anche per note e righe prive di insegnamenti.
for (const uda of unita) {
    for (const campo of ['saperi', 'abilita', 'integrazioniSaperi']) {
        const originale = uda[campo] || [];
        assert.deepEqual(plain(leggiValore(formattaValore(originale, 'righe'), 'righe')), originale,
            `Round trip non fedele: ${uda.id}.${campo}`);
    }
}

const originale = [
    { t: 'Prima voce', ins: ['Materia A'], notaAttribuzione: 'Da ratificare.' },
    { t: 'Seconda voce', ins: ['Materia B'] },
];
const testo = formattaValore(originale, 'righe')
    .replace('Prima voce || Materia A', 'Voce riscritta || Materia C');
assert.deepEqual(plain(leggiValore(testo, 'righe'))[0],
    { t: 'Voce riscritta', ins: ['Materia C'], notaAttribuzione: 'Da ratificare.' });
const invertite = leggiValore(testo.split('\n').reverse().join('\n'), 'righe');
assert.equal(invertite[1].notaAttribuzione, 'Da ratificare.');
assert.equal('notaAttribuzione' in invertite[0], false, 'La nota non deve migrare su una voce diversa');
assert.deepEqual(plain(leggiValore('Nuova voce || Materia D', 'righe')),
    [{ t: 'Nuova voce', ins: ['Materia D'] }]);
assert.deepEqual(plain(leggiValore('', 'righe')), [], 'La rimozione esplicita di una voce resta possibile');

// Riparazione delle vecchie bozze senza reinserire righe eliminate, né
// sovrascrivere una nota esplicitamente presente nella proposta.
const bozza = [{ t: 'Prima voce', ins: ['Materia C'] }];
assert.deepEqual(plain(ripristinaNoteRighe(bozza, originale)),
    [{ t: 'Prima voce', ins: ['Materia C'], notaAttribuzione: 'Da ratificare.' }]);
assert.equal('notaAttribuzione' in bozza[0], false, 'Non mutare la bozza di partenza');
assert.equal(ripristinaNoteRighe([{ ...bozza[0], notaAttribuzione: 'Nota aggiornata.' }], originale)[0].notaAttribuzione,
    'Nota aggiornata.');
console.log('PASS: note fedeli al salvataggio, modifica di testo/materie, riordino e recupero delle vecchie bozze.');
