// Votazione per la scelta delle UDA da attivare.
//
// Si vota in due tempi. Prima chi ha i permessi di gestione mette al voto una
// rosa di UDA, dopo la consultazione collegiale: votare su dieci schede che
// nessuno ha discusso non produce una scelta. Poi i docenti votano dentro la
// rosa, un voto a testa per UDA e due voti per anno di corso, spostabili
// togliendone uno. Alla fine la scelta viene confermata.
//
// Le UDA FSL restano fuori: sono già una per anno e area di tirocinio, non c'è
// nulla da mettere in concorrenza.

const GENERE = document.documentElement.dataset.udaKind === 'trasversale' ? 'trasversale' : 'asse';
const NOME_GENERE = GENERE === 'trasversale' ? 'trasversali' : 'd’asse';
const VOTI_PER_DOCENTE = 2;

const statoVoto = { voti: [], votazioni: [], caricato: false, uda: new Map(), messaggio: null, rosaInCorso: new Map() };
const uiVoto = {};

document.addEventListener('DOMContentLoaded', avviaVotazione);
document.addEventListener('curricolo:uda-rendered', () => { disegnaSchede(); disegnaPannello(); });
document.addEventListener('curricolo:uda-sessione', sincronizza);

async function avviaVotazione() {
    uiVoto.accesso = document.getElementById('uda-voto-accesso');
    uiVoto.apri = document.getElementById('uda-voto-apri-accesso');
    uiVoto.messaggio = document.getElementById('uda-voto-accesso-messaggio');
    uiVoto.apri?.addEventListener('click', gestisciAccessoVoto);
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

function inModalitaVoto() {
    return window.CurricoloRevisione?.modalita === 'voto';
}

async function gestisciAccessoVoto() {
    if (!window.CurricoloRevisione) return;
    uiVoto.apri.disabled = true;
    try {
        if (inModalitaVoto()) await window.CurricoloRevisione.esci();
        else await window.CurricoloRevisione.apriAccesso('voto');
    } finally {
        uiVoto.apri.disabled = false;
        aggiornaAccessoVoto();
    }
}

function aggiornaAccessoVoto() {
    if (!uiVoto.apri) return;
    const attiva = inModalitaVoto() && Boolean(window.CurricoloRevisione?.docente);
    uiVoto.accesso?.classList.toggle('is-active', attiva);
    uiVoto.apri.textContent = attiva ? 'Esci dalla votazione' : 'Vota le preferenze per le UDA';
    uiVoto.apri.className = attiva ? 'uda-revisione-secondary' : 'uda-voto-primary';
    if (uiVoto.messaggio) uiVoto.messaggio.textContent = attiva
        ? `${window.CurricoloRevisione.docente} · spazio di votazione attivo`
        : '';
}

// I voti si leggono solo a sessione attiva: l'elenco richiede il token.
async function sincronizza() {
    aggiornaAccessoVoto();
    const docente = window.CurricoloRevisione?.docente || '';
    if (!docente || !inModalitaVoto()) {
        Object.assign(statoVoto, { voti: [], votazioni: [], caricato: false });
        return aggiornaTutto();
    }
    if (statoVoto.caricato) return aggiornaTutto();
    await caricaVoti();
}

async function caricaVoti() {
    try {
        assorbi(await window.CurricoloRevisione.api('votes'));
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

function assorbi(dati) {
    statoVoto.voti = dati.votes || [];
    statoVoto.votazioni = dati.ballots || [];
}

function votazioneDi(anno) {
    return statoVoto.votazioni.find(voce => voce.anno === anno && voce.genere === GENERE) || null;
}

function rosaDi(anno) { return votazioneDi(anno)?.rosa || []; }
function sceltaDi(anno) { return votazioneDi(anno)?.scelta || []; }

function udaDellAnno(anno) {
    return [...statoVoto.uda.values()].filter(uda => Number(uda.anno) === anno);
}

// Classifica di un anno: solo le UDA messe al voto, più voti prima, a parità
// l'identificativo, così l'ordine non cambia da un caricamento all'altro.
function classifica(anno) {
    const rosa = rosaDi(anno);
    return udaDellAnno(anno)
        .filter(uda => rosa.includes(String(uda.id)))
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
        if (!docente || !inModalitaVoto() || !statoVoto.caricato) return;
        // Si vota solo dentro la rosa messa al voto: fuori non c'è nulla da
        // premere, e la scheda non porta comandi che il server rifiuterebbe.
        if (!rosaDi(anno).includes(chiave)) return;
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

function creaPillola(contenuto, classe) {
    const pillola = document.createElement('span');
    pillola.className = `pill ${classe}`;
    pillola.dataset.udaVotoPill = 'true';
    pillola.textContent = contenuto;
    return pillola;
}

function creaRiquadroVoto(chiave, anno, voti, docente) {
    const box = document.createElement('section');
    box.className = 'uda-voto-box';
    const mio = voti.some(voce => voce.author_name === docente);
    const spesi = votiSpesi(anno);
    const conclusa = sceltaDi(anno).length > 0;
    const esauriti = !mio && spesi.length >= VOTI_PER_DOCENTE;

    const titolo = document.createElement('h4');
    titolo.textContent = 'Scelta delle UDA da attivare';
    const spiegazione = document.createElement('p');
    spiegazione.className = 'uda-voto-testo';
    spiegazione.textContent = conclusa
        ? `La scelta di ${anno}ª è già stata confermata: la votazione è chiusa.`
        : esauriti
        ? `Hai già usato i tuoi ${VOTI_PER_DOCENTE} voti di ${anno}ª su ${spesi.map(voce => voce.uda_key).join(' e ')}. Togli un voto per spostarlo qui.`
        : `Hai ${VOTI_PER_DOCENTE - spesi.length + (mio ? 1 : 0)} ${VOTI_PER_DOCENTE - spesi.length + (mio ? 1 : 0) === 1 ? 'voto disponibile' : 'voti disponibili'} fra le UDA ${NOME_GENERE} di ${anno}ª.`;

    const azioni = document.createElement('div');
    azioni.className = 'uda-voto-azioni';
    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = mio ? 'uda-revisione-secondary' : 'uda-revisione-primary';
    bottone.textContent = mio ? 'Togli il mio voto' : 'Vota questa UDA';
    bottone.disabled = esauriti || conclusa;
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
        assorbi(await window.CurricoloRevisione.api('vote', { uda_key: chiave, anno, genere: GENERE, rimuovi }));
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
    if (!docente || !inModalitaVoto() || !statoVoto.caricato) return;

    const box = document.createElement('section');
    box.className = 'uda-voto-pannello';
    const titolo = document.createElement('h2');
    titolo.textContent = `Scelta delle UDA ${NOME_GENERE} da attivare`;
    const intro = document.createElement('p');
    intro.className = 'uda-voto-testo';
    intro.textContent = `Si vota in due tempi: prima vengono messe al voto alcune UDA, dopo la consultazione, poi ogni docente esprime ${VOTI_PER_DOCENTE} voti per anno di corso. La classifica è consultiva finché la scelta non viene confermata.`;
    box.append(titolo, intro);

    const anni = [...new Set([...statoVoto.uda.values()].map(uda => Number(uda.anno)))].sort();
    anni.forEach(anno => box.appendChild(creaBloccoAnno(anno)));
    contenitore.appendChild(box);
}

function creaBloccoAnno(anno) {
    const blocco = document.createElement('article');
    blocco.className = 'uda-voto-anno';
    const gestisco = Boolean(window.CurricoloRevisione?.puoGestire);
    const tutte = udaDellAnno(anno);
    const rosa = rosaDi(anno);
    const scelta = sceltaDi(anno);

    const testata = document.createElement('div');
    testata.className = 'uda-voto-anno-testa';
    const titolo = document.createElement('h3');
    titolo.textContent = `${anno}ª — ${tutte.length} UDA ${NOME_GENERE}`;
    testata.appendChild(titolo);
    blocco.appendChild(testata);

    // Quando le UDA disponibili sono già quante se ne devono attivare non c'è
    // gara: si dice e basta, invece di far aprire una votazione a vuoto.
    if (tutte.length <= VOTI_PER_DOCENTE) {
        blocco.appendChild(testo(`Sono ${tutte.length}, cioè esattamente quante se ne devono attivare: entrano tutte, non serve votare.`));
        return blocco;
    }

    if (!rosa.length) {
        blocco.dataset.fase = 'da-aprire';
        testata.appendChild(etichettaFase('Votazione non aperta'));
        blocco.appendChild(testo(gestisco
            ? `Scegli le UDA da mettere al voto, almeno ${VOTI_PER_DOCENTE + 1}, e apri la votazione. Fino ad allora i docenti non vedono nulla da votare.`
            : 'La votazione non è ancora aperta: verranno messe al voto alcune UDA dopo la consultazione.'));
        if (gestisco) blocco.appendChild(creaSelettoreRosa(anno, tutte, rosa));
        return blocco;
    }

    blocco.dataset.fase = scelta.length ? 'conclusa' : 'in-corso';
    testata.appendChild(etichettaFase(scelta.length ? 'Scelta confermata' : 'Votazione aperta'));
    const votazione = votazioneDi(anno);
    blocco.appendChild(testo(scelta.length
        ? `Votazione chiusa. Sono state messe al voto ${rosa.length} UDA.`
        : `Sono al voto ${rosa.length} UDA su ${tutte.length}, messe in votazione da ${votazione.aperta_da}. Ogni docente ha ${VOTI_PER_DOCENTE} voti.`));

    const ordinate = classifica(anno);
    const votate = ordinate.filter(voce => voce.voti.length);
    const elenco = document.createElement('ol');
    elenco.className = 'uda-voto-classifica';
    ordinate.forEach((voce, posizione) => {
        const riga = document.createElement('li');
        if (posizione < VOTI_PER_DOCENTE && voce.voti.length) riga.dataset.inTesta = 'true';
        if (scelta.includes(String(voce.uda.id))) riga.dataset.scelta = 'true';
        const nome = document.createElement('div');
        nome.className = 'uda-voto-nome';
        const intestazione = document.createElement('strong');
        intestazione.textContent = `${voce.uda.id} · ${voce.uda.titolo}`;
        nome.append(intestazione, ...descrizione(voce.uda));
        const conteggio = document.createElement('span');
        conteggio.className = 'uda-voto-conteggio';
        conteggio.textContent = voce.voti.length
            ? `${voce.voti.length} ${voce.voti.length === 1 ? 'voto' : 'voti'}`
            : 'nessun voto';
        riga.append(nome, conteggio);
        elenco.appendChild(riga);
    });
    blocco.appendChild(elenco);

    const pareggio = !scelta.length && ordinate.length > VOTI_PER_DOCENTE
        && ordinate[VOTI_PER_DOCENTE - 1].voti.length
        && ordinate[VOTI_PER_DOCENTE - 1].voti.length === ordinate[VOTI_PER_DOCENTE].voti.length;
    if (pareggio) {
        const avviso = testo('Pareggio al secondo posto: prima della conferma il consiglio deve risolverlo spostando almeno un voto.');
        avviso.className = 'uda-voto-avviso';
        blocco.appendChild(avviso);
    }

    if (scelta.length) {
        const quando = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' })
            .format(new Date(votazione.confermata_il));
        const nota = testo(`Scelta confermata da ${votazione.confermata_da} il ${quando}: ${scelta.join(' e ')}.`);
        nota.className = 'uda-voto-confermata';
        blocco.appendChild(nota);
    }

    if (gestisco) {
        const azioni = document.createElement('div');
        azioni.className = 'uda-voto-azioni';
        if (!scelta.length) {
            const conferma = creaBottone(`Conferma le prime ${VOTI_PER_DOCENTE}`, 'uda-revisione-primary');
            conferma.disabled = votate.length < VOTI_PER_DOCENTE || pareggio;
            conferma.title = pareggio
                ? 'Prima di confermare occorre risolvere il pareggio al secondo posto.'
                : conferma.disabled ? `Servono almeno ${VOTI_PER_DOCENTE} UDA votate per confermare.` : '';
            conferma.addEventListener('click', () => confermaScelta(anno, ordinate.slice(0, VOTI_PER_DOCENTE).map(voce => String(voce.uda.id)), conferma));
            azioni.appendChild(conferma);
        }
        const cambia = creaBottone(scelta.length ? 'Riapri la votazione' : 'Cambia la rosa', 'uda-revisione-secondary');
        cambia.addEventListener('click', () => {
            statoVoto.rosaInCorso.set(anno, new Set(rosa));
            aggiornaTutto();
        });
        azioni.appendChild(cambia);
        blocco.appendChild(azioni);
        if (statoVoto.rosaInCorso.has(anno)) blocco.appendChild(creaSelettoreRosa(anno, tutte, rosa));
    }
    return blocco;
}

// Selettore della rosa, riservato a chi gestisce: si spuntano le UDA da mettere
// al voto e si apre la votazione.
function creaSelettoreRosa(anno, tutte, rosa) {
    const scelte = statoVoto.rosaInCorso.get(anno) || new Set(rosa);
    statoVoto.rosaInCorso.set(anno, scelte);

    const box = document.createElement('div');
    box.className = 'uda-voto-rosa';
    const elenco = document.createElement('div');
    elenco.className = 'uda-voto-rosa-elenco';
    tutte.forEach(uda => {
        const chiave = String(uda.id);
        const riga = document.createElement('div');
        riga.className = 'uda-voto-rosa-voce';
        const casella = document.createElement('input');
        casella.type = 'checkbox';
        casella.id = `rosa-${GENERE}-${anno}-${chiave.replace(/[^a-zA-Z0-9]/g, '-')}`;
        casella.checked = scelte.has(chiave);
        casella.addEventListener('change', () => {
            if (casella.checked) scelte.add(chiave); else scelte.delete(chiave);
            aggiornaConteggioRosa(box, anno);
        });
        const testoVoce = document.createElement('div');
        testoVoce.className = 'uda-voto-rosa-testo';
        const etichetta = document.createElement('label');
        etichetta.htmlFor = casella.id;
        etichetta.textContent = `${uda.id} · ${uda.titolo}`;
        testoVoce.append(etichetta, ...descrizione(uda));
        riga.append(casella, testoVoce);
        elenco.appendChild(riga);
    });
    box.appendChild(elenco);

    const azioni = document.createElement('div');
    azioni.className = 'uda-voto-azioni';
    const conteggio = document.createElement('p');
    conteggio.className = 'uda-voto-testo uda-voto-rosa-conteggio';
    const apri = creaBottone(rosa.length ? 'Aggiorna la rosa' : 'Apri la votazione', 'uda-revisione-primary');
    apri.addEventListener('click', () => apriVotazione(anno, [...scelte], apri));
    const annulla = creaBottone('Annulla', 'uda-revisione-secondary');
    annulla.addEventListener('click', () => { statoVoto.rosaInCorso.delete(anno); aggiornaTutto(); });
    azioni.append(apri, annulla, conteggio);
    box.appendChild(azioni);
    if (statoVoto.messaggio?.chiave === `rosa-${anno}`) {
        const esito = document.createElement('p');
        esito.className = 'uda-voto-messaggio';
        esito.dataset.tipo = statoVoto.messaggio.tipo;
        esito.setAttribute('role', 'status');
        esito.textContent = statoVoto.messaggio.testo;
        box.appendChild(esito);
        statoVoto.messaggio = null;
    }
    aggiornaConteggioRosa(box, anno);
    return box;
}

function aggiornaConteggioRosa(box, anno) {
    const scelte = statoVoto.rosaInCorso.get(anno) || new Set();
    const conteggio = box.querySelector('.uda-voto-rosa-conteggio');
    const apri = box.querySelector('.uda-revisione-primary');
    const troppePoche = scelte.size > 0 && scelte.size <= VOTI_PER_DOCENTE;
    conteggio.textContent = scelte.size === 0
        ? 'Nessuna UDA selezionata: la votazione resterà chiusa.'
        : troppePoche
        ? `Ne hai selezionate ${scelte.size} e se ne devono attivare ${VOTI_PER_DOCENTE}: non ci sarebbe nulla da scegliere. Selezionane almeno ${VOTI_PER_DOCENTE + 1}.`
        : `${scelte.size} UDA al voto.`;
    apri.disabled = troppePoche;
}

async function apriVotazione(anno, rosa, bottone) {
    bottone.disabled = true;
    try {
        assorbi(await window.CurricoloRevisione.api('ballot', { anno, genere: GENERE, rosa }));
        statoVoto.rosaInCorso.delete(anno);
    } catch (errore) {
        statoVoto.messaggio = { chiave: `rosa-${anno}`, testo: errore.message || 'Rosa non registrata.', tipo: 'errore' };
    }
    aggiornaTutto();
}

// Di cosa si tratta e come si verifica: senza queste due righe si voterebbe
// leggendo solo il titolo. La prova esperta sta in un blocco richiudibile, così
// l'elenco resta scorribile e chi vuole approfondire apre.
function descrizione(uda) {
    const nodi = [];
    if (uda.traguardo) {
        const traguardo = document.createElement('p');
        traguardo.className = 'uda-voto-descrizione';
        traguardo.textContent = uda.traguardo;
        nodi.push(traguardo);
    }
    const prova = uda.compito || '';
    // Nelle UDA d'asse compito e prodotto sono lo stesso testo: ripeterlo non
    // aggiunge nulla.
    const prodotto = uda.prodotto && uda.prodotto !== prova ? uda.prodotto : '';
    if (!prova && !prodotto) return nodi;
    const dettaglio = document.createElement('details');
    dettaglio.className = 'uda-voto-prova';
    const sommario = document.createElement('summary');
    sommario.textContent = 'Prova esperta';
    dettaglio.appendChild(sommario);
    if (prova) {
        const corpo = document.createElement('p');
        corpo.textContent = prova;
        dettaglio.appendChild(corpo);
    }
    if (prodotto) {
        const corpo = document.createElement('p');
        corpo.innerHTML = '';
        const titolo = document.createElement('strong');
        titolo.textContent = 'Prodotto atteso: ';
        corpo.append(titolo, document.createTextNode(prodotto));
        dettaglio.appendChild(corpo);
    }
    nodi.push(dettaglio);
    return nodi;
}

function testo(contenuto) {
    const nodo = document.createElement('p');
    nodo.className = 'uda-voto-testo';
    nodo.textContent = contenuto;
    return nodo;
}

function etichettaFase(contenuto) {
    const nodo = document.createElement('span');
    nodo.className = 'uda-voto-fase';
    nodo.textContent = contenuto;
    return nodo;
}

function creaBottone(contenuto, classe) {
    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = classe;
    bottone.textContent = contenuto;
    return bottone;
}

async function confermaScelta(anno, chiavi, bottone) {
    bottone.disabled = true;
    try {
        assorbi(await window.CurricoloRevisione.api('choice', { anno, genere: GENERE, uda_keys: chiavi }));
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
