// Test della pagina locale: tutte le richieste API sono intercettate, mai inviate a Supabase.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const base = (process.env.STAMPA_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'ssas-voto-'));
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
 const rosa = ['asse:1.1','trasversale:T1.1'];
 const backend = { ballot: null, saved: {}, author: 'Prof. Picconi', fail: '', calls: [], delayRate: 0 };
 let catalogoNonDisponibile = false;
 const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
 await context.route('**/data-uda.json', route => catalogoNonDisponibile ? route.fulfill({status:503,body:'offline'}) : route.continue());
 await context.route('https://**/*', async route => {
  if (!route.request().url().includes('/functions/v1/curricolo-uda-revisioni')) return route.abort();
  const req = route.request().postDataJSON(); backend.calls.push(req.action);
  let status = 200, result;
  if(req.action==='rate' && backend.delayRate) await new Promise(r=>setTimeout(r,backend.delayRate));
  if (backend.fail === 'ratings-500' && req.action === 'ratings') {status=503;result={error:'Caricamento temporaneamente non disponibile.'};}
  else if (backend.fail === req.action) { status = 401; result = {error:'Sessione scaduta. Accedi di nuovo.'}; }
  else if (req.action === 'login') {
   if(req.password !== 'password-di-prova') {status=401;result={error:'Password non corretta.'};}
   else {backend.author=req.author_name;result={token:'token-di-prova',author_name:backend.author};}
  } else if(req.action === 'session') result={author_name:backend.author};
  else if(req.action === 'logout') result={ok:true};
  else if(req.action === 'ratings' || req.action === 'rate') {
   if(req.action === 'rate') backend.saved[backend.author]=req.ratings;
   result={ballot:backend.ballot,my_ratings:backend.saved[backend.author] || [],results:backend.ballot?.stato==='chiusa'?rosa.map(uda_ref=>{const v=Object.values(backend.saved).flat().filter(r=>r.uda_ref===uda_ref);return {uda_ref,conteggio:v.length,media:v.reduce((s,r)=>s+r.valutazione,0)/v.length};}):[]};
  } else {status=400;result={error:'Azione non riconosciuta.'};}
  await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
 });
 const page = await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/votazione-uda.html',{waitUntil:'networkidle'});
 const login=async(name='Prof. Picconi')=>{await page.locator('#voto-apri').click();await page.locator('#voto-docente').selectOption(name);await page.locator('#voto-password').fill('password-di-prova');await page.locator('#voto-auth button[type=submit]').click();await page.waitForFunction(n=>document.getElementById('voto-identita').textContent===n && !document.getElementById('voto-stato').textContent.includes('Caricamento'),name);};
 await login();await page.locator('#voto-stato').filter({hasText:'non è stata ancora definita'}).waitFor();assert.equal(await page.locator('#voto-form').isVisible(),false);console.log('PASS rosa assente');
 backend.ballot={id:1,rosa,stato:'preparazione'};await page.reload({waitUntil:'networkidle'});assert.match(await page.locator('#voto-stato').textContent(),/non è ancora aperta/);console.log('PASS preparazione');
 backend.ballot.stato='aperta';await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.voto-scheda').count(),2);
 await page.locator('#voto-salva').click();assert.ok(!backend.calls.includes('rate'));assert.match(await page.locator('#voto-messaggio').textContent(),/tutte le UDA/);
 await page.locator('label[for="stella-asse-1-1-4"]').click();await page.locator('label[for="stella-trasversale-T1-1-5"]').click();await page.locator('#voto-salva').click();await page.locator('#voto-messaggio').filter({hasText:'Valutazioni salvate'}).waitFor();assert.deepEqual(backend.saved['Prof. Picconi'],[{uda_ref:rosa[0],valutazione:4},{uda_ref:rosa[1],valutazione:5}]);
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#stella-asse-1-1-4').isChecked(),true);console.log('PASS salvataggio completo e ripristino');
 await page.locator('#voto-esci').click();await login('Prof. Pinna');assert.equal(await page.locator('input[type=radio]:checked').count(),0);await page.locator('label[for="stella-asse-1-1-2"]').click();await page.locator('label[for="stella-trasversale-T1-1-3"]').click();await page.locator('#voto-salva').click();await page.locator('#voto-messaggio').filter({hasText:'Valutazioni salvate'}).waitFor();console.log('PASS due docenti indipendenti');
 backend.ballot.stato='chiusa';await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#voto-salva').isVisible(),false);assert.equal(await page.locator('.voto-salvataggio').isVisible(),false);assert.equal(await page.locator('.voto-intro').isVisible(),false);assert.equal(await page.locator('input[type=radio]:enabled').count(),0);assert.match(await page.locator('.voto-risultato').first().textContent(),/Media 3,0\/5 · 2 valutazioni/);console.log('PASS chiusura e medie');await page.screenshot({path:path.join(output,'risultati-mobile.png'),fullPage:true});
 backend.ballot.stato='aperta';await page.reload({waitUntil:'networkidle'});backend.fail='rate';await page.locator('#voto-salva').click();await page.waitForTimeout(150);
 const expiredRecovered=await page.locator('#voto-auth').isVisible() || await page.locator('#voto-apri').isVisible();
 console.log('SESSIONE_SCADUTA_RECUPERABILE',expiredRecovered);
 assert.equal(expiredRecovered,true,'Una sessione scaduta deve consentire un nuovo accesso');
 backend.fail='';await page.locator('#voto-docente').selectOption('Prof. Pinna');await page.locator('#voto-password').fill('password-di-prova');await page.locator('#voto-auth button[type=submit]').click();await page.locator('#voto-form').waitFor();
 backend.delayRate=600;await page.locator('#voto-salva').click();await page.locator('#voto-salva:disabled').waitFor();assert.equal(await page.locator('#voto-form input:enabled').count(),0);assert.equal(await page.locator('#voto-esci').isDisabled(),true);await page.locator('#voto-messaggio').filter({hasText:'Valutazioni salvate'}).waitFor();backend.delayRate=0;console.log('PASS controlli bloccati durante salvataggio');
 backend.fail='ratings-500';await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#voto-riprova').isVisible(),true);assert.equal(await page.evaluate(()=>sessionStorage.getItem('curricolo:uda-revisione-session')),'token-di-prova');backend.fail='';await page.locator('#voto-riprova').click();await page.locator('#voto-form').waitFor();console.log('PASS recupero errore server senza perdere sessione');
 backend.ballot.rosa=['asse:1.999'];await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#voto-form').isVisible(),false);assert.match(await page.locator('#voto-stato').textContent(),/non disponibili nel catalogo/);backend.ballot.rosa=rosa;console.log('PASS rosa sconosciuta bloccata');
 catalogoNonDisponibile=true;await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#voto-apri').isDisabled(),true);assert.match(await page.locator('#voto-avviso').textContent(),/non sono disponibili/);catalogoNonDisponibile=false;await page.locator('#voto-riprova').click();await page.locator('#voto-form').waitFor();console.log('PASS errore catalogo visibile e recuperabile');
 assert.deepEqual(errors,[]);await browser.close();console.log('OUTPUT',output);
})().catch(e=>{console.error(e);process.exit(1)});
