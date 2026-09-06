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

const stato = { token: '', docente: '', schede: new Map(), votazione: null, valutazioni: new Map(), risultati: new Map() };
const ui = {};

document.addEventListener('DOMContentLoaded', inizializza);

async function inizializza() {
    raccogliUi();
    collegaEventi();
    DOCENTI.forEach(nome => {
        const opzione = document.createElement('option');
        opzione.value = nome;
        opzione.textContent = nome;
        ui.docente.appendChild(opzione);
    });
    if (await caricaSchede()) await ripristinaSessione();
    notificaAltezza();
}

function raccogliUi() {
    const id = nome => document.getElementById(nome);
    Object.assign(ui, {
        apri: id('voto-apri'), auth: id('voto-auth'), docente: id('voto-docente'),
        password: id('voto-password'), authMessaggio: id('voto-auth-messaggio'),
        annulla: id('voto-annulla'), area: id('voto-area'), identita: id('voto-identita'),
        esci: id('voto-esci'), stato: id('voto-stato'), form: id('voto-form'),
        elenco: id('voto-elenco'), messaggio: id('voto-messaggio'), salva: id('voto-salva'),
        avviso: id('voto-avviso'), riprova: id('voto-riprova')
    });
    ui.intro = document.querySelector('.voto-intro');
    ui.salvataggio = document.querySelector('.voto-salvataggio');
    ui.titoloArea = id('voto-area-titolo');
}

function collegaEventi() {
    ui.apri.addEventListener('click', apriAccesso);
    ui.annulla.addEventListener('click', () => mostraAccesso(false));
    ui.auth.addEventListener('submit', accedi);
    ui.form.addEventListener('submit', salvaValutazioni);
    ui.esci.addEventListener('click', esci);
    ui.riprova.addEventListener('click', async () => {
        ui.riprova.disabled = true;
        try {
            if (await caricaSchede()) await ripristinaSessione();
        } finally { ui.riprova.disabled = false; }
    });
}

async function caricaSchede() {
    ui.apri.disabled = true;
    try {
        const [asse, trasversali] = await Promise.all([
            fetch('data-uda.json', { cache: 'no-store' }).then(verificaRisposta).then(r => r.json()),
            fetch('data-uda-trasversali.json', { cache: 'no-store' }).then(verificaRisposta).then(r => r.json())
        ]);
        if (!Array.isArray(asse.uda) || !Array.isArray(trasversali.uda)) throw new Error('Catalogo non valido.');
        stato.schede.clear();
        asse.uda.forEach(uda => stato.schede.set(`asse:${uda.id}`, { ...uda, genere: 'asse' }));
        trasversali.uda.forEach(uda => stato.schede.set(`trasversale:${uda.id}`, { ...uda, genere: 'trasversale' }));
        messaggio(ui.avviso, '');
        ui.riprova.hidden = true;
        ui.apri.disabled = false;
        return true;
    } catch (errore) {
        messaggio(ui.avviso, 'Le schede UDA non sono disponibili. Riprova il caricamento.', 'errore');
        ui.riprova.hidden = false;
        return false;
    }
}

function verificaRisposta(risposta) {
    if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
    return risposta;
}

async function ripristinaSessione() {
    const token = sessionStorage.getItem(SESSION_KEY) || '';
    const docente = sessionStorage.getItem(IDENTITY_KEY) || '';
    if (!token || !DOCENTI.includes(docente)) return;
    stato.token = token;
    stato.docente = docente;
    try {
        const dati = await api('session');
        if (dati.author_name !== docente) {
            richiediNuovoAccesso('Sessione non valida. Accedi di nuovo.');
            return;
        }
        await attivaVotazione();
    } catch (errore) {
        if (errore.status !== 401) {
            messaggio(ui.avviso, 'Impossibile verificare la sessione. Riprova il caricamento.', 'errore');
            ui.riprova.hidden = false;
        }
    }
}

function apriAccesso() {
    if (stato.token) return attivaVotazione();
    mostraAccesso(true);
}

function mostraAccesso(visibile) {
    ui.auth.hidden = !visibile;
    messaggio(ui.authMessaggio, '');
    if (visibile) setTimeout(() => ui.docente.focus(), 30);
    notificaAltezza();
}

async function accedi(evento) {
    evento.preventDefault();
    if (!DOCENTI.includes(ui.docente.value)) return messaggio(ui.authMessaggio, 'Scegli il tuo nome.', 'errore');
    const bottone = ui.auth.querySelector('button[type="submit"]');
    bottone.disabled = true;
    messaggio(ui.authMessaggio, 'Verifica delle credenziali…');
    try {
        const dati = await api('login', { author_name: ui.docente.value, password: ui.password.value }, true);
        stato.token = dati.token;
        stato.docente = dati.author_name;
        sessionStorage.setItem(SESSION_KEY, stato.token);
        sessionStorage.setItem(IDENTITY_KEY, stato.docente);
        ui.password.value = '';
        mostraAccesso(false);
        await attivaVotazione();
    } catch (errore) {
        messaggio(ui.authMessaggio, errore.message || 'Accesso non riuscito.', 'errore');
    } finally {
        bottone.disabled = false;
    }
}

async function attivaVotazione() {
    ui.apri.hidden = true;
    ui.intro.hidden = true;
    ui.area.hidden = false;
    ui.identita.textContent = stato.docente;
    ui.form.hidden = true;
    ui.stato.dataset.tipo = 'attesa';
    ui.stato.textContent = 'Caricamento della votazione…';
    try {
        assorbi(await api('ratings'));
        disegna();
    } catch (errore) {
        if (errore.status === 401) return;
        ui.stato.dataset.tipo = 'attesa';
        ui.stato.textContent = errore.message || 'Votazione non disponibile.';
        ui.riprova.hidden = false;
    }
    notificaAltezza();
}

function assorbi(dati) {
    if (!dati || !Object.hasOwn(dati, 'ballot') ||
        !Array.isArray(dati.my_ratings) || !Array.isArray(dati.results)) {
        throw new Error('Risposta della votazione non valida. Riprova il caricamento.');
    }
    if (dati.ballot && (!Array.isArray(dati.ballot.rosa) ||
        new Set(dati.ballot.rosa).size !== dati.ballot.rosa.length ||
        dati.ballot.rosa.some(ref => !stato.schede.has(ref)))) {
        throw new Error('La rosa contiene UDA non disponibili nel catalogo. Occorre verificare la configurazione.');
    }
    stato.votazione = dati.ballot || null;
    stato.valutazioni = new Map((dati.my_ratings || []).map(voce => [String(voce.uda_ref), Number(voce.valutazione)]));
    stato.risultati = new Map((dati.results || []).map(voce => [String(voce.uda_ref), voce]));
}

function disegna() {
    ui.elenco.replaceChildren();
    messaggio(ui.messaggio, '');
    const rosa = Array.isArray(stato.votazione?.rosa) ? stato.votazione.rosa : [];
    const aperta = stato.votazione?.stato === 'aperta';
    const chiusa = stato.votazione?.stato === 'chiusa';
    ui.salvataggio.hidden = chiusa;
    ui.titoloArea.textContent = chiusa ? 'Risultati della votazione' : 'Valuta ogni proposta da 1 a 5 stelle';
    if (!rosa.length) {
        ui.form.hidden = true;
        ui.stato.dataset.tipo = 'attesa';
        ui.stato.textContent = 'La rosa delle UDA da votare non è stata ancora definita collegialmente.';
        return;
    }
    if (!aperta && !chiusa) {
        ui.form.hidden = true;
        ui.stato.dataset.tipo = 'attesa';
        ui.stato.textContent = 'La rosa è stata definita, ma la votazione non è ancora aperta.';
        return;
    }
    ui.stato.removeAttribute('data-tipo');
    ui.stato.textContent = chiusa
        ? 'Votazione conclusa. Sono visibili i risultati complessivi.'
        : `${rosa.length} UDA da valutare. Assegna da 1 a 5 stelle a ciascuna proposta e salva una sola volta.`;
    rosa.forEach(riferimento => ui.elenco.appendChild(creaScheda(riferimento, chiusa)));
    ui.form.hidden = false;
    ui.salva.hidden = chiusa;
}

function creaScheda(riferimento, chiusa) {
    const uda = stato.schede.get(riferimento);
    const scheda = document.createElement('article');
    scheda.className = 'voto-scheda';
    const testata = document.createElement('div');
    testata.className = 'voto-scheda-head';
    const titolo = document.createElement('h3');
    titolo.textContent = uda ? `${uda.id} · ${uda.titolo}` : riferimento;
    const meta = document.createElement('span');
    meta.className = 'voto-meta';
    meta.textContent = uda ? `${uda.genere === 'trasversale' ? 'Trasversale' : 'D’asse'} · ${uda.anno}ª` : 'UDA';
    testata.append(titolo, meta);
    scheda.appendChild(testata);
    if (uda?.traguardo) {
        const descrizione = document.createElement('p');
        descrizione.className = 'voto-descrizione';
        descrizione.textContent = uda.traguardo;
        scheda.appendChild(descrizione);
    }
    if (uda?.compito || uda?.prodotto) scheda.appendChild(creaProva(uda));
    scheda.appendChild(creaStelle(riferimento, chiusa));
    if (chiusa) {
        const risultato = stato.risultati.get(riferimento);
        const riga = document.createElement('p');
        riga.className = 'voto-risultato';
        riga.textContent = risultato?.conteggio
            ? `Media ${Number(risultato.media).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}/5 · ${risultato.conteggio} valutazioni`
            : 'Nessuna valutazione ricevuta';
        scheda.appendChild(riga);
    }
    return scheda;
}

function creaProva(uda) {
    const dettaglio = document.createElement('details');
    dettaglio.className = 'voto-prova';
    const sommario = document.createElement('summary');
    sommario.textContent = 'Prova esperta';
    dettaglio.appendChild(sommario);
    const testo = [uda.compito, uda.prodotto && uda.prodotto !== uda.compito ? `Prodotto atteso: ${uda.prodotto}` : '']
        .filter(Boolean).join(' ');
    const corpo = document.createElement('p');
    corpo.textContent = testo;
    dettaglio.appendChild(corpo);
    return dettaglio;
}

function creaStelle(riferimento, chiusa) {
    const gruppo = document.createElement('fieldset');
    gruppo.className = 'voto-stelle';
    gruppo.dataset.disabled = chiusa ? 'true' : 'false';
    const legenda = document.createElement('legend');
    legenda.textContent = chiusa ? 'La tua valutazione' : 'La tua valutazione, da 1 a 5';
    gruppo.appendChild(legenda);
    const selezionata = stato.valutazioni.get(riferimento) || 0;
    for (let valore = 5; valore >= 1; valore -= 1) {
        const input = document.createElement('input');
        const id = `stella-${riferimento.replace(/[^a-zA-Z0-9]/g, '-')}-${valore}`;
        input.type = 'radio';
        input.name = `valutazione-${riferimento}`;
        input.id = id;
        input.value = String(valore);
        input.checked = selezionata === valore;
        input.disabled = chiusa;
        const etichetta = document.createElement('label');
        etichetta.htmlFor = id;
        etichetta.textContent = '★';
        etichetta.title = `${valore} ${valore === 1 ? 'stella' : 'stelle'}`;
        etichetta.setAttribute('aria-label', etichetta.title);
        gruppo.append(input, etichetta);
    }
    return gruppo;
}

async function salvaValutazioni(evento) {
    evento.preventDefault();
    const rosa = stato.votazione?.rosa || [];
    const valutazioni = [];
    for (const riferimento of rosa) {
        const scelta = [...document.getElementsByName(`valutazione-${riferimento}`)].find(input => input.checked);
        if (!scelta) return messaggio(ui.messaggio, 'Assegna le stelle a tutte le UDA prima di salvare.', 'errore');
        valutazioni.push({ uda_ref: riferimento, valutazione: Number(scelta.value) });
    }
    ui.salva.disabled = true;
    ui.esci.disabled = true;
    ui.form.querySelectorAll('input').forEach(input => { input.disabled = true; });
    messaggio(ui.messaggio, 'Salvataggio…');
    try {
        assorbi(await api('rate', { ratings: valutazioni }));
        disegna();
        messaggio(ui.messaggio, 'Valutazioni salvate. Puoi modificarle e salvarle di nuovo finché la votazione resta aperta.', 'successo');
    } catch (errore) {
        messaggio(ui.messaggio, errore.message || 'Valutazioni non salvate.', 'errore');
    } finally {
        ui.salva.disabled = false;
        ui.esci.disabled = false;
        ui.form.querySelectorAll('input').forEach(input => { input.disabled = stato.votazione?.stato === 'chiusa'; });
        notificaAltezza();
    }
}

async function esci() {
    ui.esci.disabled = true;
    try { await api('logout'); } catch { /* la sessione locale viene comunque rimossa */ }
    cancellaSessione();
    mostraAccesso(false);
    ui.area.hidden = true;
    ui.apri.hidden = false;
    ui.intro.hidden = false;
    ui.esci.disabled = false;
    notificaAltezza();
}

function cancellaSessione() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(IDENTITY_KEY);
    Object.assign(stato, { token: '', docente: '', votazione: null, valutazioni: new Map(), risultati: new Map() });
    ui.elenco.replaceChildren();
}

function richiediNuovoAccesso(testo) {
    cancellaSessione();
    ui.area.hidden = true;
    ui.apri.hidden = false;
    ui.intro.hidden = false;
    mostraAccesso(true);
    messaggio(ui.authMessaggio, testo, 'errore');
}

async function api(action, payload = {}, pubblica = false) {
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
    if (!pubblica && stato.token) headers['X-Curricolo-Session'] = stato.token;
    const risposta = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action, ...payload }) });
    const dati = await risposta.json().catch(() => ({}));
    if (!risposta.ok) {
        const errore = new Error(dati.error || 'Servizio temporaneamente non disponibile.');
        errore.status = risposta.status;
        if (risposta.status === 401 && !pubblica) richiediNuovoAccesso(errore.message);
        throw errore;
    }
    return dati;
}

function messaggio(nodo, testo, tipo = '') {
    nodo.textContent = testo;
    if (tipo) nodo.dataset.tipo = tipo;
    else nodo.removeAttribute('data-tipo');
}

function notificaAltezza() {
    setTimeout(() => {
        if (window.parent === window) return;
        const altezza = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        window.parent.postMessage({ type: 'iframeContentHeight', height: altezza }, window.location.origin);
    }, 20);
}
