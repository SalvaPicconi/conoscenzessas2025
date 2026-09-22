// Piano delle UDA del consiglio di classe — strumento del coordinatore.
//
// Il consiglio discute e sceglie; il coordinatore riporta qui le unità
// deliberate, indica quando si svolgono e stampa l'allegato alla programmazione
// di classe. La pagina non decide nulla da sola: mette insieme i tre cataloghi
// (asse, trasversali, formazione scuola-lavoro), la ripartizione oraria già
// calcolata sul quadro orario d'istituto e i dati della seduta.
//
// Quando il collegio ha votato e confermato le UDA dell'anno, la scelta si
// importa invece di essere ricopiata: si passa dall'accesso della votazione,
// lo stesso di votazione-uda.js, e si leggono le delibere già registrate.
//
// Nulla viene inviato: la bozza vive nel localStorage del browser di chi
// compila, perché un piano a metà non deve andare perso fra una seduta e la
// stampa, ma non riguarda nessun altro.

const CATALOGHI = [
    { genere: 'dipartimento', fonte: 'data-uda-dipartimento.json', evidenza: true, nome: 'Scelte dal Dipartimento', descrizione: 'Le unità adottate dal Dipartimento SSAS: sono queste il riferimento del consiglio di classe.' },
    { genere: 'asse', fonte: 'data-uda-asse.json', nome: 'UDA d’asse', descrizione: 'Il catalogo d’asse del curricolo. Le ore delle unità nate da accorpamento sono la somma delle origini, da deliberare.' },
    { genere: 'trasversale', fonte: 'data-uda-trasversali.json', nome: 'UDA trasversali', descrizione: 'Interdisciplinari, a cavallo di più assi culturali.' },
    { genere: 'civica', fonte: 'data-uda-civica.json', nome: 'UDA di Educazione civica', descrizione: 'Collegate alle competenze nazionali del D.M. 183/2024; il curricolo annuale deve prevedere almeno 33 ore complessive.' },
    { genere: 'fsl', fonte: 'data-uda-fsl.json', nome: 'UDA di formazione scuola-lavoro', descrizione: 'Percorsi collegati all’area di tirocinio (già PCTO).' }
];
const FONTE_RIPARTIZIONE = 'data-ripartizione-ore.json';
// Le scelte del Dipartimento sono copie autonome dei cataloghi: senza sapere
// da dove vengono, il piano non si accorgerebbe che l'unità adottata e quella
// del catalogo sono la stessa cosa contata due volte.
const FONTE_DERIVAZIONE = 'tools/derivazione_dipartimento.json';
const ARCHIVIO = 'curricolo:piano-uda';
const PERIODI = ['1° quadrimestre', '2° quadrimestre', 'Intero anno scolastico'];
const CAMPI_LIBERI = ['anno', 'classe', 'annoScolastico', 'coordinatore', 'dirigente', 'dataSeduta', 'verbale', 'docenti', 'note', 'formato'];
const FORMATI = ['sintetico', 'integrale'];

const stato = {
    catalogo: new Map(),   // id → { uda, genere, meta }
    ordine: [],            // id nell'ordine dei cataloghi
    ripartizione: {},
    metaRipartizione: {},
    derivazione: {},
    scelte: new Map(),     // id → { periodo }
    dati: {},
    pronto: false
};

document.addEventListener('DOMContentLoaded', avvia);
// L'accesso alla votazione avviene fuori da questa pagina: quando la sessione
// cambia si riprova l'importazione, così il pulsante non resta in attesa.
document.addEventListener('curricolo:uda-sessione', () => {
    if (stato.importazioneInAttesa) importaScelta();
});

async function avvia() {
    disegnaNorme();
    collegaEventi();
    ripristina();

    const risposte = await Promise.all([
        ...CATALOGHI.map(voce => carica(voce.fonte)),
        carica(FONTE_RIPARTIZIONE),
        carica(FONTE_DERIVAZIONE)
    ]);
    const derivazione = risposte.pop();
    const ore = risposte.pop();
    stato.ripartizione = (ore && ore.uda) || {};
    stato.metaRipartizione = (ore && ore.meta) || {};
    stato.derivazione = (derivazione && derivazione.scelte) || {};

    risposte.forEach((dati, indice) => {
        if (!dati) return;
        const catalogo = CATALOGHI[indice];
        elencoUda(dati).forEach(uda => {
            const chiave = String(uda.id);
            stato.catalogo.set(chiave, { uda, genere: catalogo.genere, meta: dati.meta || {} });
            stato.ordine.push(chiave);
        });
    });

    completaRipartizione();
    stato.pronto = risposte.every(Boolean) && Boolean(ore);
    // Le UDA salvate in bozza ma non più presenti nei cataloghi vanno tolte,
    // altrimenti il piano stampato conterrebbe righe vuote.
    // Conservare le scelte anche in caso di caricamento incompleto; bloccare l'export.
    disegnaTutto();
}

// Le scelte del Dipartimento stanno annidate per classe e per decisione;
// gli altri cataloghi espongono un elenco piatto.
function elencoUda(dati) {
    if (Array.isArray(dati.uda)) return dati.uda;
    const unita = [];
    (dati.classi || []).forEach(classe =>
        (classe.decisioni || []).forEach(decisione => unita.push(...(decisione.unita || []))));
    ((dati.simulazioni && dati.simulazioni.voci) || []).forEach(voce => unita.push(...(voce.unita || [])));
    return unita;
}

// La ripartizione oraria è calcolata sulle schede di origine del curricolo.
// Un'unità che ne accorpa più d'una, o che è stata adottata dal Dipartimento
// con un identificativo proprio, non ha una voce sua: senza questo passaggio
// il riepilogo del monte ore uscirebbe vuoto proprio sulle unità scelte.
function completaRipartizione() {
    for (const [id, voce] of stato.catalogo) {
        if (stato.ripartizione[id]) continue;

        const sorgente = stato.derivazione[id] && stato.derivazione[id].copia;
        if (sorgente && stato.ripartizione[sorgente.id]) {
            stato.ripartizione[id] = stato.ripartizione[sorgente.id];
            continue;
        }

        const origini = (voce.uda.fonde || [])
            .filter(o => String(o.id) !== id)
            .map(o => stato.ripartizione[o.id]);
        if (origini.length && !origini.some(o => !o)) {
            const materie = new Map();
            for (const origine of origini) for (const r of origine.voci) {
                const somma = materie.get(r.ins) || { ins: r.ins, oreSett: r.oreSett, min: 0, max: 0 };
                somma.min += r.min; somma.max += r.max; materie.set(r.ins, somma);
            }
            stato.ripartizione[id] = {
                totaleMin: origini.reduce((n, r) => n + r.totaleMin, 0),
                totaleMax: origini.reduce((n, r) => n + r.totaleMax, 0),
                voci: [...materie.values()],
                senzaOre: [...new Set(origini.flatMap(r => r.senzaOre || []))]
            };
            continue;
        }

        // Ultima risorsa: la ripartizione scritta dentro la scheda adottata.
        if (voce.uda.oreRipartizione) {
            const voci = Object.entries(voce.uda.oreRipartizione)
                .map(([ins, ore]) => ({ ins, oreSett: '—', min: Number(ore) || 0, max: Number(ore) || 0 }));
            const totale = voci.reduce((n, v) => n + v.min, 0);
            if (voci.length) stato.ripartizione[id] = { totaleMin: totale, totaleMax: totale, voci };
        }
    }
}

async function carica(percorso) {
    try {
        const risposta = await fetch(percorso, { cache: 'no-store' });
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        return await risposta.json();
    } catch (errore) {
        console.error(`Piano UDA — ${percorso} non disponibile:`, errore);
        return null;
    }
}

// ------------------------------------------------------------------
// Interfaccia
// ------------------------------------------------------------------

function collegaEventi() {
    CAMPI_LIBERI.forEach(campo => {
        document.querySelectorAll(`[data-campo="${campo}"]`).forEach(nodo => {
            const evento = nodo.tagName === 'SELECT' || nodo.type === 'date' ? 'change' : 'input';
            nodo.addEventListener(evento, () => {
                stato.dati[campo] = nodo.value;
                scriviCampo(campo, nodo.value, nodo);
                salva();
                if (campo === 'anno') disegnaTutto();
            });
        });
    });
    // I comandi compaiono due volte, in cima e in fondo: si legano per azione
    // invece che per identificatore.
    document.querySelectorAll('[data-azione]').forEach(bottone => {
        const azione = bottone.dataset.azione;
        bottone.addEventListener('click', () => {
            if (azione === 'svuota') return svuota();
            consegna(azione);
        });
    });
    document.getElementById('piano-import').addEventListener('click', () => importaScelta(true));
}

function disegnaNorme() {
    const elenco = document.getElementById('piano-norme-elenco');
    const documento = window.CurricoloDocumento;
    if (!elenco || !documento) return;
    elenco.replaceChildren();
    documento.RIFERIMENTI.forEach(voce => {
        const riga = document.createElement('li');
        const norma = document.createElement('strong');
        norma.textContent = voce.norma;
        riga.append(norma, document.createTextNode(` — ${voce.oggetto}`));
        elenco.appendChild(riga);
    });
}

function annoScelto() {
    return Number(stato.dati.anno) || 0;
}

function udaDellAnno(genere) {
    const anno = annoScelto();
    if (!anno) return [];
    return stato.ordine
        .map(chiave => stato.catalogo.get(chiave))
        .filter(voce => voce && voce.genere === genere && Number(voce.uda.anno) === anno);
}

function disegnaTutto() {
    disegnaCatalogo();
    disegnaRiepilogo();
    aggiornaStato();
}

function disegnaCatalogo() {
    const contenitore = document.getElementById('piano-catalogo');
    contenitore.replaceChildren();

    if (!stato.pronto) {
        contenitore.appendChild(avviso('I cataloghi delle UDA non sono raggiungibili. Ricarica la pagina.'));
        return;
    }
    if (!annoScelto()) {
        contenitore.appendChild(avviso('Scegli l’anno di corso della classe: compariranno le UDA disponibili.'));
        return;
    }

    // Le UDA restano selezionate anche se il coordinatore cambia l'anno di
    // corso: non si cancella il lavoro di nessuno, ma non si lascia neanche che
    // un'unità di un'altra annualità finisca nel documento senza avvisare.
    const altroAnno = scelteDiAltroAnno();
    if (altroAnno.length) {
        contenitore.appendChild(avviso(`Nella bozza ci ${altroAnno.length === 1 ? 'è' : 'sono'} ${altroAnno.length} ${altroAnno.length === 1 ? 'unità' : 'unità'} di un altro anno di corso (${altroAnno.map(voce => voce.uda.id).join(', ')}): ${altroAnno.length === 1 ? 'toglila' : 'toglile'} o cambia l’anno indicato al punto 1, altrimenti ${altroAnno.length === 1 ? 'entra' : 'entrano'} nel documento.`));
    }

    // Prima ciò che il Dipartimento ha deliberato, aperto. Il resto del
    // curricolo resta raggiungibile ma chiuso: serve nei casi particolari, non
    // è il punto di partenza del consiglio.
    CATALOGHI.filter(catalogo => catalogo.evidenza)
        .forEach(catalogo => contenitore.appendChild(creaGruppo(catalogo)));

    const altri = CATALOGHI.filter(catalogo => !catalogo.evidenza);
    const disponibili = altri.reduce((somma, catalogo) => somma + udaDellAnno(catalogo.genere).length, 0);
    if (!disponibili) return;

    const scelteFuori = [...stato.scelte.keys()].filter(chiave => fuoriDelibera(chiave)).length;
    const riserva = document.createElement('details');
    riserva.className = 'piano-riserva';
    riserva.open = scelteFuori > 0;
    const sommario = document.createElement('summary');
    sommario.textContent = scelteFuori
        ? `Altre unità disponibili — fuori delibera dipartimentale (${scelteFuori} ${scelteFuori === 1 ? 'selezionata' : 'selezionate'})`
        : 'Altre unità disponibili — fuori delibera dipartimentale';
    const premessa = document.createElement('p');
    premessa.className = 'piano-nota';
    premessa.textContent = 'Unità del curricolo che il Dipartimento non ha adottato per questo anno di corso. Il consiglio di classe può sceglierle, ma nel documento stampato escono segnalate come fuori delibera dipartimentale.';
    riserva.append(sommario, premessa);
    altri.forEach(catalogo => riserva.appendChild(creaGruppo(catalogo)));
    contenitore.appendChild(riserva);
}

function creaGruppo(catalogo) {
    const voci = udaDellAnno(catalogo.genere);
    const gruppo = document.createElement('section');
    gruppo.className = 'piano-gruppo';
    if (catalogo.evidenza) gruppo.dataset.evidenza = 'true';

    const testata = document.createElement('div');
    testata.className = 'piano-gruppo-testa';
    const titolo = document.createElement('h3');
    titolo.textContent = catalogo.nome;
    const conteggio = document.createElement('span');
    conteggio.className = 'piano-conteggio';
    const scelte = voci.filter(voce => stato.scelte.has(String(voce.uda.id))).length;
    conteggio.textContent = `${scelte} ${scelte === 1 ? 'scelta' : 'scelte'} su ${voci.length}`;
    testata.append(titolo, conteggio);

    const descrizione = document.createElement('p');
    descrizione.className = 'piano-nota';
    descrizione.textContent = catalogo.descrizione;
    gruppo.append(testata, descrizione);

    if (!voci.length) {
        gruppo.appendChild(avviso(catalogo.evidenza
            ? 'Il Dipartimento non ha adottato unità per questo anno di corso: scegli fra le altre unità disponibili.'
            : `Nessuna ${catalogo.nome.toLowerCase()} prevista per questo anno di corso.`));
        return gruppo;
    }

    voci.forEach(voce => gruppo.appendChild(creaVoce(voce)));
    return gruppo;
}

// Un'unità scelta fuori dall'elenco adottato dal Dipartimento: è legittimo,
// ma va detto nel documento, perché chi lo legge non deve dedurlo.
function fuoriDelibera(chiave) {
    return stato.catalogo.get(chiave)?.genere !== 'dipartimento';
}

function scelteDiAltroAnno() {
    const anno = annoScelto();
    if (!anno) return [];
    return scelteOrdinate().filter(voce => Number(voce.uda.anno) !== anno);
}

// Una stessa unità arriva al piano da più strade: adottata dal Dipartimento,
// presa dal catalogo d'asse, o nelle schede di origine che un accorpamento
// tiene insieme. Sono la stessa cosa e vanno contate una volta sola.
function originiDi(chiave) {
    const voce = stato.catalogo.get(chiave);
    if (!voce) return [];
    const origini = new Set([String(chiave)]);
    const derivazione = stato.derivazione[chiave];
    if (derivazione && derivazione.copia) origini.add(String(derivazione.copia.id));
    (voce.uda.fonde || []).forEach(o => origini.add(String(o.id)));
    return [...origini];
}
function sovrapposizione(chiave) {
    const origini = new Set(originiDi(chiave));
    return [...stato.scelte.keys()].some(k=>k!==chiave && originiDi(k).some(id=>origini.has(id)));
}

function creaVoce({ uda, genere }) {
    const chiave = String(uda.id);
    const scelta = stato.scelte.get(chiave);
    const riga = document.createElement('div');
    riga.className = 'piano-voce';
    if (scelta) riga.dataset.scelta = 'true';

    const casella = document.createElement('input');
    casella.type = 'checkbox';
    casella.id = `piano-uda-${chiave.replace(/[^a-zA-Z0-9]/g, '-')}`;
    casella.checked = Boolean(scelta);
    casella.addEventListener('change', () => {
        if (casella.checked) {
            if (sovrapposizione(chiave)) {
                casella.checked = false;
                messaggioStato('Questa UDA è già nel piano sotto un’altra voce: l’unità adottata dal Dipartimento e quella del catalogo sono la stessa. Scegline una sola.');
                return;
            }
            stato.scelte.set(chiave, { periodo: periodoPredefinito(uda) });
        }
        else stato.scelte.delete(chiave);
        salva();
        disegnaTutto();
    });

    const corpo = document.createElement('div');
    corpo.className = 'piano-voce-corpo';

    const etichetta = document.createElement('label');
    etichetta.htmlFor = casella.id;
    etichetta.className = 'piano-voce-titolo';
    etichetta.textContent = `${uda.id} · ${uda.titolo}`;

    if (fuoriDelibera(chiave)) {
        const segnale = document.createElement('span');
        segnale.className = 'piano-voce-fuori';
        segnale.textContent = 'Fuori delibera dipartimentale';
        etichetta.appendChild(segnale);
    }

    const meta = document.createElement('p');
    meta.className = 'piano-voce-meta';
    meta.textContent = [
        oreTesto(uda),
        uda.qnq ? `QNQ ${uda.qnq}` : '',
        genere === 'fsl' && uda.areaTirocinio ? uda.areaTirocinio : '',
        insegnamentiDi(chiave).join(' · ')
    ].filter(Boolean).join(' — ');

    corpo.append(etichetta, meta);

    if (uda.traguardo) {
        const traguardo = document.createElement('p');
        traguardo.className = 'piano-voce-traguardo';
        traguardo.textContent = uda.traguardo;
        corpo.appendChild(traguardo);
    }

    if (scelta) {
        const periodo = document.createElement('label');
        periodo.className = 'piano-voce-periodo';
        periodo.textContent = 'Periodo di svolgimento ';
        const scelto = document.createElement('select');
        PERIODI.forEach(voce => {
            const opzione = document.createElement('option');
            opzione.value = voce;
            opzione.textContent = voce;
            opzione.selected = voce === scelta.periodo;
            scelto.appendChild(opzione);
        });
        scelto.addEventListener('change', () => {
            stato.scelte.set(chiave, { periodo: scelto.value });
            salva();
        });
        periodo.appendChild(scelto);
        corpo.appendChild(periodo);
    }

    riga.append(casella, corpo);
    return riga;
}

function periodoPredefinito(uda) {
    return PERIODI.includes(uda.periodo) ? uda.periodo : PERIODI[2];
}

function oreTesto(uda) {
    const ripartizione = stato.ripartizione[String(uda.id)];
    if (ripartizione && ripartizione.convenzionale) {
        return `${ripartizione.totaleMin} ore (monte convenzionale)`;
    }
    // Le simulazioni della prova d'esame dichiarano una durata, non un monte ore.
    const ore = uda.ore || uda.durata;
    return ore ? `${ore} ore` : '';
}

function insegnamentiDi(chiave) {
    const documento = window.CurricoloDocumento;
    const ripartizione = stato.ripartizione[String(chiave)];
    if (!ripartizione) return [];
    return ripartizione.voci.map(voce => documento ? documento.etichettaInsegnamento(voce.ins) : voce.ins);
}

// Somma delle ore per insegnamento sulle sole UDA scelte: è il numero che
// interessa al consiglio, perché dice quante ore ogni docente deve trovare
// nella propria programmazione.
function riepilogoOre() {
    const documento = window.CurricoloDocumento;
    const totali = new Map();
    scelteOrdinate().forEach(({ chiave }) => {
        const ripartizione = stato.ripartizione[chiave];
        if (!ripartizione) return;
        ripartizione.voci.forEach(voce => {
            const nome = documento ? documento.etichettaInsegnamento(voce.ins) : voce.ins;
            const corrente = totali.get(nome) || { min: 0, max: 0, perUda: new Map() };
            corrente.min += voce.min || 0;
            corrente.max += voce.max || 0;
            corrente.perUda.set(chiave, { min: voce.min || 0, max: voce.max || 0 });
            totali.set(nome, corrente);
        });
    });
    return [...totali.entries()]
        .sort((a, b) => b[1].max - a[1].max || a[0].localeCompare(b[0], 'it'))
        .map(([nome, valori]) => ({ nome, ...valori }));
}

function scelteOrdinate() {
    return stato.ordine
        .filter(chiave => stato.scelte.has(chiave))
        .map(chiave => ({ chiave, ...stato.catalogo.get(chiave), scelta: stato.scelte.get(chiave) }))
        .filter(voce => voce.uda);
}

function intervallo(min, max) {
    return min === max ? String(min) : `${min}–${max}`;
}

function disegnaRiepilogo() {
    const contenitore = document.getElementById('piano-riepilogo');
    contenitore.replaceChildren();
    const scelte = scelteOrdinate();
    if (!scelte.length) {
        contenitore.appendChild(avviso('Nessuna UDA selezionata: il riepilogo compare appena spunti la prima.'));
        return;
    }

    const righe = riepilogoOre();
    const tabella = document.createElement('table');
    tabella.className = 'piano-tabella';
    tabella.innerHTML = `<thead><tr><th scope="col">Insegnamento</th><th scope="col">Ore sulle UDA scelte</th><th scope="col">UDA coinvolte</th></tr></thead>`;
    const corpo = document.createElement('tbody');
    righe.forEach(riga => {
        const tr = document.createElement('tr');
        const nome = document.createElement('th');
        nome.scope = 'row';
        nome.textContent = riga.nome;
        const ore = document.createElement('td');
        ore.className = 'piano-ore';
        ore.textContent = intervallo(riga.min, riga.max);
        const quali = document.createElement('td');
        quali.className = 'piano-codici';
        quali.textContent = [...riga.perUda.keys()].join(' · ');
        tr.append(nome, ore, quali);
        corpo.appendChild(tr);
    });
    tabella.appendChild(corpo);

    const totaleMin = scelte.reduce((somma, voce) => somma + (stato.ripartizione[voce.chiave]?.totaleMin || 0), 0);
    const totaleMax = scelte.reduce((somma, voce) => somma + (stato.ripartizione[voce.chiave]?.totaleMax || 0), 0);
    const piede = document.createElement('tfoot');
    piede.innerHTML = `<tr><th scope="row">Totale delle UDA selezionate nella bozza</th><td class="piano-ore">${intervallo(totaleMin, totaleMax)}</td><td>${scelte.length} ${scelte.length === 1 ? 'unità' : 'unità di apprendimento'}</td></tr>`;
    tabella.appendChild(piede);

    contenitore.appendChild(tabella);

    const convenzionali = scelte.filter(voce => stato.ripartizione[voce.chiave]?.convenzionale);
    if (convenzionali.length) {
        const nota = document.createElement('p');
        nota.className = 'piano-nota';
        nota.textContent = stato.metaRipartizione.notaFSL
            || 'Le UDA di formazione scuola-lavoro non hanno un monte ore proprio: quello indicato è convenzionale e va sostituito con quello deliberato.';
        contenitore.appendChild(nota);
    }
}

function messaggioStato(testo) {
    document.querySelectorAll('.piano-stato').forEach(nodo => { nodo.textContent = testo; });
}

function aggiornaStato() {
    const scelte = scelteOrdinate();
    if (!annoScelto()) return messaggioStato('Scegli l’anno di corso per iniziare.');
    messaggioStato(scelte.length
        ? `${scelte.length} ${scelte.length === 1 ? 'UDA selezionata' : 'UDA selezionate'} · bozza salvata nel browser`
        : 'Nessuna UDA selezionata.');
}

function avviso(testo) {
    const nodo = document.createElement('p');
    nodo.className = 'piano-avviso';
    nodo.textContent = testo;
    return nodo;
}

// ------------------------------------------------------------------
// Importazione della scelta confermata dal collegio
// ------------------------------------------------------------------

async function importaScelta(daPulsante = false) {
    const messaggio = document.getElementById('piano-import-messaggio');
    const bottone = document.getElementById('piano-import');
    messaggio.textContent = 'Importazione dalla votazione temporaneamente sospesa. Seleziona le UDA concordate nel consiglio di classe.';
    return;
    const anno = annoScelto();
    if (!anno) {
        messaggio.textContent = 'Prima scegli l’anno di corso della classe.';
        return;
    }
    const revisione = window.CurricoloRevisione;
    if (!revisione) {
        messaggio.textContent = 'Servizio di votazione non disponibile: spunta le UDA a mano.';
        return;
    }
    // Fuori dallo spazio di votazione l'elenco dei voti non è leggibile: si
    // apre l'accesso e si riprova quando la sessione è attiva.
    if (revisione.modalita !== 'voto' || !revisione.docente) {
        if (!daPulsante) return;
        stato.importazioneInAttesa = true;
        messaggio.textContent = 'Accedi con le credenziali della votazione per leggere la scelta confermata.';
        await revisione.apriAccesso('voto');
        return;
    }

    stato.importazioneInAttesa = false;
    bottone.disabled = true;
    messaggio.textContent = 'Lettura delle delibere in corso…';
    try {
        const dati = await revisione.api('votes');
        const delibere = (dati.ballots || []).filter(voce => Number(voce.anno) === anno && (voce.scelta || []).length);
        if (!delibere.length) {
            messaggio.textContent = `Per il ${anno}° anno non risulta ancora una scelta confermata: spunta le UDA a mano oppure completa la votazione.`;
            return;
        }
        let aggiunte = 0;
        delibere.forEach(delibera => {
            (delibera.scelta || []).forEach(chiave => {
                const voce = stato.catalogo.get(String(chiave));
                if (!voce || stato.scelte.has(String(chiave))) return;
                stato.scelte.set(String(chiave), { periodo: periodoPredefinito(voce.uda) });
                aggiunte += 1;
            });
        });
        const quando = delibere
            .map(delibera => delibera.confermata_il ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(delibera.confermata_il)) : '')
            .filter(Boolean);
        messaggio.textContent = aggiunte
            ? `Importate ${aggiunte} ${aggiunte === 1 ? 'UDA confermata' : 'UDA confermate'} dal collegio${quando.length ? ` (conferma del ${quando.join(' e ')})` : ''}. Controlla i periodi e aggiungi le UDA di formazione scuola-lavoro, che non passano dalla votazione.`
            : 'Le UDA confermate erano già tutte selezionate.';
        salva();
        disegnaTutto();
    } catch (errore) {
        console.error('Scelta collegiale non leggibile:', errore);
        messaggio.textContent = errore.message || 'Non è stato possibile leggere la scelta confermata.';
    } finally {
        bottone.disabled = false;
    }
}

// ------------------------------------------------------------------
// Bozza nel browser
// ------------------------------------------------------------------

function salva() {
    try {
        localStorage.setItem(ARCHIVIO, JSON.stringify({
            dati: stato.dati,
            scelte: [...stato.scelte.entries()]
        }));
    } catch (errore) {
        console.warn('Bozza non salvata:', errore);
    }
}

function ripristina() {
    let salvato = null;
    try {
        salvato = JSON.parse(localStorage.getItem(ARCHIVIO) || 'null');
    } catch {
        salvato = null;
    }
    if (!salvato) return;
    stato.dati = salvato.dati || {};
    stato.scelte = new Map(salvato.scelte || []);
    CAMPI_LIBERI.forEach(campo => {
        if (stato.dati[campo] !== undefined) scriviCampo(campo, stato.dati[campo]);
    });
}

// Lo stesso campo può comparire in più punti della pagina: il formato del
// documento sta sia nella barra in cima sia in quella in fondo.
function scriviCampo(campo, valore, tranne) {
    document.querySelectorAll(`[data-campo="${campo}"]`).forEach(nodo => {
        if (nodo !== tranne) nodo.value = valore;
    });
}

function formatoScelto() {
    return FORMATI.includes(stato.dati.formato) ? stato.dati.formato : FORMATI[0];
}

function svuota() {
    if (!window.confirm('Vuoi svuotare il modulo? I dati della seduta e le UDA selezionate verranno cancellati da questo browser.')) return;
    stato.dati = {};
    stato.scelte = new Map();
    CAMPI_LIBERI.forEach(campo => scriviCampo(campo, campo === 'formato' ? FORMATI[0] : ''));
    try {
        localStorage.removeItem(ARCHIVIO);
    } catch (errore) {
        console.warn('Bozza non rimossa:', errore);
    }
    disegnaTutto();
}

// ------------------------------------------------------------------
// Documento
// ------------------------------------------------------------------

function consegna(modo) {
    const documento = window.CurricoloDocumento;
    if (!documento) return;
    const scelte = scelteOrdinate();
    if (!scelte.length) {
        messaggioStato('Seleziona almeno una UDA prima di stampare il piano.');
        return;
    }
    if (!stato.pronto || [...stato.scelte.keys()].some(k=>!stato.catalogo.has(k))) {
        messaggioStato('Cataloghi incompleti o schede non più disponibili: la bozza è conservata. Verifica prima di esportare.'); return;
    }
    if (scelte.some(v=>sovrapposizione(v.chiave))) {
        messaggioStato('Il piano contiene la stessa unità due volte, sotto voci diverse: togline una prima di esportare.'); return;
    }
    const { nodi, meta } = costruisciPiano(scelte);
    if (modo === 'word') {
        documento.scaricaDocx(
            documento.nomeFile(['Piano UDA', stato.dati.classe, stato.dati.annoScolastico], 'docx'),
            nodi,
            meta
        );
        messaggioStato(formatoScelto() === 'integrale' ? 'File Word generato, con le UDA integrali.' : 'File Word generato, in formato sintetico.');
    } else {
        documento.stampa(nodi, meta);
        messaggioStato('Anteprima di stampa aperta.');
    }
    setTimeout(aggiornaStato, 4000);
}

function costruisciPiano(scelte) {
    const d = window.CurricoloDocumento;
    const B = d.blocchi;
    const dati = stato.dati;
    const classe = dati.classe || '__________';
    const annoScolastico = dati.annoScolastico || '________';
    const integrale = formatoScelto() === 'integrale';
    const nomeDocumento = `Piano delle UDA — classe ${classe} — a.s. ${annoScolastico}`;
    const docenti = (dati.docenti || '').split('\n').map(riga => riga.trim()).filter(Boolean);

    const nodi = [
        ...d.testata(),
        B.paragrafo('Allegato alla programmazione del consiglio di classe', 'occhiello'),
        B.titolo(1, 'PIANO DELLE UNITÀ DI APPRENDIMENTO'),
        B.paragrafo(`Classe ${classe} — Anno scolastico ${annoScolastico}`, 'sottotitolo'),
        B.paragrafo(`${d.INDIRIZZO} · ${d.ANNO_ETICHETTA[annoScelto()] || ''}`, 'catenaccio'),
        ...d.tabellaVoci([
            ['Classe e sezione', classe],
            ['Anno di corso', d.ANNO_ETICHETTA[annoScelto()] || ''],
            ['Anno scolastico', annoScolastico],
            ['Coordinatore del consiglio di classe', dati.coordinatore || ''],
            ['Dirigente scolastico', dati.dirigente || ''],
            ['Seduta del consiglio di classe', d.dataItaliana(dati.dataSeduta)],
            ['Verbale n.', dati.verbale || ''],
            ['Unità di apprendimento selezionate nella bozza', String(scelte.length)],
            ['Formato del documento', integrale ? 'UDA integrali · format completo del Box n. 8' : 'Allegato sintetico · sezioni essenziali']
        ], { tieniVuote: true }),
        B.paragrafo('Bozza da verificare e approvare nel consiglio di classe. La compilazione non attesta una deliberazione. Le ore delle unità nate da accorpamento sono somme delle schede di origine, da deliberare.', 'nota'),
        ...notaFuoriDelibera(scelte),
        ...notaAltroAnno(),
        ...bloccoDelibera(scelte, docenti),
        ...d.sezione('2', 'Prospetto delle unità di apprendimento selezionate nella bozza', prospetto(scelte),
            'Le unità di apprendimento costituiscono il riferimento per la valutazione, la certificazione e il riconoscimento dei crediti — D.I. 92/2018, art. 2, comma 1.'),
        ...d.sezione('3', 'Ripartizione del monte ore fra gli insegnamenti', ripartizioneStampata(scelte),
            'La proposta iniziale è calcolata sul quadro orario d’istituto. La distribuzione può essere modificata liberamente in base alla progettazione collegiale; l’eventuale differenza rispetto al monte ore indicativo resta visibile.'),
        ...d.sezione('4', 'Impianto comune delle unità di apprendimento', impiantoComune()),
        ...((dati.note || '').trim()
            ? d.sezione('5', 'Note del consiglio di classe', [B.paragrafo(dati.note)])
            : []),
        ...schede(scelte),
        ...d.bloccoRiferimenti('Riferimenti normativi'),
        ...sottoscrizione(docenti),
        B.paragrafo(`Documento generato dal Curricolo Verticale SSAS dell’${d.ISTITUTO} — ${d.SEDE}. Profilo finale SSAS: D.I. 92/2018, Allegato 2-I; risultati intermedi: Linee guida D.M. 766/2019, Allegato C, sezione I. Le unità selezionate restano una bozza finché non sono adottate dal consiglio di classe.`, 'piede')
    ];

    return { nodi, meta: { titolo: nomeDocumento, istituto: d.ISTITUTO }, nomeDocumento };
}

// Se il consiglio ha preso unità che il Dipartimento non ha adottato, il
// documento lo dice in apertura: chi lo legge non deve ricostruirlo dai codici.
function notaFuoriDelibera(scelte) {
    const B = window.CurricoloDocumento.blocchi;
    const fuori = scelte.filter(voce => fuoriDelibera(voce.chiave));
    if (!fuori.length) return [];
    const elenco = fuori.map(voce => `${voce.uda.id} · ${voce.uda.titolo}`).join('; ');
    return [B.paragrafo(fuori.length === 1
        ? `Un’unità del piano non rientra fra quelle adottate dal Dipartimento per questo anno di corso: ${elenco}. La sua attivazione è una scelta del consiglio di classe.`
        : `${fuori.length} unità del piano non rientrano fra quelle adottate dal Dipartimento per questo anno di corso: ${elenco}. La loro attivazione è una scelta del consiglio di classe.`, 'nota')];
}

function notaAltroAnno() {
    const B = window.CurricoloDocumento.blocchi;
    const altre = scelteDiAltroAnno();
    if (!altre.length) return [];
    return [B.paragrafo(`Attenzione: ${altre.length === 1 ? 'un’unità del piano è prevista' : `${altre.length} unità del piano sono previste`} per un altro anno di corso (${altre.map(voce => `${voce.uda.id}, ${voce.uda.anno}ª`).join('; ')}). Verifica la selezione prima di allegare il documento.`, 'nota')];
}

function bloccoDelibera(scelte, docenti) {
    const d = window.CurricoloDocumento;
    const B = d.blocchi;
    const dati = stato.dati;
    const seduta = d.dataItaliana(dati.dataSeduta) || '____________';
    const verbale = dati.verbale || '____';
    const classe = dati.classe || '__________';
    const annoScolastico = dati.annoScolastico || '________';
    const quanti = docenti.length ? `, composto da ${docenti.length} docenti` : '';
    const quante = scelte.length === 1
        ? 'L’unità indicata è progettata'
        : `Le ${scelte.length} unità indicate sono progettate`;

    return d.sezione('1', 'Deliberazione del consiglio di classe', [
        B.riquadro([
            B.paragrafo([
                B.testo('Il Consiglio della classe '),
                B.testo(classe, { grassetto: true }),
                B.testo(` dell’indirizzo ${d.INDIRIZZO}${quanti}, riunito in data `),
                B.testo(seduta, { grassetto: true }),
                B.testo(` (verbale n. ${verbale}) e presieduto dal dirigente scolastico oppure da un docente membro da lui delegato, conclusa la consultazione sulle proposte dei dipartimenti e dei singoli docenti, `),
                B.testo('approva il presente Piano delle unità di apprendimento', { grassetto: true }),
                B.testo(` per l’anno scolastico ${annoScolastico}, che costituisce parte integrante della programmazione di classe.`)
            ]),
            B.paragrafo(`${quante} in forma interdisciplinare, con l’aggregazione degli insegnamenti negli assi culturali e il ricorso a metodologie di apprendimento di tipo induttivo, in attuazione dell’art. 5, comma 1, lettere b), c), d) ed f) del D.Lgs. 13 aprile 2017, n. 61, e dell’art. 6, comma 4, del D.M. 24 maggio 2018, n. 92.`),
            B.paragrafo('Per gli studenti la cui progettazione è personalizzata, le unità qui deliberate possono concorrere a strutturare il PFI, articolato per unità di apprendimento (D.I. 92/2018, art. 2, comma 1). La valutazione di competenze, abilità e conoscenze è effettuata in relazione alle UDA e al PFI (art. 4, comma 6).')
        ])
    ]);
}

function prospetto(scelte) {
    const d = window.CurricoloDocumento;
    const B = d.blocchi;
    return [B.tabella({
        intestazioni: ['#', 'Codice', 'Denominazione e tipologia', 'Competenze', 'Periodo', 'Ore'],
        larghezze: [4, 10, 40, 16, 18, 12],
        righe: scelte.map((voce, indice) => [
            { frammenti: B.frammenti(String(indice + 1)), allineamento: 'center' },
            { frammenti: B.frammenti(String(voce.uda.id)), grassetto: true },
            {
                frammenti: [
                    B.testo(`${voce.uda.titolo}\n`),
                    B.testo(d.nomeGenere(voce.genere) + (voce.uda.areaTirocinio ? ` · ${voce.uda.areaTirocinio}` : ''), { piccolo: true })
                ]
            },
            competenzeSintetiche(voce),
            voce.scelta.periodo || '',
            { frammenti: B.frammenti(oreDocumento(voce)), allineamento: 'center' }
        ])
    })];
}

function competenzeSintetiche(voce) {
    const uda = voce.uda;
    const codici = [];
    if (uda.competenza) codici.push(`C${uda.competenza}`);
    // Nelle schede d'esame ogni competenza è un oggetto con numero e traguardo,
    // negli altri cataloghi è il numero e basta.
    (uda.competenzeSSAS || uda.competenze || []).forEach(voce => {
        const numero = voce && typeof voce === 'object' ? voce.numero : voce;
        if (numero !== undefined && numero !== null) codici.push(`C${numero}`);
    });
    (uda.competenzeGenerali || []).forEach(numero => codici.push(`G${numero}`));
    return [...new Set(codici)].join(' · ');
}

function oreDocumento(voce) {
    const ripartizione = stato.ripartizione[voce.chiave];
    if (!ripartizione) return String(voce.uda.ore || voce.uda.durata || '');
    const testoOre = intervallo(ripartizione.totaleMin, ripartizione.totaleMax);
    return ripartizione.convenzionale ? `${testoOre}*` : testoOre;
}

// Matrice insegnamenti × UDA finché le colonne stanno in pagina; oltre, il
// totale per insegnamento, che è il dato che serve davvero.
function ripartizioneStampata(scelte) {
    const d = window.CurricoloDocumento;
    const B = d.blocchi;
    const righe = riepilogoOre();
    if (!righe.length) return [];
    const totaleMin = scelte.reduce((somma, voce) => somma + (stato.ripartizione[voce.chiave]?.totaleMin || 0), 0);
    const totaleMax = scelte.reduce((somma, voce) => somma + (stato.ripartizione[voce.chiave]?.totaleMax || 0), 0);
    const convenzionali = scelte.some(voce => stato.ripartizione[voce.chiave]?.convenzionale);
    const nota = convenzionali
        ? [B.paragrafo(`* ${stato.metaRipartizione.notaFSL || 'Le UDA di formazione scuola-lavoro non hanno un monte ore proprio: quello indicato è convenzionale e va sostituito con quello deliberato nel piano FSL d’istituto.'}`, 'nota')]
        : [];

    if (scelte.length <= 8) {
        const larghezzaCodice = Math.floor(62 / (scelte.length + 1));
        const corpo = righe.map(riga => [
            riga.nome,
            ...scelte.map(voce => {
                const cella = riga.perUda.get(voce.chiave);
                return { frammenti: B.frammenti(cella ? intervallo(cella.min, cella.max) : '—'), allineamento: 'center' };
            }),
            { frammenti: B.frammenti(intervallo(riga.min, riga.max)), grassetto: true, allineamento: 'center' }
        ]);
        corpo.push([
            { frammenti: B.frammenti('Monte ore dell’UDA'), grassetto: true },
            ...scelte.map(voce => ({ frammenti: B.frammenti(oreDocumento(voce)), grassetto: true, allineamento: 'center' })),
            { frammenti: B.frammenti(intervallo(totaleMin, totaleMax)), grassetto: true, allineamento: 'center' }
        ]);
        return [
            B.tabella({
                intestazioni: ['Insegnamento', ...scelte.map(voce => String(voce.uda.id)), 'Totale'],
                larghezze: [38, ...scelte.map(() => larghezzaCodice), 62 - larghezzaCodice * scelte.length],
                righe: corpo
            }),
            ...nota
        ];
    }

    const corpo = righe.map(riga => [
        riga.nome,
        { frammenti: B.frammenti(intervallo(riga.min, riga.max)), allineamento: 'center' },
        { frammenti: [B.testo([...riga.perUda.keys()].join(' · '), { piccolo: true })] }
    ]);
    corpo.push([
        { frammenti: B.frammenti('Totale delle UDA selezionate nella bozza'), grassetto: true },
        { frammenti: B.frammenti(intervallo(totaleMin, totaleMax)), grassetto: true, allineamento: 'center' },
        ''
    ]);
    return [
        B.tabella({ intestazioni: ['Insegnamento', 'Ore complessive', 'UDA coinvolte'], larghezze: [38, 18, 44], righe: corpo }),
        ...nota
    ];
}

function impiantoComune() {
    const d = window.CurricoloDocumento;
    const B = d.blocchi;
    const chiaveAsse = stato.ordine.find(chiave => stato.catalogo.get(chiave)?.genere === 'asse');
    const metaAsse = stato.catalogo.get(chiaveAsse)?.meta || {};
    const nodi = [];
    if ((metaAsse.fasiStandard || []).length) {
        nodi.push(B.titolo(3, 'Fasi comuni a ogni unità di apprendimento'));
        nodi.push(B.elenco(metaAsse.fasiStandard, true));
    }
    if (metaAsse.valutazioneStandard) {
        nodi.push(B.titolo(3, 'Valutazione'));
        nodi.push(B.paragrafo(metaAsse.valutazioneStandard));
        nodi.push(B.paragrafo('Rubrica ad almeno quattro livelli — Linee guida D.M. 766/2019, Box n. 8, voce 8; valutazione di competenze, abilità e conoscenze in relazione alle UDA e al PFI — D.I. 92/2018, art. 4, comma 6.', 'fonte'));
    }
    return nodi;
}

function schede(scelte) {
    const d = window.CurricoloDocumento;
    const B = d.blocchi;
    if (!scelte.length) return [];
    const integrale = formatoScelto() === 'integrale';
    const nodi = [
        B.titolo(2, integrale
            ? 'Unità di apprendimento in forma integrale'
            : 'Schede sintetiche delle unità di apprendimento'),
        B.paragrafo(integrale
            ? 'Format dell’unità di apprendimento — Linee guida D.M. 766/2019, Box n. 8. Ogni unità esce completa: le sezioni su fasi, accompagnamento, documentazione, rubrica e note restano predisposte da compilare in consiglio.'
            : 'Format dell’unità di apprendimento — Linee guida D.M. 766/2019, Box n. 8, sezioni essenziali. La scheda completa di ciascuna unità, con fasi, attività di accompagnamento, documentazione e rubrica, si ottiene scegliendo il formato integrale oppure dalla scheda della singola UDA.', 'fonte')
    ];
    scelte.forEach((voce, indice) => {
        // In forma sintetica solo la prima scheda apre una pagina nuova: le
        // altre sono lunghe una pagina e mezza e forzare il salto lascerebbe
        // mezze pagine bianche. In forma integrale ogni unità è un documento a
        // sé e la pagina nuova ci vuole.
        if (indice === 0 || integrale) nodi.push(B.interruzione());
        nodi.push(B.titolo(2, `${integrale ? 'Unità' : 'Scheda'} ${indice + 1} — ${voce.uda.id} · ${voce.uda.titolo}`));
        nodi.push(B.paragrafo([
            d.nomeGenere(voce.genere),
            voce.scelta.periodo || '',
            `${oreDocumento(voce)} ore`,
            fuoriDelibera(voce.chiave) ? 'fuori delibera dipartimentale' : ''
        ].filter(Boolean).join(' · '), 'fonte'));
        nodi.push(...(d.eScheda(voce.uda)
            ? d.schedaEsame(voce.uda, { meta: voce.meta })
            : d.schedaUda(voce.uda, {
                meta: voce.meta,
                genere: voce.genere,
                ripartizione: stato.ripartizione,
                compatta: !integrale
            })));
    });
    return nodi;
}

function sottoscrizione(docenti) {
    const d = window.CurricoloDocumento;
    const B = d.blocchi;
    const righe = docenti.length
        ? docenti.map(riga => [riga, ''])
        : Array.from({ length: 8 }, () => ['', '']);
    return [
        B.titolo(2, 'Sottoscrizione'),
        B.paragrafo('Il presente piano è stato approvato dal consiglio di classe nella seduta indicata e viene allegato alla programmazione di classe.'),
        B.tabella({ intestazioni: ['Docente e insegnamento', 'Firma'], larghezze: [58, 42], righe }),
        B.firme(['Il/La coordinatore/coordinatrice del consiglio di classe', 'Il Dirigente scolastico'])
    ];
}
