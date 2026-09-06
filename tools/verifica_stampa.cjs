const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'ssas-stampa-'));
const base=(process.env.STAMPA_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/,'');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined});
const context=await browser.newContext();await context.route('https://**/*',r=>r.abort());
const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
for(const embedded of [false,true]){
 const p=await context.newPage();await p.goto(base+'/'+(embedded?'index.html#pfi':'pfi.html'),{waitUntil:'domcontentloaded'});
 const f=embedded?await (await p.waitForSelector('#content-pfi iframe')).contentFrame():p;
 await f.waitForSelector('[name="an_5_esito"]',{state:'attached'});
 await f.locator('[name="profilo"]').fill('INIZIO PROFILO\n'+'Testo lungo del profilo personale e delle attività. '.repeat(160)+'\nFINE PROFILO');
 await f.locator('[name="an_5_esito"]').evaluate(e=>e.value='ESITO QUINTA COMPLETO');
 await f.locator('[name="an_5_tutorfirma"]').evaluate(e=>e.value='TUTOR QUINTA COMPLETO');
 await f.locator('#pfi-uda-vuota').click();await f.locator('[data-campo="titolo"]').fill('UDA DI PROVA STAMPA');
 const snapshot=()=>f.evaluate(()=>({fields:[...document.querySelectorAll('#pfi-form input, #pfi-form select, #pfi-form textarea')].map(e=>[e.name,e.value,e.checked]),details:[...document.querySelectorAll('#pfi-form details')].map(e=>e.open)}));
 const before=await snapshot();
 await p.pdf({path:output+'/pfi-'+(embedded?'integrato':'corretto')+'.pdf',preferCSSPageSize:true});
 assert.deepEqual(await snapshot(),before);
 assert.equal(await p.locator('.stampa-documento').count(),0);
 // Verifica il pulsante senza aprire una finestra di stampa interattiva.
 await p.evaluate(()=>{window.print=()=>{window.__stampaTest={copies:document.querySelectorAll('.stampa-documento').length,text:document.querySelector('.stampa-documento')?.textContent};window.dispatchEvent(new Event('afterprint'));};});
 await f.locator('#pfi-print').click();assert.equal(await p.evaluate(()=>window.__stampaTest.copies),1);
 assert.ok((await p.evaluate(()=>window.__stampaTest.text)).includes('ESITO QUINTA COMPLETO'));
 assert.deepEqual(await snapshot(),before);
 console.log('PASS PFI',embedded?'integrato':'autonomo');await p.close();
}
for(const file of ['rubrica.html','rubrica_metodologie_3.html','rubrica_metodologie_4_5.html']){
 const p=await context.newPage();await p.goto(base+'/'+file,{waitUntil:'load'});
 await p.getByRole('button',{name:'Salva Configurazione e Procedi'}).click();
 await p.locator('#nomeStudente').fill('STUDENTE DI PROVA');
 for(const radio of await p.locator('.competenza-valutazione').first().locator('input[type="radio"][value="7-8"]').all()) await radio.check();
 await p.getByRole('button',{name:'Calcola Voto Finale'}).click();
 await p.waitForSelector('#step3:not(.hidden)');
 const vote=await p.locator('#voto-finale-display').textContent();assert.equal(vote,'7.5');
 await p.pdf({path:output+'/'+file.replace('.html','.pdf'),preferCSSPageSize:true});
 assert.equal(await p.locator('.stampa-documento').count(),0);
 assert.equal(await p.locator('#voto-finale-display').textContent(),vote);
 console.log('PASS',file,vote);await p.close();
}
assert.deepEqual(errors,[]);await browser.close();console.log('PDF di prova:',output);
})().catch(e=>{console.error(e);process.exit(1)});
