const assert=require('node:assert/strict');const fs=require('node:fs');const {chromium}=require('playwright');
const base=process.env.UDA_BASE_URL||'http://127.0.0.1:8765/';const out='/tmp/ssas-sezioni-docenti';
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});try{
 const c=await b.newContext({viewport:{width:1280,height:900}});await c.route('https://**/*',r=>r.abort());
 let records=[],author='Prof. Picconi',failure=false;const errors=[];
 await c.route('**/functions/v1/curricolo-uda-revisioni',async route=>{const p=route.request().postDataJSON();let data={},status=200;
 if(p.action==='login'){author=p.author_name;data={token:'test-token',author_name:author};}
 else if(p.action==='session')data={author_name:author};
 else if(p.action==='ideas-list')data={ideas:records};
 else if(p.action==='ideas-save'){
  if(failure){status=409;data={error:'Conflitto simulato: testo non salvato.'};}
  else{const idea={...p.idea,versione:p.idea.versione+1,author_name:author};records=[idea,...records.filter(i=>i.id!==idea.id)];data={idea};}
 }
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'uda-unificate.html',{waitUntil:'domcontentloaded'});await p.waitForSelector('.uda-acc');
 await p.locator('.anno-pill[data-anno="1"]').click();assert.equal(await p.locator('.uda-acc').count(),4);assert.equal(await p.locator('[data-id="U1.1"]').count(),0);
 await p.locator('.anno-pill[data-anno="2"]').click();assert.equal(await p.locator('.uda-acc').count(),7);assert.equal(await p.locator('[data-id="U1.1"]').count(),1);assert.equal(await p.locator('[data-id="U2.1"]').count(),1);
 assert.ok(!(await p.locator('body').textContent()).includes('parziale e su carta'));
 await p.goto(base+'uda-monografiche.html',{waitUntil:'domcontentloaded'});await p.locator('#docente').selectOption('Prof. Picconi');await p.locator('#password').fill('test-non-reale');await p.getByRole('button',{name:'Accedi',exact:true}).click();await p.waitForSelector('#lavoro:not([hidden])');
 await p.locator('#nuova').click();await p.locator('[name="titolo"]').fill('Un tema attuale');await p.locator('[name="descrizione"]').fill('<img src=x onerror=alert(1)> descrizione di prova');await p.locator('#salva').click();await p.waitForFunction(()=>document.querySelector('#esito-salvataggio').textContent.includes('versione 1'));
 assert.equal(records.length,1);assert.equal(await p.locator('#elenco img').count(),0);assert.equal(await p.locator('[name="competenza"], [name="anno"]').count(),0);
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('.idea-card');await p.getByRole('button',{name:'Modifica la tua proposta'}).click();await p.locator('[name="titolo"]').fill('Titolo rivisto');await p.locator('#salva').click();await p.waitForFunction(()=>document.querySelector('#esito-salvataggio').textContent.includes('versione 2'));
 failure=true;await p.locator('[name="titolo"]').fill('Testo da conservare');await p.locator('#salva').click();await p.waitForFunction(()=>document.querySelector('#esito-salvataggio').textContent.includes('Conflitto'));assert.equal(await p.locator('[name="titolo"]').inputValue(),'Testo da conservare');failure=false;
 p.on('dialog',d=>d.accept());await p.locator('#annulla').click();await p.locator('#nuova').click();await p.locator('[name="titolo"]').fill('Seconda idea');await p.locator('[name="descrizione"]').fill('Descrizione della seconda idea');await p.locator('#salva').click();await p.waitForFunction(()=>document.querySelectorAll('.idea-card').length===2);assert.equal(records.length,2);
 await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:out+'/monografiche-mobile.png',fullPage:true});
 await p.locator('#esci').click();await p.locator('#docente').selectOption('Prof. Pinna');await p.locator('#password').fill('test-non-reale');await p.getByRole('button',{name:'Accedi',exact:true}).click();await p.waitForSelector('.idea-card');assert.equal(await p.locator('[data-edit]').count(),0);
 await p.goto(base+'index.html#annuale',{waitUntil:'domcontentloaded'});const f=await(await p.waitForSelector('#content-annuale iframe')).contentFrame();await f.waitForSelector('.empty-state');assert.equal(await f.locator('form, .idea-card').count(),0);assert.ok((await f.locator('body').textContent()).includes('Nessuna proposta inserita'));
 await p.locator('#tab-monografiche').click();assert.equal(await p.locator('#content-monografiche').getAttribute('aria-hidden'),'false');
 assert.deepEqual(errors,[]);console.log('PASS UI locale: U1.1/U2.1 distinte in seconda; distribuzione 4/7; creazione di due idee; rilettura; modifica; errore senza perdita testo; escaping; altro docente legge senza modificare; mobile; navigazione; progettazione annuale vuota. API simulata, nessuna scrittura live.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
