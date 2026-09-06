// Esegue il vero handler Edge con un adattatore dati in memoria. Non apre connessioni.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const db = { curricolo_uda_revision_sessions: [], curricolo_uda_votazione_stelle: [], curricolo_uda_valutazioni: [] };
class Query {
 constructor(table) { this.table=table; this.filters=[]; this.action='select'; }
 select(){return this;} eq(k,v){this.filters.push(r=>r[k]===v);return this;}
 gt(k,v){this.filters.push(r=>r[k]>v);return this;} lt(k,v){this.filters.push(r=>r[k]<v);return this;}
 insert(rows){this.action='insert';this.rows=Array.isArray(rows)?rows:[rows];return this;}
 upsert(rows){this.action='upsert';this.rows=rows;return this;}
 delete(){this.action='delete';return this;} update(row){this.action='update';this.row=row;return this;}
 maybeSingle(){this.single=true;return this;}
 then(resolve,reject){return Promise.resolve().then(()=>{
  const all=db[this.table]; if(!all)return {data:null,error:{message:'Tabella assente'}};
  const matches=r=>this.filters.every(f=>f(r));
  if(this.action==='insert') all.push(...structuredClone(this.rows));
  if(this.action==='delete')db[this.table]=all.filter(r=>!matches(r));
  if(this.action==='update')all.filter(matches).forEach(r=>Object.assign(r,this.row));
  if(this.action==='upsert')for(const r of this.rows){const old=all.find(x=>x.votazione_id===r.votazione_id&&x.uda_ref===r.uda_ref&&x.author_name===r.author_name);if(old)Object.assign(old,r);else all.push(structuredClone(r));}
  const data=all.filter(matches);return {data:this.single?(data[0]||null):structuredClone(data),error:null};
 }).then(resolve,reject); }
}
const admin={from:t=>new Query(t),rpc:async(name,p)=>({data:name==='verifica_curricolo_uda_password'&&p.p_password==='password-test',error:null})};
let handler;
const context=vm.createContext({Request,Response,crypto,btoa,TextEncoder,console,createClient:()=>admin,Deno:{env:{get:()=>''},serve:f=>{handler=f;}}});
let source=fs.readFileSync('supabase/functions/curricolo-uda-revisioni/index.ts','utf8').replace(/^import .*;\n/gm,'');
vm.runInContext(stripTypeScriptTypes(source),context);
async function call(action,payload={},token='') {
 const response=await handler(new Request('http://localhost/test',{method:'POST',headers:{origin:'http://127.0.0.1:8765','content-type':'application/json','x-curricolo-session':token},body:JSON.stringify({action,...payload})}));
 return {status:response.status,body:await response.json(),cors:response.headers.get('access-control-allow-origin')};
}
(async()=>{
 assert.equal((await call('ratings')).status,401);
 assert.equal((await call('login',{author_name:'Prof. Picconi',password:'errata'})).status,401);
 const a=await call('login',{author_name:'Prof. Picconi',password:'password-test'});assert.equal(a.status,200);assert.equal(a.cors,'http://127.0.0.1:8765');const token=a.body.token;
 assert.deepEqual((await call('ratings',{},token)).body,{ballot:null,my_ratings:[],results:[]});
 const rosa=['asse:1.1','trasversale:T1.1'];db.curricolo_uda_votazione_stelle.push({id:1,rosa,stato:'preparazione'});
 const ratings=[{uda_ref:rosa[0],valutazione:4},{uda_ref:rosa[1],valutazione:5}];
 assert.equal((await call('rate',{ratings},token)).status,400);db.curricolo_uda_votazione_stelle[0].stato='aperta';
 for(const invalid of [[],[ratings[0]],[ratings[0],ratings[0]],[{uda_ref:'asse:1.99',valutazione:4},ratings[1]],[{uda_ref:rosa[0],valutazione:6},ratings[1]],[{uda_ref:rosa[0],valutazione:1.5},ratings[1]],[{uda_ref:rosa[0],valutazione:true},ratings[1]]])assert.equal((await call('rate',{ratings:invalid},token)).status,400);
 assert.equal(db.curricolo_uda_valutazioni.length,0);
 assert.equal((await call('rate',{ratings,author_name:'Prof. Pinna'},token)).status,200);
 assert.equal(db.curricolo_uda_valutazioni.length,2);assert.ok(db.curricolo_uda_valutazioni.every(r=>r.author_name==='Prof. Picconi'));
 assert.equal((await call('rate',{ratings},token)).status,200);assert.equal(db.curricolo_uda_valutazioni.length,2);
 const b=await call('login',{author_name:'Prof. Pinna',password:'password-test'});assert.equal((await call('ratings',{},b.body.token)).body.my_ratings.length,0);
 const second=ratings.map(r=>({...r,valutazione:2}));await call('rate',{ratings:second},b.body.token);
 const open=(await call('ratings',{},token)).body;assert.deepEqual(open.results,[]);assert.ok(!JSON.stringify(open).includes('Prof. Pinna'));
 db.curricolo_uda_votazione_stelle[0].stato='chiusa';assert.equal((await call('rate',{ratings},token)).status,400);
 const closed=(await call('ratings',{},token)).body;assert.equal(closed.results[0].media,3);assert.equal(closed.results[0].conteggio,2);assert.equal(closed.results[1].media,3.5);
 await call('logout',{},token);assert.equal((await call('ratings',{},token)).status,401);
 console.log('PASS handler Edge: accesso, CORS locale, rosa, validazione, salvataggio, separazione docenti, medie, chiusura, logout.');
 console.log('Limite: adattatore dati in memoria; SQL e concorrenza PostgreSQL non eseguiti.');
})().catch(e=>{console.error(e);process.exit(1)});
