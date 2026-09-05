// Votazione delle UDA — preferenze del collegio.
//
// Prima si votava per alzata di mano: due voti a testa per anno, sì o niente.
// Contare quante volte una UDA era stata scelta non diceva però quanto la si
// volesse, e obbligava a spendere i due voti alla cieca su una rosa appena
// discussa. Ora ogni docente dà una preferenza da 1 a 5 a quante UDA vuole
// della rosa, e la classifica si legge sui punti che ciascuna somma.
//
// La votazione ha una sezione sua: dentro le schede UDA i comandi si perdevano
// fra revisione, ripartizione oraria e stampa, e per farsi un'idea bisognava
// aprire una scheda alla volta. Qui si vede tutto l'anno in una schermata.
//
// L'accesso è quello condiviso di assets/uda-revisione.js, in modalità «voto»:
// stessa password, stessa sessione. Le UDA di formazione scuola-lavoro restano
// fuori, sono già una per anno e area di tirocinio.

const CATALOGHI = [
    { genere: 'asse', fonte: 'data-uda.json', nome: 'UDA d’asse' },
    { genere: 'trasversale', fonte: 'data-uda-trasversali.json', nome: 'UDA trasversali' }
];
const UDA_DA_ATTIVARE = 2;
const SCALA = [
    { valore: 1, etichetta: 'Non la attiverei' },
    { valore: 2, etichetta: 'Poco convincente' },
    { valore: 3, etichetta: 'Possibile' },
    { valore: 4, etichetta: 'Buona proposta' },
    { valore: 5, etichetta: 'Da attivare senz’altro' }
];

const stato = {
    uda: new Map(),        // chiave → { uda, genere }
    genere: 'asse',
    voti: [],
    votazioni: [],
    caricato: false,
    messaggi: new Map(),   // chiave del blocco → { testo, tipo }
    rosaInCorso: new Map(),// `${genere}:${anno}` → Set di chiavi
    fuoco: null            // id del comando da rimettere a fuoco dopo il ridisegno
};

const ui = {};

document.addEventListener('DOMContentLoaded', avvia);
document.addEventListener('curricolo:uda-sessione', sincronizza);

async function avvia() {
    ui.accesso = document.getElementById('voto-accesso');
    ui.apri = document.getElementById('voto-apri-accesso');
    ui.messaggio = document.getElementById('voto-accesso-messaggio');
    ui.contenuto = document.getElementById('voto-contenuto');
    ui.apri.addEventListener('click', gestisciAccesso);

    disegnaScala();
    document.querySelectorAll('.voto-genere').forEach(bottone => {
        bottone.addEventListener('click', () => {
            stato.genere = bottone.dataset.genere;
            document.querySelectorAll('.voto-genere').forEach(altro => {
                const attivo = altro === bottone;
                altro.classList.toggle('is-active', attivo);
                altro.setAttribute('aria-selected', attivo ? 'true' : 'false');
            });
            disegna();
        });
    });

    const risposte = await Promise.all(CATALOGHI.map(voce => carica(voce.fonte)));
    risposte.forEach((dati, indice) => {
        if (!dati) return;
        (dati.uda || []).forEach(uda => {
            stato.uda.set(String(uda.id), { uda, genere: CATALOGHI[indice].genere });
        });
    });
    sincronizza();
}

async function carica(percorso) {
    try {
        const risposta = await fetch(percorso, { cache: 'no-store' });
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        return await risposta.json();
    } catch (errore) {
        console.error(`Votazione — ${percorso} non disponibile:`, errore);
        return null;
    }
}

function disegnaScala() {
    const contenitore = document.querySelector('.voto-scala');
    if (!contenitore) return;
    SCALA.forEach(voce => {
        const riga = document.createElement('div');
        riga.className = 'voto-scala-voce';
        riga.setAttribute('role', 'listitem');
        const stelle = document.createElement('span');
        stelle.className = 'voto-scala-stelle';
        stelle.setAttribute('aria-hidden', 'true');
        stelle.textContent = '★'.repeat(voce.valore) + '☆'.repeat(5 - voce.valore);
        const testo = document.createElement('span');
        testo.className = 'voto-scala-testo';
        testo.textContent = `${voce.valore} · ${voce.etichetta}`;
        riga.append(stelle, testo);
        contenitore.appendChild(riga);
    });
}

// ------------------------------------------------------------------
// Sessione
// ------------------------------------------------------------------

function inModalitaVoto() {
    return window.CurricoloRevisione?.modalita === 'voto';
}

function docente() {
    return (inModalitaVoto() && window.CurricoloRevisione?.docente) || '';
}

function gestisco() {
    return Boolean(inModalitaVoto() && window.CurricoloRevisione?.puoGestire);
}

async function gestisciAccesso() {
    if (!window.CurricoloRevisione) return;
    ui.apri.disabled = true;
    try {
        if (inModalitaVoto()) await window.CurricoloRevisione.esci();
        else await window.CurricoloRevisione.apriAccesso('voto');
    } finally {
        ui.apri.disabled = false;
        aggiornaAccesso();
    }
}

function aggiornaAccesso() {
    const attivo = Boolean(docente());
    ui.accesso.classList.toggle('is-active', attivo);
    ui.apri.textContent = attivo ? 'Esci dalla votazione' : 'Entra nella votazione';
    ui.apri.className = attivo ? 'uda-revisione-secondary' : 'voto-primary';
    ui.messaggio.textContent = attivo
        ? `${docente()} · sessione attiva${gestisco() ? ' · permessi di gestione' : ''}`
        : 'Le preferenze si leggono e si danno solo a docente riconosciuto.';
}

// I voti si leggono solo a sessione attiva: l'elenco richiede il token.
async function sincronizza() {
    aggiornaAccesso();
    if (!docente()) {
        Object.assign(stato, { voti: [], votazioni: [], caricato: false });
        return disegna();
    }
    if (stato.caricato) return disegna();
    await caricaVoti();
}

async function caricaVoti() {
    try {
        assorbi(await window.CurricoloRevisione.api('votes'));
        stato.caricato = true;
    } catch (errore) {
        console.error('Impossibile caricare le preferenze:', errore);
        stato.caricato = false;
    }
    disegna();
}

function assorbi(dati) {
    stato.voti = dati.votes || [];
    stato.votazioni = dati.ballots || [];
}

// ------------------------------------------------------------------
// Lettura dei dati
// ------------------------------------------------------------------

function udaDellAnno(anno) {
    return [...stato.uda.values()]
        .filter(voce => voce.genere === stato.genere && Number(voce.uda.anno) === anno)
        .map(voce => voce.uda)
        .sort((a, b) => String(a.id).localeCompare(String(b.id), 'it', { numeric: true }));
}

function anniDisponibili() {
    return [...new Set([...stato.uda.values()]
        .filter(voce => voce.genere === stato.genere)
        .map(voce => Number(voce.uda.anno)))].sort((a, b) => a - b);
}

function votazioneDi(anno) {
    return stato.votazioni.find(voce => Number(voce.anno) === anno && voce.genere === stato.genere) || null;
}

function rosaDi(anno) { return votazioneDi(anno)?.rosa || []; }
function sceltaDi(anno) { return (votazioneDi(anno)?.scelta || []).map(String); }

function preferenzeDi(chiave) {
    return stato.voti.filter(voce => String(voce.uda_key) === String(chiave));
}

function miaPreferenza(chiave) {
    const mia = preferenzeDi(chiave).find(voce => voce.author_name === docente());
    return mia ? Number(mia.punteggio) : 0;
}

function totale(preferenze) {
    return preferenze.reduce((somma, voce) => somma + Number(voce.punteggio || 0), 0);
}

function media(preferenze) {
    if (!preferenze.length) return 0;
    return totale(preferenze) / preferenze.length;
}

function formattaMedia(valore) {
    return valore.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Classifica di un anno: solo le UDA della rosa, chi somma più punti prima.
//
// Si potrebbe ordinare per media, ed è la prima cosa che viene in mente con le
// stelle. Ma una UDA con un solo 5 avrebbe media 5 e passerebbe davanti a una
// votata 5 e 4 da due docenti: vincerebbe chi ha convinto meno gente. La somma
// dei punti tiene insieme le due cose che contano in un collegio — quanto piace
// e a quanti — ed è una regola che si spiega in una riga.
//
// A parità di punti decide la media, poi il numero di preferenze, poi
// l'identificativo, così l'ordine non cambia da un caricamento all'altro.
function classifica(anno) {
    const rosa = rosaDi(anno).map(String);
    return udaDellAnno(anno)
        .filter(uda => rosa.includes(String(uda.id)))
        .map(uda => {
            const preferenze = preferenzeDi(uda.id);
            return { uda, preferenze, punti: totale(preferenze), media: media(preferenze) };
        })
        .sort((a, b) => b.punti - a.punti
            || b.media - a.media
            || b.preferenze.length - a.preferenze.length
            || String(a.uda.id).localeCompare(String(b.uda.id), 'it', { numeric: true }));
}

// Pareggio all'ultimo posto utile: se la UDA che entra e la prima che resta
// fuori hanno gli stessi punti, la stessa media e lo stesso numero di
// preferenze, la classifica non decide e il collegio deve scioglierlo prima
// della conferma.
function pareggioAllaSoglia(ordinate) {
    if (ordinate.length <= UDA_DA_ATTIVARE) return false;
    const ultima = ordinate[UDA_DA_ATTIVARE - 1];
    const prima = ordinate[UDA_DA_ATTIVARE];
    return Boolean(ultima.preferenze.length)
        && ultima.punti === prima.punti
        && ultima.media === prima.media
        && ultima.preferenze.length === prima.preferenze.length;
}

// ------------------------------------------------------------------
// Disegno
// ------------------------------------------------------------------

function disegna() {
    if (!ui.contenuto) return;
    ui.contenuto.replaceChildren();

    if (!stato.uda.size) {
        ui.contenuto.appendChild(avviso('I cataloghi delle UDA non sono raggiungibili. Ricarica la pagina.'));
        return notificaAltezza();
    }
    if (!docente()) {
        ui.contenuto.appendChild(avviso('Entra nella votazione per vedere che cosa è al voto e dare le tue preferenze.'));
        return notificaAltezza();
    }
    if (!stato.caricato) {
        ui.contenuto.appendChild(avviso('Le preferenze non sono al momento leggibili. Riprova fra poco.'));
        return notificaAltezza();
    }

    anniDisponibili().forEach(anno => ui.contenuto.appendChild(creaBloccoAnno(anno)));
    rimettiFuoco();
    notificaAltezza();
}

function creaBloccoAnno(anno) {
    const blocco = document.createElement('section');
    blocco.className = 'voto-anno';
    const tutte = udaDellAnno(anno);
    const rosa = rosaDi(anno).map(String);
    const scelta = sceltaDi(anno);

    const testata = document.createElement('div');
    testata.className = 'voto-anno-testa';
    const titolo = document.createElement('h2');
    titolo.textContent = `${anno}ª — ${tutte.length} ${tutte.length === 1 ? 'UDA disponibile' : 'UDA disponibili'}`;
    testata.appendChild(titolo);
    blocco.appendChild(testata);

    // Quando le UDA disponibili sono già quante se ne devono attivare non c'è
    // gara: si dice e basta, invece di far aprire una votazione a vuoto.
    if (tutte.length <= UDA_DA_ATTIVARE) {
        blocco.dataset.fase = 'senza-gara';
        testata.appendChild(etichettaFase('Nessuna gara'));
        blocco.appendChild(testo(`Sono ${tutte.length}, cioè esattamente quante se ne devono attivare: entrano tutte, non serve votare.`));
        return blocco;
    }

    if (!rosa.length) {
        blocco.dataset.fase = 'da-aprire';
        testata.appendChild(etichettaFase('Votazione non aperta'));
        blocco.appendChild(testo(gestisco()
            ? `Scegli le UDA da mettere al voto, almeno ${UDA_DA_ATTIVARE + 1}, e apri la votazione. Fino ad allora i docenti non vedono nulla da votare.`
            : 'La votazione non è ancora aperta: verranno messe al voto alcune UDA dopo la consultazione.'));
        if (gestisco()) blocco.appendChild(creaSelettoreRosa(anno, tutte, rosa));
        aggiungiMessaggio(blocco, `rosa-${anno}`);
        return blocco;
    }

    const votazione = votazioneDi(anno);
    blocco.dataset.fase = scelta.length ? 'conclusa' : 'in-corso';
    testata.appendChild(etichettaFase(scelta.length ? 'Scelta confermata' : 'Votazione aperta'));
    blocco.appendChild(testo(scelta.length
        ? `Votazione chiusa: erano al voto ${rosa.length} UDA su ${tutte.length}.`
        : `Sono al voto ${rosa.length} UDA su ${tutte.length}, messe in votazione da ${votazione.aperta_da}. Dai una preferenza da 1 a 5 a quante vuoi.`));

    if (!scelta.length) blocco.appendChild(creaSchedaPreferenze(anno, rosa));
    blocco.appendChild(creaClassifica(anno, scelta));

    if (gestisco()) blocco.appendChild(creaAzioniGestione(anno, scelta));
    if (stato.rosaInCorso.has(chiaveRosa(anno))) blocco.appendChild(creaSelettoreRosa(anno, tutte, rosa));
    aggiungiMessaggio(blocco, `rosa-${anno}`);
    return blocco;
}

// Le UDA della rosa in ordine fisso, con la propria preferenza accanto. Restano
// ferme mentre si vota: se si riordinassero per media, la riga su cui si sta
// lavorando scapperebbe via a ogni clic.
function creaSchedaPreferenze(anno, rosa) {
    const box = document.createElement('div');
    box.className = 'voto-preferenze';
    const titolo = document.createElement('h3');
    const date = rosa.filter(chiave => miaPreferenza(chiave)).length;
    titolo.textContent = `Le tue preferenze — ${date} su ${rosa.length}`;
    box.appendChild(titolo);

    udaDellAnno(anno)
        .filter(uda => rosa.includes(String(uda.id)))
        .forEach(uda => box.appendChild(creaRigaPreferenza(uda, anno)));
    return box;
}

function creaRigaPreferenza(uda, anno) {
    const chiave = String(uda.id);
    const riga = document.createElement('article');
    riga.className = 'voto-voce';
    const mia = miaPreferenza(chiave);
    if (mia) riga.dataset.espressa = 'true';

    const intestazione = document.createElement('div');
    intestazione.className = 'voto-voce-testa';
    const nome = document.createElement('h4');
    nome.textContent = `${uda.id} · ${uda.titolo}`;
    intestazione.appendChild(nome);
    riga.appendChild(intestazione);

    descrizione(uda).forEach(nodo => riga.appendChild(nodo));
    riga.appendChild(creaStelle(chiave, anno, mia));
    aggiungiMessaggio(riga, chiave);
    return riga;
}

// Cinque stelle come gruppo di radio: si usano con il mouse, con la tastiera e
// con lo screen reader, e il valore resta un numero da 1 a 5.
function creaStelle(chiave, anno, mia) {
    const gruppo = document.createElement('fieldset');
    gruppo.className = 'voto-stelle';

    const legenda = document.createElement('legend');
    legenda.className = 'sr-only';
    legenda.textContent = `Preferenza per l’UDA ${chiave}, da 1 a 5`;
    gruppo.appendChild(legenda);

    const stelle = document.createElement('div');
    stelle.className = 'voto-stelle-scelta';
    const nomeGruppo = `voto-${chiave.replace(/[^a-zA-Z0-9]/g, '-')}`;
    SCALA.forEach(voce => {
        const id = `${nomeGruppo}-${voce.valore}`;
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = nomeGruppo;
        radio.id = id;
        radio.className = 'voto-stella-input';
        radio.value = String(voce.valore);
        radio.checked = mia === voce.valore;
        radio.addEventListener('change', () => {
            stato.fuoco = id;
            vota(chiave, anno, voce.valore);
        });

        const etichetta = document.createElement('label');
        etichetta.className = 'voto-stella';
        etichetta.htmlFor = id;
        etichetta.title = `${voce.valore} · ${voce.etichetta}`;
        const segno = document.createElement('span');
        segno.setAttribute('aria-hidden', 'true');
        segno.textContent = '★';
        const descrizioneVoce = document.createElement('span');
        descrizioneVoce.className = 'sr-only';
        descrizioneVoce.textContent = `${voce.valore} — ${voce.etichetta}`;
        etichetta.append(segno, descrizioneVoce);

        stelle.append(radio, etichetta);
    });
    gruppo.appendChild(stelle);

    const esito = document.createElement('p');
    esito.className = 'voto-stelle-esito';
    const scelta = SCALA.find(voce => voce.valore === mia);
    esito.textContent = scelta ? `${mia} / 5 — ${scelta.etichetta}` : 'Nessuna preferenza espressa';
    gruppo.appendChild(esito);

    if (mia) {
        const togli = document.createElement('button');
        togli.type = 'button';
        togli.className = 'voto-ghost';
        togli.textContent = 'Togli la preferenza';
        togli.addEventListener('click', () => vota(chiave, anno, null));
        gruppo.appendChild(togli);
    }
    return gruppo;
}

function creaClassifica(anno, scelta) {
    const box = document.createElement('div');
    box.className = 'voto-classifica-box';
    const titolo = document.createElement('h3');
    titolo.textContent = scelta.length ? 'Esito della votazione' : 'Classifica del collegio';
    box.appendChild(titolo);

    const ordinate = classifica(anno);
    const espresse = ordinate.filter(voce => voce.preferenze.length);
    if (!espresse.length) {
        box.appendChild(testo('Nessuna preferenza espressa finora: la classifica compare appena qualcuno vota.'));
        return box;
    }

    const elenco = document.createElement('ol');
    elenco.className = 'voto-classifica';
    ordinate.forEach((voce, posizione) => {
        const riga = document.createElement('li');
        if (posizione < UDA_DA_ATTIVARE && voce.preferenze.length) riga.dataset.inTesta = 'true';
        if (scelta.includes(String(voce.uda.id))) riga.dataset.scelta = 'true';

        const nome = document.createElement('div');
        nome.className = 'voto-classifica-nome';
        const etichetta = document.createElement('strong');
        etichetta.textContent = `${voce.uda.id} · ${voce.uda.titolo}`;
        nome.appendChild(etichetta);
        if (voce.preferenze.length) {
            const chi = document.createElement('p');
            chi.className = 'voto-classifica-chi';
            chi.textContent = voce.preferenze
                .slice()
                .sort((a, b) => Number(b.punteggio) - Number(a.punteggio))
                .map(preferenza => `${preferenza.author_name} ${preferenza.punteggio}`)
                .join(' · ');
            nome.appendChild(chi);
        }

        const punteggio = document.createElement('div');
        punteggio.className = 'voto-classifica-punteggio';
        if (voce.preferenze.length) {
            const valore = document.createElement('span');
            valore.className = 'voto-punti';
            valore.textContent = `${voce.punti} ${voce.punti === 1 ? 'punto' : 'punti'}`;
            const dettaglio = document.createElement('span');
            dettaglio.className = 'voto-quante';
            dettaglio.textContent = `media ${formattaMedia(voce.media)} su ${voce.preferenze.length} ${voce.preferenze.length === 1 ? 'preferenza' : 'preferenze'}`;
            punteggio.append(valore, dettaglio);
        } else {
            const valore = document.createElement('span');
            valore.className = 'voto-quante';
            valore.textContent = 'nessuna preferenza';
            punteggio.appendChild(valore);
        }

        riga.append(nome, punteggio);
        elenco.appendChild(riga);
    });
    box.appendChild(elenco);

    if (!scelta.length && pareggioAllaSoglia(ordinate)) {
        const avvisoPareggio = testo(`Pareggio al ${UDA_DA_ATTIVARE}º posto, stessi punti e stessa media: prima della conferma il collegio deve scioglierlo rivedendo qualche preferenza.`);
        avvisoPareggio.className = 'voto-avviso-pareggio';
        box.appendChild(avvisoPareggio);
    }

    if (scelta.length) {
        const votazione = votazioneDi(anno);
        const quando = votazione?.confermata_il
            ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(votazione.confermata_il))
            : '';
        const nota = testo(`Scelta confermata da ${votazione?.confermata_da || '—'}${quando ? ` il ${quando}` : ''}: ${scelta.join(' e ')}.`);
        nota.className = 'voto-confermata';
        box.appendChild(nota);
    }
    return box;
}

function creaAzioniGestione(anno, scelta) {
    const azioni = document.createElement('div');
    azioni.className = 'voto-azioni';
    const ordinate = classifica(anno);
    const espresse = ordinate.filter(voce => voce.preferenze.length);

    if (!scelta.length) {
        const conferma = creaBottone(`Conferma le prime ${UDA_DA_ATTIVARE}`, 'uda-revisione-primary');
        const pareggio = pareggioAllaSoglia(ordinate);
        conferma.disabled = espresse.length < UDA_DA_ATTIVARE || pareggio;
        conferma.title = pareggio
            ? 'Prima di confermare occorre sciogliere il pareggio.'
            : conferma.disabled ? `Servono almeno ${UDA_DA_ATTIVARE} UDA con una preferenza per confermare.` : '';
        conferma.addEventListener('click', () => confermaScelta(
            anno,
            ordinate.slice(0, UDA_DA_ATTIVARE).map(voce => String(voce.uda.id)),
            conferma
        ));
        azioni.appendChild(conferma);
    }

    const cambia = creaBottone(scelta.length ? 'Riapri la votazione' : 'Cambia la rosa', 'uda-revisione-secondary');
    cambia.addEventListener('click', () => {
        stato.rosaInCorso.set(chiaveRosa(anno), new Set(rosaDi(anno).map(String)));
        disegna();
    });
    azioni.appendChild(cambia);
    return azioni;
}

// Selettore della rosa, riservato a chi gestisce: si spuntano le UDA da mettere
// al voto e si apre la votazione.
function creaSelettoreRosa(anno, tutte, rosa) {
    const chiave = chiaveRosa(anno);
    const scelte = stato.rosaInCorso.get(chiave) || new Set(rosa);
    stato.rosaInCorso.set(chiave, scelte);

    const box = document.createElement('div');
    box.className = 'voto-rosa';
    const titolo = document.createElement('h3');
    titolo.textContent = 'UDA da mettere al voto';
    box.appendChild(titolo);

    const elenco = document.createElement('div');
    elenco.className = 'voto-rosa-elenco';
    tutte.forEach(uda => {
        const id = String(uda.id);
        const voce = document.createElement('div');
        voce.className = 'voto-rosa-voce';
        const casella = document.createElement('input');
        casella.type = 'checkbox';
        casella.id = `rosa-${stato.genere}-${anno}-${id.replace(/[^a-zA-Z0-9]/g, '-')}`;
        casella.checked = scelte.has(id);
        casella.addEventListener('change', () => {
            if (casella.checked) scelte.add(id); else scelte.delete(id);
            aggiornaConteggioRosa(box, anno);
        });
        const corpo = document.createElement('div');
        corpo.className = 'voto-rosa-testo';
        const etichetta = document.createElement('label');
        etichetta.htmlFor = casella.id;
        etichetta.textContent = `${uda.id} · ${uda.titolo}`;
        corpo.append(etichetta, ...descrizione(uda));
        voce.append(casella, corpo);
        elenco.appendChild(voce);
    });
    box.appendChild(elenco);

    const azioni = document.createElement('div');
    azioni.className = 'voto-azioni';
    const conteggio = document.createElement('p');
    conteggio.className = 'voto-testo voto-rosa-conteggio';
    const apri = creaBottone(rosa.length ? 'Aggiorna la rosa' : 'Apri la votazione', 'uda-revisione-primary');
    apri.addEventListener('click', () => apriVotazione(anno, [...scelte], apri));
    const annulla = creaBottone('Annulla', 'uda-revisione-secondary');
    annulla.addEventListener('click', () => { stato.rosaInCorso.delete(chiave); disegna(); });
    azioni.append(apri, annulla, conteggio);
    box.appendChild(azioni);
    aggiornaConteggioRosa(box, anno);
    return box;
}

function aggiornaConteggioRosa(box, anno) {
    const scelte = stato.rosaInCorso.get(chiaveRosa(anno)) || new Set();
    const conteggio = box.querySelector('.voto-rosa-conteggio');
    const apri = box.querySelector('.uda-revisione-primary');
    const troppePoche = scelte.size > 0 && scelte.size <= UDA_DA_ATTIVARE;
    conteggio.textContent = scelte.size === 0
        ? 'Nessuna UDA selezionata: la votazione resterà chiusa.'
        : troppePoche
        ? `Ne hai selezionate ${scelte.size} e se ne devono attivare ${UDA_DA_ATTIVARE}: non ci sarebbe nulla da scegliere. Selezionane almeno ${UDA_DA_ATTIVARE + 1}.`
        : `${scelte.size} UDA al voto.`;
    apri.disabled = troppePoche;
}

function chiaveRosa(anno) {
    return `${stato.genere}:${anno}`;
}

// ------------------------------------------------------------------
// Scritture
// ------------------------------------------------------------------

async function vota(chiave, anno, punteggio) {
    try {
        const dati = punteggio === null
            ? { uda_key: chiave, anno, genere: stato.genere, rimuovi: true }
            : { uda_key: chiave, anno, genere: stato.genere, punteggio };
        assorbi(await window.CurricoloRevisione.api('vote', dati));
        stato.messaggi.delete(chiave);
    } catch (errore) {
        stato.messaggi.set(chiave, { testo: errore.message || 'Preferenza non registrata.', tipo: 'errore' });
    }
    disegna();
}

async function apriVotazione(anno, rosa, bottone) {
    bottone.disabled = true;
    try {
        assorbi(await window.CurricoloRevisione.api('ballot', { anno, genere: stato.genere, rosa }));
        stato.rosaInCorso.delete(chiaveRosa(anno));
        stato.messaggi.delete(`rosa-${anno}`);
    } catch (errore) {
        stato.messaggi.set(`rosa-${anno}`, { testo: errore.message || 'Rosa non registrata.', tipo: 'errore' });
    }
    disegna();
}

async function confermaScelta(anno, chiavi, bottone) {
    bottone.disabled = true;
    try {
        assorbi(await window.CurricoloRevisione.api('choice', { anno, genere: stato.genere, uda_keys: chiavi }));
        stato.messaggi.delete(`rosa-${anno}`);
    } catch (errore) {
        stato.messaggi.set(`rosa-${anno}`, { testo: errore.message || 'Scelta non registrata.', tipo: 'errore' });
    }
    disegna();
}

// ------------------------------------------------------------------
// Pezzi comuni
// ------------------------------------------------------------------

// Di cosa si tratta e come si verifica: senza queste due righe si voterebbe
// leggendo solo il titolo. La prova esperta sta in un blocco richiudibile, così
// l'elenco resta scorribile e chi vuole approfondire apre.
function descrizione(uda) {
    const nodi = [];
    if (uda.traguardo) {
        const traguardo = document.createElement('p');
        traguardo.className = 'voto-descrizione';
        traguardo.textContent = uda.traguardo;
        nodi.push(traguardo);
    }
    const prova = uda.compito || '';
    // Nelle UDA d'asse compito e prodotto sono lo stesso testo: ripeterlo non
    // aggiunge nulla.
    const prodotto = uda.prodotto && uda.prodotto !== prova ? uda.prodotto : '';
    if (!prova && !prodotto) return nodi;
    const dettaglio = document.createElement('details');
    dettaglio.className = 'voto-prova';
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
        const titolo = document.createElement('strong');
        titolo.textContent = 'Prodotto atteso: ';
        corpo.append(titolo, document.createTextNode(prodotto));
        dettaglio.appendChild(corpo);
    }
    nodi.push(dettaglio);
    return nodi;
}

function aggiungiMessaggio(contenitore, chiave) {
    const messaggio = stato.messaggi.get(chiave);
    if (!messaggio) return;
    const nodo = document.createElement('p');
    nodo.className = 'voto-messaggio';
    nodo.dataset.tipo = messaggio.tipo;
    nodo.setAttribute('role', 'status');
    nodo.textContent = messaggio.testo;
    contenitore.appendChild(nodo);
}

// Il ridisegno ricostruisce i comandi da capo: senza questo, dopo ogni
// preferenza il fuoco tornerebbe in cima alla pagina e chi naviga da tastiera
// dovrebbe ripercorrere tutto l'elenco.
function rimettiFuoco() {
    if (!stato.fuoco) return;
    const nodo = document.getElementById(stato.fuoco);
    stato.fuoco = null;
    if (nodo) nodo.focus({ preventScroll: true });
}

function testo(contenuto) {
    const nodo = document.createElement('p');
    nodo.className = 'voto-testo';
    nodo.textContent = contenuto;
    return nodo;
}

function avviso(contenuto) {
    const nodo = document.createElement('p');
    nodo.className = 'voto-avviso';
    nodo.textContent = contenuto;
    return nodo;
}

function etichettaFase(contenuto) {
    const nodo = document.createElement('span');
    nodo.className = 'voto-fase';
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

function notificaAltezza() {
    setTimeout(() => {
        if (window.parent === window) return;
        const altezza = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        window.parent.postMessage({ type: 'iframeContentHeight', height: altezza }, window.location.origin);
    }, 20);
}
