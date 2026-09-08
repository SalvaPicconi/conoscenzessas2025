// ============================================================
// PFI compilabile — Progetto Formativo Individuale
// Struttura: modello di riferimento delle Linee guida (6 quadri) + allegato UDA.
// Il PFI è articolato per unità di apprendimento ai sensi del D.I. 92/2018,
// art. 2, comma 1.
//
// Cataloghi UDA pubblicati in questo sito:
//   data-uda.json ............... 57 UDA d'asse: una per competenza intermedia, più nove proposte
//   data-uda-trasversali.json ... UDA trasversali fra i quattro assi culturali
//   data-uda-fsl.json ............ 4 UDA per la Formazione scuola-lavoro
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
    'Formazione scuola-lavoro (ex PCTO) / apprendistato',
    'Progetti di ampliamento dell\'offerta formativa',
    'Alfabetizzazione italiano L2'
];

// Se la pagina vive in un iframe: altezza gestita dalla madre
if (window.parent !== window) {
    document.documentElement.classList.add('embedded');
}

const stato = {
    catalogoIndirizzo: [],      // 57 UDA d'asse — data-uda.json
    metaIndirizzo: null,
    catalogoTrasversali: [],    // UDA trasversali — data-uda-trasversali.json
    metaTrasversali: null,
    catalogoFsl: [],            // 4 UDA FSL — data-uda-fsl.json
    metaFsl: null,
    uda: [],            // UDA inserite nel PFI
    seq: 0,
    token: '',
    docente: '',
    nomeCompleto: '',
    classi: [],          // gruppi classe esistenti sul server
    classeAttiva: '',
    documentoId: '',     // PFI attualmente aperto
    eliminandoId: ''
};

document.addEventListener('DOMContentLoaded', avvia);

async function avvia() {
    costruisciTutor();
    costruisciPersonalizzazione();
    costruisciAnnualita();
    collegaEventi();
    await caricaCataloghi();
    await ripristinaSessione();
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
    // Tre cataloghi pubblicati nel sito: UDA d'asse + trasversali + FSL
    const [asse, trasv, fsl, unificate, generale] = await Promise.allSettled([
        fetch('data-uda.json', { cache: 'no-store' }).then(r => r.json()),
        fetch('data-uda-trasversali.json', { cache: 'no-store' }).then(r => r.json()),
        fetch('data-uda-fsl.json', { cache: 'no-store' }).then(r => r.json()),
        fetch('data-uda-unificate.json', { cache: 'no-store' }).then(r => r.json()),
        fetch('data-area-generale.json', { cache: 'no-store' }).then(r => r.json())
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
    } else {
        console.error('Impossibile caricare il catalogo delle UDA trasversali:', trasv.reason);
    }

    if (fsl.status === 'fulfilled') {
        stato.catalogoFsl = fsl.value.uda || [];
        stato.metaFsl = fsl.value.meta || null;
    } else {
        console.error('Impossibile caricare il catalogo delle UDA FSL:', fsl.reason);
    }

    stato.catalogoUnificate = unificate.status === 'fulfilled' ? unificate.value.uda : [];
    stato.titoliGenerali = generale.status === 'fulfilled' ? Object.fromEntries(generale.value.area_generale_istruzione_professionale.competenze.map(c => [c.numero,c.titolo])) : {};
    const selComp = document.getElementById('pfi-uda-competenza');
    Object.entries(stato.metaIndirizzo?.competenze || {}).forEach(([num, titolo]) => {
        const o = document.createElement('option');
        o.value = num;
        o.textContent = `C${num} — ${titolo}`;
        selComp.appendChild(o);
    });

    popolaScelta();
}

/** Elenco unificato dei tre cataloghi, con marcatore di provenienza. */
function tutteLeUda() {
    return [
        ...stato.catalogoIndirizzo.map(u => ({ ...u, _fonte: 'asse' })),
        ...(stato.catalogoUnificate || []).map(u => ({ ...u, _fonte: 'unificate' })),
        ...stato.catalogoTrasversali.map(u => ({ ...u, _fonte: 'trasversale' })),
        ...stato.catalogoFsl.map(u => ({ ...u, _fonte: 'fsl' }))
    ];
}

function competenzeIndirizzo(u) {
    return Array.isArray(u.competenze) && u.competenze.length ? u.competenze : [u.competenza];
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
                      (u.competenzeSSAS || u.competenze || []).map(String).includes(competenza)))
        .sort((a, b) => a.anno - b.anno || a._fonte.localeCompare(b._fonte))
        .map(u => ({
            key: `${u._fonte}:${u.id}`,
            testo: `${ANNO_ETICHETTA[u.anno]} · ${u._fonte === 'unificate' ? 'Unificata · proposta' : u._fonte === 'trasversale' ? 'Trasversale' : u._fonte === 'fsl' ? 'FSL · ' + u.areaTirocinio : competenzeIndirizzo(u).map(c => 'C' + c).join(' · ')} — ${u.titolo}`
        }));

    sel.innerHTML = voci.length
        ? `<option value="">Scegli fra ${voci.length} UDA…</option>` +
          voci.map(v => `<option value="${escapeHtml(v.key)}">${escapeHtml(v.testo)}</option>`).join('')
        : '<option value="">Nessuna UDA per questi filtri</option>';
}

function daCatalogo(key) {
    const u=datiDaCatalogo(key);
    return u ? {...u, catalogoKey:key, origineRefs:u.origineRefs || [key]} : null;
}
function datiDaCatalogo(key) {
    const [fonte, id] = key.split(':');

    if (fonte === 'unificate') {
        const u = (stato.catalogoUnificate || []).find(x => x.id === id);
        if (!u) return null;
        return { titolo: u.titolo, tipo: 'Unificata · proposta', anno: u.anno, periodo: '',
            competenze: u.competenze.map(c => `C${c} — ${stato.metaIndirizzo?.competenze[c] || ''}`).join('\n'),
            saperi: u.saperi.map(x => `${x.t} (${x.ins.join(', ')})`).join('\n'),
            insegnamenti: [...new Set([...u.abilita,...u.saperi].flatMap(x=>x.ins))].join(', '),
            attivita: u.abilita.map(x=>x.t).join('\n'), compito:u.sintesi, prodotto:u.sintesi,
            valutazione:u.rubrica.map(r=>`C${r.competenza}: ${r.indicatore}`).join('\n'),
            ore:'Da deliberare', qnq:u.qnq, origine:`Proposta unificata ${u.id}; ore originarie ${u.ore}; adozione da concordare`,
            origineRefs:u.fonde.map(f=>'asse:'+f.id), catalogoKey:key };
    }
    if (fonte === 'fsl') {
        const u = stato.catalogoFsl.find(x => x.id === id);
        if (!u) return null;
        const tit = stato.metaFsl?.competenzeSSAS || {};
        const ins = [...new Set([...(u.abilita || []), ...(u.saperi || [])].flatMap(x => x.ins || []))];
        return {
            titolo: u.titolo, tipo: 'FSL', anno: u.anno, periodo: u.periodo || '',
            competenze: (u.competenzeSSAS || []).map(c => `C${c} — ${tit[c] || ''}`).join('\n') + `\nTraguardo: ${u.traguardo || ''}`,
            europee: (u.competenzeEuropee || []).join('\n'), insegnamenti: ins.join(', '),
            saperi: (u.saperi || []).map(s => `${s.t} (${(s.ins || []).join(', ')})`).join('\n'),
            situazione: u.situazione || '', prodotto: u.prodotto || u.compito || '', beneficiari: u.beneficiari || '',
            ambito: 'mista', compito: u.compito || '', ore: u.ore || '',
            attivita: (u.abilita || []).map(a => `${a.t} (${(a.ins || []).join(', ')})`).join('\n'),
            valutazione: 'Osservazione dei processi, evidenze concordate con tutor scolastico e tutor esterno, prodotto finale e autovalutazione.',
            livello: '', qnq: u.qnq || '', origine: `UDA FSL — scheda ${u.id} · ${u.areaTirocinio}`
        };
    }

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
            competenze: [...(u.competenzeSSAS || []).map(c => `C${c} — ${tit[c] || ''}`), ...(u.competenzeGenerali || []).map(c => `AG${c} — ${stato.titoliGenerali?.[c] || 'Competenza area generale '+c}`)].join('\n') + `\nTraguardo: ${u.traguardo || ''}`,
            europee: (u.competenzeEuropee || []).join('\n'),
            insegnamenti: ins.join(', '),
            saperi: (u.saperi || []).map(s => `${s.t} (${(s.ins || []).join(', ')})`).join('\n'),
            situazione: u.situazione || '',
            prodotto: u.prodotto || u.compito || '',
            beneficiari: u.beneficiari || '',
            ambito: u.ambito || '',
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
        competenze: `${competenzeIndirizzo(u).map(c => `C${c} — ${comp[c] || ''}`).join('\n')}\nTraguardo: ${u.traguardo || ''}`,
        europee: '',
        insegnamenti: ins.join(', '),
        saperi: (u.saperi || []).map(s => `${s.t} (${(s.ins || []).join(', ')})`).join('\n'),
        situazione: u.situazione || '',
        prodotto: u.prodotto || u.compito || '',
        beneficiari: u.beneficiari || '',
        ambito: u.ambito || '',
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

function riferimentiOrigine(u) {
    if(!u)return [];
    if(u.origineRefs?.length)return u.origineRefs;
    const id=(u.origine || '').match(/scheda ([\w.]+)/)?.[1];
    return id ? [(u.tipo==='Trasversale'?'trasversale:':u.tipo==='FSL'?'fsl:':'asse:')+id] : [];
}
function aggiungiUda(dati) {
    const refs = riferimentiOrigine(dati);
    if (refs.length && stato.uda.some(u => riferimentiOrigine(u).some(r => refs.includes(r)))) {
        alert('Questa UDA o una sua scheda di origine è già nel piano. Rimuovi la scelta precedente per sostituirla.'); return;
    }
    stato.uda.push(Object.assign({
        _id: crypto.randomUUID(),
        titolo: '', tipo: 'Indirizzo', anno: '', periodo: '',
        competenze: '', europee: '', insegnamenti: '', saperi: '',
        situazione: '', prodotto: '', beneficiari: '', ambito: '',
        compito: '', ore: '', attivita: '', valutazione: '',
        livello: '', qnq: '', origine: 'Inserita a mano'
    }, dati || {}, { _id: crypto.randomUUID() }));
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
                        ${['Indirizzo', 'Trasversale', 'FSL', 'Unificata · proposta', 'Asse culturale', 'PCTO (storico)'].map(t =>
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
                <label>Competenze target · C = SSAS, AG = area generale <textarea data-campo="competenze" rows="3">${escapeHtml(u.competenze)}</textarea></label>
                <label>Competenze chiave europee 2018 <textarea data-campo="europee" rows="3">${escapeHtml(u.europee)}</textarea></label>
                <label class="pfi-col-2">Insegnamenti coinvolti <input type="text" data-campo="insegnamenti" value="${escapeAttr(u.insegnamenti)}"></label>
                <label class="pfi-col-2">Saperi essenziali mobilitati <textarea data-campo="saperi" rows="3">${escapeHtml(u.saperi)}</textarea></label>
                <label class="pfi-col-2">Situazione, problema o tema di riferimento <textarea data-campo="situazione" rows="2">${escapeHtml(u.situazione)}</textarea></label>
                <label class="pfi-col-2">Prodotto da realizzare <textarea data-campo="prodotto" rows="2">${escapeHtml(u.prodotto)}</textarea></label>
                <label>Beneficiari <input type="text" data-campo="beneficiari" value="${escapeAttr(u.beneficiari)}"></label>
                <label>Ambito
                    <select data-campo="ambito">
                        <option value=""${!u.ambito ? ' selected' : ''}>—</option>
                        ${['interna', 'esterna', 'mista'].map(a => `<option${a === u.ambito ? ' selected' : ''}>${a}</option>`).join('')}
                    </select>
                </label>
                <label class="pfi-col-2">Attività degli studenti <textarea data-campo="attivita" rows="3">${escapeHtml(u.attivita)}</textarea></label>
                <label class="pfi-col-2">Criteri ed evidenze per la valutazione <textarea data-campo="valutazione" rows="2">${escapeHtml(u.valutazione)}</textarea></label>
                ${u.livello ? `<p class="pfi-nota">Livello complessivo della bozza precedente: ${escapeHtml(u.livello)}. Per più competenze, confermare i singoli esiti nel Quadro 8.</p>` : ''}
                <label>Livello QNQ di riferimento <input type="text" data-campo="qnq" value="${escapeAttr(u.qnq)}"></label>
            </div>
            <p class="pfi-nota">${escapeHtml(u.origine)}</p>
        </article>`).join('');

    aggiornaCompetenze();
    notificaAltezza();
}

function righeCompetenze(u) {
    const righe = (u.competenze || '').split('\n').map(t=>t.trim()).filter(t=>t && !t.startsWith('Traguardo:'));
    return [...new Set(righe)].map(t => ({testo:t, livello:u.livelliCompetenze?.[t] ?? (righe.length===1 ? (u.livello || '') : '')}));
}
function aggiornaCompetenze() {
    const corpo = document.querySelector('#pfi-competenze tbody');
    if (!corpo) return;
    corpo.innerHTML = stato.uda.flatMap(u => righeCompetenze(u).map(r => `<tr>
        <td>${escapeHtml(r.testo)}</td><td>${escapeHtml(u.titolo)}</td>
        <td><select aria-label="Livello per ${escapeAttr(r.testo)}" data-uda-livello="${escapeAttr(u._id)}" data-competenza="${escapeAttr(r.testo)}">${LIVELLI.map(l=>`<option value="${escapeAttr(l)}"${l===r.livello?' selected':''}>${escapeHtml(l || 'Da valutare')}</option>`).join('')}</select></td>
        <td>${escapeHtml(u.qnq || '—')}</td></tr>`)).join('') || '<tr><td colspan="4">Nessuna competenza inserita.</td></tr>';
}
document.addEventListener('change', e => {
    const el=e.target.closest('[data-uda-livello]'); if(!el)return;
    const u=stato.uda.find(u=>u._id===el.dataset.udaLivello); if(!u)return;
    u.livelliCompetenze={...(u.livelliCompetenze || {}),[el.dataset.competenza]:el.value};
});

// ============================================================
// 4. Eventi
// ============================================================

/** Registra un listener solo se l'elemento esiste: un id rimosso dall'HTML
 *  non deve impedire la registrazione di tutti i listener successivi. */
function su(id, evento, gestore) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(evento, gestore);
    else console.warn(`[pfi] elemento "${id}" assente: listener "${evento}" non registrato.`);
}

function collegaEventi() {
    ['pfi-uda-tipo', 'pfi-uda-anno', 'pfi-uda-competenza'].forEach(id =>
        document.getElementById(id).addEventListener('change', popolaScelta));

    su('pfi-uda-aggiungi', 'click', () => {
        const key = document.getElementById('pfi-uda-scelta').value;
        if (!key) return;
        const dati = daCatalogo(key);
        if (dati) aggiungiUda(dati);
    });

    su('pfi-uda-vuota', 'click', () => aggiungiUda());

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

    su('pfi-word', 'click', esportaWord);
    su('pfi-print', 'click', () => window.CurricoloStampa.stampa());
    su('pfi-save-json', 'click', salvaBozza);
    su('pfi-load-json', 'click', () =>
        document.getElementById('pfi-file').click());
    su('pfi-file', 'change', apriBozza);
    su('pfi-reset', 'click', svuota);

    su('pfi-accedi', 'click', apriAccesso);
    su('pfi-accesso-form', 'submit', accedi);
    su('pfi-acc-annulla', 'click', () =>
        document.getElementById('pfi-accesso').close());
    su('pfi-nuovo-form', 'submit', creaNuovo);
    su('pfi-nuovo-classe', 'change', e => {
        const nuova = e.target.value === '__nuova__';
        document.getElementById('pfi-nuovo-classe-box').hidden = !nuova;
        const c = stato.classi.find(x => x.id === e.target.value);
        // su una classe esistente si eredita il suo tutor; su una nuova, sei tu
        document.getElementById('pfi-nuovo-as').value =
            (c ? c.anno_scolastico : document.getElementById('pfi-nuovo-as').value) || '';
        document.getElementById('pfi-nuovo-tutor').value =
            (c && c.tutor) ? c.tutor : stato.nomeCompleto;
    });
    su('pfi-mostra-archiviati', 'change', caricaElenco);
    su('pfi-elimina-form', 'submit', eliminaDefinitivo);
    su('pfi-el-annulla', 'click', () =>
        document.getElementById('pfi-elimina').close());
    su('pfi-esci', 'click', esci);
    su('pfi-cloud-salva', 'click', salvaCloud);
    su('pfi-cloud-apri', 'click', apriDaCloud);
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
        Object.assign({}, u, { _id: crypto.randomUUID() }));
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
    const D = window.DocumentoOffice;
    const vuoto = '—';
    const nodi = [];

    nodi.push(D.paragrafo(d.istituto || '', 'istituto'));
    nodi.push(D.linea());
    nodi.push(D.titolo(1, 'PROGETTO FORMATIVO INDIVIDUALE'));
    nodi.push(D.paragrafo(`${d.indirizzo || ''} — Anno scolastico ${d.annoScolastico || '________'}`, 'sottotitolo'));
    nodi.push(D.paragrafo('Redatto ai sensi del D.Lgs. 13 aprile 2017 n. 61, art. 5 c. 1 lett. a) e del D.M. 24 maggio 2018 n. 92, artt. 4 e 6.', 'catenaccio'));

    nodi.push(D.titolo(2, 'Quadro 1 — Dati generali e anagrafici'));
    nodi.push(tab([
        ['Cognome e nome', `${d.cognome || ''} ${d.nome || ''}`.trim()],
        ['Data e luogo di nascita', `${d.dataNascita || ''} — ${d.luogoNascita || ''}`],
        ['Residenza', d.residenza],
        ['Classe', d.classe],
        ['Codice ATECO / NUP', `${d.ateco || ''} / ${d.nup || ''}`],
        ['Bisogni educativi speciali', [
            d.bes_dsa && 'DSA', d.bes_cdc && 'BES rilevato dal CdC',
            d.bes_doc && 'con documentazione', d.bes_104 && 'L. 104/1992'
        ].filter(Boolean).join('; ')],
        ['Livello di lingua italiana', `scritto ${d.italianoScritto || vuoto} · orale ${d.italianoOrale || vuoto}`],
        ['Docenti tutor', ANNI.map(a => d[`tutor_${a}`] ? `${ANNO_ETICHETTA[a]}: ${d[`tutor_${a}`]}` : null).filter(Boolean).join(' · ')]
    ]));

    nodi.push(D.titolo(2, 'Quadro 2 — Sintesi del bilancio personale iniziale'));
    nodi.push(D.paragrafo(`Rilevazione del ${d.bilancioData || '__________'}`, 'fonte'));
    nodi.push(D.titolo(3, 'Profilo dell’allievo'));
    nodi.push(D.paragrafo(d.profilo || vuoto));
    nodi.push(D.titolo(3, 'Competenze acquisite in contesti formali'));
    nodi.push(tab([
        ['Precedenti esperienze di istruzione e formazione', d.precedentiEsperienze],
        ['Eventuali ripetenze', d.ripetenze],
        ['Titolo di studio e votazione', d.titoloStudio],
        ['Certificazione del primo ciclo e INVALSI', d.certificazionePrimoCiclo],
        ['Esiti delle prove di ingresso', d.proveIngresso],
        ['Debiti in ingresso', d.debitiIngresso],
        ['Crediti dimostrabili', d.creditiIngresso],
        ['Precedenti esperienze di formazione scuola-lavoro (ex PCTO) o apprendistato', d.esperienzePcto]
    ]));
    nodi.push(D.titolo(3, 'Competenze acquisite in contesti non formali e informali'));
    nodi.push(tab([
        ['Attitudini', d.attitudini],
        ['Risorse e motivazione', d.motivazione],
        ['Aspettative per il futuro', d.aspettative],
        ['Capacità di studiare e lavorare con altri', d.capacitaSociali],
        ['Problematiche sociali o personali', d.problematiche],
        ['Altre attività significative', d.altreAttivita]
    ]));

    nodi.push(D.titolo(2, 'Quadro 3 — Obiettivi previsti in termini di personalizzazione'));
    nodi.push(D.paragrafo(d.obiettivi || vuoto));
    nodi.push(tab([
        ['Apprendimento della lingua italiana', d.obiettivoItaliano],
        ['Partecipazione alla vita scolastica', d.obiettivoPartecipazione],
        ['Qualifiche e certificazioni', d.obiettivoCertificazioni],
        ['Crediti per passaggi ad altri indirizzi o sistemi', d.obiettivoCrediti]
    ]));

    nodi.push(D.titolo(2, 'Quadro 4 — Strumenti didattici particolari previsti'));
    const strumenti = [
        d.str_formulari && 'Formulari, schemi e mappe concettuali',
        d.str_tempi && 'Tempi aggiuntivi nelle verifiche',
        d.str_digitali && 'Strumenti compensativi digitali',
        d.str_orale && 'Prevalenza della verifica orale'
    ].filter(Boolean);
    nodi.push(strumenti.length ? D.elenco(strumenti) : D.paragrafo(vuoto));
    if (d.strumentiAltro) nodi.push(D.paragrafo(d.strumentiAltro));

    nodi.push(D.titolo(2, 'Quadro 5 — Interventi di personalizzazione del percorso'));
    nodi.push(D.paragrafo('Quota di personalizzazione fino a 264 ore nel biennio — D.Lgs. 61/2017 art. 4 c. 2.', 'fonte'));
    const righeInterventi = [];
    INTERVENTI.forEach((voce, i) => {
        const att = d[`int_${i}_att`] || '';
        const ore = ANNI.map(a => d[`int_${i}_ore_${a}`] || '');
        if (!att && !ore.some(Boolean)) return;
        righeInterventi.push([voce, att, ...ore.map(o => ({ frammenti: D.frammenti(o), allineamento: 'center' }))]);
    });
    if (righeInterventi.length) {
        nodi.push(D.tabella({
            intestazioni: ['Tipo di intervento', 'Attività', ...ANNI.map(a => `Ore ${ANNO_ETICHETTA[a]}`)],
            larghezze: [26, 34, 8, 8, 8, 8, 8],
            righe: righeInterventi
        }));
    } else {
        nodi.push(D.paragrafo('Nessun intervento di personalizzazione registrato.', 'nota'));
    }

    nodi.push(D.titolo(2, 'Quadro 6 — Verifica periodica e revisione'));
    nodi.push(D.paragrafo('La valutazione di competenze, abilità e conoscenze è effettuata in relazione alle unità di apprendimento nelle quali è strutturato il PFI — D.I. 92/2018 art. 4 c. 6.', 'fonte'));
    ANNI.forEach(a => {
        const campi = ['as', 'freq', 'esito', 'carenze', 'revisione', 'data'];
        if (!campi.some(k => d[`an_${a}_${k}`])) return;
        nodi.push(D.titolo(3, `${ANNO_ETICHETTA[a]} annualità — a.s. ${d[`an_${a}_as`] || ''}`));
        nodi.push(tab([
            ['Frequenza', d[`an_${a}_freq`]],
            ['Esito della valutazione delle UDA', d[`an_${a}_esito`]],
            ['Carenze e misure', d[`an_${a}_carenze`]],
            ['Revisione del PFI', d[`an_${a}_revisione`]],
            ['Data della verifica', d[`an_${a}_data`]],
            ...(a === 2 ? [['Certificato di competenze', d.an_2_certificato]] : []),
            ['Docente tutor', d[`an_${a}_tutorfirma`]]
        ]));
    });

    nodi.push(D.titolo(2, 'Quadro 7 — Piano didattico delle unità di apprendimento'));
    nodi.push(D.paragrafo('Parte integrante del presente documento. Il PFI è articolato per unità di apprendimento — D.I. 92/2018 art. 2 c. 1.', 'fonte'));
    if (!stato.uda.length) {
        nodi.push(D.paragrafo('Nessuna unità di apprendimento inserita.', 'nota'));
    } else {
        stato.uda.forEach((u, i) => {
            nodi.push(D.titolo(3, `UDA ${i + 1} — ${u.titolo || ''}`));
            nodi.push(tab([
                ['Tipo e anno', `${u.tipo || ''}${u.anno ? ' · ' + ANNO_ETICHETTA[u.anno] : ''}${u.periodo ? ' · ' + u.periodo : ''}`],
                ['Competenze target · C = SSAS, AG = area generale', u.competenze],
                ['Competenze chiave europee', u.europee],
                ['Insegnamenti coinvolti', u.insegnamenti],
                ['Saperi essenziali mobilitati', u.saperi],
                ['Situazione, problema o tema', u.situazione || u.compito],
                ['Prodotto da realizzare', u.prodotto || u.compito],
                ['Beneficiari', u.beneficiari],
                ['Ambito', u.ambito],
                ['Attività degli studenti', u.attivita],
                ['Monte ore', u.ore],
                ['Criteri ed evidenze di valutazione', u.valutazione],
                ['Livello di padronanza raggiunto', `${u.livello || vuoto}${u.qnq ? ' · QNQ ' + u.qnq : ''}`]
            ]));
        });
    }

    nodi.push(D.titolo(2, 'Quadro 8 — Livelli di padronanza delle competenze'));
    nodi.push(D.paragrafo('Valutazione collegiale del consiglio di classe riferita alle UDA — Linee guida § 3.2.2 e Box n. 8 voce 8.', 'fonte'));
    if (stato.uda.length) {
        nodi.push(D.tabella({
            intestazioni: ['Competenza', 'UDA', 'Livello', 'QNQ'],
            larghezze: [34, 34, 20, 12],
            righe: stato.uda.flatMap(u => righeCompetenze(u).map(r => [
                r.testo, u.titolo || '', r.livello || '',
                { frammenti: D.frammenti(u.qnq || ''), allineamento: 'center' }
            ]))
        }));
    }

    nodi.push(D.titolo(2, 'Sottoscrizione'));
    nodi.push(tab([
        ['Data di prima stesura', d.dataStesura],
        ['Approvazione del consiglio di classe', d.dataApprovazione],
        ['Coordinatore', d.coordinatore],
        ['Dirigente scolastico', d.dirigente]
    ]));
    nodi.push(D.firme([
        'Firma dello studente',
        'Firma del genitore o di chi esercita la responsabilità genitoriale',
        'Firma del docente tutor'
    ]));

    const titoloDocumento = `PFI — ${`${d.cognome || ''} ${d.nome || ''}`.trim() || 'senza nome'}`;
    D.scaricaDocx(nomeFile('docx'), nodi, { titolo: titoloDocumento, istituto: d.istituto || '' });
}

// Etichetta a sinistra, valore a destra. Le righe senza valore restano, con un
// trattino: nel PFI un campo vuoto è un'informazione, dice che non è stato
// ancora compilato.
function tab(righe) {
    const D = window.DocumentoOffice;
    return D.tabella({
        larghezze: [34, 66],
        righe: righe.map(([etichetta, valore]) => [
            { frammenti: D.frammenti(etichetta), grassetto: true, sfondo: 'FAFAFA' },
            String(valore ?? '').trim() || '—'
        ])
    });
}

// ============================================================
// 7. Supabase — prototipo dimostrativo
// ============================================================

async function ripristinaSessione() {
    const token = sessionStorage.getItem(SESSION_KEY) || '';
    if (!token) { modalitaCloud(false); return; }
    stato.token = token;
    try {
        const p = await chiamaApi('session', {});
        applicaProfilo(p);
        modalitaCloud(true);
    } catch {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(IDENTITA_KEY);
        stato.token = '';
        modalitaCloud(false);
    }
}

function applicaProfilo(p) {
    stato.docente = p.docente || '';
    stato.nomeCompleto = p.nomeCompleto || p.docente || '';
    aggiornaEtichettaCloud();
}

function aggiornaEtichettaCloud() {
    const et = document.getElementById('pfi-cloud-stato');
    if (!stato.token) {
        et.textContent = "Non hai effettuato l'accesso";
        et.dataset.attivo = 'no';
        return;
    }
    et.textContent = stato.nomeCompleto + (stato.classeAttiva ? ` · ${stato.classeAttiva}` : '');
    et.dataset.attivo = 'si';
}

function modalitaCloud(attivo) {
    document.getElementById('pfi-accedi').hidden = attivo;
    document.getElementById('pfi-cloud-salva').hidden = !attivo;
    document.getElementById('pfi-cloud-apri').hidden = !attivo;
    document.getElementById('pfi-esci').hidden = !attivo;
    document.getElementById('pfi-gestione').hidden = !attivo;
    aggiornaEtichettaCloud();
    if (attivo) caricaClassi().then(caricaElenco);
    notificaAltezza();
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

// ---------- accesso ----------

function apriAccesso() {
    const err = document.getElementById('pfi-acc-errore');
    err.hidden = true;
    document.getElementById('pfi-acc-codice').value = '';
    document.getElementById('pfi-accesso').showModal();
    document.getElementById('pfi-acc-nome').focus();
}

async function accedi(evento) {
    evento.preventDefault();
    const nome = document.getElementById('pfi-acc-nome').value.trim();
    const codice = document.getElementById('pfi-acc-codice').value;
    const err = document.getElementById('pfi-acc-errore');
    const bottone = document.getElementById('pfi-acc-conferma');
    if (!nome || !codice) return;

    bottone.disabled = true;
    try {
        stato.token = '';
        const dati = await chiamaApi('login', { docente: nome, codice });
        stato.token = dati.token;
        sessionStorage.setItem(SESSION_KEY, stato.token);
        applicaProfilo(dati);
        modalitaCloud(true);
        document.getElementById('pfi-accesso').close();
        if (dati.nuovo) {
            alert(`Utenza creata: ${dati.nomeCompleto}.\n\n` +
                  'Da ora entri con questo nome e il codice che hai scelto. ' +
                  'Il nome comparirà come docente tutor nei PFI che compili.');
        }
    } catch (e) {
        err.textContent = e.message;
        err.hidden = false;
        modalitaCloud(false);
    } finally {
        bottone.disabled = false;
    }
}

function esci() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(IDENTITA_KEY);
    Object.assign(stato, {
        token: '', docente: '', nomeCompleto: '',
        classi: [], classeAttiva: '', documentoId: '', eliminandoId: ''
    });
    modalitaCloud(false);
}

// ---------- sezione 1: crea un nuovo PFI ----------

async function caricaClassi() {
    try {
        const d = await chiamaApi('classi', {});
        stato.classi = d.classi || [];
    } catch { stato.classi = []; }

    const sel = document.getElementById('pfi-nuovo-classe');
    sel.innerHTML = stato.classi
        .map(c => `<option value="${escapeAttr(c.id)}">${escapeHtml(c.nome)} — ${escapeHtml(c.anno_scolastico || 's.a.')} (${c.studenti})</option>`)
        .join('') + '<option value="__nuova__">+ Nuova classe…</option>';

    if (!stato.classi.length) sel.value = '__nuova__';
    sel.dispatchEvent(new Event('change'));
    if (!document.getElementById('pfi-nuovo-tutor').value) {
        document.getElementById('pfi-nuovo-tutor').value = stato.nomeCompleto;
    }
}

async function creaNuovo(evento) {
    evento.preventDefault();
    const err = document.getElementById('pfi-nuovo-errore');
    err.hidden = true;

    const sel = document.getElementById('pfi-nuovo-classe').value;
    const classe = sel === '__nuova__'
        ? document.getElementById('pfi-nuovo-classe-nome').value.trim()
        : (stato.classi.find(c => c.id === sel)?.nome || '');
    const anno = document.getElementById('pfi-nuovo-as').value.trim();
    const tutor = document.getElementById('pfi-nuovo-tutor').value.trim();
    const cognome = document.getElementById('pfi-nuovo-cognome').value.trim();
    const nome = document.getElementById('pfi-nuovo-nome').value.trim();

    if (!classe) { err.textContent = 'Indica la classe.'; err.hidden = false; return; }
    if (!cognome || !nome) { err.textContent = 'Indica cognome e nome dello studente.'; err.hidden = false; return; }

    // modulo pulito con l'intestazione già compilata
    document.getElementById('pfi-form').reset();
    stato.uda = []; stato.documentoId = '';
    aggiornaUda(); ricalcolaOre();

    const f = document.getElementById('pfi-form');
    f.elements['cognome'].value = cognome;
    f.elements['nome'].value = nome;
    f.elements['classe'].value = classe;
    f.elements['annoScolastico'].value = anno;
    impostaClasse(classe, tutor);

    try {
        await chiamaApi('salva', {
            etichetta: `${cognome} ${nome}`, classe, anno_scolastico: anno, tutor, payload: raccogli()
        });
        document.getElementById('pfi-nuovo-cognome').value = '';
        document.getElementById('pfi-nuovo-nome').value = '';
        await caricaClassi(); await caricaElenco();
        document.getElementById('q1').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        err.textContent = e.message; err.hidden = false;
    }
}

/** Riporta nel PFI la classe e il nome del tutor per l'anno corrispondente. */
function impostaClasse(classe, tutor) {
    stato.classeAttiva = classe || '';
    const form = document.getElementById('pfi-form');
    const campoClasse = form.elements['classe'];
    if (campoClasse && stato.classeAttiva) campoClasse.value = stato.classeAttiva;

    const nomeTutor = tutor || stato.nomeCompleto;
    const anno = Number((stato.classeAttiva.match(/[1-5]/) || [])[0]);
    if (anno && nomeTutor) {
        const campoTutor = form.elements[`tutor_${anno}`];
        if (campoTutor && !campoTutor.value.trim()) campoTutor.value = nomeTutor;
        const firma = form.elements[`an_${anno}_tutorfirma`];
        if (firma && !firma.value.trim()) firma.value = nomeTutor;
    }
    aggiornaEtichettaCloud();
}

// ---------- sezione 2: PFI già creati, per classe ----------

async function caricaElenco() {
    const box = document.getElementById('pfi-lista-classi');
    const archiviati = document.getElementById('pfi-mostra-archiviati').checked;
    box.innerHTML = '<p class="pfi-nota">Caricamento…</p>';

    try {
        const d = await chiamaApi('elenco', { archiviati });
        const voci = d.documenti || [];
        document.getElementById('pfi-lista-sottotitolo').textContent = archiviati
            ? `${voci.length} PFI archiviati.`
            : `${voci.length} PFI, raggruppati per classe.`;

        if (!voci.length) {
            box.innerHTML = `<p class="pfi-nota">${archiviati ? 'Nessun PFI archiviato.' : 'Nessun PFI creato finora.'}</p>`;
            notificaAltezza();
            return;
        }

        const gruppi = new Map();
        voci.forEach(v => {
            const k = v.classe || '(senza classe)';
            if (!gruppi.has(k)) gruppi.set(k, []);
            gruppi.get(k).push(v);
        });

        box.innerHTML = [...gruppi.entries()].map(([classe, studenti]) => `
            <section class="pfi-gruppo">
                <h3>${escapeHtml(classe)} <span>${studenti.length} student${studenti.length === 1 ? 'e' : 'i'}</span></h3>
                <ul>
                    ${studenti.map(v => `
                        <li>
                            <button type="button" class="pfi-elenco-voce" data-apri="${escapeAttr(v.id)}">
                                <span class="pfi-elenco-nome">${escapeHtml(v.etichetta)}</span>
                                <span class="pfi-elenco-meta">${escapeHtml(v.anno_scolastico || 's.a.')} · ultimo aggiornamento ${new Date(v.aggiornato_il).toLocaleDateString('it-IT')}${v.aggiornato_da ? ' di ' + escapeHtml(v.aggiornato_da) : ''}</span>
                            </button>
                            <div class="pfi-voce-azioni">
                                <button type="button" class="pfi-mini" data-archivia="${escapeAttr(v.id)}" data-ripristina="${archiviati}">${archiviati ? 'Ripristina' : 'Archivia'}</button>
                                ${archiviati ? `<button type="button" class="pfi-mini pfi-mini-pericolo" data-elimina="${escapeAttr(v.id)}" data-nome="${escapeAttr(v.etichetta)}">Cancella</button>` : ''}
                            </div>
                        </li>`).join('')}
                </ul>
            </section>`).join('');
    } catch (e) {
        box.innerHTML = `<p class="pfi-nota">Lettura non riuscita: ${escapeHtml(e.message)}</p>`;
    }
    notificaAltezza();
}

async function salvaCloud() {
    const pacchetto = raccogli();
    const etichetta = `${pacchetto.campi.cognome || ''} ${pacchetto.campi.nome || ''}`.trim();
    if (!etichetta) { alert('Compila cognome e nome dello studente prima di salvare.'); return; }
    const classe = stato.classeAttiva || pacchetto.campi.classe || '';
    if (!classe) { alert('Assegna la classe prima di salvare.'); return; }
    try {
        const r = await chiamaApi('salva', {
            etichetta, classe,
            anno_scolastico: pacchetto.campi.annoScolastico || '',
            tutor: stato.nomeCompleto,
            payload: pacchetto
        });
        stato.documentoId = r.id;
        alert(`PFI di ${etichetta} salvato — classe ${r.classe}.`);
        await caricaClassi(); await caricaElenco();
    } catch (err) {
        alert(`Salvataggio non riuscito: ${err.message}`);
    }
}

function apriDaCloud() {
    const g = document.getElementById('pfi-gestione');
    g.hidden = false;
    g.scrollIntoView({ behavior: 'smooth' });
    caricaElenco();
}

// ---------- cancellazione protetta ----------

function chiediEliminazione(id, nome) {
    stato.eliminandoId = id;
    document.getElementById('pfi-el-conferma').value = '';
    document.getElementById('pfi-el-codice').value = '';
    const err = document.getElementById('pfi-el-errore');
    err.hidden = true;
    document.getElementById('pfi-elimina-titolo').textContent = `Cancellare il PFI di ${nome}?`;
    document.getElementById('pfi-elimina').showModal();
}

async function eliminaDefinitivo(evento) {
    evento.preventDefault();
    const err = document.getElementById('pfi-el-errore');
    try {
        await chiamaApi('elimina', {
            id: stato.eliminandoId,
            codice: document.getElementById('pfi-el-codice').value,
            conferma: document.getElementById('pfi-el-conferma').value
        });
        document.getElementById('pfi-elimina').close();
        await caricaClassi(); await caricaElenco();
    } catch (e) {
        err.textContent = e.message;
        err.hidden = false;
    }
}

document.addEventListener('click', async e => {
    const apri = e.target.closest('[data-apri]');
    if (apri) {
        try {
            const doc = await chiamaApi('apri', { id: apri.dataset.apri });
            applica(doc.payload);
            stato.documentoId = doc.id;
            if (doc.classe) impostaClasse(doc.classe);
            document.getElementById('q1').scrollIntoView({ behavior: 'smooth' });
        } catch (err) { alert(`Apertura non riuscita: ${err.message}`); }
        return;
    }

    const arch = e.target.closest('[data-archivia]');
    if (arch) {
        try {
            await chiamaApi('archivia', {
                id: arch.dataset.archivia,
                ripristina: arch.dataset.ripristina === 'true'
            });
            await caricaClassi(); await caricaElenco();
        } catch (err) { alert(err.message); }
        return;
    }

    const el = e.target.closest('[data-elimina]');
    if (el) chiediEliminazione(el.dataset.elimina, el.dataset.nome);
});

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
