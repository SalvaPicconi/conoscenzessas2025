const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const leggi = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const dati = leggi('data-uda-dipartimento.json');
const sorgenti = {
    'uda-civica.html': leggi('data-uda-civica.json').uda,
    'uda-trasversali.html': leggi('data-uda-trasversali.json').uda,
    'uda-fsl.html': leggi('data-uda-fsl.json').uda,
    'uda-unificate.html': leggi('data-uda-unificate.json').uda,
    'uda.html': leggi('data-uda.json').uda,
    'uda-esame.html': leggi('data-uda-esame.json').schede
};

assert.deepEqual(dati.classi.map(classe => classe.anno), [1, 2, 3, 4, 5]);
const decisioni = dati.classi.flatMap(classe => classe.decisioni);
const vociModificabili = [...decisioni, ...dati.simulazioni.voci];
assert.equal(dati.classi.filter(classe => classe.anno <= 2).flatMap(classe => classe.decisioni).length, 2, 'Devono esserci due UDA adottate nel biennio');
assert.equal(dati.classi.find(classe => classe.anno === 1).decisioni[0].riferimenti[0], 'T1.1');
assert.equal(dati.classi.find(classe => classe.anno === 1).decisioni[0].titolo, 'Conoscersi e collaborare: dalle regole quotidiane al regolamento di classe');
assert.equal(dati.classi.find(classe => classe.anno === 2).decisioni[0].riferimenti[0], 'T2.1');
assert.equal(dati.classi.find(classe => classe.anno === 2).decisioni[0].titolo, 'Fiaba e racconto come strumento di crescita');
assert.equal(decisioni.filter(voce => voce.categoria === 'FSL').length, 3, 'Devono esserci tre scelte FSL');
assert.deepEqual(
    decisioni.filter(voce => voce.categoria === 'FSL').map(voce => voce.titolo),
    [
        'Area minori: osservare, accompagnare e documentare',
        'Area disabilità: inclusione, autonomia e progetto individualizzato',
        'Area anziani: assistenza, qualità di vita e lavoro in struttura residenziale'
    ],
    'Le scelte FSL devono mostrare i titoli completi delle UDA specifiche'
);
assert.equal(decisioni.filter(voce => voce.categoria === 'UDA d’asse').length, 3, 'Devono esserci tre scelte d’asse');
assert.equal(dati.simulazioni.voci.length, 2, 'Devono esserci due simulazioni');
assert.equal(dati.simulazioni.voci[1].titolo, 'Invecchiamento attivo in Sardegna: progetto di rete', 'La seconda simulazione deve riprendere la UDA E5.2');
assert.deepEqual(dati.simulazioni.voci[1].riferimenti, ['E5.2'], 'La seconda simulazione deve essere collegata alla UDA E5.2');
assert.equal(dati.simulazioni.voci[1].stato, 'Tema confermato');
assert.match(dati.correzioneVerbale, /Parole che curano/, 'La correzione del verbale deve essere esplicita');
assert.deepEqual(dati.nonAdottate, [], 'Le UDA adottate del biennio non devono restare tra le non adottate');

const chiaviSintesi = new Set(vociModificabili.map(voce => voce.id));
const chiaviOriginali = new Set(vociModificabili.flatMap(voce => voce.riferimenti));
assert.equal(chiaviSintesi.size, 10, 'Ogni voce modificabile deve avere una chiave autonoma');
assert.deepEqual([...chiaviSintesi].filter(chiave => chiaviOriginali.has(chiave)), [], 'Le chiavi della sintesi non devono coincidere con le originali');

for (const voce of vociModificabili) {
    assert.ok(sorgenti[voce.catalogo], `Catalogo non riconosciuto: ${voce.catalogo}`);
    for (const id of voce.riferimenti) {
        assert.ok(sorgenti[voce.catalogo].some(uda => uda.id === id), `Riferimento ${id} non trovato in ${voce.catalogo}`);
    }
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'assets/navigazione.js'), 'utf8');
const pagina = fs.readFileSync(path.join(root, 'uda-dipartimento.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'uda-dipartimento.js'), 'utf8');
const revisione = fs.readFileSync(path.join(root, 'assets/uda-revisione.js'), 'utf8');
const funzione = fs.readFileSync(path.join(root, 'supabase/functions/curricolo-uda-revisioni/index.ts'), 'utf8');
const migrazione = fs.readFileSync(path.join(root, 'supabase/consenti-uda-dipartimento.sql'), 'utf8');
assert.match(html, /data-tab="dipartimento"/);
assert.match(html, /id="content-dipartimento"/);
assert.match(nav, /uda-dipartimento\.html/);
assert.match(pagina, /data-uda-kind="dipartimento"/);
assert.match(pagina, /data-uda-source="data-uda-dipartimento\.json"/);
assert.doesNotMatch(pagina, /data-uda-source="data-uda-(fsl|esame|unificate)\.json"/);
assert.match(pagina, /id="uda-revisione-apri-accesso"/);
assert.match(pagina, /non vengono modificate automaticamente/);
assert.match(script, /data-uda-revisione-key/);
assert.match(script, /data-uda-revisione-slot/);
assert.match(revisione, /IS_DIPARTIMENTO/);
assert.match(revisione, /originali invariati/);
const campiDipartimento = revisione.match(/const CAMPI_DIPARTIMENTO = \[([\s\S]*?)\n\];/)?.[1] || '';
assert.match(campiDipartimento, /descrizione/);
assert.match(campiDipartimento, /statoDecisione/);
assert.doesNotMatch(campiDipartimento, /riferimenti|competenze|saperi|oreRipartizione/, 'L’editor non deve modificare contenuti o riferimenti delle UDA originali');
assert.match(funzione, /1-CIVICA/);
assert.match(funzione, /2-TRASVERSALE/);
assert.match(funzione, /SIM5-/);
assert.match(migrazione, /DIP1-CIVICA/);
assert.match(migrazione, /DIP2-TRASVERSALE/);
assert.match(migrazione, /SIM5-/);
assert.ok(!/DIP3-FSL.*FSL3\.1|DIP4-FSL.*FSL4\.1|DIP5-FSL.*FSL5\.1/.test(migrazione), 'Le chiavi autonome non devono essere mappate sulle originali');

console.log('PASS: 2 UDA del biennio, 3 UDA FSL, 3 UDA d’asse e 2 simulazioni; revisioni autonome e originali invariati.');
