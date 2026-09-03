const SUPABASE_URL = 'https://ruplzgcnheddmqqdephp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGx6Z2NuaGVkZG1xcWRlcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTYyMjksImV4cCI6MjA3NTY5MjIyOX0.tOLIkgi5yTt61_0rMlXUqxnbil4DLD7kBaqZBVAv1CI';
const API_URL = `${SUPABASE_URL}/functions/v1/curricolo-uda-revisioni`;
const SESSION_KEY = 'curricolo:uda-revisione-session';
const IDENTITY_KEY = 'curricolo:uda-revisione-identita';
const DOCENTI = ['Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca', 'Prof.ssa Cossu', 'Prof.ssa Preite', 'Prof.ssa Sanna'];
const CAMPI = [
    ['titolo', 'Titolo', 'testo'],
    ['traguardo', 'Traguardo intermedio', 'testo-lungo'],
    ['compito', 'Compito di realtà', 'testo-lungo'],
    ['situazione', 'Situazione-problema', 'testo-lungo'],
    ['prodotto', 'Prodotto atteso', 'testo-lungo'],
    ['beneficiari', 'Beneficiari', 'testo-lungo'],
    ['ambito', 'Ambito del prodotto', 'testo'],
    ['ore', 'Monte ore indicativo', 'testo'],
    ['abilita', 'Abilità essenziali', 'righe'],
    ['saperi', 'Saperi essenziali', 'righe'],
    ['sviluppata', 'Materiali / UDA sviluppata', 'testo']
];
const CAMPI_NUOVA = [
    ['anno', 'Anno di corso', 'scelta-numero', [
        ['1', '1° anno'], ['2', '2° anno'], ['3', '3° anno'], ['4', '4° anno'], ['5', '5° anno']
    ]],
    ['competenza', 'Competenza in uscita', 'scelta-numero', Array.from({ length: 10 }, (_, indice) => [String(indice + 1), `Competenza ${indice + 1}`])],
    ['qnq', 'Livello QNQ', 'scelta', [['2', 'Livello 2'], ['3', 'Livello 3'], ['3/4', 'Livello 3/4'], ['4', 'Livello 4']]],
    ...CAMPI
];
const TUTTI_I_CAMPI = [...CAMPI_NUOVA];

const statoRev = { token: '', docente: '', autorizzato: false, uda: new Map(), revisioni: new Map() };
const uiRev = {};

document.addEventListener('DOMContentLoaded', inizializzaRevisioni);

async function inizializzaRevisioni() {
    raccogliUi();
    collegaEventi();
    DOCENTI.forEach(nome => aggiungiOpzione(uiRev.filtroDocente, nome, nome));
    try {
        const risposta = await fetch('data-uda.json', { cache: 'no-store' });
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        const dati = await risposta.json();
        statoRev.uda = new Map(dati.uda.map(uda => [String(uda.id), uda]));
        if (await ripristinaSessione()) await attivaArea();
    } catch (errore) {
        console.error('Area revisioni UDA non disponibile:', errore);
        uiRev.apri.disabled = true;
        uiRev.apri.textContent = 'Revisione non disponibile';
    }
    aggiornaAzioniSchede();
}

function raccogliUi() {
    const id = nome => document.getElementById(nome);
    Object.assign(uiRev, {
        apri: id('uda-revisione-apri-accesso'), auth: id('uda-revisione-auth'),
        docente: id('uda-revisione-docente'), password: id('uda-revisione-password'),
        authMsg: id('uda-revisione-auth-messaggio'), annulla: id('uda-revisione-annulla'),
        toolbar: id('uda-revisione-toolbar'), identita: id('uda-revisione-identita'),
        contatore: id('uda-revisione-contatore'), crea: id('uda-revisione-crea'),
        nuovaSlot: id('uda-revisione-nuova-slot'), elencoApri: id('uda-revisione-elenco'),
        esci: id('uda-revisione-esci'), pannello: id('uda-revisione-pannello'),
        pannelloChiudi: id('uda-revisione-pannello-chiudi'), filtroAnno: id('uda-revisione-filtro-anno'),
        filtroDocente: id('uda-revisione-filtro-docente'), elencoMsg: id('uda-revisione-elenco-messaggio'),
        elenco: id('uda-revisione-elenco-contenuto')
    });
}

function collegaEventi() {
    uiRev.apri.addEventListener('click', () => mostraAccesso(true));
    uiRev.annulla.addEventListener('click', () => mostraAccesso(false));
    uiRev.auth.addEventListener('submit', accedi);
    uiRev.esci.addEventListener('click', esci);
    uiRev.crea.addEventListener('click', () => apriEditor('nuova'));
    uiRev.elencoApri.addEventListener('click', apriElenco);
    uiRev.pannelloChiudi.addEventListener('click', () => { uiRev.pannello.hidden = true; notificaAltezza(); });
    uiRev.filtroAnno.addEventListener('change', disegnaElenco);
    uiRev.filtroDocente.addEventListener('change', disegnaElenco);
    document.addEventListener('curricolo:uda-rendered', aggiornaAzioniSchede);
}

function mostraAccesso(visibile) {
    uiRev.auth.hidden = !visibile;
    messaggio(uiRev.authMsg, '');
    if (visibile) setTimeout(() => uiRev.docente.focus(), 30);
    notificaAltezza();
}

async function ripristinaSessione() {
    const token = sessionStorage.getItem(SESSION_KEY) || '';
    const docente = sessionStorage.getItem(IDENTITY_KEY) || '';
    if (!token || !DOCENTI.includes(docente)) return false;
    statoRev.token = token;
    statoRev.docente = docente;
    try {
        const dati = await chiamaApi('session');
        if (dati.author_name !== docente) throw new Error('Sessione non valida');
        statoRev.autorizzato = true;
        return true;
    } catch {
        cancellaSessione();
        return false;
    }
}

async function accedi(evento) {
    evento.preventDefault();
    const docente = uiRev.docente.value;
    if (!DOCENTI.includes(docente)) return messaggio(uiRev.authMsg, 'Scegli il tuo nome.', 'errore');
    const bottone = uiRev.auth.querySelector('button[type="submit"]');
    bottone.disabled = true;
    messaggio(uiRev.authMsg, 'Verifica delle credenziali…');
    try {
        const dati = await chiamaApi('login', { password: uiRev.password.value, author_name: docente }, true);
        statoRev.token = dati.token;
        statoRev.docente = dati.author_name;
        statoRev.autorizzato = true;
        sessionStorage.setItem(SESSION_KEY, dati.token);
        sessionStorage.setItem(IDENTITY_KEY, dati.author_name);
        uiRev.password.value = '';
        await attivaArea();
        mostraAccesso(false);
    } catch (errore) {
        messaggio(uiRev.authMsg, errore.message || 'Accesso non riuscito.', 'errore');
    } finally {
        bottone.disabled = false;
    }
}

async function attivaArea() {
    uiRev.apri.hidden = true;
    uiRev.toolbar.hidden = false;
    uiRev.identita.textContent = `${statoRev.docente} · proposte personali, confronto condiviso`;
    await caricaRevisioni();
    aggiornaAzioniSchede();
    notificaAltezza();
}

async function esci() {
    uiRev.esci.disabled = true;
    try { await chiamaApi('logout'); } catch { /* la sessione locale viene comunque rimossa */ }
    cancellaSessione();
    uiRev.toolbar.hidden = true;
    uiRev.pannello.hidden = true;
    uiRev.apri.hidden = false;
    document.querySelectorAll('.uda-revisione-editor').forEach(nodo => nodo.remove());
    aggiornaAzioniSchede();
    uiRev.esci.disabled = false;
    notificaAltezza();
}

function cancellaSessione() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(IDENTITY_KEY);
    Object.assign(statoRev, { token: '', docente: '', autorizzato: false, revisioni: new Map() });
}

async function caricaRevisioni() {
    const dati = await chiamaApi('list');
    statoRev.revisioni = new Map((dati.revisions || []).map(voce => [chiaveRevisione(voce.uda_key, voce.author_name), voce]));
    aggiornaContatore();
}

function aggiornaAzioniSchede() {
    document.querySelectorAll('[data-uda-revisione-key]').forEach(scheda => {
        const chiave = scheda.dataset.udaRevisioneKey;
        const slot = scheda.querySelector(`[data-uda-revisione-slot="${CSS.escape(chiave)}"]`);
        if (!slot) return;
        let azioni = slot.querySelector('.uda-revisione-card-actions');
        if (!statoRev.autorizzato) return azioni?.remove();
        if (!azioni) {
            azioni = document.createElement('div');
            azioni.className = 'uda-revisione-card-actions';
            slot.prepend(azioni);
        }
        azioni.replaceChildren();
        const mia = revisionePersonale(chiave);
        const tutte = revisioniUda(chiave);
        const bottone = creaBottone(mia ? 'Apri la mia proposta' : 'Proponi una modifica', 'uda-revisione-edit');
        bottone.addEventListener('click', () => apriEditor(chiave));
        azioni.appendChild(bottone);
        if (tutte.length) {
            const badge = document.createElement('span');
            badge.className = 'uda-revisione-badge';
            badge.textContent = `${tutte.length} ${tutte.length === 1 ? 'revisione' : 'revisioni'}`;
            azioni.appendChild(badge);
        }
    });
    notificaAltezza();
}

function apriEditor(chiave) {
    const richiestaNuova = chiave === 'nuova';
    const chiaveEffettiva = richiestaNuova ? `nuova-${crypto.randomUUID()}` : String(chiave);
    const nuova = chiaveEffettiva.startsWith('nuova-');
    const uda = nuova ? creaUdaVuota(chiaveEffettiva) : statoRev.uda.get(chiaveEffettiva);
    const slot = nuova ? uiRev.nuovaSlot : document.querySelector(`[data-uda-revisione-slot="${CSS.escape(chiaveEffettiva)}"]`);
    if (!uda || !slot || !statoRev.autorizzato) return;
    document.querySelectorAll('.uda-revisione-editor').forEach(nodo => nodo.remove());
    const salvata = revisionePersonale(chiaveEffettiva);
    const definizioni = nuova ? CAMPI_NUOVA : CAMPI;
    const originale = nuova ? creaSnapshot(creaUdaVuota(chiaveEffettiva), definizioni) : creaSnapshot(uda, definizioni);
    const form = document.createElement('form');
    form.className = 'uda-revisione-editor';
    const testata = document.createElement('div');
    testata.className = 'uda-revisione-editor-head';
    const titolo = document.createElement('h3');
    titolo.textContent = nuova ? `Nuova UDA · proposta di ${statoRev.docente}` : `Proposta di ${statoRev.docente} · UDA ${uda.id}`;
    const chiudi = creaBottone('Chiudi', 'uda-revisione-secondary');
    chiudi.addEventListener('click', () => { form.remove(); notificaAltezza(); });
    testata.append(titolo, chiudi);
    const intro = document.createElement('p');
    intro.className = 'uda-revisione-editor-intro';
    intro.textContent = nuova
        ? 'Scrivi la nuova unità da zero. Sarà salvata come bozza condivisa e non cambierà il fascicolo pubblico.'
        : 'Compila solo i campi da cambiare. Il testo pubblico resta invariato finché la proposta non viene applicata ai file sorgente.';
    const campi = document.createElement('div');
    campi.className = 'uda-revisione-fields';
    definizioni.forEach(definizione => campi.appendChild(creaCampo(definizione, originale, salvata?.modifiche || {}, nuova)));
    const nota = document.createElement('label');
    nota.className = 'uda-revisione-field uda-revisione-note';
    nota.appendChild(document.createTextNode('Annotazione generale'));
    const notaInput = document.createElement('textarea');
    notaInput.name = 'nota_generale';
    notaInput.rows = 3;
    notaInput.placeholder = 'Motivazione, osservazioni o indicazioni per il confronto collegiale.';
    notaInput.value = salvata?.nota_generale || '';
    nota.appendChild(notaInput);
    const piede = document.createElement('div');
    piede.className = 'uda-revisione-editor-footer';
    const esito = document.createElement('p');
    esito.className = 'uda-revisione-messaggio';
    esito.setAttribute('role', 'status');
    const salva = creaBottone('Salva proposta', 'uda-revisione-primary', 'submit');
    piede.append(esito, salva);
    form.append(testata, intro, campi, nota, piede);
    form.addEventListener('submit', evento => salvaRevisione(evento, uda, originale, esito, salva, definizioni, nuova));
    slot.appendChild(form);
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    notificaAltezza();
}

function creaCampo([chiave, etichetta, tipo, opzioni = []], originale, modifiche, nuova = false) {
    const label = document.createElement('label');
    label.className = 'uda-revisione-field';
    if (!['testo', 'scelta', 'scelta-numero'].includes(tipo)) label.classList.add('uda-revisione-field-wide');
    const titolo = document.createElement('span');
    titolo.textContent = etichetta;
    let controllo;
    if (tipo === 'scelta' || tipo === 'scelta-numero') {
        controllo = document.createElement('select');
        aggiungiOpzione(controllo, '', 'Seleziona…');
        opzioni.forEach(([valore, testo]) => aggiungiOpzione(controllo, valore, testo));
    } else controllo = tipo === 'testo' ? document.createElement('input') : document.createElement('textarea');
    controllo.name = chiave;
    if (nuova && ['anno', 'competenza', 'qnq', 'titolo'].includes(chiave)) controllo.required = true;
    if (controllo.tagName === 'TEXTAREA') controllo.rows = tipo === 'righe' ? 7 : 4;
    controllo.value = formattaValore(Object.hasOwn(modifiche, chiave) ? modifiche[chiave] : originale[chiave], tipo);
    controllo.dataset.originale = JSON.stringify(originale[chiave]);
    controllo.dataset.tipo = tipo;
    controllo.addEventListener('input', () => aggiornaStatoCampo(label, controllo));
    label.append(titolo, controllo);
    if (tipo === 'righe') {
        const aiuto = document.createElement('small');
        aiuto.textContent = 'Una voce per riga: testo || insegnamento, altro insegnamento';
        label.appendChild(aiuto);
    }
    aggiornaStatoCampo(label, controllo);
    return label;
}

function aggiornaStatoCampo(label, controllo) {
    label.dataset.changed = String(!uguali(leggiValore(controllo.value, controllo.dataset.tipo), JSON.parse(controllo.dataset.originale)));
}

async function salvaRevisione(evento, uda, originale, esito, bottone, definizioni = CAMPI, nuova = false) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const modifiche = {};
    definizioni.forEach(([chiave, , tipo]) => {
        const valore = leggiValore(form.elements.namedItem(chiave).value, tipo);
        if (!uguali(valore, originale[chiave])) modifiche[chiave] = valore;
    });
    const nota = form.elements.namedItem('nota_generale').value.trim();
    if (nuova && (!modifiche.titolo || !modifiche.anno || !modifiche.competenza || !modifiche.qnq)) {
        return messaggio(esito, 'Indica almeno anno, competenza, livello QNQ e titolo.', 'errore');
    }
    if (!nota && !Object.keys(modifiche).length) return messaggio(esito, 'Scrivi un’annotazione oppure modifica almeno un campo.', 'errore');
    bottone.disabled = true;
    messaggio(esito, 'Salvataggio…');
    try {
        const esistente = revisionePersonale(uda.id);
        const dati = await chiamaApi('upsert', { revision: {
            uda_key: String(uda.id), author_name: statoRev.docente,
            anno: nuova ? Number(modifiche.anno) : Number(uda.anno),
            titolo_uda: nuova ? modifiche.titolo : uda.titolo,
            originale, modifiche, nota_generale: nota,
            stato: esistente?.stato || 'bozza', source_version: nuova ? 'nuova-uda' : 'data-uda.json'
        }});
        statoRev.revisioni.set(chiaveRevisione(dati.revision.uda_key, dati.revision.author_name), dati.revision);
        aggiornaContatore();
        aggiornaAzioniSchede();
        messaggio(esito, 'Proposta salvata nell’area condivisa.', 'successo');
    } catch (errore) {
        messaggio(esito, errore.message || 'Salvataggio non riuscito.', 'errore');
    } finally {
        bottone.disabled = false;
    }
}

function creaSnapshot(uda, definizioni = CAMPI) {
    return Object.fromEntries(definizioni.map(([chiave, , tipo]) => [chiave, structuredClone(uda[chiave] ?? (tipo === 'righe' ? [] : ''))]));
}

function creaUdaVuota(chiave) {
    return { id: chiave, anno: '', competenza: '', qnq: '', titolo: '', traguardo: '', compito: '', situazione: '',
        prodotto: '', beneficiari: '', ambito: '', ore: '', abilita: [], saperi: [], sviluppata: '' };
}

function formattaValore(valore, tipo) {
    if (tipo === 'righe') return (Array.isArray(valore) ? valore : []).map(riga => `${riga.t || ''} || ${(riga.ins || []).join(', ')}`).join('\n');
    return String(valore ?? '');
}

function leggiValore(valore, tipo) {
    if (tipo === 'scelta-numero') return valore ? Number(valore) : '';
    if (tipo !== 'righe') return valore.trim();
    return valore.split('\n').map(riga => riga.trim()).filter(Boolean).map(riga => {
        const [testo, insegnamenti = ''] = riga.split('||');
        return { t: testo.trim(), ins: insegnamenti.split(',').map(voce => voce.trim()).filter(Boolean) };
    }).filter(riga => riga.t);
}

function uguali(a, b) { return JSON.stringify(a ?? '') === JSON.stringify(b ?? ''); }

async function apriElenco() {
    uiRev.pannello.hidden = false;
    messaggio(uiRev.elencoMsg, 'Aggiornamento delle revisioni…');
    try { await caricaRevisioni(); messaggio(uiRev.elencoMsg, ''); disegnaElenco(); }
    catch (errore) { messaggio(uiRev.elencoMsg, errore.message || 'Impossibile caricare le revisioni.', 'errore'); }
    uiRev.pannello.scrollIntoView({ behavior: 'smooth', block: 'start' });
    notificaAltezza();
}

function disegnaElenco() {
    const anno = uiRev.filtroAnno.value;
    const docente = uiRev.filtroDocente.value;
    const voci = [...statoRev.revisioni.values()].filter(voce => !anno || String(voce.anno) === anno)
        .filter(voce => !docente || voce.author_name === docente).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    uiRev.elenco.replaceChildren();
    if (!voci.length) {
        const vuoto = document.createElement('p');
        vuoto.className = 'uda-revisione-empty';
        vuoto.textContent = 'Nessuna revisione corrisponde ai filtri selezionati.';
        uiRev.elenco.appendChild(vuoto);
    } else voci.forEach(voce => uiRev.elenco.appendChild(creaSchedaRevisione(voce)));
    notificaAltezza();
}

function creaSchedaRevisione(voce) {
    const scheda = document.createElement('article');
    scheda.className = 'uda-revisione-summary';
    scheda.dataset.state = voce.stato;
    const testata = document.createElement('div');
    testata.className = 'uda-revisione-summary-head';
    const titoloBox = document.createElement('div');
    const autore = document.createElement('span');
    autore.className = 'uda-revisione-author';
    autore.textContent = voce.author_name;
    const titolo = document.createElement('h3');
    titolo.textContent = String(voce.uda_key).startsWith('nuova-')
        ? `Nuova UDA proposta · ${voce.anno}° anno — ${voce.titolo_uda}`
        : `UDA ${voce.uda_key} — ${voce.titolo_uda}`;
    const meta = document.createElement('p');
    meta.textContent = `Aggiornata ${new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(voce.updated_at))}`;
    titoloBox.append(autore, titolo, meta);
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Stato revisione UDA ${voce.uda_key}`);
    select.disabled = voce.author_name !== statoRev.docente;
    [['bozza', 'Da valutare'], ['approvata', 'Approvata'], ['applicata', 'Applicata'], ['archiviata', 'Archiviata']]
        .forEach(([valore, etichetta]) => aggiungiOpzione(select, valore, etichetta, voce.stato === valore));
    select.addEventListener('change', () => aggiornaStato(voce, select, scheda));
    testata.append(titoloBox, select);
    scheda.appendChild(testata);
    if (voce.nota_generale) {
        const nota = document.createElement('p');
        nota.className = 'uda-revisione-summary-note';
        nota.textContent = voce.nota_generale;
        scheda.appendChild(nota);
    }
    const chiavi = Object.keys(voce.modifiche || {});
    if (chiavi.length) {
        const dettagli = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = `Confronta ${chiavi.length} ${chiavi.length === 1 ? 'campo modificato' : 'campi modificati'}`;
        dettagli.appendChild(summary);
        chiavi.forEach(chiave => dettagli.appendChild(creaConfronto(chiave, voce)));
        scheda.appendChild(dettagli);
    }
    if (voce.author_name === statoRev.docente) {
        const apri = creaBottone('Apri la mia proposta', 'uda-revisione-secondary');
        apri.addEventListener('click', () => apriDaElenco(voce.uda_key));
        scheda.appendChild(apri);
    }
    return scheda;
}

function creaConfronto(chiave, voce) {
    const box = document.createElement('section');
    box.className = 'uda-revisione-comparison';
    const titolo = document.createElement('h4');
    titolo.textContent = TUTTI_I_CAMPI.find(campo => campo[0] === chiave)?.[1] || chiave;
    const nuova = String(voce.uda_key).startsWith('nuova-');
    box.append(titolo, testoConfronto(nuova ? 'Da compilare' : 'Testo pubblico', voce.originale?.[chiave]),
        testoConfronto(`Proposta di ${voce.author_name}`, voce.modifiche?.[chiave]));
    return box;
}

function testoConfronto(etichetta, valore) {
    const box = document.createElement('div');
    const titolo = document.createElement('strong');
    titolo.textContent = etichetta;
    const testo = document.createElement('pre');
    testo.textContent = formattaValore(valore, Array.isArray(valore) ? 'righe' : 'testo');
    box.append(titolo, testo);
    return box;
}

function apriDaElenco(chiave) {
    uiRev.pannello.hidden = true;
    if (String(chiave).startsWith('nuova-')) {
        apriEditor(chiave);
        return;
    }
    const card = document.querySelector(`[data-uda-revisione-key="${CSS.escape(String(chiave))}"]`);
    card?.classList.add('group-expanded');
    card?.querySelector('.uda-acc-header')?.setAttribute('aria-expanded', 'true');
    const corpo = card?.querySelector('.uda-acc-body');
    if (corpo) corpo.hidden = false;
    apriEditor(chiave);
}

async function aggiornaStato(voce, select, scheda) {
    const precedente = voce.stato;
    select.disabled = true;
    try {
        const dati = await chiamaApi('status', { id: voce.id, state: select.value });
        statoRev.revisioni.set(chiaveRevisione(dati.revision.uda_key, dati.revision.author_name), dati.revision);
        scheda.dataset.state = dati.revision.stato;
        aggiornaContatore();
        aggiornaAzioniSchede();
    } catch (errore) {
        select.value = precedente;
        messaggio(uiRev.elencoMsg, errore.message || 'Impossibile aggiornare lo stato.', 'errore');
    } finally { select.disabled = voce.author_name !== statoRev.docente; }
}

function revisionePersonale(chiave) { return statoRev.revisioni.get(chiaveRevisione(chiave, statoRev.docente)); }
function revisioniUda(chiave) { return [...statoRev.revisioni.values()].filter(voce => String(voce.uda_key) === String(chiave) && voce.stato !== 'archiviata'); }
function chiaveRevisione(chiave, autore) { return `${chiave}::${autore}`; }
function aggiornaContatore() { uiRev.contatore.textContent = String([...statoRev.revisioni.values()].filter(voce => voce.stato !== 'archiviata').length); }

function creaBottone(testo, classe, tipo = 'button') {
    const bottone = document.createElement('button');
    bottone.type = tipo;
    bottone.className = classe;
    bottone.textContent = testo;
    return bottone;
}

function aggiungiOpzione(select, valore, etichetta, selezionata = false) {
    const option = document.createElement('option');
    option.value = valore;
    option.textContent = etichetta;
    option.selected = selezionata;
    select.appendChild(option);
}

function messaggio(elemento, testo, tipo = '') {
    elemento.textContent = testo;
    if (tipo) elemento.dataset.tipo = tipo; else delete elemento.dataset.tipo;
}

function notificaAltezza() {
    setTimeout(() => {
        if (window.parent === window) return;
        const altezza = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        window.parent.postMessage({ type: 'iframeContentHeight', height: altezza }, window.location.origin);
    }, 20);
}

async function chiamaApi(action, payload = {}, pubblica = false) {
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
    if (!pubblica && statoRev.token) headers['X-Curricolo-Session'] = statoRev.token;
    const risposta = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action, ...payload }) });
    const dati = await risposta.json().catch(() => ({}));
    if (!risposta.ok) {
        if (risposta.status === 401 && action !== 'login') cancellaSessione();
        throw new Error(dati.error || 'Servizio temporaneamente non disponibile.');
    }
    return dati;
}
