const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = (process.env.UDA_BASE_URL || 'http://127.0.0.1:8765/').replace(/\/$/, '') + '/';

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
        assert.equal(await page.locator('.tab-button').count(), 11);
        assert.equal(await page.locator('[data-tab="didattica"]').count(), 1);
        assert.equal(await page.locator('[data-tab="esame"][aria-selected="true"]').count(), 1);
        assert.equal(await page.locator('[data-tab="votazione"]').count(), 0);

        const frameElement = await page.waitForSelector('#content-esame iframe');
        const frame = await frameElement.contentFrame();
        assert.ok(frame, 'iframe UDA Esame non caricato');
        await frame.waitForSelector('.esame-type-card');
        assert.equal(await frame.locator('.esame-type-card').count(), 4);
        assert.deepEqual(await frame.locator('.esame-type-letter').allTextContents(), ['A', 'B', 'C', 'D']);
        assert.equal(await frame.locator('.esame-slot').count(), 6);
        assert.equal(await frame.locator('.esame-slot-type').filter({ hasText: 'Da definire' }).count(), 6);
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
        console.log('PASS: sezione Esame con tipologie A-D separate, 6 schede vuote e filtri 2 per anno; mobile senza overflow; 57 UDA; competenze multiple e 5.13 verificate.');
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
