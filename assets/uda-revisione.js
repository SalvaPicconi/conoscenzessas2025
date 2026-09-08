const SUPABASE_URL = 'https://ruplzgcnheddmqqdephp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGx6Z2NuaGVkZG1xcWRlcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTYyMjksImV4cCI6MjA3NTY5MjIyOX0.tOLIkgi5yTt61_0rMlXUqxnbil4DLD7kBaqZBVAv1CI';
const API_URL = `${SUPABASE_URL}/functions/v1/curricolo-uda-revisioni`;
const SESSION_KEY = 'curricolo:uda-revisione-session';
const IDENTITY_KEY = 'curricolo:uda-revisione-identita';
const MODE_KEY = 'curricolo:uda-accesso-modalita';
const DATA_SOURCE = document.documentElement.dataset.udaSource || 'data-uda.json';
const UDA_KIND = document.documentElement.dataset.udaKind || 'asse';
const IS_TRASVERSALE = UDA_KIND === 'trasversale';
const IS_FSL = UDA_KIND === 'fsl';
const IS_ESAME = UDA_KIND === 'esame';
const IS_UNIFICATA = UDA_KIND === 'unificate';
const IS_COLLEGIALE = IS_TRASVERSALE || IS_FSL || IS_ESAME;
const NEW_KEY_PREFIX = IS_FSL ? 'nuova-f-' : IS_TRASVERSALE ? 'nuova-t-' : 'nuova-';
const NEW_SOURCE_VERSION = IS_FSL ? 'nuova-uda-fsl' : IS_TRASVERSALE ? 'nuova-uda-trasversale' : 'nuova-uda';
const DOCENTI = [
    'Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca', 'Prof.ssa Cossu',
    'Prof.ssa Preite', 'Prof.ssa Sanna', 'Prof.ssa Onnis', 'Prof. Carlo Cossu',
    'Prof.ssa Celina Murgia', 'Prof.ssa Isabella Urru'
];
const CAMPI_COMUNI = [
    ['titolo', 'Titolo', 'testo'],
    ['traguardo', 'Traguardo intermedio', 'testo-lungo'],
    ['compito', 'Compito di realtà', 'testo-lungo'],
    ['situazione', 'Situazione-problema', 'testo-lungo'],
    ['prodotto', 'Prodotto atteso', 'testo-lungo'],
    ['beneficiari', 'Beneficiari', 'testo-lungo'],
    ['ambito', 'Ambito del prodotto', 'testo'],
    ['ore', 'Monte ore indicativo', 'testo'],
    ['abilita', 'Abilità mobilitate', 'righe'],
    ['integrazioniSaperi', 'Saperi integrativi proposti · libera scelta del docente', 'righe'],
    ['segnalazioneSaperi', 'Segnalazione sui saperi documentali', 'testo-lungo'],
    ['sviluppata', 'Materiali / UDA sviluppata', 'testo']
];
const CAMPI_TRASVERSALI = [
    ['periodo', 'Periodo', 'testo'],
    ['assi', 'Assi culturali coinvolti', 'lista'],
    ['competenzeGenerali', 'Competenze dell’area generale', 'numeri'],
    ['competenzeSSAS', 'Competenze SSAS', 'numeri'],
    ['competenzeEuropee', 'Competenze chiave europee 2018', 'lista'],
    ...CAMPI_COMUNI
];
const CAMPI_FSL = [
    ['periodo', 'Fasi del percorso', 'testo'],
    ['areaTirocinio', 'Area di tirocinio', 'testo'],
    ['competenzeSSAS', 'Competenze SSAS', 'numeri'],
    ['competenzeEuropee', 'Competenze chiave europee 2018', 'lista'],
    ...CAMPI_COMUNI
];
const CAMPI_ESAME = [
    ['periodo', 'Periodo', 'testo'],
    ['titolo', 'Titolo', 'testo'],
    ['argomento', 'Argomento', 'testo-lungo'],
    ['situazione', 'Situazione-problema', 'testo-lungo'],
    ['ruolo', 'Ruolo dello studente', 'testo-lungo'],
    ['committente', 'Committente', 'testo-lungo'],
    ['destinatario', 'Destinatario', 'testo-lungo'],
    ['prodotto', 'Prodotto atteso', 'testo-lungo'],
    ['autonomiaOperativa', 'Autonomia nel compito', 'testo-lungo'],
    ['traccia', 'Consegna conclusiva individuale', 'testo-lungo'],
    ['personalizzazione', 'Personalizzazione e accessibilità', 'testo-lungo']
];
const CAMPI = IS_ESAME ? CAMPI_ESAME : IS_FSL ? CAMPI_FSL : IS_TRASVERSALE ? CAMPI_TRASVERSALI : CAMPI_COMUNI;
const CAMPI_SAPERI_NUOVA = [['saperi', 'Saperi essenziali di riferimento (riportare senza riscrivere)', 'righe']];
const CAMPI_NUOVA = [
    ['anno', 'Anno di corso', 'scelta-numero', IS_FSL
        ? [['3', '3° anno'], ['4', '4° anno'], ['5', '5° anno']]
        : [['1', '1° anno'], ['2', '2° anno'], ['3', '3° anno'], ['4', '4° anno'], ['5', '5° anno']]],
    ...(IS_COLLEGIALE ? [] : [
        ['competenza', 'Competenza in uscita', 'scelta-numero', Array.from({ length: 10 }, (_, indice) => [String(indice + 1), `Competenza ${indice + 1}`])]
    ]),
    ['qnq', 'Livello QNQ', 'scelta', [['2', 'Livello 2'], ['3', 'Livello 3'], ['3/4', 'Livello 3/4'], ['4', 'Livello 4']]],
    ...CAMPI,
    ...CAMPI_SAPERI_NUOVA
];
// La ripartizione oraria ha un'interfaccia propria (assets/uda-ore.js) e non
// compare fra i campi dell'editor: qui serve solo a intitolarla nel confronto.
const CAMPO_ORE = ['oreRipartizione', 'Ripartizione oraria per insegnamento', 'ore'];
const TUTTI_I_CAMPI = [...CAMPI_NUOVA, CAMPO_ORE];

const statoRev = { token: '', docente: '', autorizzato: false, puoGestireStati: false, modalita: '', uda: new Map(), revisioni: new Map() };
const uiRev = {};

document.addEventListener('DOMContentLoaded', inizializzaRevisioni);

async function inizializzaRevisioni() {
    raccogliUi();
    collegaEventi();
    uiRev.docente.querySelectorAll('option:not(:first-child)').forEach(opzione => opzione.remove());
    DOCENTI.forEach(nome => aggiungiOpzione(uiRev.docente, nome, nome));
    DOCENTI.forEach(nome => aggiungiOpzione(uiRev.filtroDocente, nome, nome));
    try {
        const risposta = await fetch(DATA_SOURCE, { cache: 'no-store' });
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        const dati = await risposta.json();
        const catalogo = IS_ESAME ? dati.schede : dati.uda;
        if (!Array.isArray(catalogo)) throw new Error('Catalogo UDA non valido');
        const tipologie = new Map((dati.tipologie || []).map(tipo => [String(tipo.id), tipo.definizione]));
        statoRev.uda = new Map(catalogo.map(uda => [String(uda.id), normalizzaUda(uda, tipologie)]));
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
        authTitolo: id('uda-revisione-auth-titolo'), authDescrizione: id('uda-revisione-auth-descrizione'),
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
    uiRev.apri.addEventListener('click', () => { void richiediAccesso('revisione'); });
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

async function richiediAccesso(modalita = 'revisione') {
    statoRev.modalita = modalita === 'voto' ? 'voto' : 'revisione';
    aggiornaTestiAccesso();
    if (statoRev.autorizzato) {
        await attivaArea();
        return;
    }
    mostraAccesso(true);
}

function aggiornaTestiAccesso() {
    const voto = statoRev.modalita === 'voto';
    if (uiRev.authTitolo) uiRev.authTitolo.textContent = voto ? 'Accedi alla votazione' : 'Accedi alla revisione';
    if (uiRev.authDescrizione) uiRev.authDescrizione.textContent = 'Inserisci nome e password.';
    const invia = uiRev.auth?.querySelector('button[type="submit"]');
    if (invia) invia.textContent = voto ? 'Accedi e vota' : 'Accedi e modifica';
}

async function ripristinaSessione() {
    const token = sessionStorage.getItem(SESSION_KEY) || '';
    const docente = sessionStorage.getItem(IDENTITY_KEY) || '';
    if (!token || !DOCENTI.includes(docente)) return false;
    statoRev.token = token;
    statoRev.docente = docente;
    statoRev.modalita = sessionStorage.getItem(MODE_KEY) === 'voto' ? 'voto' : 'revisione';
    try {
        const dati = await chiamaApi('session');
        if (dati.author_name !== docente) throw new Error('Sessione non valida');
        statoRev.autorizzato = true;
        statoRev.puoGestireStati = dati.permissions?.manage_status === true;
        aggiornaTestiAccesso();
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
        statoRev.puoGestireStati = dati.permissions?.manage_status === true;
        sessionStorage.setItem(SESSION_KEY, dati.token);
        sessionStorage.setItem(IDENTITY_KEY, dati.author_name);
        sessionStorage.setItem(MODE_KEY, statoRev.modalita || 'revisione');
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
    const revisione = statoRev.modalita !== 'voto';
    sessionStorage.setItem(MODE_KEY, revisione ? 'revisione' : 'voto');
    uiRev.apri.hidden = revisione;
    uiRev.toolbar.hidden = !revisione;
    uiRev.pannello.hidden = true;
    document.querySelectorAll('.uda-revisione-editor').forEach(nodo => nodo.remove());
    if (revisione) {
        uiRev.identita.textContent = `${statoRev.docente} · proposte personali, confronto condiviso`;
        await caricaRevisioni();
    } else {
        statoRev.revisioni = new Map();
        aggiornaContatore();
    }
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
    sessionStorage.removeItem(MODE_KEY);
    Object.assign(statoRev, { token: '', docente: '', autorizzato: false, puoGestireStati: false, modalita: '', revisioni: new Map() });
}

async function caricaRevisioni() {
    const dati = await chiamaApi('list');
    const revisioniPagina = (dati.revisions || []).filter(voce => {
        const source = voce.source_version || '';
        if (IS_COLLEGIALE || IS_UNIFICATA) {
            return source === DATA_SOURCE || source === NEW_SOURCE_VERSION;
        }
        return source === '' || source === DATA_SOURCE || source === NEW_SOURCE_VERSION;
    });
    statoRev.revisioni = new Map(revisioniPagina.map(voce => [chiaveRevisione(voce.uda_key, voce.author_name), voce]));
    aggiornaContatore();
}

function aggiornaAzioniSchede() {
    document.querySelectorAll('[data-uda-revisione-key]').forEach(scheda => {
        const chiave = scheda.dataset.udaRevisioneKey;
        const slot = scheda.querySelector(`[data-uda-revisione-slot="${CSS.escape(chiave)}"]`);
        if (!slot) return;
        let azioni = slot.querySelector('.uda-revisione-card-actions');
        if (!statoRev.autorizzato || statoRev.modalita !== 'revisione') return azioni?.remove();
        if (!azioni) {
            azioni = document.createElement('div');
            azioni.className = 'uda-revisione-card-actions';
            slot.prepend(azioni);
        }
        azioni.replaceChildren();
        const mia = revisionePersonale(chiave);
        const tutte = revisioniUda(chiave);
        const bloccata = mia && ['approvata', 'applicata'].includes(mia.stato) && !statoRev.puoGestireStati;
        const bottone = creaBottone(bloccata ? 'Proposta approvata' : mia ? 'Apri la mia proposta' : 'Proponi una modifica', 'uda-revisione-edit');
        bottone.disabled = Boolean(bloccata);
        if (!bloccata) bottone.addEventListener('click', () => apriEditor(chiave));
        azioni.appendChild(bottone);
        if (tutte.length) {
            const badge = document.createElement('span');
            badge.className = 'uda-revisione-badge';
            badge.textContent = `${tutte.length} ${tutte.length === 1 ? 'revisione' : 'revisioni'}`;
            azioni.appendChild(badge);
        }
    });
    document.dispatchEvent(new CustomEvent('curricolo:uda-sessione'));
    notificaAltezza();
}

function apriEditor(chiave) {
    const richiestaNuova = chiave === 'nuova';
    const chiaveEffettiva = richiestaNuova ? `${NEW_KEY_PREFIX}${crypto.randomUUID()}` : String(chiave);
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
    titolo.textContent = nuova
        ? `Nuova ${IS_FSL ? 'UDA FSL' : IS_TRASVERSALE ? 'UDA trasversale' : 'UDA'} · proposta di ${statoRev.docente}`
        : `Proposta di ${statoRev.docente} · UDA ${uda.id}`;
    const chiudi = creaBottone('Chiudi', 'uda-revisione-secondary');
    chiudi.addEventListener('click', () => { form.remove(); notificaAltezza(); });
    testata.append(titolo, chiudi);
    const intro = document.createElement('p');
    intro.className = 'uda-revisione-editor-intro';
    intro.textContent = nuova
        ? 'Scrivi la nuova unità da zero. Sarà salvata come bozza condivisa e non cambierà il fascicolo pubblico.'
        : 'Compila solo i campi da cambiare. Il testo pubblico resta invariato finché la proposta non viene applicata ai file sorgente.';
    if (!nuova && IS_ESAME) form.appendChild(creaRiferimentiEsameProtetti(uda));
    else if (!nuova && Array.isArray(uda.saperi)) form.appendChild(creaSaperiProtetti(uda.saperi));
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

function normalizzaUda(uda, tipologie = new Map()) {
    if (!IS_ESAME) return uda;
    return {
        ...uda,
        ...(uda.compitoAtteso || {}),
        definizioneTipologia: tipologie.get(String(uda.tipologia)) || ''
    };
}

function creaRiferimentiEsameProtetti(uda) {
    const box = document.createElement('section');
    box.className = 'uda-revisione-comparison uda-revisione-protected';
    const titolo = document.createElement('h4');
    titolo.textContent = 'Quadro della prova e raccordo curricolare · dati protetti';
    const testo = document.createElement('pre');
    const nuclei = (uda.nuclei || []).map(nucleo => `Nucleo ${nucleo.id} — ${nucleo.testo}`).join('\n');
    const competenze = (uda.competenze || []).map(voce => `C${voce.numero} — ${voce.traguardo}`).join('\n');
    const insegnamenti = (uda.contributi || []).map(voce => voce.insegnamento).join('\n');
    testo.textContent = [
        `Tipologia ${uda.tipologia} — ${uda.definizioneTipologia}`,
        nuclei,
        competenze,
        `Insegnamenti dell’area di indirizzo sempre coinvolti:\n${insegnamenti}`
    ].filter(Boolean).join('\n\n');
    const nota = document.createElement('small');
    nota.textContent = 'Tipologia, nuclei, competenze e insegnamenti di indirizzo restano riportati integralmente. Eventuali osservazioni si registrano nell’annotazione generale.';
    box.append(titolo, testo, nota);
    return box;
}

function creaSaperiProtetti(saperi) {
    const box = document.createElement('section');
    box.className = 'uda-revisione-comparison';
    const titolo = document.createElement('h4');
    titolo.textContent = 'Saperi essenziali di riferimento · dato protetto';
    const testo = document.createElement('pre');
    testo.textContent = formattaValore(saperi, 'righe');
    const nota = document.createElement('small');
    nota.textContent = 'Sono riportati dai documenti del curricolo: non si riscrivono nella revisione. Usa i campi dedicati per integrazioni o segnalazioni.';
    box.append(titolo, testo, nota);
    return box;
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
    const obbligatori = IS_FSL
        ? ['anno', 'qnq', 'titolo', 'areaTirocinio', 'competenzeSSAS', 'saperi']
        : IS_TRASVERSALE
        ? ['anno', 'qnq', 'titolo', 'assi', 'competenzeGenerali', 'competenzeSSAS']
        : ['anno', 'competenza', 'qnq', 'titolo'];
    if (nuova && obbligatori.includes(chiave)) controllo.required = true;
    if (controllo.tagName === 'TEXTAREA') controllo.rows = tipo === 'righe' ? 7 : 4;
    controllo.value = formattaValore(Object.hasOwn(modifiche, chiave) ? modifiche[chiave] : originale[chiave], tipo);
    controllo.dataset.originale = JSON.stringify(originale[chiave]);
    controllo.dataset.tipo = tipo;
    controllo.addEventListener('input', () => aggiornaStatoCampo(label, controllo));
    label.append(titolo, controllo);
    if (tipo === 'righe') {
        const aiuto = document.createElement('small');
        aiuto.textContent = chiave === 'integrazioniSaperi'
            ? 'Una voce per riga: testo || insegnamento. La proposta sarà affiancata ai saperi normativi, non li sostituirà.'
            : 'Una voce per riga: testo || insegnamento, altro insegnamento';
        label.appendChild(aiuto);
    } else if (tipo === 'lista') {
        const aiuto = document.createElement('small');
        aiuto.textContent = 'Una voce per riga.';
        label.appendChild(aiuto);
    } else if (tipo === 'numeri') {
        const aiuto = document.createElement('small');
        aiuto.textContent = 'Indica i numeri separati da virgole, per esempio: 1, 3, 8.';
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
    const modificheDelForm = Object.keys(modifiche).length;
    // I campi con interfaccia propria, come la ripartizione oraria, non passano
    // da questo form: vanno riportati così come sono, o il salvataggio li perde.
    const gestitiDalForm = new Set(definizioni.map(([chiave]) => chiave));
    Object.entries(revisionePersonale(uda.id)?.modifiche || {}).forEach(([chiave, valore]) => {
        if (!gestitiDalForm.has(chiave)) modifiche[chiave] = valore;
    });
    const nota = form.elements.namedItem('nota_generale').value.trim();
    if (nuova && (!modifiche.titolo || !modifiche.anno || !modifiche.qnq)) {
        return messaggio(esito, 'Indica almeno anno, livello QNQ e titolo.', 'errore');
    }
    if (nuova && !IS_COLLEGIALE && !modifiche.competenza) {
        return messaggio(esito, 'Indica la competenza in uscita.', 'errore');
    }
    if (nuova && IS_TRASVERSALE && (!modifiche.assi?.length || !modifiche.competenzeGenerali?.length || !modifiche.competenzeSSAS?.length)) {
        return messaggio(esito, 'Indica assi culturali, competenze generali e competenze SSAS.', 'errore');
    }
    if (nuova && IS_FSL && (Number(modifiche.anno) < 3 || !modifiche.areaTirocinio || !modifiche.competenzeSSAS?.length || !modifiche.saperi?.length)) {
        return messaggio(esito, 'Indica area di tirocinio, competenze SSAS e saperi documentali; la FSL è prevista dal terzo anno.', 'errore');
    }
    const duplicati = trovaDuplicatiSaperi(uda.saperi || modifiche.saperi || [], modifiche.integrazioniSaperi || []);
    if (duplicati.length) {
        return messaggio(esito, `Rimuovi ${duplicati.length === 1 ? 'il sapere integrativo già presente' : 'i saperi integrativi già presenti'} nella base normativa: ${duplicati.join('; ')}`, 'errore');
    }
    if (!nota && !modificheDelForm) return messaggio(esito, 'Scrivi un’annotazione oppure modifica almeno un campo.', 'errore');
    bottone.disabled = true;
    messaggio(esito, 'Salvataggio…');
    try {
        const esistente = revisionePersonale(uda.id);
        const dati = await chiamaApi('upsert', { revision: {
            uda_key: String(uda.id), author_name: statoRev.docente,
            anno: nuova ? Number(modifiche.anno) : Number(uda.anno),
            titolo_uda: nuova ? modifiche.titolo : uda.titolo,
            originale, modifiche, nota_generale: nota,
            stato: esistente?.stato || 'bozza', source_version: nuova ? NEW_SOURCE_VERSION : DATA_SOURCE
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

function trovaDuplicatiSaperi(base, integrazioni) {
    const normalizza = testo => String(testo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const esistenti = new Set((base || []).map(voce => normalizza(voce.t)).filter(Boolean));
    const visti = new Set();
    return (integrazioni || []).filter(voce => {
        const chiave = normalizza(voce.t);
        const duplicato = chiave && (esistenti.has(chiave) || visti.has(chiave));
        if (chiave) visti.add(chiave);
        return duplicato;
    }).map(voce => voce.t);
}

function creaSnapshot(uda, definizioni = CAMPI) {
    return Object.fromEntries(definizioni.map(([chiave, , tipo]) => [chiave,
        structuredClone(uda[chiave] ?? (['righe', 'lista', 'numeri'].includes(tipo) ? [] : ''))
    ]));
}

function creaUdaVuota(chiave) {
    return { id: chiave, anno: '', periodo: '', areaTirocinio: '', competenza: '', qnq: '', titolo: '', assi: [],
        competenzeGenerali: [], competenzeSSAS: [], competenzeEuropee: [], traguardo: '', compito: '', situazione: '',
        prodotto: '', beneficiari: '', ambito: '', ore: '', abilita: [], saperi: [], integrazioniSaperi: [],
        segnalazioneSaperi: '', sviluppata: '' };
}

function formattaValore(valore, tipo) {
    if (tipo === 'ore') {
        const voci = Object.entries(valore && typeof valore === 'object' ? valore : {});
        return voci.length ? voci.map(([ins, ore]) => `${ins}: ${ore} ore`).join('\n') : 'Proposta proporzionale confermata';
    }
    if (tipo === 'righe') return (Array.isArray(valore) ? valore : []).map(riga => `${riga.t || ''} || ${(riga.ins || []).join(', ')}`).join('\n');
    if (tipo === 'lista') return (Array.isArray(valore) ? valore : []).join('\n');
    if (tipo === 'numeri') return (Array.isArray(valore) ? valore : []).join(', ');
    return String(valore ?? '');
}

function leggiValore(valore, tipo) {
    if (tipo === 'scelta-numero') return valore ? Number(valore) : '';
    if (tipo === 'lista') return valore.split('\n').map(voce => voce.trim()).filter(Boolean);
    if (tipo === 'numeri') return [...new Set(valore.split(/[\s,;]+/).map(Number).filter(numero => Number.isInteger(numero) && numero > 0))];
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
    const puoValidare = statoRev.puoGestireStati;
    const puoGestireBozza = voce.author_name === statoRev.docente && ['bozza', 'archiviata'].includes(voce.stato);
    select.disabled = !puoValidare && !puoGestireBozza;
    [['bozza', 'Da valutare'], ['approvata', 'Approvata'], ['applicata', 'Applicata ai sorgenti'], ['archiviata', 'Archiviata']]
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
    if (voce.author_name === statoRev.docente && (!['approvata', 'applicata'].includes(voce.stato) || statoRev.puoGestireStati)) {
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
    const definizione = TUTTI_I_CAMPI.find(campo => campo[0] === chiave);
    titolo.textContent = definizione?.[1] || chiave;
    const nuova = String(voce.uda_key).startsWith('nuova-');
    const tipo = definizione?.[2] || 'testo';
    box.append(titolo, testoConfronto(nuova ? 'Da compilare' : 'Testo pubblico', voce.originale?.[chiave], tipo),
        testoConfronto(`Proposta di ${voce.author_name}`, voce.modifiche?.[chiave], tipo));
    return box;
}

function testoConfronto(etichetta, valore, tipo) {
    const box = document.createElement('div');
    const titolo = document.createElement('strong');
    titolo.textContent = etichetta;
    const testo = document.createElement('pre');
    testo.textContent = formattaValore(valore, tipo);
    box.append(titolo, testo);
    return box;
}

function apriDaElenco(chiave) {
    uiRev.pannello.hidden = true;
    if (String(chiave).startsWith('nuova-')) {
        apriEditor(chiave);
        return;
    }
    let card = document.querySelector(`[data-uda-revisione-key="${CSS.escape(String(chiave))}"]`);
    if (IS_ESAME) {
        if (!card) {
            document.querySelector('.esame-year-button[data-anno=""]')?.click();
            card = document.querySelector(`[data-uda-revisione-key="${CSS.escape(String(chiave))}"]`);
        }
        const header = card?.querySelector('.esame-slot-header');
        if (header?.getAttribute('aria-expanded') !== 'true') header?.click();
        requestAnimationFrame(() => apriEditor(chiave));
        return;
    }
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
    } finally {
        select.disabled = !statoRev.puoGestireStati &&
            (voce.author_name !== statoRev.docente || !['bozza', 'archiviata'].includes(select.value));
    }
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

// Ponte per assets/uda-ore.js: la ripartizione oraria è una proposta come le
// altre e viaggia dentro lo stesso record, ma ha un'interfaccia separata.
window.CurricoloRevisione = {
    get docente() { return statoRev.autorizzato ? statoRev.docente : ''; },
    get modalita() { return statoRev.autorizzato ? statoRev.modalita : ''; },
    get puoRevisionare() { return statoRev.autorizzato && statoRev.modalita === 'revisione'; },
    get puoGestire() { return statoRev.autorizzato && statoRev.puoGestireStati; },
    apriAccesso: modalita => richiediAccesso(modalita),
    esci,
    // Revisione e voto hanno ingressi distinti, ma riusano la stessa sessione
    // autenticata e quindi la stessa password lato server.
    api: (azione, dati) => {
        if (['votes', 'vote', 'ballot', 'choice'].includes(azione) && statoRev.modalita !== 'voto') {
            throw new Error('Apri prima lo spazio “Vota le preferenze per le UDA”.');
        }
        return chiamaApi(azione, dati);
    },
    revisioniUda,
    revisionePersonale,
    async salvaCampo(chiave, campo, valore, originaleCampo) {
        if (!statoRev.autorizzato || statoRev.modalita !== 'revisione') throw new Error('Apri prima lo spazio di modifica e revisione.');
        const uda = statoRev.uda.get(String(chiave));
        if (!uda) throw new Error('UDA non riconosciuta.');
        const esistente = revisionePersonale(chiave);
        if (esistente && ['approvata', 'applicata'].includes(esistente.stato) && !statoRev.puoGestireStati) {
            throw new Error('La proposta è già stata validata e non può più essere modificata.');
        }
        const dati = await chiamaApi('upsert', { revision: {
            uda_key: String(chiave), author_name: statoRev.docente, anno: Number(uda.anno),
            titolo_uda: uda.titolo,
            originale: { ...(esistente?.originale || {}), [campo]: originaleCampo },
            modifiche: { ...(esistente?.modifiche || {}), [campo]: valore },
            nota_generale: esistente?.nota_generale || '',
            stato: esistente?.stato || 'bozza', source_version: DATA_SOURCE
        }});
        statoRev.revisioni.set(chiaveRevisione(dati.revision.uda_key, dati.revision.author_name), dati.revision);
        aggiornaContatore();
        aggiornaAzioniSchede();
        return dati.revision;
    }
};

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
