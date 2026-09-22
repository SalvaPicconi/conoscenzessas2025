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

// Da dove viene ogni scelta sta scritto in un posto solo, che lo strumento di
// riallineamento e questa verifica leggono entrambi: tools/derivazione_dipartimento.json.
const derivazione = leggi('tools/derivazione_dipartimento.json').scelte;
assert.deepEqual(new Set(Object.keys(derivazione)), new Set(copie.map(voce => voce.id)),
    'Ogni UDA del Dipartimento deve dichiarare la propria derivazione, e viceversa');

for (const [chiave, regola] of Object.entries(derivazione)) {
    if (!regola.copia) continue;
    const copia = copie.find(voce => voce.id === chiave);
    assert.ok(copia, `Copia autonoma mancante: ${chiave}`);
    const originale = structuredClone(trova(regola.copia.file, regola.copia.raccolta, regola.copia.id));
    originale.id = chiave;
    assert.deepEqual(copia, originale, `${chiave} deve essere una copia integrale con il solo identificativo autonomo: esegui tools/allinea_uda_dipartimento.py`);
}

// La scelta d’asse di terza non è la copia di un catalogo: il Dipartimento la
// riscrive sugli adolescenti (revisione del 21 settembre 2026), perché la
// versione precedente, centrata sulla prima infanzia, ripeteva la scelta FSL
// della stessa classe. Resta vincolata alle schede d’asse che fonde: ogni
// abilità e ogni sapere o viene da una di quelle schede, o porta la nota di
// attribuzione che il dipartimento deve ratificare.
const fusa = copie.find(voce => voce.id === 'DIP3-ASSE');
const riscritta = derivazione['DIP3-ASSE'].riscritta;
assert.ok(riscritta, 'La scelta d’asse di terza deve essere dichiarata come riscritta dal Dipartimento');
const schedeFuse = riscritta.fonde;
const fontiFusione = schedeFuse.map(id => trova(riscritta.fascicolo, 'uda', id));
assert.ok(fusa, 'La scelta d’asse di terza deve avere un’unica chiave autonoma');
assert.equal(fusa.titolo, 'Adolescenti: prevenzione, tutela, diritti e servizi');
assert.deepEqual(fusa.fonde.map(voce => voce.id), schedeFuse);
assert.deepEqual(fusa.titoliOrigine, fontiFusione.map(voce => voce.titolo));
assert.deepEqual(fusa.competenze, fontiFusione.map(voce => voce.competenza));
assert.deepEqual(new Set(fusa.competenze), new Set([5, 6, 7, 9]));
assert.equal(fusa.competenze.includes(4), false, 'La competenza 4 resta alla scelta FSL: qui parlerebbe di bambini');
assert.doesNotMatch(JSON.stringify(fusa), /puericultura|accudimento del bambino|prima infanzia/i, 'La scheda non deve tornare sulla prima infanzia');

for (const fonte of fontiFusione) {
    const provenienza = fusa.provenienzaContenuti.find(voce => voce.scheda === fonte.id);
    assert.ok(provenienza, `Provenienza mancante per la scheda ${fonte.id}`);
    assert.equal(provenienza.competenza, fonte.competenza);
    assert.equal(fusa.traguardo.includes(fonte.traguardo), true, `Traguardo perso: ${fonte.id}`);
    for (const campo of ['abilita', 'saperi']) {
        for (const voce of fonte[campo]) {
            assert.ok(provenienza[campo].some(altra => JSON.stringify(altra) === JSON.stringify(voce)), `Contenuto perso in ${fonte.id}.${campo}`);
            assert.ok(fusa[campo].some(altra => JSON.stringify(altra) === JSON.stringify(voce)), `Contenuto non riportato nella scheda: ${fonte.id}.${campo}`);
        }
    }
}

// Quello che non viene dalle schede d’asse è una proposta del dipartimento e
// come tale va dichiarata, altrimenti entra nel curricolo senza che nessuno
// l’abbia deliberata.
for (const campo of ['abilita', 'saperi']) {
    const dalleSchede = fontiFusione.flatMap(fonte => fonte[campo].map(voce => JSON.stringify(voce)));
    for (const voce of fusa[campo]) {
        if (dalleSchede.includes(JSON.stringify(voce))) continue;
        assert.ok(voce.notaAttribuzione, `Voce senza attribuzione dichiarata in ${campo}: ${voce.t}`);
    }
}

assert.deepEqual(fusa.rubrica.map(voce => voce.competenza), fusa.competenze, 'La rubrica deve seguire le competenze della scheda');
assert.deepEqual(fusa.raccordoProfilo.map(voce => voce.competenza), fusa.competenze);
assert.deepEqual(fusa.pianificazione.oreOrigine.map(voce => voce.scheda), schedeFuse);

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
