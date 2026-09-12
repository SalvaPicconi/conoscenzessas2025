const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const base = 'https://salvapicconi.github.io/conoscenzessas2025/';

(async () => {
    const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
    try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.route(`${base}**`, async route => {
            const relativo = decodeURIComponent(new URL(route.request().url()).pathname.slice('/conoscenzessas2025/'.length)) || 'index.html';
            const file = path.resolve(root, relativo);
            if (!file.startsWith(`${root}${path.sep}`)) return route.abort();
            try { await route.fulfill({ path: file }); }
            catch { await route.fulfill({ status: 404, body: 'not found' }); }
        });
        await context.route('**/functions/v1/curricolo-uda-revisioni', async route => {
            const azione = route.request().postDataJSON()?.action;
            const corpo = azione === 'login'
                ? { ok: true, token: 'x'.repeat(40), author_name: 'Prof. Picconi', permissions: { manage_status: true } }
                : azione === 'session'
                ? { ok: true, author_name: 'Prof. Picconi', permissions: { manage_status: true } }
                : azione === 'list'
                ? { revisions: [] }
                : { ok: true };
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
        });
        const pagina = await context.newPage();
        const errori = [];
        pagina.on('pageerror', errore => errori.push(errore.message));
        await pagina.goto(`${base}uda-dipartimento.html`, { waitUntil: 'domcontentloaded' });
        await pagina.waitForSelector('.dip-full-uda');

        assert.equal(await pagina.locator('.dip-full-uda').count(), 10, 'Devono essere presenti dieci UDA complete');
        assert.equal(await pagina.locator('.dip-full-uda [data-uda-revisione-slot]').count(), 10, 'Ogni UDA deve avere la propria revisione');
        assert.equal(await pagina.locator('a[href$="uda.html"], a[href$="uda-fsl.html"], a[href$="uda-unificate.html"], a[href$="uda-esame.html"], a[href$="uda-civica.html"], a[href$="uda-trasversali.html"]').count(), 0, 'Non devono esserci rimandi ai cataloghi originali');

        const titoli = await pagina.locator('.dip-full-uda .uda-acc-title').allTextContents();
        for (const atteso of [
            'Conoscersi e collaborare: dalle regole quotidiane al regolamento di classe',
            'Fiaba e racconto come strumento di crescita',
            'Area minori: osservare, accompagnare e documentare',
            'Prevenzione, tutela, diritti dei minori e servizi',
            'Area disabilità: inclusione, autonomia e progetto individualizzato',
            'Area anziani: assistenza, qualità di vita e lavoro in struttura residenziale',
            'Parole che curano: raccontare la salute mentale, superare lo stigma',
            'Salute, autonomia e domanda di assistenza degli anziani',
            'Invecchiamento attivo in Sardegna: progetto di rete',
        ]) assert.ok(titoli.includes(atteso), `Titolo non visualizzato: ${atteso}`);

        assert.equal(await pagina.locator('.dip-full-uda[data-id="DIP3-ASSE"]').count(), 1, 'La scelta d’asse di terza deve essere una sola UDA');
        assert.equal(await pagina.locator('.dip-full-uda[data-id="DIP3-ASSE-U33"], .dip-full-uda[data-id="DIP3-ASSE-U34"]').count(), 0);
        const asseTerza = pagina.locator('.dip-full-uda[data-id="DIP3-ASSE"]');
        await asseTerza.locator('.uda-acc-header').click();
        assert.match(await asseTerza.innerText(), /C4[\s\S]*C6[\s\S]*C5[\s\S]*C9/);
        assert.match(await asseTerza.innerText(), /Programma attività di accudimento/);
        assert.match(await asseTerza.innerText(), /prevenzione primaria/i);

        await pagina.locator('.dip-full-uda').first().locator('.uda-acc-header').click();
        assert.ok(await pagina.locator('.dip-full-uda').first().locator('.uda-acc-body').isVisible());
        assert.match(await pagina.locator('.dip-full-uda').first().innerText(), /Obiettivo di apprendimento/);

        const secondaSimulazione = pagina.locator('.dip-full-uda[data-id="SIM5-2"]');
        await secondaSimulazione.locator('.uda-acc-header').click();
        assert.match(await secondaSimulazione.innerText(), /Dossier documentale/);
        assert.match(await secondaSimulazione.innerText(), /Progetto VEGA/);

        const testo = await pagina.locator('main').innerText();
        assert.doesNotMatch(testo, /catalogo originale|originali invariati|correzione necessaria|dato non reperito/i);

        await pagina.locator('#uda-revisione-apri-accesso').click();
        await pagina.locator('#uda-revisione-docente').selectOption({ label: 'Prof. Picconi' });
        await pagina.locator('#uda-revisione-password').fill('verifica-locale');
        await pagina.locator('#uda-revisione-auth button[type="submit"]').click();
        await pagina.locator('.uda-revisione-card-actions').first().waitFor();
        assert.equal(await pagina.locator('.uda-revisione-card-actions').count(), 10, 'Ogni UDA deve essere modificabile autonomamente');
        await pagina.locator('.dip-full-uda').first().locator('.uda-revisione-edit').click();
        assert.equal(await pagina.locator('.uda-revisione-editor [name="titolo"]').count(), 1);
        assert.equal(await pagina.locator('.uda-revisione-editor [name="traguardo"]').count(), 1);
        assert.equal(await pagina.locator('.uda-revisione-editor [name="saperi"]').count(), 1);

        await pagina.setViewportSize({ width: 390, height: 844 });
        assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'La pagina non deve avere overflow orizzontale su mobile');
        assert.deepEqual(errori, []);
        console.log('PASS: pagina autonoma, 10 UDA complete, fusione corretta, nessun rimando ai cataloghi e layout mobile valido.');
    } finally {
        await browser.close();
    }
})().catch(errore => { console.error(errore); process.exit(1); });
