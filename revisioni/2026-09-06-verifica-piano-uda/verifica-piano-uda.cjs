const {chromium}=require('playwright');const fs=require('node:fs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{const c=await b.newContext();await c.route('https://**/*',r=>r.abort());const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8765/pfi.html',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('#pfi-uda-scelta').options.length>1);
const result=await p.evaluate(()=>{
 const source=stato.catalogoTrasversali.find(u=>u.competenzeSSAS.length>1);const parsed=daCatalogo('trasversale:'+source.id);aggiungiUda(parsed);
 const data=raccogli();const compText=document.querySelector('#pfi-competenze tbody').textContent;
 const first={id:source.id,ssas:source.competenzeSSAS,generali:source.competenzeGenerali,importate:parsed.competenze,riepilogo:compText};
 const originalId=stato.uda[0]._id;stato.seq=0;applica(data);aggiungiUda();const ids=stato.uda.map(u=>u._id);
 const before=stato.uda.length;document.querySelector('[data-rimuovi]').click();const after=stato.uda.length;
 return {catalogo:document.querySelector('#pfi-uda-scelta').options.length-1,prima:first,roundtrip:JSON.stringify(data.uda[0])===JSON.stringify(parsed),idsDopoImportAggiunta:ids,rimozione:{before,after},unificate:!!stato.catalogoUnificate};
});console.log(JSON.stringify(result));
await p.evaluate(()=>{applica({campi:{cognome:'TEST',nome:'FITTIZIO',classe:'2A'},uda:[{_id:'audit1',titolo:'UDA PROVA',competenze:'C1\nC7',periodo:'Secondo quadrimestre',ore:'20',tipo:'Indirizzo',anno:2}]});window.print=()=>{};});await p.locator('#pfi-stampa-piano').click();console.log('STAMPA PFI',await p.locator('.stampa-documento').textContent());
await p.goto('http://127.0.0.1:8765/uda-unificate.html',{waitUntil:'domcontentloaded'});await p.waitForSelector('.uda-acc');await p.locator('.anno-pill[data-anno="2"]').click();await p.evaluate(()=>window.print=()=>{});await p.getByRole('button',{name:'Stampa piano UDA',exact:true}).click();console.log('PIANO CATALOGO',await p.locator('.stampa-piano thead').textContent(),'RIGHE',await p.locator('.stampa-piano > tbody > tr').count());console.log('ERRORI',errors);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
