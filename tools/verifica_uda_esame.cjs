const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = (process.env.UDA_BASE_URL || 'http://127.0.0.1:8765/').replace(/\/$/, '') + '/';
const dati = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data-uda-esame.json'), 'utf8'));

assert.equal(dati.schede.length, 6);
for (const anno of [3, 4, 5]) assert.equal(dati.schede.filter(scheda => scheda.anno === anno).length, 2);
assert.deepEqual([...new Set(dati.schede.map(scheda => scheda.tipologia))].sort(), ['A', 'B', 'C', 'D']);
assert.equal(dati.grigliaComune.reduce((totale, voce) => totale + voce.max, 0), 20);
assert.deepEqual(dati.tipologie.map(voce => voce.definizione), [
    'Redazione di una relazione professionale sulla base dell’analisi di documenti, tabelle, dati.',
    'Analisi e soluzione di problematiche in un contesto operativo riguardante l’area professionale (caso aziendale/caso professionale).',
    'Individuazione, predisposizione o descrizione delle fasi per la realizzazione di un servizio.',
    'Elaborazione di un progetto finalizzato all’innovazione della filiera di produzione e/o alla promozione di servizi e prestazioni professionali del settore.'
]);
const insegnamentiIndirizzo = [
    'Metodologie Operative',
    'Diritto e Tecnica Amministrativa',
    'Igiene e Cultura Medico-Sanitaria',
    'Psicologia Generale e Applicata'
];
const nucleiIntegrali = {
    1: 'Metodi di progettazione e relative azioni di pianificazione, gestione, valutazione dei progetti per rispondere ai bisogni delle persone; reti formali e informali come elementi di contesto operativo.',
    2: 'Raccolta e modalità di trattamento e trasmissione di dati e informazioni per mezzo di diversi canali e registri comunicativi; norme di sicurezza e privacy.',
    4: 'Condizioni d’accesso e fruizione dei servizi educativi, sociali, sociosanitari e sanitari.',
    5: 'Metodi, strumenti e condizioni del prendere in cura persone con fragilità o in situazioni di svantaggio per cause sociali o patologie.',
    6: 'Allestimento e cura dell’ambiente di vita delle persone in difficoltà e norme di sicurezza.',
    7: 'Attività educative, di animazione, ludiche e culturali in rapporto alle diverse tipologie di utenza.',
    8: 'Inclusione socio-culturale di singoli o gruppi, prevenzione e contrasto all’emarginazione e alla discriminazione sociale.'
};
for (const scheda of dati.schede) {
    assert.match(scheda.tipologia, /^[ABCD]$/);
    assert.ok(scheda.titolo && scheda.argomento && scheda.traccia);
    assert.ok(scheda.nuclei.length >= 2 && scheda.competenze.length >= 2);
    for (const nucleo of scheda.nuclei) assert.equal(nucleo.testo, nucleiIntegrali[nucleo.id]);
    assert.deepEqual(scheda.contributi.map(voce => voce.insegnamento), insegnamentiIndirizzo);
    assert.deepEqual(scheda.contributi.map(voce => voce.ore), [3, 4, 5, 4]);
    assert.equal(scheda.durata, 16);
    assert.equal(scheda.contributi.reduce((totale, voce) => totale + voce.ore, 0), scheda.durata);
    assert.equal(scheda.fasi.reduce((totale, voce) => totale + voce.ore, 0), scheda.durata);
    assert.equal(scheda.focusValutazione.length, 4);
    assert.ok(scheda.provaFinaleOre > 0 && scheda.provaFinaleOre < scheda.durata);
    assert.doesNotMatch(JSON.stringify(scheda), /scelta del nucleo|scegli uno|nucleo opzionale|nuclei opzionali/i);
}

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    });
    try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.route('https://fonts.googleapis.com/**', route => route.abort());
        await context.route('https://fonts.gstatic.com/**', route => route.abort());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));

        await page.goto(base + 'index.html#esame', { waitUntil: 'domcontentloaded' });
        await page.locator('#content-esame.active iframe').waitFor();
        assert.equal(await page.locator('.tab-button').count(), 12);
        assert.equal(await page.locator('[data-tab="didattica"]').count(), 1);
        assert.equal(await page.locator('[data-tab="normativa"]').count(), 1);
        assert.equal(await page.locator('[data-tab="esame"][aria-selected="true"]').count(), 1);
        assert.equal(await page.locator('[data-tab="votazione"]').count(), 0);

        const frameElement = await page.waitForSelector('#content-esame iframe');
        const frame = await frameElement.contentFrame();
        assert.ok(frame, 'iframe UDA Esame non caricato');
        await frame.waitForSelector('.esame-type-card');
        assert.equal(await frame.locator('.esame-type-card').count(), 4);
        assert.deepEqual(await frame.locator('.esame-type-letter').allTextContents(), ['A', 'B', 'C', 'D']);
        assert.equal(await frame.locator('.esame-slot').count(), 6);
        assert.equal(await frame.getByText('Da definire', { exact: true }).count(), 0);
        assert.equal(await frame.locator('.esame-slot-type').count(), 6);
        assert.match(await frame.locator('.esame-slot-main strong').first().textContent(), /Leggere la fragilità/);
        await frame.locator('.esame-slot-header').first().click();
        assert.equal(await frame.locator('.esame-slot.open').count(), 1);
        assert.equal(await frame.locator('.esame-slot.open .esame-contributions-table').count(), 1);
        assert.equal(await frame.locator('.esame-slot.open .esame-contributions-table tbody tr').count(), 4);
        assert.equal(await frame.locator('.esame-slot.open .esame-optional-subjects').count(), 1);
        assert.equal(await frame.locator('.esame-slot.open .esame-rubric-table tbody tr').count(), 4);
        assert.match(await frame.locator('.esame-slot.open .esame-prompt').textContent(), /Consegna conclusiva individuale/);
        await frame.locator('.esame-year-button[data-anno="3"]').click();
        assert.equal(await frame.locator('.esame-slot').count(), 2);
        assert.match(await frame.locator('#esame-count').textContent(), /^2 schede/);

        await page.setViewportSize({ width: 390, height: 844 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        const frameOverflow = await frame.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        assert.equal(overflow, false);
        assert.equal(frameOverflow, false);

        await page.goto(base + 'uda.html', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.uda-acc');
        assert.equal(await page.locator('.uda-acc').count(), 57);
        for (const [competenza, ids] of [['4', ['4.11', '5.11']], ['7', ['4.11']], ['9', ['5.11', '5.12']]]) {
            await page.locator('#uda-competenza').selectOption(competenza);
            for (const id of ids) assert.equal(await page.locator(`.uda-acc[data-id="${id}"]`).count(), 1);
        }
        await page.locator('#uda-competenza').selectOption('');
        for (const [id, etichetta] of [['4.11', 'C4 · C7'], ['5.11', 'C4 · C9'], ['5.12', 'C3 · C9']]) {
            assert.equal((await page.locator(`.uda-acc[data-id="${id}"] .uda-acc-sub`).textContent()).trim(), etichetta);
        }
        assert.equal(await page.locator('.uda-acc[data-id="5.13"]').count(), 1);
        assert.deepEqual(errors, []);
        console.log('PASS: 6 UDA Esame; tipologie integrali; 4 discipline di indirizzo sempre presenti con ore 3+4+5+4; altre discipline opzionali; nuclei assegnati dalla commissione; rendering e mobile verificati; 57 UDA e 5.13 preservate.');
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
