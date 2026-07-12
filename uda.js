// Fascicolo UDA quinquennio — rendering e filtri
// Dati: data-uda.json (48 schede sintetiche D.I. 92/2018 con attribuzione
// di saperi e abilità agli insegnamenti derivata dal curricolo di indirizzo)

// Se la pagina vive in un iframe: niente scroll interno, altezza gestita dalla madre
if (window.parent !== window) {
    document.documentElement.classList.add('embedded');
}

let udaData = null;
const udaFilters = { anno: '', competenza: '', insegnamento: '', search: '' };
const expandedUda = new Set();

const ANNO_LABEL = { 1: '1° anno', 2: '2° anno', 3: '3° anno', 4: '4° anno', 5: '5° anno' };
const ANNO_PERIODO = { 1: 'Biennio', 2: 'Biennio', 3: 'Terzo Anno', 4: 'Quarto Anno', 5: 'Quinto Anno' };
const ANNO_CLASS = { 1: 'per-biennio', 2: 'per-biennio', 3: 'per-terzo', 4: 'per-quarto', 5: 'per-quinto' };

// Colore identificativo per insegnamento
const INS_CLASS = {
    'Metodologie Operative': 'ins-met',
    'Psicologia': 'ins-psi',
    'Igiene e Cultura M.S.': 'ins-igi',
    'Diritto': 'ins-dir',
    'Diritto e T.A.': 'ins-dir',
    'Scienze Umane': 'ins-su',
    'Scienze Integrate': 'ins-si',
    'Scienze Motorie': 'ins-sm',
    'Italiano': 'ins-ita',
    'Inglese': 'ins-lin',
    'Spagnolo': 'ins-lin',
    'Storia': 'ins-sto',
    'Matematica': 'ins-mat',
    'TIC': 'ins-tic'
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const response = await fetch('data-uda.json', { cache: 'no-store' });
        udaData = await response.json();
        setupToolbar();
        render();
    } catch (error) {
        console.error('Errore caricamento UDA:', error);
        const list = document.getElementById('uda-list');
        if (list) list.innerHTML = '<p class="empty-placeholder">Impossibile caricare le UDA.</p>';
    } finally {
        const loading = document.getElementById('uda-loading');
        if (loading) loading.classList.add('hidden');
        notifyParentHeight();
    }
}

function setupToolbar() {
    // Filtro competenza
    const compSelect = document.getElementById('uda-competenza');
    Object.entries(udaData.meta.competenze).forEach(([num, titolo]) => {
        const option = document.createElement('option');
        option.value = num;
        option.textContent = `C${num} — ${titolo}`;
        compSelect.appendChild(option);
    });

    // Filtro insegnamento
    const insSelect = document.getElementById('uda-insegnamento');
    const insSet = new Set();
    udaData.uda.forEach(u => [...u.abilita, ...u.saperi].forEach(x => x.ins.forEach(i => insSet.add(i))));
    [...insSet].sort((a, b) => a.localeCompare(b)).forEach(ins => {
        const option = document.createElement('option');
        option.value = ins;
        option.textContent = ins;
        insSelect.appendChild(option);
    });

    // Eventi
    document.querySelectorAll('.anno-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            udaFilters.anno = btn.dataset.anno === udaFilters.anno ? '' : btn.dataset.anno;
            document.querySelectorAll('.anno-pill').forEach(b =>
                b.classList.toggle('active', b.dataset.anno === udaFilters.anno));
            render();
        });
    });
    compSelect.addEventListener('change', e => { udaFilters.competenza = e.target.value; render(); });
    insSelect.addEventListener('change', e => { udaFilters.insegnamento = e.target.value; render(); });
    document.getElementById('uda-search').addEventListener('input', e => {
        udaFilters.search = e.target.value.trim().toLowerCase();
        render();
    });
    document.getElementById('uda-reset').addEventListener('click', () => {
        udaFilters.anno = udaFilters.competenza = udaFilters.insegnamento = udaFilters.search = '';
        document.getElementById('uda-competenza').value = '';
        document.getElementById('uda-insegnamento').value = '';
        document.getElementById('uda-search').value = '';
        document.querySelectorAll('.anno-pill').forEach(b => b.classList.remove('active'));
        expandedUda.clear();
        render();
    });
}

function hasActiveUdaFilters() {
    return Boolean(udaFilters.anno || udaFilters.competenza || udaFilters.insegnamento || udaFilters.search);
}

function udaMatches(u) {
    if (udaFilters.anno && String(u.anno) !== udaFilters.anno) return false;
    if (udaFilters.competenza && String(u.competenza) !== udaFilters.competenza) return false;
    if (udaFilters.insegnamento) {
        const involved = [...u.abilita, ...u.saperi].some(x => x.ins.includes(udaFilters.insegnamento));
        if (!involved) return false;
    }
    if (udaFilters.search) {
        const haystack = JSON.stringify(u).toLowerCase();
        if (!haystack.includes(udaFilters.search)) return false;
    }
    return true;
}

function toggleUda(id) {
    if (expandedUda.has(id)) {
        expandedUda.delete(id);
    } else {
        expandedUda.add(id);
    }
    const element = document.querySelector(`.uda-acc[data-id="${id}"]`);
    if (element) {
        element.classList.toggle('group-expanded', expandedUda.has(id));
    }
    notifyParentHeight();
}
window.toggleUda = toggleUda;

// Raggruppa abilità e saperi per insegnamento: ogni docente vede tutto ciò
// che il suo insegnamento deve sviluppare nella UDA
function groupByInsegnamento(u) {
    const map = new Map();
    const add = (ins, tipo, item) => {
        if (!map.has(ins)) map.set(ins, { abilita: [], saperi: [] });
        const others = item.ins.filter(x => x !== ins);
        map.get(ins)[tipo].push({ testo: item.t, referente: item.ins[0] === ins, con: others });
    };
    u.abilita.forEach(item => item.ins.forEach(ins => add(ins, 'abilita', item)));
    u.saperi.forEach(item => item.ins.forEach(ins => add(ins, 'saperi', item)));
    // Ordina: prima chi è referente di più voci, poi chi è più coinvolto
    return [...map.entries()].sort((a, b) => {
        const refScore = entry => entry[1].abilita.filter(x => x.referente).length +
            entry[1].saperi.filter(x => x.referente).length;
        const totScore = entry => entry[1].abilita.length + entry[1].saperi.length;
        return refScore(b) - refScore(a) || totScore(b) - totScore(a) || a[0].localeCompare(b[0]);
    });
}

function renderItem(item) {
    const conHtml = item.con.length
        ? ` <span class="ins-con">con ${item.con.map(escapeHTML).join(', ')}</span>`
        : '';
    const refClass = item.referente ? '' : ' class="ins-co-item"';
    return `<li${refClass}>${escapeHTML(item.testo)}${conHtml}</li>`;
}

function renderInsCard(ins, blocks, highlight) {
    const abilitaHtml = blocks.abilita.length
        ? `<div class="ins-block"><h6>⚙️ Abilità essenziali</h6><ul>${blocks.abilita.map(renderItem).join('')}</ul></div>`
        : '';
    const saperiHtml = blocks.saperi.length
        ? `<div class="ins-block"><h6>💡 Saperi essenziali</h6><ul>${blocks.saperi.map(renderItem).join('')}</ul></div>`
        : '';
    return `
        <div class="ins-card ${INS_CLASS[ins] || ''} ${highlight ? 'ins-highlight' : ''}">
            <div class="ins-name">${escapeHTML(ins)}</div>
            ${abilitaHtml}
            ${saperiHtml}
        </div>
    `;
}

function renderUdaCard(u, autoExpand) {
    const expanded = autoExpand || expandedUda.has(u.id);
    const compTitolo = udaData.meta.competenze[String(u.competenza)] || '';
    const insGroups = groupByInsegnamento(u);
    const insCards = insGroups
        .map(([ins, blocks]) => renderInsCard(ins, blocks, udaFilters.insegnamento === ins))
        .join('');
    const svilHtml = u.sviluppata
        ? `<span class="pill pill-stato">📂 ${escapeHTML(u.sviluppata)}</span>`
        : '';

    return `
        <div class="uda-acc ${expanded ? 'group-expanded' : ''}" data-id="${u.id}">
            <div class="uda-acc-header" onclick="toggleUda('${u.id}')">
                <span class="uda-num ${ANNO_CLASS[u.anno]}">${u.id}</span>
                <div class="uda-acc-main">
                    <span class="uda-acc-title">${escapeHTML(u.titolo)}</span>
                    <span class="uda-acc-sub">C${u.competenza} · ${escapeHTML(compTitolo)}</span>
                </div>
                <div class="uda-acc-pills">
                    <span class="pill ${ANNO_CLASS[u.anno]}">${ANNO_LABEL[u.anno]}</span>
                    <span class="pill pill-qnq">QNQ ${escapeHTML(u.qnq)}</span>
                    <span class="pill pill-comp">⏱ ${escapeHTML(u.ore)} ore</span>
                </div>
                <span class="group-chevron">▸</span>
            </div>
            <div class="uda-acc-body">
                <div class="uda-boxes">
                    <div class="uda-box uda-box-traguardo">
                        <div class="uda-label">🎯 Traguardo intermedio</div>
                        <div>${escapeHTML(u.traguardo)}</div>
                    </div>
                    <div class="uda-box uda-box-compito">
                        <div class="uda-label">🛠 Compito di realtà</div>
                        <div>${escapeHTML(u.compito)}</div>
                    </div>
                </div>
                ${svilHtml ? `<div class="uda-svil">${svilHtml}</div>` : ''}
                <div class="uda-ripartizione">
                    <h5>Chi sviluppa che cosa — ripartizione per insegnamento</h5>
                    <div class="ins-grid">${insCards}</div>
                </div>
            </div>
        </div>
    `;
}

function render() {
    const list = document.getElementById('uda-list');
    const counter = document.getElementById('uda-count');
    if (!list || !udaData) return;

    const autoExpand = hasActiveUdaFilters();
    const visible = udaData.uda.filter(udaMatches);

    counter.textContent = `${visible.length} ${visible.length === 1 ? 'scheda' : 'schede'} su ${udaData.uda.length}` +
        (udaFilters.insegnamento ? ` · evidenziato: ${udaFilters.insegnamento}` : '');

    if (!visible.length) {
        list.innerHTML = `
            <div class="empty-state">
                <p>Nessuna UDA corrisponde ai filtri selezionati.</p>
                <p>Modifica i filtri o usa Reset.</p>
            </div>`;
        notifyParentHeight();
        return;
    }

    const sections = [];
    [1, 2, 3, 4, 5].forEach(anno => {
        const inAnno = visible.filter(u => u.anno === anno);
        if (!inAnno.length) return;
        sections.push(`
            <div class="uda-section">
                <div class="uda-section-header">
                    <span class="uda-icon anno-badge ${ANNO_CLASS[anno]}">${anno}°</span>
                    <h2>${ANNO_LABEL[anno].toUpperCase()} — ${inAnno.length} ${inAnno.length === 1 ? 'scheda' : 'schede'} (QNQ ${inAnno[0].qnq})</h2>
                    <span class="uda-rule"></span>
                </div>
                ${inAnno.map(u => renderUdaCard(u, autoExpand)).join('')}
            </div>
        `);
    });

    list.innerHTML = sections.join('');
    notifyParentHeight();
}

function notifyParentHeight() {
    if (window.parent === window) {
        return;
    }
    requestAnimationFrame(() => {
        const height = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
        );
        window.parent.postMessage({ type: 'iframeContentHeight', height }, '*');
    });
}

function escapeHTML(value) {
    if (value === undefined || value === null) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
