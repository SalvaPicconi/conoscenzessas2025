// Calendario di massima delle UDA scelte dal Dipartimento.
//
// Controlla che il calendario copra tutte le unità adottate, che i periodi
// siano coerenti con i mesi del diagramma e che la pagina lo mostri senza
// togliere ai docenti la possibilità di cambiare il periodo della singola UDA.
//
//   node tools/verifica_calendario_dipartimento.cjs
//
// Il controllo del browser si esegue solo se playwright è raggiungibile
// (NODE_PATH=/opt/node22/lib/node_modules oppure installazione locale).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const leggi = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const dati = leggi('data-uda-dipartimento.json');
const calendario = dati.calendario;

assert.ok(calendario, 'Il fascicolo deve contenere il calendario di massima');

const unita = [
    ...dati.classi.flatMap(classe => classe.decisioni.flatMap(voce => voce.unita)),
    ...dati.simulazioni.voci.flatMap(voce => voce.unita)
];
const sigle = calendario.mesi.map(mese => mese.sigla);

assert.deepEqual(sigle, ['Set', 'Ott', 'Nov', 'Dic', 'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu']);
assert.deepEqual(calendario.mesi.map(mese => mese.quadrimestre), [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);

// Nessuna unità adottata resta senza periodo e nessuna voce del calendario
// resta senza unità.
assert.deepEqual(
    calendario.voci.map(voce => voce.id).sort(),
    unita.map(voce => voce.id).sort(),
    'Il calendario deve avere una voce per ogni unità adottata, simulazioni comprese'
);

for (const voce of calendario.voci) {
    const scheda = unita.find(riga => riga.id === voce.id);
    assert.equal(voce.anno, scheda.anno, `Anno discordante nel calendario di ${voce.id}`);
    const primo = sigle.indexOf(voce.da);
    const ultimo = sigle.indexOf(voce.a);
    assert.ok(primo >= 0 && ultimo >= 0, `Mesi non riconosciuti in ${voce.id}`);
    assert.ok(primo <= ultimo, `Il mese iniziale segue quello finale in ${voce.id}`);
    for (const campo of ['etichetta', 'genere', 'periodo', 'dettaglio', 'materie', 'ore']) {
        assert.ok(String(voce[campo] || '').trim(), `Campo ${campo} mancante nel calendario di ${voce.id}`);
    }
    assert.ok(['UDA', 'FSL', 'Simulazione'].includes(voce.genere), `Genere non previsto in ${voce.id}`);
    if (voce.daConfermare) assert.ok(String(voce.nota || '').trim(), `La voce ${voce.id} è da confermare senza motivazione`);
}

// Il periodo della singola unità resta un campo modificabile: l'editor delle
// revisioni mostra solo i campi presenti nella scheda.
const revisione = fs.readFileSync(path.join(root, 'assets/uda-revisione.js'), 'utf8');
assert.match(revisione.match(/const CAMPI_DIPARTIMENTO = \[([\s\S]*?)\n\];/)[1], /'periodo'/);
for (const chiave of ['DIP3-ASSE', 'DIP4-ASSE', 'DIP5-ASSE']) {
    const scheda = unita.find(voce => voce.id === chiave);
    assert.ok('periodo' in scheda, `Senza il campo periodo la scheda ${chiave} non è modificabile nel calendario`);
}
const PERIODI = ['1° quadrimestre', '2° quadrimestre', 'Intero anno scolastico'];
for (const chiave of ['DIP1-CIVICA', 'DIP2-TRASVERSALE', 'DIP3-ASSE', 'DIP4-ASSE', 'DIP5-ASSE']) {
    const scheda = unita.find(voce => voce.id === chiave);
    assert.ok(PERIODI.includes(scheda.periodo), `Il periodo di ${chiave} deve essere una delle scelte del piano UDA del consiglio di classe`);
}

// La copia autonoma e la scheda di origine devono restare allineate.
const unificate = leggi('data-uda-unificate.json').uda.find(voce => voce.id === 'U4.3');
assert.equal(unificate.periodo, unita.find(voce => voce.id === 'DIP4-ASSE').periodo);
const asse = leggi('data-uda.json').uda.find(voce => voce.id === '5.12');
assert.equal(asse.periodo, unita.find(voce => voce.id === 'DIP5-ASSE').periodo);

// Prerequisiti: uno per ogni anno di corso.
for (const classe of dati.classi) {
    assert.ok(Array.isArray(classe.prerequisiti) && classe.prerequisiti.length,
        `Prerequisiti mancanti per la classe ${classe.anno}ª`);
}
assert.ok(calendario.puntiDaDeliberare.length >= 3, 'I punti da deliberare devono essere riportati');

// Il piano vale per una sola annualità e si presenta con un titolo proprio.
assert.equal(dati.meta.annoScolastico, '2026/2027');
assert.equal(calendario.annoScolastico, dati.meta.annoScolastico);
assert.ok(String(dati.meta.titoloPiano || '').trim(), 'Il piano deve avere un titolo');
assert.match(dati.meta.validita, /2026\/2027/);
assert.match(calendario.nota, /2026\/2027/);

console.log(`PASS dati: ${calendario.voci.length} voci di calendario, ${calendario.voci.filter(voce => voce.daConfermare).length} da confermare, prerequisiti su cinque anni.`);

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('SALTATO browser: playwright non disponibile.'); process.exit(0); }

const base = 'https://salvapicconi.github.io/conoscenzessas2025/';

(async () => {
    const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {});
    try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.route(`${base}**`, async route => {
            const relativo = decodeURIComponent(new URL(route.request().url()).pathname.slice('/conoscenzessas2025/'.length)) || 'index.html';
            const file = path.resolve(root, relativo);
            if (!file.startsWith(`${root}${path.sep}`)) return route.abort();
            try { await route.fulfill({ path: file }); }
            catch { await route.fulfill({ status: 404, body: 'not found' }); }
        });
        await context.route('https://fonts.googleapis.com/**', route => route.abort());
        await context.route('https://fonts.gstatic.com/**', route => route.abort());
        const pagina = await context.newPage();
        const errori = [];
        pagina.on('pageerror', errore => errori.push(errore.message));
        await pagina.goto(`${base}uda-dipartimento.html`, { waitUntil: 'domcontentloaded' });
        await pagina.waitForSelector('.dip-gantt-bar');

        assert.equal(await pagina.locator('.dip-gantt tbody tr').count(), calendario.voci.length);
        assert.equal(await pagina.locator('.dip-gantt-bar').count(), calendario.voci.length);
        assert.equal(await pagina.locator('.dip-gantt-bar[data-conferma="true"]').count(),
            calendario.voci.filter(voce => voce.daConfermare).length);
        assert.equal(await pagina.locator('.dip-decisioni-griglia article').count(), calendario.puntiDaDeliberare.length);
        assert.equal(await pagina.locator('.dip-prerequisiti').count(), 5);

        // Ogni barra deve partire e finire nei mesi dichiarati.
        const misure = await pagina.evaluate(() => [...document.querySelectorAll('.dip-gantt tbody tr')].map(riga => {
            const celle = [...riga.children].slice(1);
            let indice = 0;
            for (const cella of celle) {
                if (cella.classList.contains('dip-gantt-cell')) {
                    return { titolo: riga.querySelector('th').textContent.trim(), primo: indice, ampiezza: cella.colSpan };
                }
                indice += cella.colSpan || 1;
            }
            return null;
        }));
        calendario.voci.forEach((voce, indice) => {
            const atteso = { primo: sigle.indexOf(voce.da), ampiezza: sigle.indexOf(voce.a) - sigle.indexOf(voce.da) + 1 };
            assert.equal(misure[indice].primo, atteso.primo, `Barra fuori posto: ${voce.id}`);
            assert.equal(misure[indice].ampiezza, atteso.ampiezza, `Durata errata nel diagramma: ${voce.id}`);
        });

        const scheda = pagina.locator('.dip-full-uda[data-id="DIP4-FSL"]');
        await scheda.locator('.uda-acc-header').click();
        const testoScheda = await scheda.innerText();
        assert.match(testoScheda, /Calendario di svolgimento/);
        assert.match(testoScheda, /Novembre – gennaio/);
        assert.match(testoScheda, /Da confermare/);

        // Foglio per il consiglio: il calendario si stampa da solo, con il
        // titolo del piano e l'anno scolastico in testa.
        assert.equal(await pagina.locator('.dip-calendario-dettaglio tbody tr').count(), calendario.voci.length);
        assert.match(await pagina.locator('#dip-hero-piano').innerText(), new RegExp(dati.meta.titoloPiano.slice(0, 20)));
        assert.match(await pagina.locator('#dip-hero-piano-sub').innerText(), /2026\/2027/);
        assert.match(await pagina.locator('.dip-anno-badge').innerText(), /2026\/2027/);
        await pagina.evaluate(() => { window.print = () => {}; });
        await pagina.locator('#dip-stampa-calendario').click();
        const foglio = pagina.locator('.stampa-documento.stampa-foglio');
        await foglio.waitFor({ state: 'attached' });
        assert.equal(await foglio.locator('.dip-gantt-bar').count(), calendario.voci.length);
        assert.equal(await foglio.locator('.dip-calendario-dettaglio tbody tr').count(), calendario.voci.length);
        assert.equal(await foglio.locator('button').count(), 0, 'Il foglio non deve portarsi dietro i comandi');
        assert.equal(await foglio.locator('h1').innerText(), dati.meta.titoloPiano);
        assert.match(await foglio.innerText(), /2026\/2027/);
        await pagina.evaluate(() => window.dispatchEvent(new Event('afterprint')));
        assert.equal(await pagina.locator('.stampa-documento').count(), 0, 'Dopo la stampa la copia va rimossa');

        await pagina.setViewportSize({ width: 390, height: 844 });
        assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false,
            'Il diagramma non deve produrre overflow orizzontale su mobile');
        assert.deepEqual(errori, []);
        console.log('PASS browser: diagramma completo, barre nei mesi dichiarati, tabella dei periodi, foglio di stampa per il consiglio, prerequisiti e mobile senza overflow.');
    } finally { await browser.close(); }
})().catch(errore => { console.error(errore); process.exit(1); });
