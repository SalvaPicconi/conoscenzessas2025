const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const base = 'https://salvapicconi.github.io/conoscenzessas2025/';

async function contestoLocale(browser) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    await context.route(base + '**', async route => {
        const relativo = decodeURIComponent(new URL(route.request().url()).pathname.slice('/conoscenzessas2025/'.length)) || 'index.html';
        const file = path.resolve(root, relativo);
        if (!file.startsWith(root + path.sep)) return route.abort();
        try { await route.fulfill({ path: file }); }
        catch { await route.fulfill({ status: 404, body: 'not found' }); }
    });
    await context.route('https://fonts.googleapis.com/**', route => route.abort());
    await context.route('https://fonts.gstatic.com/**', route => route.abort());
    return context;
}

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    });
    try {
        const context = await contestoLocale(browser);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + 'piano-uda.html', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => stato.pronto);

        const struttura = await page.evaluate(() => ({
            catalogo: stato.catalogo.size,
            dipartimento: [...stato.dipartimentoOrdine.entries()],
            aliasPresenti: [stato.catalogo.has('SIM5-1'), stato.catalogo.has('SIM5-2')]
        }));
        assert.equal(struttura.catalogo, 109);
        assert.deepEqual(struttura.dipartimento, [[1, ['T1.1']], [2, ['T2.1']], [3, ['FSL3.1', 'DIP3-ASSE']], [4, ['FSL4.1', 'U4.3']], [5, ['FSL5.1', '5.12', 'E5.1', 'E5.2']]]);
        assert.deepEqual(struttura.aliasPresenti, [false, false]);

        for (const [anno, attese] of [['1', ['T1.1']], ['2', ['T2.1']], ['4', ['U4.3', 'FSL4.1']]]) {
            await page.locator('[data-campo="anno"]').selectOption(anno);
            assert.deepEqual(await page.evaluate(() => scelteOrdinate().map(voce => voce.chiave)), attese);
        }
        await page.locator('[data-campo="anno"]').selectOption('3');
        assert.equal(await page.locator('#piano-uda-DIP3-ASSE').isChecked(), true);
        assert.equal(await page.locator('#piano-uda-FSL3-1').isChecked(), true);
        assert.equal(await page.locator('.piano-sezione-dipartimento .piano-voce').count(), 2);
        assert.equal(await page.locator('.piano-badge-dipartimento').count(), 2);
        assert.match(await page.locator('body').innerText(), /Adolescenti: prevenzione, tutela, diritti e servizi/);

        await page.locator('#piano-ricerca').fill('adolescenti');
        assert.equal(await page.locator('#piano-uda-DIP3-ASSE').count(), 1);
        await page.locator('#piano-ricerca').fill('');
        const screenshot = path.join(os.tmpdir(), 'piano-uda-dipartimento-terza.png');
        await page.locator('.piano-sezione-dipartimento').screenshot({ path: screenshot });

        await page.evaluate(() => {
            window.__schedaStampata = null;
            CurricoloDocumento.stampa = (nodi, meta) => { window.__schedaStampata = { nodi, meta }; };
        });
        await page.locator('#piano-uda-DIP3-ASSE').locator('xpath=..').locator('.piano-stampa-scheda').click();
        const stampa = await page.evaluate(() => window.__schedaStampata && JSON.stringify(window.__schedaStampata));
        assert.match(stampa, /Adolescenti/);

        const terza = await page.evaluate(() => ({
            scelte: scelteOrdinate().map(voce => voce.chiave),
            periodo: stato.scelte.get('DIP3-ASSE').periodo,
            ore: [stato.ripartizione['DIP3-ASSE'].totaleMin, stato.ripartizione['DIP3-ASSE'].totaleMax],
            documento: JSON.stringify(costruisciPiano(scelteOrdinate()))
        }));
        assert.deepEqual(terza.scelte, ['FSL3.1', 'DIP3-ASSE']);
        assert.equal(terza.periodo, '1° quadrimestre');
        assert.deepEqual(terza.ore, [52, 62]);
        assert.match(terza.documento, /Adolescenti: prevenzione, tutela, diritti e servizi/);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => stato.pronto);
        assert.deepEqual(await page.evaluate(() => scelteOrdinate().map(voce => voce.chiave)), ['FSL3.1', 'DIP3-ASSE']);
        await context.close();

        const quintaContext = await contestoLocale(browser);
        const quintaPage = await quintaContext.newPage();
        await quintaPage.goto(base + 'piano-uda.html', { waitUntil: 'domcontentloaded' });
        await quintaPage.waitForFunction(() => stato.pronto);
        await quintaPage.locator('[data-campo="anno"]').selectOption('5');
        const quinta = await quintaPage.evaluate(() => ({
            scelte: [...stato.scelte.keys()],
            periodi: Object.fromEntries([...stato.scelte.entries()].map(([id, scelta]) => [id, scelta.periodo])),
            dipartimentoCards: document.querySelectorAll('.piano-sezione-dipartimento .piano-voce').length,
            simCards: document.querySelectorAll('#piano-uda-SIM5-1, #piano-uda-SIM5-2').length
        }));
        assert.deepEqual(quinta.scelte, ['FSL5.1', '5.12', 'E5.1', 'E5.2']);
        assert.deepEqual(quinta.periodi, {
            'FSL5.1': 'Intero anno scolastico',
            '5.12': 'Intero anno scolastico',
            'E5.1': '2° quadrimestre',
            'E5.2': '2° quadrimestre'
        });
        assert.equal(quinta.dipartimentoCards, 4);
        assert.equal(quinta.simCards, 0);
        assert.equal(await quintaPage.locator('.piano-sezione-alternative .piano-stampa-scheda').count() > 0, true);
        await quintaContext.close();

        const salvatoContext = await contestoLocale(browser);
        await salvatoContext.addInitScript(() => {
            localStorage.setItem('curricolo:piano-uda', JSON.stringify({
                dati: { anno: '5' },
                scelte: [['E5.1', { periodo: '1° quadrimestre' }]]
            }));
        });
        const salvatoPage = await salvatoContext.newPage();
        await salvatoPage.goto(base + 'piano-uda.html', { waitUntil: 'domcontentloaded' });
        await salvatoPage.waitForFunction(() => stato.pronto);
        assert.deepEqual(await salvatoPage.evaluate(() => [...stato.scelte.entries()]), [['E5.1', { periodo: '1° quadrimestre' }]]);
        await salvatoContext.close();

        assert.deepEqual(errors, []);
        console.log(JSON.stringify({
            success: true,
            catalogo: struttura.catalogo,
            terza: terza.scelte,
            quinta: quinta.scelte,
            aliasDuplicati: quinta.simCards,
            screenshot
        }));
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
