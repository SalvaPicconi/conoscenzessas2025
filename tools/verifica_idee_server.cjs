// Esegue il vero handler Edge con archivio in memoria; non usa dati o credenziali reali.
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {stripTypeScriptTypes}=require('node:module');const {webcrypto}=require('node:crypto');
const records=[];const sessions=[];let handler;
function query(table){let op='read',record,filters=[];const q={select(){return q},order(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},gt(k,v){filters.push(r=>r[k]>v);return q},update(r){op='update';record=r;return q},insert(r){op='insert';record=r;return q},single(){return q.exec(true)},maybeSingle(){return q.exec(true)},then(a,b){return q.exec(false).then(a,b)},async exec(single){const rows=table==='curricolo_uda_idee'?records:sessions;let selected=rows.filter(r=>filters.every(f=>f(r)));if(op==='insert'){if(rows.some(r=>r.id===record.id))return {data:null,error:{code:'23505'}};rows.push({...record});selected=[rows.at(-1)];}if(op==='update')selected.forEach(r=>Object.assign(r,record));return {data:single?(selected[0]||null):selected,error:null}}};return q}
const admin={from:query};const context={createClient:()=>admin,Request,Response,Headers,TextEncoder,crypto:webcrypto,btoa,console,Deno:{env:{get:()=>''},serve:fn=>handler=fn}};
const source=fs.readFileSync('supabase/functions/curricolo-uda-revisioni/idee.ts','utf8').replace('export function','function')+'\n'+fs.readFileSync('supabase/functions/curricolo-uda-revisioni/index.ts','utf8').replace(/^import .*$/gm,'');
vm.runInNewContext(stripTypeScriptTypes(source),context);
(async()=>{
 async function session(author,t){const hash=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(t))).toString('hex');sessions.push({token_hash:hash,author_name:author,expires_at:'2099-01-01T00:00:00.000Z'});return t;}
 const alice=await session('Prof. Picconi','a'.repeat(40));const bob=await session('Prof. Pinna','b'.repeat(40));
 const call=async(action,token,idea)=>{const r=await handler(new Request('http://localhost/',{method:'POST',headers:{'Content-Type':'application/json','X-Curricolo-Session':token||''},body:JSON.stringify({action,idea})}));return {status:r.status,data:await r.json()};};
 const idea={id:'12345678-1234-1234-1234-123456789012',versione:0,titolo:'Tema di prova',profilo:'',descrizione:'Descrizione di prova',attualita:'',modalita:'trasversale',collegamenti:''};
 assert.equal((await call('ideas-list')).status,401);
 assert.equal((await call('ideas-save',alice,{...idea,titolo:''})).status,400);
 assert.equal((await call('ideas-save',alice,{...idea,modalita:'inesistente'})).status,400);
 const created=await call('ideas-save',alice,{...idea,author_name:'Prof. Pinna'});assert.equal(created.status,200);assert.equal(created.data.idea.author_name,'Prof. Picconi');assert.equal(records.length,1);
 assert.equal((await call('ideas-save',bob,{...idea,versione:1})).status,409); // altro autore
 assert.equal((await call('ideas-save',alice,{...idea,versione:1,titolo:'Modificato'})).data.idea.versione,2);
 assert.equal((await call('ideas-save',alice,{...idea,versione:1,titolo:'Obsoleto'})).status,409);
 assert.equal(records[0].titolo,'Modificato');assert.equal((await call('ideas-list',bob)).data.ideas.length,1);
 console.log('PASS handler reale con DB simulato: sessione obbligatoria; validazione; autore dalla sessione; creazione; modifica propria; rifiuto modifica altrui/versione obsoleta; lettura condivisa. SQL e trigger non eseguiti su Postgres.');
})().catch(e=>{console.error(e);process.exit(1)});
