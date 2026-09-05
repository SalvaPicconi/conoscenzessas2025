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
// lo stesso di assets/uda-voto.js, e si leggono le delibere già registrate.
//
// Nulla viene inviato: la bozza vive nel localStorage del browser di chi
// compila, perché un piano a metà non deve andare perso fra una seduta e la
// stampa, ma non riguarda nessun altro.

const CATALOGHI = [
    { genere: 'asse', fonte: 'data-uda.json', nome: 'UDA d’asse', descrizione: 'Una per competenza intermedia del curricolo di indirizzo.' },
    { genere: 'trasversale', fonte: 'data-uda-trasversali.json', nome: 'UDA trasversali', descrizione: 'Interdisciplinari, a cavallo di più assi culturali.' },
    { genere: 'fsl', fonte: 'data-uda-fsl.json', nome: 'UDA di formazione scuola-lavoro', descrizione: 'Percorsi collegati all’area di tirocinio (già PCTO).' }
];
const FONTE_RIPARTIZIONE = 'data-ripartizione-ore.json';
const ARCHIVIO = 'curricolo:piano-uda';
const PERIODI = ['1° quadrimestre', '2° quadrimestre', 'Intero anno scolastico'];
const CAMPI_LIBERI = ['anno', 'classe', 'annoScolastico', 'coordinatore', 'dirigente', 'dataSeduta', 'verbale', 'docenti', 'note'];
// I termini che il Piano usa davvero: si stampano in coda con definizione e
// norma, così l'allegato si legge anche fuori dal consiglio che l'ha scritto.
const TERMINI_PIANO = ['uda', 'piano-uda', 'consiglio-classe', 'competenza', 'traguardo-intermedio',
    'compito-di-realta', 'quadro-orario', 'rubrica', 'qnq'];

const stato = {
    catalogo: new Map(),   // id → { uda, genere, meta }
    ordine: [],            // id nell'ordine dei cataloghi
    ripartizione: {},
    metaRipartizione: {},
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
        carica(FONTE_RIPARTIZIONE)
    ]);
    const ore = risposte.pop();
    stato.ripartizione = (ore && ore.uda) || {};
    stato.metaRipartizione = (ore && ore.meta) || {};

    risposte.forEach((dati, indice) => {
        if (!dati) return;
        const catalogo = CATALOGHI[indice];
        (dati.uda || []).forEach(uda => {
            const chiave = String(uda.id);
            stato.catalogo.set(chiave, { uda, genere: catalogo.genere, meta: dati.meta || {} });
            stato.ordine.push(chiave);
        });
    });

    stato.pronto = stato.catalogo.size > 0;
    // Le UDA salvate in bozza ma non più presenti nei cataloghi vanno tolte,
    // altrimenti il piano stampato conterrebbe righe vuote.
    [...stato.scelte.keys()].forEach(chiave => {
        if (!stato.catalogo.has(chiave)) stato.scelte.delete(chiave);
    });
    disegnaTutto();
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
        const nodo = document.querySelector(`[data-campo="${campo}"]`);
        if (!nodo) return;
        const evento = nodo.tagName === 'SELECT' || nodo.type === 'date' ? 'change' : 'input';
        nodo.addEventListener(evento, () => {
            stato.dati[campo] = nodo.value;
            salva();
            if (campo === 'anno') disegnaTutto();
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

// L'elenco delle norme arriva da data-normativa.json attraverso il motore
// documentale: si disegna quando il caricamento è finito, non prima.
function disegnaNorme() {
    const documento = window.CurricoloDocumento;
    if (!documento) return;
    if (documento.pronto) return documento.pronto.then(scriviNorme);
    scriviNorme();
}

function scriviNorme() {
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

    CATALOGHI.forEach(catalogo => {
        const voci = udaDellAnno(catalogo.genere);
        const gruppo = document.createElement('section');
        gruppo.className = 'piano-gruppo';

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
            gruppo.appendChild(avviso(`Nessuna ${catalogo.nome.toLowerCase()} prevista per questo anno di corso.`));
            contenitore.appendChild(gruppo);
            return;
        }

        voci.forEach(voce => gruppo.appendChild(creaVoce(voce)));
        contenitore.appendChild(gruppo);
    });
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
        if (casella.checked) stato.scelte.set(chiave, { periodo: periodoPredefinito(uda) });
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
    return uda.ore ? `${uda.ore} ore` : '';
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
    piede.innerHTML = `<tr><th scope="row">Totale delle UDA deliberate</th><td class="piano-ore">${intervallo(totaleMin, totaleMax)}</td><td>${scelte.length} ${scelte.length === 1 ? 'unità' : 'unità di apprendimento'}</td></tr>`;
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
        ? `${scelte.length} ${scelte.length === 1 ? 'UDA deliberata' : 'UDA deliberate'} · bozza salvata nel browser`
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
        const nodo = document.querySelector(`[data-campo="${campo}"]`);
        if (nodo && stato.dati[campo] !== undefined) nodo.value = stato.dati[campo];
    });
}

function svuota() {
    if (!window.confirm('Vuoi svuotare il modulo? I dati della seduta e le UDA selezionate verranno cancellati da questo browser.')) return;
    stato.dati = {};
    stato.scelte = new Map();
    CAMPI_LIBERI.forEach(campo => {
        const nodo = document.querySelector(`[data-campo="${campo}"]`);
        if (nodo) nodo.value = '';
    });
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
    const { html } = costruisciPiano(scelte);
    if (modo === 'word') {
        documento.scaricaWord(documento.nomeFile(['Piano UDA', stato.dati.classe, stato.dati.annoScolastico], 'doc'), html);
        messaggioStato('File Word generato.');
    } else {
        documento.stampa(html);
        messaggioStato('Anteprima di stampa aperta.');
    }
    setTimeout(aggiornaStato, 4000);
}

function costruisciPiano(scelte) {
    const d = window.CurricoloDocumento;
    const dati = stato.dati;
    const classe = dati.classe || '__________';
    const annoScolastico = dati.annoScolastico || '________';
    const nomeDocumento = `Piano delle UDA — classe ${classe} — a.s. ${annoScolastico}`;
    const docenti = (dati.docenti || '').split('\n').map(riga => riga.trim()).filter(Boolean);

    const parti = [];
    parti.push(d.testata());
    parti.push('<p class="doc-occhiello">Allegato alla programmazione del consiglio di classe</p>');
    parti.push('<h1>PIANO DELLE UNITÀ DI APPRENDIMENTO</h1>');
    parti.push(`<p class="doc-sottotitolo">Classe ${d.esc(classe)} — Anno scolastico ${d.esc(annoScolastico)}</p>`);
    parti.push(`<p class="doc-catenaccio">${d.esc(d.INDIRIZZO)} · ${d.esc(d.ANNO_ETICHETTA[annoScelto()] || '')}</p>`);

    parti.push(d.tabellaVoci([
        ['Classe e sezione', d.esc(classe)],
        ['Anno di corso', d.esc(d.ANNO_ETICHETTA[annoScelto()] || '')],
        ['Anno scolastico', d.esc(annoScolastico)],
        ['Coordinatore del consiglio di classe', d.esc(dati.coordinatore || '')],
        ['Dirigente scolastico', d.esc(dati.dirigente || '')],
        ['Seduta del consiglio di classe', d.dataItaliana(dati.dataSeduta)],
        ['Verbale n.', d.esc(dati.verbale || '')],
        ['Unità di apprendimento deliberate', `${scelte.length}`]
    ], { tieniVuote: true }));

    parti.push(bloccoDelibera(scelte, docenti));
    parti.push(d.sezione('2', 'Prospetto delle unità di apprendimento deliberate', prospetto(scelte),
        'Le unità di apprendimento costituiscono il riferimento per la valutazione, la certificazione e il riconoscimento dei crediti — D.Lgs. 61/2017, art. 2, comma 1.'));
    parti.push(d.sezione('3', 'Ripartizione del monte ore fra gli insegnamenti', ripartizioneStampata(scelte),
        'Proposta proporzionale calcolata sul quadro orario d’istituto. Ogni docente può modificare le ore del proprio insegnamento entro il 40%, purché la somma copra il monte ore dell’unità.'));
    parti.push(d.sezione('4', 'Impianto comune delle unità di apprendimento', impiantoComune()));
    if ((dati.note || '').trim()) {
        parti.push(d.sezione('5', 'Note del consiglio di classe', d.paragrafo(dati.note)));
    }

    parti.push(schede(scelte));
    parti.push(d.bloccoGlossario(TERMINI_PIANO, 'Glossario dei termini usati nel Piano'));
    parti.push(d.bloccoRiferimenti('Riferimenti normativi'));
    parti.push(sottoscrizione(docenti));

    parti.push(`<p class="doc-piede">Documento generato dal Curricolo Verticale SSAS dell’${d.esc(d.ISTITUTO)} — ${d.esc(d.SEDE)}. I contenuti delle unità derivano dal curricolo di indirizzo (D.M. 92/2018, Allegato C) e dai cataloghi delle UDA d’asse, trasversali e di formazione scuola-lavoro.</p>`);

    return { html: d.documento({ titolo: nomeDocumento, corpo: parti.filter(Boolean).join('\n'), nomeDocumento }), nomeDocumento };
}

function bloccoDelibera(scelte, docenti) {
    const d = window.CurricoloDocumento;
    const dati = stato.dati;
    const seduta = d.dataItaliana(dati.dataSeduta) || '____________';
    const verbale = d.esc(dati.verbale || '____');
    const classe = d.esc(dati.classe || '__________');
    const annoScolastico = d.esc(dati.annoScolastico || '________');
    const quanti = docenti.length ? `, composto da ${docenti.length} docenti` : '';

    return d.sezione('1', 'Deliberazione del consiglio di classe', `
        <div class="doc-delibera">
            <p>Il Consiglio della classe <strong>${classe}</strong> dell’indirizzo ${d.esc(d.INDIRIZZO)}${quanti},
            riunito in data <strong>${seduta}</strong> (verbale n. ${verbale}) e presieduto dal coordinatore su delega
            del dirigente scolastico, conclusa la consultazione sulle proposte dei dipartimenti e dei singoli docenti,
            <strong>approva il presente Piano delle unità di apprendimento</strong> per l’anno scolastico
            ${annoScolastico}, che costituisce parte integrante della programmazione di classe.</p>
            <p>Le ${scelte.length === 1 ? 'unità indicata è progettata' : `${scelte.length} unità indicate sono progettate`}
            in forma interdisciplinare, con l’aggregazione degli insegnamenti negli assi culturali e il ricorso a
            metodologie di apprendimento di tipo induttivo, in attuazione dell’art. 5, comma 1, lettere b), c), d) ed f)
            del D.Lgs. 13 aprile 2017, n. 61, e dell’art. 6, comma 4, del D.M. 24 maggio 2018, n. 92.</p>
            <p>Per gli studenti la cui progettazione è personalizzata, le unità qui deliberate sono quelle «nelle quali
            è strutturato il Progetto formativo individuale» (D.M. 92/2018, art. 4, comma 6) e i loro risultati
            costituiscono oggetto della valutazione (art. 4, comma 7).</p>
        </div>`);
}

function prospetto(scelte) {
    const d = window.CurricoloDocumento;
    const righe = scelte.map((voce, indice) => [
        `<span class="num">${indice + 1}</span>`,
        `<strong>${d.esc(voce.uda.id)}</strong>`,
        `${d.esc(voce.uda.titolo)}<br><span class="doc-ins">${d.esc(nomeGenere(voce.genere))}${voce.uda.areaTirocinio ? ` · ${d.esc(voce.uda.areaTirocinio)}` : ''}</span>`,
        d.esc(competenzeSintetiche(voce)),
        d.esc(voce.scelta.periodo || ''),
        `<span class="num">${d.esc(oreDocumento(voce))}</span>`
    ]);
    return d.tabellaColonne(['#', 'Codice', 'Denominazione e tipologia', 'Competenze', 'Periodo', 'Ore'], righe, 'doc-tab-prospetto');
}

function nomeGenere(genere) {
    return genere === 'trasversale' ? 'UDA trasversale'
        : genere === 'fsl' ? 'UDA di formazione scuola-lavoro'
        : 'UDA d’asse';
}

function competenzeSintetiche(voce) {
    const uda = voce.uda;
    const codici = [];
    if (uda.competenza) codici.push(`C${uda.competenza}`);
    (uda.competenzeSSAS || []).forEach(numero => codici.push(`C${numero}`));
    (uda.competenzeGenerali || []).forEach(numero => codici.push(`G${numero}`));
    return [...new Set(codici)].join(' · ');
}

function oreDocumento(voce) {
    const ripartizione = stato.ripartizione[voce.chiave];
    if (!ripartizione) return voce.uda.ore || '';
    const testo = intervallo(ripartizione.totaleMin, ripartizione.totaleMax);
    return ripartizione.convenzionale ? `${testo}*` : testo;
}

// Matrice insegnamenti × UDA finché le colonne stanno in pagina; oltre, il
// totale per insegnamento, che è il dato che serve davvero.
function ripartizioneStampata(scelte) {
    const d = window.CurricoloDocumento;
    const righe = riepilogoOre();
    if (!righe.length) return '';
    const totaleMin = scelte.reduce((somma, voce) => somma + (stato.ripartizione[voce.chiave]?.totaleMin || 0), 0);
    const totaleMax = scelte.reduce((somma, voce) => somma + (stato.ripartizione[voce.chiave]?.totaleMax || 0), 0);
    const convenzionali = scelte.some(voce => stato.ripartizione[voce.chiave]?.convenzionale);
    const nota = convenzionali
        ? `<p class="doc-nota">* ${d.esc(stato.metaRipartizione.notaFSL || 'Le UDA di formazione scuola-lavoro non hanno un monte ore proprio: quello indicato è convenzionale e va sostituito con quello deliberato nel piano FSL d’istituto.')}</p>`
        : '';

    if (scelte.length <= 8) {
        const intestazioni = ['Insegnamento', ...scelte.map(voce => voce.uda.id), 'Totale'];
        const corpo = righe.map(riga => [
            d.esc(riga.nome),
            ...scelte.map(voce => {
                const cella = riga.perUda.get(voce.chiave);
                return `<span class="num">${cella ? d.esc(intervallo(cella.min, cella.max)) : '—'}</span>`;
            }),
            `<span class="num"><strong>${d.esc(intervallo(riga.min, riga.max))}</strong></span>`
        ]);
        corpo.push([
            '<strong>Monte ore dell’UDA</strong>',
            ...scelte.map(voce => `<span class="num"><strong>${d.esc(oreDocumento(voce))}</strong></span>`),
            `<span class="num"><strong>${d.esc(intervallo(totaleMin, totaleMax))}</strong></span>`
        ]);
        return d.tabellaColonne(intestazioni, corpo, 'doc-tab-matrice') + nota;
    }

    const corpo = righe.map(riga => [
        d.esc(riga.nome),
        `<span class="num">${d.esc(intervallo(riga.min, riga.max))}</span>`,
        `<span class="doc-ins">${d.esc([...riga.perUda.keys()].join(' · '))}</span>`
    ]);
    corpo.push([
        '<strong>Totale delle UDA deliberate</strong>',
        `<span class="num"><strong>${d.esc(intervallo(totaleMin, totaleMax))}</strong></span>`,
        ''
    ]);
    return d.tabellaColonne(['Insegnamento', 'Ore complessive', 'UDA coinvolte'], corpo, 'doc-tab-ore') + nota;
}

function impiantoComune() {
    const d = window.CurricoloDocumento;
    const metaAsse = stato.catalogo.get(stato.ordine.find(chiave => stato.catalogo.get(chiave)?.genere === 'asse'))?.meta || {};
    const fasi = metaAsse.fasiStandard || [];
    const valutazione = metaAsse.valutazioneStandard || '';
    const parti = [];
    if (fasi.length) {
        parti.push('<h3>Fasi comuni a ogni unità di apprendimento</h3>');
        parti.push(`<ol class="doc-lista">${fasi.map(fase => `<li>${d.esc(fase)}</li>`).join('')}</ol>`);
    }
    if (valutazione) {
        parti.push('<h3>Valutazione</h3>');
        parti.push(`<p>${d.esc(valutazione)}</p>`);
        parti.push('<p class="doc-fonte">Rubrica ad almeno quattro livelli — Linee guida D.M. 766/2019, Box n. 8, voce 8; la valutazione ha per oggetto i risultati delle unità di apprendimento — D.M. 92/2018, art. 4, comma 7.</p>');
    }
    return parti.join('');
}

function schede(scelte) {
    const d = window.CurricoloDocumento;
    const blocchi = scelte.map((voce, indice) => {
        const scheda = d.schedaUda(voce.uda, {
            meta: voce.meta,
            genere: voce.genere,
            ripartizione: stato.ripartizione,
            compatta: true
        });
        // Solo la prima scheda apre una pagina nuova: le altre sono lunghe una
        // pagina e mezza e forzare il salto lascerebbe mezze pagine bianche.
        return `<div class="doc-scheda doc-compatta ${indice === 0 ? 'doc-scheda-nuova' : ''}">
            <h2>Scheda ${indice + 1} — ${d.esc(voce.uda.id)} · ${d.esc(voce.uda.titolo)}</h2>
            <p class="doc-fonte">${d.esc(nomeGenere(voce.genere))} · ${d.esc(voce.scelta.periodo || '')} · ${d.esc(oreDocumento(voce))} ore</p>
            ${scheda}
        </div>`;
    });
    if (!blocchi.length) return '';
    return `<section class="doc-sezione">
        <h2>Schede sintetiche delle unità di apprendimento</h2>
        <p class="doc-fonte">Format dell’unità di apprendimento — Linee guida D.M. 766/2019, Box n. 8. La scheda completa di ciascuna unità, con fasi, attività di accompagnamento, documentazione e rubrica, si scarica dal fascicolo delle UDA.</p>
    </section>
    ${blocchi.join('')}`;
}

function sottoscrizione(docenti) {
    const d = window.CurricoloDocumento;
    const righe = docenti.length
        ? docenti.map(riga => [d.esc(riga), '&nbsp;'])
        : Array.from({ length: 8 }, () => ['&nbsp;', '&nbsp;']);
    const tabella = d.tabellaColonne(['Docente e insegnamento', 'Firma'], righe, 'doc-tab-firme');
    return `<section class="doc-sezione">
        <h2>Sottoscrizione</h2>
        <p>Il presente piano è stato approvato dal consiglio di classe nella seduta indicata e viene allegato alla
        programmazione di classe.</p>
        ${tabella}
        <table class="doc-firme">
            <tr><td class="linea"></td><td class="linea"></td></tr>
            <tr><td>Il/La coordinatore/coordinatrice del consiglio di classe</td><td>Il Dirigente scolastico</td></tr>
        </table>
    </section>`;
}
