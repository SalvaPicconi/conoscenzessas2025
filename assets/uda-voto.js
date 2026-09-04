// Votazione per la scelta delle UDA da attivare.
//
// Un docente vale un voto: non ci sono punteggi, vince chi ne raccoglie di più.
// Ogni docente dispone di due voti per anno di corso, tanti quante sono le UDA
// da scegliere, e li può spostare quando vuole togliendone uno.
//
// La classifica è consultiva. Diventa la scelta ufficiale dell'anno solo quando
// chi ha i permessi di gestione la conferma, e da quel momento la scheda porta
// il contrassegno anche a scheda chiusa.
//
// Le UDA FSL restano fuori: sono già una per anno e area di tirocinio, non c'è
// nulla da mettere in concorrenza.

const GENERE = document.documentElement.dataset.udaKind === 'trasversale' ? 'trasversale' : 'asse';
const NOME_GENERE = GENERE === 'trasversale' ? 'trasversali' : 'd’asse';
const VOTI_PER_DOCENTE = 2;

const statoVoto = { voti: [], scelte: [], caricato: false, uda: new Map(), messaggio: null };

document.addEventListener('DOMContentLoaded', avviaVotazione);
document.addEventListener('curricolo:uda-rendered', () => { disegnaSchede(); disegnaPannello(); });
document.addEventListener('curricolo:uda-sessione', sincronizza);

async function avviaVotazione() {
    const fonte = document.documentElement.dataset.udaSource || 'data-uda.json';
    try {
        const risposta = await fetch(fonte, { cache: 'no-store' });
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        const dati = await risposta.json();
        statoVoto.uda = new Map(dati.uda.map(uda => [String(uda.id), uda]));
    } catch (errore) {
        console.error('Votazione UDA non disponibile:', errore);
    }
    sincronizza();
}

// I voti si leggono solo a sessione attiva: l'elenco richiede il token.
async function sincronizza() {
    const docente = window.CurricoloRevisione?.docente || '';
    if (!docente) {
        Object.assign(statoVoto, { voti: [], scelte: [], caricato: false });
        return aggiornaTutto();
    }
    if (statoVoto.caricato) return aggiornaTutto();
    await caricaVoti();
}

async function caricaVoti() {
    try {
        const dati = await window.CurricoloRevisione.api('votes');
        statoVoto.voti = dati.votes || [];
        statoVoto.scelte = dati.choices || [];
        statoVoto.caricato = true;
    } catch (errore) {
        console.error('Impossibile caricare i voti:', errore);
        statoVoto.caricato = false;
    }
    aggiornaTutto();
}

function aggiornaTutto() {
    disegnaSchede();
    disegnaPannello();
    notificaAltezzaVoto();
}

function votiDi(chiave) {
    return statoVoto.voti.filter(voce => String(voce.uda_key) === String(chiave));
}

function votiSpesi(anno) {
    const docente = window.CurricoloRevisione?.docente || '';
    return statoVoto.voti.filter(voce => voce.author_name === docente && voce.anno === anno && voce.genere === GENERE);
}

function sceltaDi(anno) {
    return statoVoto.scelte.find(voce => voce.anno === anno && voce.genere === GENERE)?.uda_keys || [];
}

// Classifica di un anno: più voti prima, a parità l'identificativo dell'UDA,
// così l'ordine non cambia da un caricamento all'altro.
function classifica(anno) {
    return [...statoVoto.uda.values()]
        .filter(uda => Number(uda.anno) === anno)
        .map(uda => ({ uda, voti: votiDi(uda.id) }))
        .sort((a, b) => b.voti.length - a.voti.length || String(a.uda.id).localeCompare(String(b.uda.id), 'it', { numeric: true }));
}

function disegnaSchede() {
    const docente = window.CurricoloRevisione?.docente || '';
    document.querySelectorAll('[data-uda-voto-slot]').forEach(slot => {
        const chiave = slot.dataset.udaVotoSlot;
        const uda = statoVoto.uda.get(chiave);
        slot.replaceChildren();
        if (!uda) return;
        const anno = Number(uda.anno);
        const voti = votiDi(chiave);
        const scelta = sceltaDi(anno).includes(chiave);
        marcaTestata(slot, voti.length, scelta);
        // Niente pulsanti finché il server non ha risposto: se le tabelle non
        // sono ancora state create, o la funzione non è aggiornata, la
        // votazione semplicemente non compare invece di fallire sotto le mani.
        if (!docente || !statoVoto.caricato) return;
        slot.appendChild(creaRiquadroVoto(chiave, anno, voti, docente));
    });
}

// Contrassegno nell'intestazione, accanto alle altre pillole: il numero di voti
// e, quando c'è, la scelta confermata si vedono a scheda chiusa.
function marcaTestata(slot, quantita, scelta) {
    const scheda = slot.closest('[data-uda-revisione-key]');
    const testata = scheda?.querySelector('.uda-acc-header');
    if (!testata) return;
    testata.querySelectorAll('[data-uda-voto-pill]').forEach(nodo => nodo.remove());
    const contenitore = testata.querySelector('.uda-acc-pills');
    if (!contenitore) return;
    if (scelta) contenitore.appendChild(creaPillola('✅ UDA scelta', 'pill-scelta'));
    if (quantita) contenitore.appendChild(creaPillola(`🗳 ${quantita} ${quantita === 1 ? 'voto' : 'voti'}`, 'pill-voti'));
}

function creaPillola(testo, classe) {
    const pillola = document.createElement('span');
    pillola.className = `pill ${classe}`;
    pillola.dataset.udaVotoPill = 'true';
    pillola.textContent = testo;
    return pillola;
}

function creaRiquadroVoto(chiave, anno, voti, docente) {
    const box = document.createElement('section');
    box.className = 'uda-voto-box';
    const mio = voti.some(voce => voce.author_name === docente);
    const spesi = votiSpesi(anno);
    const esauriti = !mio && spesi.length >= VOTI_PER_DOCENTE;

    const titolo = document.createElement('h4');
    titolo.textContent = 'Scelta delle UDA da attivare';
    const spiegazione = document.createElement('p');
    spiegazione.className = 'uda-voto-testo';
    spiegazione.textContent = esauriti
        ? `Hai già usato i tuoi ${VOTI_PER_DOCENTE} voti di ${anno}ª su ${spesi.map(voce => voce.uda_key).join(' e ')}. Togli un voto per spostarlo qui.`
        : `Hai ${VOTI_PER_DOCENTE - spesi.length + (mio ? 1 : 0)} ${VOTI_PER_DOCENTE - spesi.length + (mio ? 1 : 0) === 1 ? 'voto disponibile' : 'voti disponibili'} fra le UDA ${NOME_GENERE} di ${anno}ª.`;

    const azioni = document.createElement('div');
    azioni.className = 'uda-voto-azioni';
    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = mio ? 'uda-revisione-secondary' : 'uda-revisione-primary';
    bottone.textContent = mio ? 'Togli il mio voto' : 'Vota questa UDA';
    bottone.disabled = esauriti;
    bottone.addEventListener('click', () => vota(chiave, anno, mio, bottone));
    azioni.appendChild(bottone);

    if (voti.length) {
        const chi = document.createElement('p');
        chi.className = 'uda-voto-elenco';
        chi.textContent = `Hanno votato: ${voti.map(voce => voce.author_name).join(', ')}.`;
        box.append(titolo, spiegazione, azioni, chi);
    } else {
        box.append(titolo, spiegazione, azioni);
    }
    if (statoVoto.messaggio?.chiave === chiave) {
        const esito = document.createElement('p');
        esito.className = 'uda-voto-messaggio';
        esito.dataset.tipo = statoVoto.messaggio.tipo;
        esito.setAttribute('role', 'status');
        esito.textContent = statoVoto.messaggio.testo;
        box.appendChild(esito);
        statoVoto.messaggio = null;
    }
    return box;
}

async function vota(chiave, anno, rimuovi, bottone) {
    bottone.disabled = true;
    try {
        const dati = await window.CurricoloRevisione.api('vote', { uda_key: chiave, anno, genere: GENERE, rimuovi });
        statoVoto.voti = dati.votes || [];
        statoVoto.scelte = dati.choices || [];
    } catch (errore) {
        statoVoto.messaggio = { chiave, testo: errore.message || 'Voto non registrato.', tipo: 'errore' };
    }
    aggiornaTutto();
}

// Pannello con la classifica di ogni anno, sopra l'elenco delle schede.
function disegnaPannello() {
    const contenitore = document.getElementById('uda-votazione');
    if (!contenitore) return;
    contenitore.replaceChildren();
    const docente = window.CurricoloRevisione?.docente || '';
    if (!docente || !statoVoto.caricato) return;

    const box = document.createElement('section');
    box.className = 'uda-voto-pannello';
    const titolo = document.createElement('h2');
    titolo.textContent = `Scelta delle UDA ${NOME_GENERE} da attivare`;
    const intro = document.createElement('p');
    intro.className = 'uda-voto-testo';
    intro.textContent = `Ogni docente ha ${VOTI_PER_DOCENTE} voti per anno di corso. La classifica è consultiva: la scelta diventa ufficiale quando viene confermata.`;
    box.append(titolo, intro);

    const anni = [...new Set([...statoVoto.uda.values()].map(uda => Number(uda.anno)))].sort();
    anni.forEach(anno => box.appendChild(creaBloccoAnno(anno)));
    contenitore.appendChild(box);
}

function creaBloccoAnno(anno) {
    const blocco = document.createElement('article');
    blocco.className = 'uda-voto-anno';
    const ordinate = classifica(anno);
    const confermate = sceltaDi(anno);
    const votate = ordinate.filter(voce => voce.voti.length);

    const testata = document.createElement('div');
    testata.className = 'uda-voto-anno-testa';
    const titolo = document.createElement('h3');
    titolo.textContent = `${anno}ª — ${ordinate.length} UDA ${NOME_GENERE}`;
    testata.appendChild(titolo);

    // Quando le UDA disponibili sono già quante se ne devono scegliere, non c'è
    // gara: si dice e basta, invece di far votare a vuoto.
    if (ordinate.length <= VOTI_PER_DOCENTE) {
        const nota = document.createElement('p');
        nota.className = 'uda-voto-testo';
        nota.textContent = `Sono ${ordinate.length}, cioè esattamente quante se ne devono attivare: entrano tutte, non serve votare.`;
        blocco.append(testata, nota);
        return blocco;
    }

    if (window.CurricoloRevisione?.puoGestire) {
        const conferma = document.createElement('button');
        conferma.type = 'button';
        conferma.className = 'uda-revisione-primary';
        conferma.textContent = confermate.length ? 'Aggiorna la scelta' : 'Conferma le prime due';
        conferma.disabled = votate.length < VOTI_PER_DOCENTE;
        conferma.title = votate.length < VOTI_PER_DOCENTE
            ? 'Servono almeno due UDA votate per confermare la scelta.'
            : '';
        conferma.addEventListener('click', () => confermaScelta(anno, ordinate.slice(0, VOTI_PER_DOCENTE).map(voce => voce.uda.id), conferma));
        testata.appendChild(conferma);
    }
    blocco.appendChild(testata);

    const elenco = document.createElement('ol');
    elenco.className = 'uda-voto-classifica';
    ordinate.forEach((voce, posizione) => {
        const riga = document.createElement('li');
        if (posizione < VOTI_PER_DOCENTE && voce.voti.length) riga.dataset.inTesta = 'true';
        if (confermate.includes(String(voce.uda.id))) riga.dataset.scelta = 'true';
        const nome = document.createElement('span');
        nome.className = 'uda-voto-nome';
        nome.textContent = `${voce.uda.id} · ${voce.uda.titolo}`;
        const conteggio = document.createElement('span');
        conteggio.className = 'uda-voto-conteggio';
        conteggio.textContent = voce.voti.length
            ? `${voce.voti.length} ${voce.voti.length === 1 ? 'voto' : 'voti'}`
            : 'nessun voto';
        riga.append(nome, conteggio);
        elenco.appendChild(riga);
    });
    blocco.appendChild(elenco);

    const pareggio = ordinate.length > VOTI_PER_DOCENTE
        && ordinate[VOTI_PER_DOCENTE - 1].voti.length
        && ordinate[VOTI_PER_DOCENTE - 1].voti.length === ordinate[VOTI_PER_DOCENTE].voti.length;
    if (pareggio) {
        const avviso = document.createElement('p');
        avviso.className = 'uda-voto-avviso';
        avviso.textContent = 'Pareggio al secondo posto: la classifica da sola non decide, serve una scelta esplicita del consiglio.';
        blocco.appendChild(avviso);
    }

    if (confermate.length) {
        const voce = statoVoto.scelte.find(riga => riga.anno === anno && riga.genere === GENERE);
        const nota = document.createElement('p');
        nota.className = 'uda-voto-confermata';
        const quando = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(voce.updated_at));
        nota.textContent = `Scelta confermata da ${voce.confermata_da} il ${quando}: ${confermate.join(' e ')}.`;
        blocco.appendChild(nota);
    }
    return blocco;
}

async function confermaScelta(anno, chiavi, bottone) {
    bottone.disabled = true;
    try {
        const dati = await window.CurricoloRevisione.api('choice', { anno, genere: GENERE, uda_keys: chiavi });
        statoVoto.voti = dati.votes || [];
        statoVoto.scelte = dati.choices || [];
    } catch (errore) {
        console.error('Scelta non registrata:', errore);
    }
    aggiornaTutto();
}

function notificaAltezzaVoto() {
    setTimeout(() => {
        if (window.parent === window) return;
        const altezza = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        window.parent.postMessage({ type: 'iframeContentHeight', height: altezza }, window.location.origin);
    }, 20);
}
