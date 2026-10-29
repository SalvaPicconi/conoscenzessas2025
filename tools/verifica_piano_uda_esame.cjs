const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const base = 'https://salvapicconi.github.io/conoscenzessas2025/';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'ssas-piano-esame-'));

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    });
    try {
        const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 950 } });
        await context.route(base + '**', async route => {
            const relativo = decodeURIComponent(new URL(route.request().url()).pathname.slice('/conoscenzessas2025/'.length)) || 'index.html';
            const file = path.resolve(root, relativo);
            if (!file.startsWith(root + path.sep)) return route.abort();
            try { await route.fulfill({ path: file }); }
            catch { await route.fulfill({ status: 404, body: 'not found' }); }
        });
        await context.route('https://fonts.googleapis.com/**', route => route.abort());
        await context.route('https://fonts.gstatic.com/**', route => route.abort());

        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + 'piano-uda.html', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => stato.pronto);
        assert.equal(await page.evaluate(() => stato.catalogo.size), 109);

        await page.locator('[data-campo="anno"]').selectOption('5');
        assert.equal(await page.locator('#piano-uda-E5-1').count(), 1);
        assert.equal(await page.locator('#piano-uda-E5-2').count(), 1);
        assert.deepEqual(await page.evaluate(() => [...stato.scelte.keys()]), ['FSL5.1', '5.12', 'E5.1', 'E5.2']);
        await page.locator('#piano-ricerca').fill('invecchiamento attivo');
        assert.equal(await page.locator('#piano-uda-E5-1').count(), 0);
        assert.equal(await page.locator('#piano-uda-E5-2').count(), 1);
        await page.locator('#piano-ricerca').fill('');

        await page.locator('#piano-uda-FSL5-1').uncheck();
        await page.locator('#piano-uda-5-12').uncheck();
        const verifica = await page.evaluate(() => ({
            scelte: scelteOrdinate().map(voce => voce.chiave),
            periodi: scelteOrdinate().map(voce => voce.scelta.periodo),
            monteOre: scelteOrdinate().map(voce => stato.ripartizione[voce.chiave].totaleMin),
            contributi: stato.ripartizione['E5.1'].voci.map(voce => voce.min),
            riepilogo: riepilogoOre().map(voce => [voce.nome, voce.min, voce.max]),
            documento: JSON.stringify(costruisciPiano(scelteOrdinate()))
        }));
        assert.deepEqual(verifica.scelte, ['E5.1', 'E5.2']);
        assert.deepEqual(verifica.periodi, ['2° quadrimestre', '2° quadrimestre']);
        assert.deepEqual(verifica.monteOre, [16, 16]);
        assert.deepEqual(verifica.contributi, [3, 4, 5, 4]);
        assert.equal(verifica.riepilogo.reduce((totale, voce) => totale + voce[1], 0), 32);
        assert.match(verifica.documento, /6 ore già comprese nel monte ore/);
        assert.match(verifica.documento, /Bozza progettuale da deliberare/);

        const download = await Promise.all([
            page.waitForEvent('download'),
            page.locator('[data-azione="word"]').first().click()
        ]);
        const docx = path.join(output, 'piano-uda-esame.docx');
        await download[0].saveAs(docx);
        const contenuto = fs.readFileSync(docx);
        assert.ok(contenuto.length > 5000);
        assert.ok(contenuto.includes(Buffer.from('E5.1')));
        assert.ok(contenuto.includes(Buffer.from('E5.2')));

        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => stato.pronto);
        assert.deepEqual(await page.evaluate(() => [...stato.scelte.keys()]), ['E5.1', 'E5.2']);
        await page.locator('[data-campo="anno"]').selectOption('5');
        const gruppo = page.locator('.piano-sezione-dipartimento');
        const screenshot = path.join(output, 'piano-uda-esame.png');
        await gruppo.screenshot({ path: screenshot });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
        assert.deepEqual(errors, []);

        console.log(JSON.stringify({
            success: true,
            schede: verifica.scelte,
            periodi: verifica.periodi,
            ore: verifica.monteOre,
            contributi: verifica.contributi,
            docx,
            screenshot
        }));
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
