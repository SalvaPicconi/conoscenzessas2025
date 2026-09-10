const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {chromium}=require('playwright');
async function azione(p,el,method='click',value) { await el.scrollIntoViewIfNeeded(); const box=await el.boundingBox(); if(box) await p.evaluate(b=>window.scrollBy({top:b.y+b.height/2-innerHeight/2,behavior:'instant'}),box); await el[method](...(value===undefined?[]:[value])); }
const out=fs.mkdtempSync(path.join(os.tmpdir(),'ssas-cataloghi-'));const base=(process.env.STAMPA_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/,'')+'/';
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});const c=await b.newContext({viewport:{width:1280,height:1000}});await c.route('https://**/*',r=>r.abort());const errors=[];c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
for(const [file,tab,count] of [['uda.html','uda',57],['uda-trasversali.html','trasversali',13],['uda-civica.html','civica',1],['uda-fsl.html','fsl',4]]){
 const p=await c.newPage();await p.goto(tab==='uda'?base+file:base+'index.html#'+tab,{waitUntil:'domcontentloaded'});const f=tab==='uda'?p:await(await p.waitForSelector('#content-'+tab+' iframe')).contentFrame();await f.waitForSelector('.uda-ore-tabella',{state:'attached'});
 assert.equal(await f.locator('.uda-acc').count(),count);
 const ids=await f.locator('.uda-acc').evaluateAll(es=>es.map(e=>e.dataset.id));const titles=await f.locator('.uda-acc-title').allTextContents();
 const open=await f.locator('.uda-acc-body').evaluateAll(es=>es.map(e=>e.hidden));
 await p.pdf({path:out+'/'+tab+'-tutte.pdf',preferCSSPageSize:true});
 assert.deepEqual(await f.locator('.uda-acc-body').evaluateAll(es=>es.map(e=>e.hidden)),open);
 await p.evaluate(()=>window.print=()=>{});
 await azione(p,f.getByRole('button',{name:'Stampa questa UDA',exact:true}).first());
 assert.equal(await p.locator('.stampa-documento .uda-acc').count(),1);assert.equal(await p.locator('.stampa-documento .uda-ore-tabella').count(),1);
 assert.ok((await p.locator('.stampa-documento').textContent()).includes(titles[0]));
 await p.pdf({path:out+'/'+tab+'-singola.pdf',preferCSSPageSize:true});
 const daSelezionare=count===1?[f.locator('.stampa-scelta input').first()]:[f.locator('.stampa-scelta input').first(),f.locator('.stampa-scelta input').last()];for(const check of daSelezionare) await azione(p,check,'check');
 await azione(p,f.locator('.search-container input'),'fill','NESSUNA_CORRISPONDENZA_TEST');await f.waitForFunction(()=>!document.querySelector('.uda-acc'));
 await azione(p,f.locator('#stampa-selezionate'));assert.equal(await p.locator('.stampa-documento .uda-acc').count(),daSelezionare.length);
 assert.deepEqual(await p.locator('.stampa-documento .uda-acc').evaluateAll(es=>es.map(e=>e.dataset.id)),count===1?[ids[0]]:[ids[0],ids.at(-1)]);
 await p.pdf({path:out+'/'+tab+'-selezionate.pdf',preferCSSPageSize:true});
 await azione(p,f.getByRole('button',{name:'Stampa piano UDA',exact:true}));assert.equal(await p.locator('.stampa-piano > tbody > tr').count(),daSelezionare.length);
 await p.pdf({path:out+'/'+tab+'-piano.pdf',preferCSSPageSize:true});
 await azione(p,f.getByRole('button',{name:'Azzera selezione',exact:true}));assert.equal(await f.locator('#stampa-selezionate').isDisabled(),true);
 await azione(p,f.getByRole('button',{name:'Azzera filtri',exact:true}));await f.waitForSelector('.uda-ore-tabella',{state:'attached'});
 await azione(p,f.getByRole('button',{name:'Stampa piano UDA',exact:true}));assert.equal(await p.locator('.stampa-piano > tbody > tr').count(),count);await p.pdf({path:out+'/'+tab+'-piano-completo.pdf',preferCSSPageSize:true});
 await p.setViewportSize({width:390,height:844});await f.getByRole('button',{name:'Stampa questa UDA',exact:true}).first().scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+tab+'-mobile.png'});
 console.log('PASS catalogo',tab,count,'singola, filtri, selezione persistente, piano, iframe');await p.close();
}
for(const [file,tab,selector,count] of [['area-indirizzo.html','indirizzo','.competence-card',39],['area-generale.html','generale','.gen-acc',12]]){
 const p=await c.newPage();await p.goto(base+file,{waitUntil:'domcontentloaded'});await p.waitForSelector(selector,{state:'attached'});assert.equal(await p.locator(selector).count(),count);
 await p.evaluate(()=>window.print=()=>{});await p.getByRole('button',{name:'Stampa / PDF — sezione corrente',exact:true}).click();assert.equal(await p.locator('.stampa-documento '+selector).count(),count);
 await p.locator('.stampa-documento img').evaluateAll(imgs=>Promise.allSettled(imgs.map(i=>i.decode())));
 await p.pdf({path:out+'/'+tab+'-completa.pdf',preferCSSPageSize:true});console.log('PASS area',tab,count);await p.close();
}
const p=await c.newPage();await p.goto(base+'pfi.html',{waitUntil:'domcontentloaded'});await p.waitForSelector('#pfi-uda-scelta option[value]:not([value=""])',{state:'attached'});
await p.locator('#pfi-uda-vuota').click();await p.locator('[data-campo="titolo"]').fill('PIANO UDA DI PROVA');await p.locator('[name="profilo"]').fill('PROFILO DA ESCLUDERE DAL PIANO');await p.evaluate(()=>window.print=()=>{});await p.locator('#pfi-stampa-piano').click();assert.equal(await p.locator('.stampa-documento .pfi-uda-card').count(),1);assert.ok(!(await p.locator('.stampa-documento').textContent()).includes('PROFILO DA ESCLUDERE'));await p.pdf({path:out+'/pfi-piano.pdf',preferCSSPageSize:true});console.log('PASS piano PFI');
assert.deepEqual(errors,[]);await b.close();console.log('OUTPUT',out);
})().catch(e=>{console.error(e);process.exit(1)});
