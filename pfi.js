// ============================================================
// PFI compilabile — Progetto Formativo Individuale
// Struttura: modello ufficiale INDIRE (6 quadri) + allegato UDA
// richiesto dal D.M. 92/2018 art. 4 c. 6 («nelle quali è strutturato»)
//
// Cataloghi UDA, entrambi pubblicati in questo sito:
//   data-uda.json ............... 48 UDA d'asse, una per competenza intermedia
//   data-uda-trasversali.json ... 10 UDA trasversali fra i quattro assi culturali
// ============================================================

const SUPABASE_URL = 'https://ruplzgcnheddmqqdephp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cGx6Z2NuaGVkZG1xcWRlcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTYyMjksImV4cCI6MjA3NTY5MjIyOX0.tOLIkgi5yTt61_0rMlXUqxnbil4DLD7kBaqZBVAv1CI';
const PFI_API = `${SUPABASE_URL}/functions/v1/pfi`;
const SESSION_KEY = 'pfi:sessione';
const IDENTITA_KEY = 'pfi:identita';

const ANNI = [1, 2, 3, 4, 5];
const ANNO_ETICHETTA = { 1: '1ª', 2: '2ª', 3: '3ª', 4: '4ª', 5: '5ª' };
const LIVELLI = ['', 'Iniziale', 'Base', 'Intermedio', 'Avanzato', 'Non rilevabile'];

const INTERVENTI = [
    'Accoglienza',
    'Attività di recupero',
    'Attività di potenziamento',
    'Sostegno alla realizzazione del PFI (peer tutoring, studio assistito)',
    'Orientamento e ri-orientamento',
    'Attività in ambiente extrascolastico in orario curricolare',
    'PCTO / apprendistato',
    'Progetti di ampliamento dell\'offerta formativa',
    'Alfabetizzazione italiano L2'
];

// Se la pagina vive in un iframe: altezza gestita dalla madre
if (window.parent !== window) {
    document.documentElement.classList.add('embedded');
}

const stato = {
    catalogoIndirizzo: [],      // 48 UDA d'asse — data-uda.json
    metaIndirizzo: null,
    catalogoTrasversali: [],    // 10 UDA trasversali — data-uda-trasversali.json
    metaTrasversali: null,
    uda: [],            // UDA inserite nel PFI
    seq: 0,
    token: '',
    docente: ''
};

document.addEventListener('DOMContentLoaded', avvia);

async function avvia() {
    costruisciTutor();
    costruisciPersonalizzazione();
    costruisciAnnualita();
    collegaEventi();
    await caricaCataloghi();
    ripristinaSessione();
    aggiornaUda();
    notificaAltezza();
}

// ============================================================
// 1. Parti dinamiche del modulo
// ============================================================

function costruisciTutor() {
    const box = document.getElementById('pfi-tutor-anni');
    box.innerHTML = ANNI.map(a => `
        <label>Tutor ${ANNO_ETICHETTA[a]}
            <input type="text" name="tutor_${a}">
        </label>`).join('');
}

function costruisciPersonalizzazione() {
    const corpo = document.querySelector('#pfi-personalizzazione tbody');
    corpo.innerHTML = INTERVENTI.map((voce, i) => `
        <tr>
            <th scope="row">${escapeHtml(voce)}</th>
            <td><input type="text" name="int_${i}_att" aria-label="Attività per ${escapeHtml(voce)}"></td>
            ${ANNI.map(a => `<td class="pfi-col-ore"><input type="number" min="0" max="500"
                name="int_${i}_ore_${a}" class="pfi-ore" aria-label="Ore ${ANNO_ETICHETTA[a]} per ${escapeHtml(voce)}"></td>`).join('')}
        </tr>`).join('');

    corpo.addEventListener('input', e => {
        if (e.target.classList.contains('pfi-ore')) ricalcolaOre();
    });
}

function ricalcolaOre() {
    const totali = {};
    ANNI.forEach(a => {
        let somma = 0;
        document.querySelectorAll(`input[name$="_ore_${a}"]`).forEach(i => {
            somma += Number(i.value) || 0;
        });
        totali[a] = somma;
        const cella = document.querySelector(`.pfi-tot[data-anno="${a}"]`);
        if (cella) cella.textContent = somma;
    });
    const biennio = (totali[1] || 0) + (totali[2] || 0);
    const nota = document.getElementById('pfi-264');
    nota.innerHTML = `Totale biennio: <strong>${biennio}</strong> ore su un massimo di 264.` +
        (biennio > 264 ? ' <strong>Quota superata</strong> — D.Lgs. 61/2017 art. 4 c. 2.' : '');
    nota.dataset.sforato = biennio > 264 ? 'si' : 'no';
}

function costruisciAnnualita() {
    const box = document.getElementById('pfi-annualita');
    box.innerHTML = ANNI.map(a => `
        <details class="pfi-anno"${a === 1 ? ' open' : ''}>
            <summary>${ANNO_ETICHETTA[a]} annualità</summary>
            <div class="pfi-anno-corpo">
                <div class="pfi-griglia pfi-griglia-2">
                    <label>Anno scolastico <input type="text" name="an_${a}_as" placeholder="20__/20__"></label>
                    <label>Frequenza (almeno il 75% del monte ore personalizzato)
                        <select name="an_${a}_freq">
                            <option value="">—</option>
                            <option>Assidua</option><option>Regolare</option><option>Irregolare</option>
                            <option>Discontinua</option><option>Sporadica</option>
                            <option>Sotto il 75% con deroga</option>
                            <option>Sotto il 75% senza deroga</option>
                        </select>
                    </label>
                </div>
                <label class="pfi-full">Esito della valutazione dei risultati delle UDA inserite nel PFI
                    <textarea name="an_${a}_esito" rows="3"></textarea>
                </label>
                <label class="pfi-full">Carenze riscontrate e misure di recupero, sostegno o ri-orientamento
                    <textarea name="an_${a}_carenze" rows="3"></textarea>
                </label>
                <div class="pfi-griglia pfi-griglia-2">
                    <label>Revisione del PFI
                        <select name="an_${a}_revisione">
                            <option value="">—</option>
                            <option>PFI confermato senza modifiche</option>
                            <option>PFI adeguato</option>
                            <option>PFI modificato con attività di recupero</option>
                            <option>PFI rimodulato e prorogato di un anno</option>
                        </select>
                    </label>
                    <label>Data della verifica <input type="date" name="an_${a}_data"></label>
                </div>
                ${a <= 2 ? `
                <div class="pfi-griglia pfi-griglia-2">
                    <label>Eventuale ri-orientamento <input type="text" name="an_${a}_riorient"></label>
                    <label>Eventuale passaggio a IeFP <input type="text" name="an_${a}_passaggio"></label>
                </div>` : ''}
                ${a === 2 ? `
                <label class="pfi-full">Certificato di competenze rilasciato al termine del biennio, con riferimento alle unità di apprendimento (D.M. 267/2021)
                    <textarea name="an_2_certificato" rows="2"></textarea>
                </label>` : ''}
                <label class="pfi-full">Docente tutor che sottoscrive la revisione <input type="text" name="an_${a}_tutorfirma"></label>
            </div>
        </details>`).join('');
}

// ============================================================
// 2. Cataloghi UDA
// ============================================================

async function caricaCataloghi() {
    // Due cataloghi pubblicati nel sito: 48 UDA d'asse + 10 trasversali
    const [asse, trasv] = await Promise.allSettled([
        fetch('data-uda.json', { cache: 'no-store' }).then(r => r.json()),
        fetch('data-uda-trasversali.json', { cache: 'no-store' }).then(r => r.json())
    ]);

    if (asse.status === 'fulfilled') {
        stato.catalogoIndirizzo = asse.value.uda || [];
        stato.metaIndirizzo = asse.value.meta || null;
    } else {
        console.error('Impossibile caricare il fascicolo delle UDA d\'asse:', asse.reason);
    }

    if (trasv.status === 'fulfilled') {
        stato.catalogoTrasversali = trasv.value.uda || [];
        stato.metaTrasversali = trasv.value.meta || null;
    }

    const selComp = document.getElementById('pfi-uda-competenza');
    Object.entries(stato.metaIndirizzo?.competenze || {}).forEach(([num, titolo]) => {
        const o = document.createElement('option');
        o.value = num;
        o.textContent = `C${num} — ${titolo}`;
        selComp.appendChild(o);
    });

    popolaScelta();
}

/** Elenco unificato dei due cataloghi, con marcatore di provenienza. */
function tutteLeUda() {
    return [
        ...stato.catalogoIndirizzo.map(u => ({ ...u, _fonte: 'asse' })),
        ...stato.catalogoTrasversali.map(u => ({ ...u, _fonte: 'trasversale' }))
    ];
}

function popolaScelta() {
    const tipo = document.getElementById('pfi-uda-tipo').value;
    const anno = document.getElementById('pfi-uda-anno').value;
    const competenza = document.getElementById('pfi-uda-competenza').value;
    const sel = document.getElementById('pfi-uda-scelta');

    const voci = tutteLeUda()
        .filter(u => (!tipo || u._fonte === tipo) &&
                     (!anno || String(u.anno) === anno) &&
                     (!competenza || String(u.competenza) === competenza ||
                      (u.competenzeSSAS || []).map(String).includes(competenza)))
        .sort((a, b) => a.anno - b.anno || a._fonte.localeCompare(b._fonte))
        .map(u => ({
            key: `${u._fonte}:${u.id}`,
            testo: `${ANNO_ETICHETTA[u.anno]} · ${u._fonte === 'trasversale' ? 'Trasversale' : 'C' + u.competenza} — ${u.titolo}`
        }));

    sel.innerHTML = voci.length
        ? `<option value="">Scegli fra ${voci.length} UDA…</option>` +
          voci.map(v => `<option value="${escapeHtml(v.key)}">${escapeHtml(v.testo)}</option>`).join('')
        : '<option value="">Nessuna UDA per questi filtri</option>';
}

function daCatalogo(key) {
    const [fonte, id] = key.split(':');

    if (fonte === 'trasversale') {
        const u = stato.catalogoTrasversali.find(x => x.id === id);
        if (!u) return null;
        const tit = stato.metaTrasversali?.competenzeSSAS || {};
        const ins = [...new Set([...(u.abilita || []), ...(u.saperi || [])].flatMap(x => x.ins || []))];
        return {
            titolo: u.titolo,
            tipo: 'Trasversale',
            anno: u.anno,
            periodo: u.periodo || '',
            competenze: (u.competenzeSSAS || []).map(c => `C${c} — ${tit[c] || ''}`).join('\n') +
                        `\nTraguardo: ${u.traguardo || ''}`,
            europee: (u.competenzeEuropee || []).join('\n'),
            insegnamenti: ins.join(', '),
            saperi: (u.saperi || []).map(s => `${s.t} (${(s.ins || []).join(', ')})`).join('\n'),
            compito: u.compito || '',
            ore: u.ore || '',
            attivita: (u.abilita || []).map(a => `${a.t} (${(a.ins || []).join(', ')})`).join('\n'),
            valutazione: 'Rubrica del compito di realtà a 4 livelli di padronanza, osservazione di '
                         + 'processo e autovalutazione, in coerenza con i livelli QNQ.',
            livello: '',
            qnq: u.qnq || '',
            origine: `UDA trasversale — scheda ${u.id} · assi: ${(u.assi || []).join(' · ')}`
        };
    }

    const u = stato.catalogoIndirizzo.find(x => x.id === id);
    if (!u) return null;
    const comp = stato.metaIndirizzo?.competenze || {};
    const ins = [...new Set([...(u.abilita || []), ...(u.saperi || [])].flatMap(x => x.ins || []))];
    return {
        titolo: u.titolo,
        tipo: 'Indirizzo',
        anno: u.anno,
        periodo: '',
        competenze: `C${u.competenza} — ${comp[u.competenza] || ''}\nTraguardo: ${u.traguardo || ''}`,
        europee: '',
        insegnamenti: ins.join(', '),
        saperi: (u.saperi || []).map(s => `${s.t} (${(s.ins || []).join(', ')})`).join('\n'),
        compito: u.compito || '',
        ore: u.ore || '',
        attivita: (u.abilita || []).map(a => `${a.t} (${(a.ins || []).join(', ')})`).join('\n'),
        valutazione: stato.metaIndirizzo?.valutazioneStandard || '',
        livello: '',
        qnq: u.qnq || '',
        origine: `Fascicolo UDA del quinquennio — scheda ${u.id}`
    };
}

// ============================================================
// 3. Schede UDA inserite nel PFI
// ============================================================

function aggiungiUda(dati) {
    stato.uda.push(Object.assign({
        _id: `u${++stato.seq}`,
        titolo: '', tipo: 'Indirizzo', anno: '', periodo: '',
        competenze: '', europee: '', insegnamenti: '', saperi: '',
        compito: '', ore: '', attivita: '', valutazione: '',
        livello: '', qnq: '', origine: 'Inserita a mano'
    }, dati || {}));
    aggiornaUda();
}

function aggiornaUda() {
    const lista = document.getElementById('pfi-uda-lista');
    const vuoto = document.getElementById('pfi-uda-vuoto');
    vuoto.hidden = stato.uda.length > 0;

    lista.innerHTML = stato.uda.map((u, i) => `
        <article class="pfi-uda-card" data-tipo="${escapeHtml(u.tipo)}" data-id="${u._id}">
            <div class="pfi-uda-testa">
                <span class="pfi-uda-badge">${escapeHtml(u.tipo)}${u.anno ? ' · ' + ANNO_ETICHETTA[u.anno] : ''}</span>
                <span class="pfi-uda-titolo">${escapeHtml(u.titolo) || 'UDA senza titolo'}</span>
                <button type="button" class="pfi-uda-rimuovi no-print" data-rimuovi="${u._id}">Rimuovi</button>
            </div>
            <div class="pfi-griglia pfi-griglia-3">
                <label class="pfi-col-2">Titolo dell'UDA <input type="text" data-campo="titolo" value="${escapeAttr(u.titolo)}"></label>
                <label>Tipo
                    <select data-campo="tipo">
                        ${['Indirizzo', 'Trasversale', 'Asse culturale', 'PCTO'].map(t =>
                            `<option${t === u.tipo ? ' selected' : ''}>${t}</option>`).join('')}
                    </select>
                </label>
                <label>Anno di corso
                    <select data-campo="anno">
                        <option value="">—</option>
                        ${ANNI.map(a => `<option value="${a}"${String(u.anno) === String(a) ? ' selected' : ''}>${ANNO_ETICHETTA[a]}</option>`).join('')}
                    </select>
                </label>
                <label>Periodo <input type="text" data-campo="periodo" value="${escapeAttr(u.periodo)}" placeholder="1° quadrimestre"></label>
                <label>Monte ore <input type="text" data-campo="ore" value="${escapeAttr(u.ore)}"></label>
            </div>
            <div class="pfi-griglia pfi-griglia-2" style="margin-top:14px">
                <label>Competenze target — Allegato C <textarea data-campo="competenze" rows="3">${escapeHtml(u.competenze)}</textarea></label>
                <label>Competenze chiave europee 2018 <textarea data-campo="europee" rows="3">${escapeHtml(u.europee)}</textarea></label>
                <label class="pfi-col-2">Insegnamenti coinvolti <input type="text" data-campo="insegnamenti" value="${escapeAttr(u.insegnamenti)}"></label>
                <label class="pfi-col-2">Saperi essenziali mobilitati <textarea data-campo="saperi" rows="3">${escapeHtml(u.saperi)}</textarea></label>
                <label class="pfi-col-2">Compito di realtà e prodotto atteso <textarea data-campo="compito" rows="2">${escapeHtml(u.compito)}</textarea></label>
                <label class="pfi-col-2">Attività degli studenti <textarea data-campo="attivita" rows="3">${escapeHtml(u.attivita)}</textarea></label>
                <label class="pfi-col-2">Criteri ed evidenze per la valutazione <textarea data-campo="valutazione" rows="2">${escapeHtml(u.valutazione)}</textarea></label>
                <label>Livello di padronanza raggiunto
                    <select data-campo="livello">
                        ${LIVELLI.map(l => `<option value="${l}"${l === u.livello ? ' selected' : ''}>${l || '—'}</option>`).join('')}
                    </select>
                </label>
                <label>Livello QNQ di riferimento <input type="text" data-campo="qnq" value="${escapeAttr(u.qnq)}"></label>
            </div>
            <p class="pfi-nota">${escapeHtml(u.origine)}</p>
        </article>`).join('');

    aggiornaCompetenze();
    notificaAltezza();
}

function aggiornaCompetenze() {
    const corpo = document.querySelector('#pfi-competenze tbody');
    if (!corpo) return;
    if (!stato.uda.length) {
        corpo.innerHTML = '<tr><td colspan="4" class="pfi-nota">Nessuna UDA inserita: la tabella si popola dal Quadro 7.</td></tr>';
        return;
    }
    corpo.innerHTML = stato.uda.map(u => `
        <tr>
            <td>${escapeHtml((u.competenze || '').split('\n')[0]) || '—'}</td>
            <td>${escapeHtml(u.titolo) || '—'}</td>
            <td>${escapeHtml(u.livello) || '—'}</td>
            <td>${escapeHtml(u.qnq) || '—'}</td>
        </tr>`).join('');
}

// ============================================================
// 4. Eventi
// ============================================================

function collegaEventi() {
    ['pfi-uda-tipo', 'pfi-uda-anno', 'pfi-uda-competenza'].forEach(id =>
        document.getElementById(id).addEventListener('change', popolaScelta));

    document.getElementById('pfi-uda-aggiungi').addEventListener('click', () => {
        const key = document.getElementById('pfi-uda-scelta').value;
        if (!key) return;
        const dati = daCatalogo(key);
        if (dati) aggiungiUda(dati);
    });

    document.getElementById('pfi-uda-vuota').addEventListener('click', () => aggiungiUda());

    const lista = document.getElementById('pfi-uda-lista');
    lista.addEventListener('click', e => {
        const id = e.target.dataset?.rimuovi;
        if (!id) return;
        stato.uda = stato.uda.filter(u => u._id !== id);
        aggiornaUda();
    });
    lista.addEventListener('input', e => {
        const campo = e.target.dataset?.campo;
        if (!campo) return;
        const card = e.target.closest('.pfi-uda-card');
        const u = stato.uda.find(x => x._id === card.dataset.id);
        if (!u) return;
        u[campo] = e.target.value;
        if (campo === 'tipo') card.dataset.tipo = e.target.value;
        if (['titolo', 'competenze', 'livello', 'qnq'].includes(campo)) aggiornaCompetenze();
    });
    lista.addEventListener('change', e => {
        if (e.target.dataset?.campo === 'tipo' || e.target.dataset?.campo === 'anno') aggiornaUda();
    });

    document.getElementById('pfi-word').addEventListener('click', esportaWord);
    document.getElementById('pfi-print').addEventListener('click', () => window.print());
    document.getElementById('pfi-save-json').addEventListener('click', salvaBozza);
    document.getElementById('pfi-load-json').addEventListener('click', () =>
        document.getElementById('pfi-file').click());
    document.getElementById('pfi-file').addEventListener('change', apriBozza);
    document.getElementById('pfi-reset').addEventListener('click', svuota);

    document.getElementById('pfi-accedi').addEventListener('click', accedi);
    document.getElementById('pfi-esci').addEventListener('click', esci);
    document.getElementById('pfi-cloud-salva').addEventListener('click', salvaCloud);
    document.getElementById('pfi-cloud-apri').addEventListener('click', apriDaCloud);
}

// ============================================================
// 5. Serializzazione
// ============================================================

function raccogli() {
    const form = document.getElementById('pfi-form');
    const dati = {};
    new FormData(form).forEach((v, k) => { dati[k] = v; });
    form.querySelectorAll('input[type="checkbox"]').forEach(c => {
        dati[c.name] = c.checked ? 'si' : '';
    });
    return {
        versione: 1,
        generato: new Date().toISOString(),
        campi: dati,
        uda: stato.uda
    };
}

function applica(pacchetto) {
    const form = document.getElementById('pfi-form');
    const campi = pacchetto?.campi || {};
    Object.entries(campi).forEach(([k, v]) => {
        const el = form.elements[k];
        if (!el) return;
        if (el.type === 'checkbox') el.checked = v === 'si';
        else el.value = v;
    });
    stato.uda = (pacchetto?.uda || []).map(u =>
        Object.assign({}, u, { _id: u._id || `u${++stato.seq}` }));
    aggiornaUda();
    ricalcolaOre();
}

function nomeFile(est) {
    const c = document.querySelector('[name="cognome"]').value.trim();
    const n = document.querySelector('[name="nome"]').value.trim();
    const base = (c || n) ? `${c}_${n}`.replace(/\s+/g, '') : 'senza_nome';
    return `PFI_${base}.${est}`;
}

function salvaBozza() {
    scarica(JSON.stringify(raccogli(), null, 2), 'application/json;charset=utf-8', nomeFile('json'));
}

function apriBozza(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const lettore = new FileReader();
    lettore.onload = () => {
        try {
            applica(JSON.parse(lettore.result));
        } catch {
            alert('Il file non è una bozza PFI valida.');
        }
    };
    lettore.readAsText(file);
    e.target.value = '';
}

function svuota() {
    if (!confirm('Svuotare il modulo? I dati non salvati andranno persi.')) return;
    document.getElementById('pfi-form').reset();
    stato.uda = [];
    aggiornaUda();
    ricalcolaOre();
}

// ============================================================
// 6. Esportazione Word
// ============================================================

function esportaWord() {
    const d = raccogli().campi;
    const stile = `<style>
        body { font-family: "Times New Roman", serif; font-size: 11pt; color: #000; }
        h1 { font-size: 14pt; text-align: center; margin: 0 0 4pt; }
        .sub { text-align: center; font-size: 10pt; margin: 0 0 2pt; }
        h2 { font-size: 12pt; border-bottom: 1pt solid #000; padding-bottom: 2pt; margin: 16pt 0 6pt; }
        h3 { font-size: 11pt; margin: 10pt 0 4pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
        td, th { border: 1px solid #808080; padding: 4pt 5pt; vertical-align: top; font-size: 10pt; }
        th { background: #f0f0f0; text-align: left; font-weight: bold; }
        .lab { width: 34%; font-weight: bold; background: #fafafa; }
        .fonte { font-size: 8pt; color: #555; font-style: italic; margin: 0 0 6pt; }
        .uda { border: 1px solid #666; padding: 6pt 8pt; margin-bottom: 8pt; page-break-inside: avoid; }
        .uda-t { font-weight: bold; font-size: 11pt; margin: 0 0 4pt; }
        .firme td { border: none; border-top: 1px solid #000; padding-top: 4pt; font-size: 9pt; height: 46pt; vertical-align: bottom; }
    </style>`;

    const p = [];
    p.push(stile);
    p.push(`<p class="sub">${esc(d.istituto)}</p>`);
    p.push('<h1>PROGETTO FORMATIVO INDIVIDUALE</h1>');
    p.push(`<p class="sub">${esc(d.indirizzo)} — Anno scolastico ${esc(d.annoScolastico)}</p>`);
    p.push('<p class="fonte">Redatto ai sensi del D.Lgs. 13 aprile 2017 n. 61, art. 5 c. 1 lett. a) e del D.M. 24 maggio 2018 n. 92, artt. 4 e 6.</p>');

    p.push('<h2>Quadro 1 — Dati generali e anagrafici</h2>');
    p.push(tab([
        ['Cognome e nome', `${esc(d.cognome)} ${esc(d.nome)}`],
        ['Data e luogo di nascita', `${esc(d.dataNascita)} — ${esc(d.luogoNascita)}`],
        ['Residenza', esc(d.residenza)],
        ['Classe', esc(d.classe)],
        ['Codice ATECO / NUP', `${esc(d.ateco)} / ${esc(d.nup)}`],
        ['Bisogni educativi speciali', [
            d.bes_dsa && 'DSA', d.bes_cdc && 'BES rilevato dal CdC',
            d.bes_doc && 'con documentazione', d.bes_104 && 'L. 104/1992'
        ].filter(Boolean).join('; ') || '—'],
        ['Livello di lingua italiana', `scritto ${esc(d.italianoScritto) || '—'} · orale ${esc(d.italianoOrale) || '—'}`],
        ['Docenti tutor', ANNI.map(a => d[`tutor_${a}`] ? `${ANNO_ETICHETTA[a]}: ${esc(d[`tutor_${a}`])}` : null).filter(Boolean).join(' · ') || '—']
    ]));

    p.push('<h2>Quadro 2 — Sintesi del bilancio personale iniziale</h2>');
    p.push(`<p class="fonte">Rilevazione del ${esc(d.bilancioData) || '__________'}</p>`);
    p.push('<h3>Profilo dell\'allievo</h3>');
    p.push(par(d.profilo));
    p.push('<h3>Competenze acquisite in contesti formali</h3>');
    p.push(tab([
        ['Precedenti esperienze di istruzione e formazione', esc(d.precedentiEsperienze)],
        ['Eventuali ripetenze', esc(d.ripetenze)],
        ['Titolo di studio e votazione', esc(d.titoloStudio)],
        ['Certificazione del primo ciclo e INVALSI', esc(d.certificazionePrimoCiclo)],
        ['Esiti delle prove di ingresso', esc(d.proveIngresso)],
        ['Debiti in ingresso', esc(d.debitiIngresso)],
        ['Crediti dimostrabili', esc(d.creditiIngresso)],
        ['Precedenti esperienze di PCTO o apprendistato', esc(d.esperienzePcto)]
    ]));
    p.push('<h3>Competenze acquisite in contesti non formali e informali</h3>');
    p.push(tab([
        ['Attitudini', esc(d.attitudini)],
        ['Risorse e motivazione', esc(d.motivazione)],
        ['Aspettative per il futuro', esc(d.aspettative)],
        ['Capacità di studiare e lavorare con altri', esc(d.capacitaSociali)],
        ['Problematiche sociali o personali', esc(d.problematiche)],
        ['Altre attività significative', esc(d.altreAttivita)]
    ]));

    p.push('<h2>Quadro 3 — Obiettivi previsti in termini di personalizzazione</h2>');
    p.push(par(d.obiettivi));
    p.push(tab([
        ['Apprendimento della lingua italiana', esc(d.obiettivoItaliano)],
        ['Partecipazione alla vita scolastica', esc(d.obiettivoPartecipazione)],
        ['Qualifiche e certificazioni', esc(d.obiettivoCertificazioni)],
        ['Crediti per passaggi ad altri indirizzi o sistemi', esc(d.obiettivoCrediti)]
    ]));

    p.push('<h2>Quadro 4 — Strumenti didattici particolari previsti</h2>');
    const strumenti = [
        d.str_formulari && 'Formulari, schemi e mappe concettuali',
        d.str_tempi && 'Tempi aggiuntivi nelle verifiche',
        d.str_digitali && 'Strumenti compensativi digitali',
        d.str_orale && 'Prevalenza della verifica orale'
    ].filter(Boolean);
    p.push(strumenti.length ? `<ul>${strumenti.map(s => `<li>${s}</li>`).join('')}</ul>` : '<p>—</p>');
    if (d.strumentiAltro) p.push(par(d.strumentiAltro));

    p.push('<h2>Quadro 5 — Interventi di personalizzazione del percorso</h2>');
    p.push('<p class="fonte">Quota di personalizzazione fino a 264 ore nel biennio — D.Lgs. 61/2017 art. 4 c. 2.</p>');
    let righe = `<tr><th>Tipo di intervento</th><th>Attività</th>${ANNI.map(a => `<th>Ore ${ANNO_ETICHETTA[a]}</th>`).join('')}</tr>`;
    INTERVENTI.forEach((voce, i) => {
        const att = d[`int_${i}_att`] || '';
        const ore = ANNI.map(a => d[`int_${i}_ore_${a}`] || '');
        if (!att && !ore.some(Boolean)) return;
        righe += `<tr><td>${esc(voce)}</td><td>${esc(att)}</td>${ore.map(o => `<td>${esc(o)}</td>`).join('')}</tr>`;
    });
    p.push(`<table>${righe}</table>`);

    p.push('<h2>Quadro 6 — Verifica periodica e revisione</h2>');
    p.push('<p class="fonte">La valutazione ha per oggetto «i risultati delle unità di apprendimento inserite nel P.F.I.» — D.M. 92/2018 art. 4 c. 7.</p>');
    ANNI.forEach(a => {
        const vuoto = !['as', 'freq', 'esito', 'carenze', 'revisione', 'data'].some(k => d[`an_${a}_${k}`]);
        if (vuoto) return;
        p.push(`<h3>${ANNO_ETICHETTA[a]} annualità — a.s. ${esc(d[`an_${a}_as`])}</h3>`);
        p.push(tab([
            ['Frequenza', esc(d[`an_${a}_freq`])],
            ['Esito della valutazione delle UDA', esc(d[`an_${a}_esito`])],
            ['Carenze e misure', esc(d[`an_${a}_carenze`])],
            ['Revisione del PFI', esc(d[`an_${a}_revisione`])],
            ['Data della verifica', esc(d[`an_${a}_data`])],
            a === 2 ? ['Certificato di competenze', esc(d.an_2_certificato)] : null,
            ['Docente tutor', esc(d[`an_${a}_tutorfirma`])]
        ].filter(Boolean)));
    });

    p.push('<h2>Quadro 7 — Piano didattico delle unità di apprendimento</h2>');
    p.push('<p class="fonte">Parte integrante del presente documento. Le UDA sono quelle «nelle quali è strutturato il Progetto formativo individuale» — D.M. 92/2018 art. 4 c. 6.</p>');
    if (!stato.uda.length) {
        p.push('<p><em>Nessuna unità di apprendimento inserita.</em></p>');
    } else {
        stato.uda.forEach((u, i) => {
            p.push(`<div class="uda">
                <p class="uda-t">UDA ${i + 1} — ${esc(u.titolo)}</p>
                ${tab([
                    ['Tipo e anno', `${esc(u.tipo)}${u.anno ? ' · ' + ANNO_ETICHETTA[u.anno] : ''}${u.periodo ? ' · ' + esc(u.periodo) : ''}`],
                    ['Competenze target — Allegato C', esc(u.competenze)],
                    ['Competenze chiave europee', esc(u.europee)],
                    ['Insegnamenti coinvolti', esc(u.insegnamenti)],
                    ['Saperi essenziali mobilitati', esc(u.saperi)],
                    ['Compito di realtà e prodotto', esc(u.compito)],
                    ['Attività degli studenti', esc(u.attivita)],
                    ['Monte ore', esc(u.ore)],
                    ['Criteri ed evidenze di valutazione', esc(u.valutazione)],
                    ['Livello di padronanza raggiunto', `${esc(u.livello) || '—'}${u.qnq ? ' · QNQ ' + esc(u.qnq) : ''}`]
                ].filter(r => r[1]))}
            </div>`);
        });
    }

    p.push('<h2>Quadro 8 — Livelli di padronanza delle competenze</h2>');
    p.push('<p class="fonte">Valutazione collegiale del consiglio di classe riferita alle UDA — Linee guida § 3.2.2 e Box n. 8 voce 8.</p>');
    if (stato.uda.length) {
        p.push(`<table><tr><th>Competenza</th><th>UDA</th><th>Livello</th><th>QNQ</th></tr>${
            stato.uda.map(u => `<tr><td>${esc((u.competenze || '').split('\n')[0])}</td><td>${esc(u.titolo)}</td><td>${esc(u.livello)}</td><td>${esc(u.qnq)}</td></tr>`).join('')
        }</table>`);
    }

    p.push('<h2>Sottoscrizione</h2>');
    p.push(tab([
        ['Data di prima stesura', esc(d.dataStesura)],
        ['Approvazione del consiglio di classe', esc(d.dataApprovazione)],
        ['Coordinatore', esc(d.coordinatore)],
        ['Dirigente scolastico', esc(d.dirigente)]
    ]));
    p.push(`<table class="firme"><tr>
        <td>Firma dello studente</td>
        <td>Firma del genitore o di chi esercita la responsabilità genitoriale</td>
        <td>Firma del docente tutor</td>
    </tr></table>`);

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>PFI</title></head><body>${p.join('\n')}</body></html>`;

    scarica('﻿' + html, 'application/msword', nomeFile('doc'));
}

function tab(righe) {
    return `<table>${righe.map(([l, v]) =>
        `<tr><td class="lab">${l}</td><td>${(v || '—').replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
}

function par(testo) {
    return testo ? `<p>${esc(testo).replace(/\n/g, '<br>')}</p>` : '<p>—</p>';
}

// ============================================================
// 7. Supabase — prototipo dimostrativo
// ============================================================

function ripristinaSessione() {
    const token = sessionStorage.getItem(SESSION_KEY) || '';
    const docente = sessionStorage.getItem(IDENTITA_KEY) || '';
    if (token && docente) {
        stato.token = token;
        stato.docente = docente;
        modalitaCloud(true);
    } else {
        modalitaCloud(false);
    }
}

function modalitaCloud(attivo) {
    const et = document.getElementById('pfi-cloud-stato');
    et.textContent = attivo ? `Collegato — ${stato.docente}` : 'Cloud non collegato';
    et.dataset.attivo = attivo ? 'si' : 'no';
    document.getElementById('pfi-accedi').hidden = attivo;
    document.getElementById('pfi-cloud-salva').hidden = !attivo;
    document.getElementById('pfi-cloud-apri').hidden = !attivo;
    document.getElementById('pfi-esci').hidden = !attivo;
}

async function chiamaApi(azione, corpo) {
    const risposta = await fetch(`${PFI_API}/${azione}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
            'x-pfi-token': stato.token || ''
        },
        body: JSON.stringify(corpo || {})
    });
    const dati = await risposta.json().catch(() => ({}));
    if (!risposta.ok) throw new Error(dati.error || `Errore ${risposta.status}`);
    return dati;
}

async function accedi() {
    const docente = prompt('Nome docente (ambiente dimostrativo):');
    if (!docente) return;
    const codice = prompt('Codice di accesso:');
    if (!codice) return;
    try {
        stato.token = '';
        const dati = await chiamaApi('login', { docente: docente.trim(), codice });
        stato.token = dati.token;
        stato.docente = dati.docente;
        sessionStorage.setItem(SESSION_KEY, stato.token);
        sessionStorage.setItem(IDENTITA_KEY, stato.docente);
        modalitaCloud(true);
    } catch (err) {
        alert(`Accesso non riuscito: ${err.message}`);
        modalitaCloud(false);
    }
}

function esci() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(IDENTITA_KEY);
    stato.token = '';
    stato.docente = '';
    modalitaCloud(false);
}

async function salvaCloud() {
    const pacchetto = raccogli();
    const etichetta = `${pacchetto.campi.cognome || ''} ${pacchetto.campi.nome || ''}`.trim() || 'Senza nome';
    try {
        await chiamaApi('salva', {
            etichetta,
            anno_scolastico: pacchetto.campi.annoScolastico || '',
            payload: pacchetto
        });
        alert('Bozza salvata in cloud.');
    } catch (err) {
        alert(`Salvataggio non riuscito: ${err.message}`);
    }
}

async function apriDaCloud() {
    try {
        const dati = await chiamaApi('elenco', {});
        const voci = dati.documenti || [];
        if (!voci.length) { alert('Nessuna bozza salvata.'); return; }
        const scelta = prompt('Bozze disponibili:\n\n' +
            voci.map((v, i) => `${i + 1}. ${v.etichetta} — ${v.anno_scolastico || 's.a.'} (${new Date(v.aggiornato_il).toLocaleDateString('it-IT')})`).join('\n') +
            '\n\nNumero della bozza da aprire:');
        const i = Number(scelta) - 1;
        if (!voci[i]) return;
        const doc = await chiamaApi('apri', { id: voci[i].id });
        applica(doc.payload);
    } catch (err) {
        alert(`Lettura non riuscita: ${err.message}`);
    }
}

// ============================================================
// 8. Utilità
// ============================================================

function scarica(contenuto, mime, nome) {
    const blob = new Blob([contenuto], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeHtml(t) {
    return String(t ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const esc = escapeHtml;

function escapeAttr(t) {
    return escapeHtml(t);
}

function notificaAltezza() {
    if (window.parent === window) return;
    requestAnimationFrame(() => {
        const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        window.parent.postMessage({ type: 'iframeContentHeight', height: h }, window.location.origin);
    });
}

window.addEventListener('resize', notificaAltezza);
