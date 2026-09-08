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
    { genere: 'unificate', fonte: 'data-uda-unificate.json', nome: 'UDA unificate · Proposte', descrizione: 'Accorpamenti da concordare. Le ore sono la somma delle origini, da deliberare.' },
    { genere: 'asse', fonte: 'data-uda.json', nome: 'UDA d’asse', descrizione: 'Una per competenza intermedia del curricolo di indirizzo.' },
    { genere: 'trasversale', fonte: 'data-uda-trasversali.json', nome: 'UDA trasversali', descrizione: 'Interdisciplinari, a cavallo di più assi culturali.' },
    { genere: 'fsl', fonte: 'data-uda-fsl.json', nome: 'UDA di formazione scuola-lavoro', descrizione: 'Percorsi collegati all’area di tirocinio (già PCTO).' }
];
const FONTE_RIPARTIZIONE = 'data-ripartizione-ore.json';
const ARCHIVIO = 'curricolo:piano-uda';
const PERIODI = ['1° quadrimestre', '2° quadrimestre', 'Intero anno scolastico'];
const CAMPI_LIBERI = ['anno', 'classe', 'annoScolastico', 'coordinatore', 'dirigente', 'dataSeduta', 'verbale', 'docenti', 'note'];

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

    // Le ore delle proposte unificate conservano le somme delle origini.
    for (const [id, voce] of stato.catalogo) {
        if (voce.genere !== 'unificate') continue;
        const origini = (voce.uda.fonde || []).map(o => stato.ripartizione[o.id]);
        if (!origini.length || origini.some(o => !o)) continue;
        const materie = new Map();
        for (const origine of origini) for (const r of origine.voci) {
            const somma = materie.get(r.ins) || { ins: r.ins, min: 0, max: 0 };
            somma.min += r.min; somma.max += r.max; materie.set(r.ins, somma);
        }
        stato.ripartizione[id] = { totaleMin: origini.reduce((n,r)=>n+r.totaleMin,0),
            totaleMax: origini.reduce((n,r)=>n+r.totaleMax,0), voci: [...materie.values()],
            senzaOre: [...new Set(origini.flatMap(r=>r.senzaOre || []))] };
    }
    stato.pronto = risposte.every(Boolean) && Boolean(ore);
    // Le UDA salvate in bozza ma non più presenti nei cataloghi vanno tolte,
    // altrimenti il piano stampato conterrebbe righe vuote.
    // Conservare le scelte anche in caso di caricamento incompleto; bloccare l'export.
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

function originiDi(chiave) {
    const voce = stato.catalogo.get(chiave);
    return voce?.genere === 'unificate' ? (voce.uda.fonde || []).map(o=>o.id) : voce?.genere === 'asse' ? [chiave] : [];
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
                messaggioStato('Questa UDA comprende origini già selezionate. Scegli la proposta unificata oppure le schede originarie.');
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
    if (!stato.pronto || [...stato.scelte.keys()].some(k=>!stato.catalogo.has(k))) {
        messaggioStato('Cataloghi incompleti o schede non più disponibili: la bozza è conservata. Verifica prima di esportare.'); return;
    }
    if (scelte.some(v=>sovrapposizione(v.chiave))) {
        messaggioStato('Il piano contiene origini duplicate: scegli le unificate oppure le schede originarie.'); return;
    }
    const { nodi, meta } = costruisciPiano(scelte);
    if (modo === 'word') {
        documento.scaricaDocx(
            documento.nomeFile(['Piano UDA', stato.dati.classe, stato.dati.annoScolastico], 'docx'),
            nodi,
            meta
        );
        messaggioStato('File Word generato.');
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
            ['Unità di apprendimento selezionate nella bozza', String(scelte.length)]
        ], { tieniVuote: true }),
        B.paragrafo('Bozza da verificare e approvare nel consiglio di classe. La compilazione non attesta una deliberazione. Le ore delle UDA unificate sono somme di origine, da deliberare.', 'nota'),
        ...bloccoDelibera(scelte, docenti),
        ...d.sezione('2', 'Prospetto delle unità di apprendimento selezionate nella bozza', prospetto(scelte),
            'Le unità di apprendimento costituiscono il riferimento per la valutazione, la certificazione e il riconoscimento dei crediti — D.I. 92/2018, art. 2, comma 1.'),
        ...d.sezione('3', 'Ripartizione del monte ore fra gli insegnamenti', ripartizioneStampata(scelte),
            'Proposta proporzionale calcolata sul quadro orario d’istituto. La modifica entro il 40% è una regola operativa interna del sito, non una percentuale prevista dalla normativa; la somma deve coprire il monte ore dell’unità.'),
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
    (uda.competenzeSSAS || uda.competenze || []).forEach(numero => codici.push(`C${numero}`));
    (uda.competenzeGenerali || []).forEach(numero => codici.push(`G${numero}`));
    return [...new Set(codici)].join(' · ');
}

function oreDocumento(voce) {
    const ripartizione = stato.ripartizione[voce.chiave];
    if (!ripartizione) return voce.uda.ore || '';
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
    const nodi = [
        B.titolo(2, 'Schede sintetiche delle unità di apprendimento'),
        B.paragrafo('Format dell’unità di apprendimento — Linee guida D.M. 766/2019, Box n. 8. La scheda completa di ciascuna unità, con fasi, attività di accompagnamento, documentazione e rubrica, si scarica dal fascicolo delle UDA.', 'fonte')
    ];
    scelte.forEach((voce, indice) => {
        // Solo la prima scheda apre una pagina nuova: le altre sono lunghe una
        // pagina e mezza e forzare il salto lascerebbe mezze pagine bianche.
        if (indice === 0) nodi.push(B.interruzione());
        nodi.push(B.titolo(2, `Scheda ${indice + 1} — ${voce.uda.id} · ${voce.uda.titolo}`));
        nodi.push(B.paragrafo(`${d.nomeGenere(voce.genere)} · ${voce.scelta.periodo || ''} · ${oreDocumento(voce)} ore`, 'fonte'));
        nodi.push(...d.schedaUda(voce.uda, {
            meta: voce.meta,
            genere: voce.genere,
            ripartizione: stato.ripartizione,
            compatta: true
        }));
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
