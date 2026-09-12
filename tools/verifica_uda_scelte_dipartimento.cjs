const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const leggi = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const trova = (file, raccolta, id) => leggi(file)[raccolta].find(voce => voce.id === id);
const dati = leggi('data-uda-dipartimento.json');

assert.deepEqual(dati.classi.map(classe => classe.anno), [1, 2, 3, 4, 5]);
const decisioni = dati.classi.flatMap(classe => classe.decisioni);
const copie = [...decisioni.flatMap(voce => voce.unita), ...dati.simulazioni.voci.flatMap(voce => voce.unita)];

assert.equal(dati.classi.filter(classe => classe.anno <= 2).flatMap(classe => classe.decisioni).length, 2, 'Devono esserci due UDA adottate nel biennio');
assert.equal(decisioni.filter(voce => voce.categoria === 'FSL').length, 3, 'Devono esserci tre scelte FSL');
assert.equal(decisioni.filter(voce => voce.categoria === 'UDA d’asse').length, 3, 'Devono esserci tre scelte d’asse');
assert.equal(dati.simulazioni.voci.length, 2, 'Devono esserci due simulazioni');
assert.equal(copie.length, 10, 'Devono esserci dieci UDA autonome, una per ogni scelta');

const corrispondenze = [
    ['DIP1-CIVICA', 'data-uda-civica.json', 'uda', 'T1.1'],
    ['DIP2-TRASVERSALE', 'data-uda-trasversali.json', 'uda', 'T2.1'],
    ['DIP3-FSL', 'data-uda-fsl.json', 'uda', 'FSL3.1'],
    ['DIP4-FSL', 'data-uda-fsl.json', 'uda', 'FSL4.1'],
    ['DIP4-ASSE', 'data-uda-unificate.json', 'uda', 'U4.3'],
    ['DIP5-FSL', 'data-uda-fsl.json', 'uda', 'FSL5.1'],
    ['DIP5-ASSE', 'data-uda.json', 'uda', '5.12'],
    ['SIM5-1', 'data-uda-esame.json', 'schede', 'E5.1'],
    ['SIM5-2', 'data-uda-esame.json', 'schede', 'E5.2'],
];

for (const [chiave, file, raccolta, originaleId] of corrispondenze) {
    const copia = copie.find(voce => voce.id === chiave);
    assert.ok(copia, `Copia autonoma mancante: ${chiave}`);
    const originale = structuredClone(trova(file, raccolta, originaleId));
    originale.id = chiave;
    assert.deepEqual(copia, originale, `${chiave} deve essere una copia integrale con il solo identificativo autonomo`);
}

const fusa = copie.find(voce => voce.id === 'DIP3-ASSE');
const fontiFusione = [trova('data-uda-unificate.json', 'uda', 'U3.3'), trova('data-uda-unificate.json', 'uda', 'U3.4')];
assert.ok(fusa, 'La scelta d’asse di terza deve avere un’unica chiave autonoma');
assert.equal(fusa.titolo, 'Prevenzione, tutela, diritti dei minori e servizi');
assert.deepEqual(fusa.titoliOrigine, fontiFusione.map(voce => voce.titolo));
assert.deepEqual(new Set(fusa.competenze), new Set([4, 5, 6, 9]));

function verificaContenutoIntegrato(destinazione, origine, percorso = '') {
    for (const [chiave, valore] of Object.entries(origine)) {
        if (['id', 'titolo', 'competenza'].includes(chiave)) continue;
        const attuale = destinazione?.[chiave];
        const posizione = `${percorso}.${chiave}`;
        if (Array.isArray(valore)) {
            assert.ok(Array.isArray(attuale), `Campo integrato mancante: ${posizione}`);
            for (const elemento of valore) assert.ok(attuale.some(voce => JSON.stringify(voce) === JSON.stringify(elemento)), `Contenuto perso in ${posizione}`);
        } else if (valore && typeof valore === 'object') {
            verificaContenutoIntegrato(attuale, valore, posizione);
        } else if (valore !== null && valore !== '') {
            assert.ok(String(attuale).includes(String(valore)), `Contenuto perso in ${posizione}`);
        }
    }
}
for (const fonte of fontiFusione) verificaContenutoIntegrato(fusa, fonte, fonte.id);

assert.equal(new Set(copie.map(voce => voce.id)).size, 10, 'Ogni UDA deve avere una chiave autonoma');
assert.equal(copie.some(voce => /DIP3-ASSE-U3[34]/.test(voce.id)), false, 'La scelta d’asse di terza non deve essere divisa in due schede');
assert.equal(copie.find(voce => voce.id === 'DIP3-FSL').titolo, 'Area minori: osservare, accompagnare e documentare');
assert.equal(copie.find(voce => voce.id === 'DIP4-FSL').titolo, 'Area disabilità: inclusione, autonomia e progetto individualizzato');
assert.equal(copie.find(voce => voce.id === 'DIP5-FSL').titolo, 'Area anziani: assistenza, qualità di vita e lavoro in struttura residenziale');
assert.equal(copie.find(voce => voce.id === 'SIM5-2').titolo, 'Invecchiamento attivo in Sardegna: progetto di rete');

const json = fs.readFileSync(path.join(root, 'data-uda-dipartimento.json'), 'utf8');
assert.doesNotMatch(json, /"catalogo"\s*:|"catalogoEtichetta"\s*:|data-uda-(civica|trasversali|fsl|unificate|esame)\.json/, 'Il catalogo autonomo non deve contenere collegamenti ai cataloghi originali');

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'assets/navigazione.js'), 'utf8');
const pagina = fs.readFileSync(path.join(root, 'uda-dipartimento.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'uda-dipartimento.js'), 'utf8');
const revisione = fs.readFileSync(path.join(root, 'assets/uda-revisione.js'), 'utf8');
const funzione = fs.readFileSync(path.join(root, 'supabase/functions/curricolo-uda-revisioni/index.ts'), 'utf8');
const migrazione = fs.readFileSync(path.join(root, 'supabase/consenti-uda-dipartimento.sql'), 'utf8');

assert.match(home, /data-tab="dipartimento"/);
assert.match(home, /id="content-dipartimento"/);
assert.match(nav, /uda-dipartimento\.html/);
assert.match(pagina, /data-uda-kind="dipartimento"/);
assert.match(pagina, /data-uda-source="data-uda-dipartimento\.json"/);
assert.match(pagina, /id="uda-revisione-apri-accesso"/);
assert.doesNotMatch(pagina, /original|catalog|codic|correzione necessaria|non adottat/i, 'La pagina pubblica non deve mostrare note tecniche o rimandi ai cataloghi');
assert.doesNotMatch(script, /href=.*uda-(civica|trasversali|fsl|unificate|esame)\.html/i, 'Le UDA devono aprirsi integralmente nella nuova sezione');
assert.match(script, /dettaglioUda/);
assert.match(script, /dettaglioEsame/);
assert.match(script, /data-uda-revisione-key/);
assert.match(revisione, /estraiScelteDipartimento/);
assert.match(revisione, /voce\.unita/);
assert.doesNotMatch(revisione, /modifiche della sola sintesi|originali invariati/);
const campiDipartimento = revisione.match(/const CAMPI_DIPARTIMENTO = \[([\s\S]*?)\n\];/)?.[1] || '';
for (const campo of ['titolo', 'traguardo', 'situazione', 'compito', 'prodotto', 'abilita', 'saperi', 'argomento', 'traccia']) {
    assert.match(campiDipartimento, new RegExp(`'${campo}'`), `Campo modificabile mancante: ${campo}`);
}
for (const testo of ['1-CIVICA', '2-TRASVERSALE', '\\[3-5\\]-\\(FSL\\|ASSE\\)', 'SIM5-']) {
    assert.match(funzione, new RegExp(testo));
    assert.match(migrazione, new RegExp(testo));
}

console.log('PASS: catalogo autonomo con 10 UDA integrali, scelta d’asse di terza fusa e revisioni separate.');
