const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const base = (process.env.UDA_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '') + '/';
const leggi = nome => fs.readFileSync(path.join(root, nome), 'utf8');

(async () => {
  const ripartizioni = JSON.parse(leggi('data-ripartizione-ore.json'));
  assert.equal('tolleranzaDocente' in ripartizioni.meta, false);
  for (const id of ['FSL4.1', 'FSL5.1']) {
    const uda = ripartizioni.uda[id];
    assert.equal(uda.assegnazioneConcordata, true);
    assert.equal(uda.totaleMax, 48);
    assert.deepEqual(Object.fromEntries(uda.voci.map(v => [v.ins, v.max])), {
      'Igiene e Cultura M.S.': 15,
      'Diritto e T.A.': 12,
      Psicologia: 12,
      'Metodologie Operative': 9,
    });
  }

  const backend = leggi('supabase/functions/curricolo-uda-revisioni/index.ts');
  assert.doesNotMatch(backend, /ORE_TOLLERANZA|40%|massimo consentito|fuori dalla banda/i);
  assert.match(backend, /Number\.isSafeInteger\(numero\) \|\| numero < 1/);

  let salvato = null;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route('**/functions/v1/curricolo-uda-revisioni', async route => {
      const payload = route.request().postDataJSON();
      let body;
      if (payload.action === 'login') body = { token: 'x'.repeat(40), author_name: payload.author_name };
      else if (payload.action === 'list') body = { revisions: [] };
      else if (payload.action === 'upsert') {
        salvato = payload.revision;
        body = { revision: { ...payload.revision, id: '00000000-0000-4000-8000-000000000000', updated_at: new Date().toISOString() } };
      } else body = { author_name: 'Prof. Picconi' };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + 'uda-fsl.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#uda-revisione-apri-accesso').click();
    await page.locator('#uda-revisione-docente').selectOption({ label: 'Prof. Picconi' });
    await page.locator('#uda-revisione-password').fill('verifica-locale');
    await page.locator('.uda-revisione-auth button[type="submit"]').click();
    await page.locator('[data-id="FSL4.1"] .uda-acc-header').click();
    const scheda = page.locator('[data-id="FSL4.1"]');
    const input = scheda.getByLabel('Ore concordate per Igiene e Cultura M.S.');
    assert.equal(await input.getAttribute('max'), null);
    assert.equal(await input.inputValue(), '15');
    await input.fill('500');
    await scheda.getByRole('button', { name: 'Salva le ore', exact: true }).click();
    await page.waitForFunction(() => document.body.textContent.includes('Ore salvate nell’area condivisa.'));
    assert.equal(salvato.modifiche.oreRipartizione['Igiene e Cultura M.S.'], 500);
    assert.equal(await page.locator('body').textContent().then(t => t.includes('40%')), false);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
  console.log('PASS: FSL4.1/FSL5.1 a 48 ore; nessun limite percentuale in dati, client e backend; salvataggio UI oltre la vecchia banda consentito.');
})().catch(error => { console.error(error); process.exit(1); });
