(() => {
'use strict';
const SUPABASE_URL = 'https://ruplzgcnheddmqqdephp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGx6Z2NuaGVkZG1xcWRlcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTYyMjksImV4cCI6MjA3NTY5MjIyOX0.tOLIkgi5yTt61_0rMlXUqxnbil4DLD7kBaqZBVAv1CI';
const API_URL = `${SUPABASE_URL}/functions/v1/curricolo-uda-revisioni`;
const SESSION_KEY = 'curricolo:uda-revisione-session';
const IDENTITY_KEY = 'curricolo:uda-revisione-identita';
const DOCENTI = [
    'Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca', 'Prof.ssa Cossu',
    'Prof.ssa Preite', 'Prof.ssa Sanna', 'Prof.ssa Onnis', 'Prof. Carlo Cossu',
    'Prof.ssa Celina Murgia', 'Prof.ssa Isabella Urru'
];
const $ = id => document.getElementById(id);
const form = $('idea-form');
let token='', autore='', idee=[], corrente=null, dirty=false, servizioPronto=false;
const campi=['titolo','profilo','descrizione','attualita','modalita','collegamenti'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modalita = {individuale:'Individuale · nel proprio insegnamento',trasversale:'Trasversale · con altri insegnamenti','da concordare':'Da concordare'};
function altezza(){if(parent!==window)parent.postMessage({type:'iframeContentHeight',height:document.documentElement.scrollHeight},'*');}
new ResizeObserver(altezza).observe(document.body);
DOCENTI.forEach(nome=>{const o=document.createElement('option');o.value=o.textContent=nome;$('docente').append(o);});
function messaggio(t){$('stato').textContent=t;}
async function api(action,payload={}) {
 const headers={'Content-Type':'application/json',apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`};
 if(token)headers['X-Curricolo-Session']=token;
 const response=await fetch(API_URL,{method:'POST',headers,body:JSON.stringify({action,...payload})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok) {
  if(response.status===401 && action!=='login') {
   token='';sessionStorage.removeItem(SESSION_KEY);$('accesso').hidden=false;$('sessione').hidden=true;
   // Il modulo resta visibile: una scadenza non deve cancellare il testo.
  }
  if(action==='ideas-list' && response.status===400)throw new Error('Lo spazio condiviso delle monografiche deve ancora essere attivato. Nessun salvataggio è disponibile.');
  throw new Error(data.error || 'Servizio non disponibile. Il salvataggio non è confermato.');
 }
 return data;
}
async function carica(){
 servizioPronto=false;$('nuova').disabled=true;
 const data=await api('ideas-list');
 if(!Array.isArray(data.ideas))throw new Error('Archivio delle idee non disponibile: occorre attivare il servizio aggiornato.');
 servizioPronto=true;$('nuova').disabled=false;idee=data.ideas;render();messaggio(`${idee.length} ${idee.length === 1 ? 'proposta caricata' : 'proposte caricate'} dallo spazio condiviso.`);
}
function render(){
 $('elenco').innerHTML=idee.length ? idee.map(i=>`<article class="idea-card"><h3>${esc(i.titolo)}</h3><p class="idea-meta">${esc(i.author_name)} · ${esc(modalita[i.modalita])} · versione ${esc(i.versione)}</p>${[['Profilo scientifico e culturale','profilo'],['Idea','descrizione'],['Attualità','attualita'],['Collaborazioni e riferimenti','collegamenti']].filter(([,k])=>i[k]).map(([l,k])=>`<h4>${l}</h4><p>${esc(i[k])}</p>`).join('')}${i.author_name===autore ? `<button type="button" data-edit="${esc(i.id)}">Modifica la tua proposta</button>`:''}</article>`).join('') : '<p>Nessuna idea ancora proposta.</p>';
}
function confermaChiusura(){return !dirty || window.confirm('Chiudere il modulo senza salvare le modifiche?');}
function apri(idea=null){
 if(!servizioPronto){messaggio('Attendi il caricamento dello spazio condiviso.');return;}
 if(!confermaChiusura())return;
 if(idea && idea.author_name!==autore)return;
 corrente=idea ? {...idea} : {id:crypto.randomUUID(),versione:0};
 form.reset();campi.forEach(k=>form.elements[k].value=idea?.[k] || (k==='modalita'?'da concordare':''));
 $('editor-titolo').textContent=idea?'Modifica la tua idea':'Nuova idea';$('esito-salvataggio').textContent='';form.hidden=false;dirty=false;form.elements.titolo.focus();
}
function identita(){ $('accesso').hidden=true;$('sessione').hidden=false;$('identita').textContent=autore;$('lavoro').hidden=false;render(); }
$('accesso').addEventListener('submit',async e=>{
 e.preventDefault();if(dirty && autore && autore!==$('docente').value && !confermaChiusura())return;const b=e.submitter;b.disabled=true;
 try {const data=await api('login',{author_name:$('docente').value,password:$('password').value});
  // Non attribuire un modulo rimasto aperto a un docente diverso.
  if(autore && autore!==data.author_name){form.hidden=true;form.reset();corrente=null;dirty=false;}
  token=data.token;autore=data.author_name;sessionStorage.setItem(SESSION_KEY,token);sessionStorage.setItem(IDENTITY_KEY,autore);$('password').value='';identita();await carica();
 }catch(error){messaggio(error.message);}finally{b.disabled=false;}
});
$('esci').addEventListener('click',async()=>{
 if(!confermaChiusura())return;
 try {await api('logout');} catch {messaggio('Connessione non disponibile; sessione rimossa da questo browser.');}
 token='';autore='';idee=[];sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(IDENTITY_KEY);
 form.reset();dirty=false;form.hidden=true;$('lavoro').hidden=true;$('accesso').hidden=false;$('sessione').hidden=true;render();messaggio('Accesso chiuso.');
});
$('nuova').addEventListener('click',()=>apri());
$('annulla').addEventListener('click',()=>{if(confermaChiusura()){form.hidden=true;dirty=false;}});
$('aggiorna').addEventListener('click',()=>carica().catch(e=>messaggio(e.message)));
$('elenco').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)apri(idee.find(i=>i.id===b.dataset.edit));});
form.addEventListener('input',()=>dirty=true);
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!token){$('esito-salvataggio').textContent='Accedi di nuovo prima di salvare. Il testo è conservato nel modulo.';return;}
 $('salva').disabled=true;
 try {
  const idea={id:corrente.id,versione:corrente.versione,...Object.fromEntries(campi.map(k=>[k,form.elements[k].value.trim()]))};
  const data=await api('ideas-save',{idea});
  if(!data.idea || data.idea.id!==idea.id || data.idea.author_name!==autore || data.idea.versione!==idea.versione+1)throw new Error('Conferma di salvataggio non valida. Conserva il testo e verifica l’elenco.');
  corrente=data.idea;dirty=false;idee=[data.idea,...idee.filter(i=>i.id!==data.idea.id)];render();messaggio(`${idee.length} ${idee.length === 1 ? 'proposta presente' : 'proposte presenti'} nello spazio condiviso.`);$('esito-salvataggio').textContent=`Proposta salvata nello spazio condiviso · versione ${data.idea.versione}.`;
 }catch(error){$('esito-salvataggio').textContent=error.message;}finally{$('salva').disabled=false;}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
(async()=>{
 token=sessionStorage.getItem(SESSION_KEY)||'';
 if(!token)return;
 try {const data=await api('session');autore=data.author_name;identita();await carica();}
 catch(error){messaggio(error.message);}
})();
})();
