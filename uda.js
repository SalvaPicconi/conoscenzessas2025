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
            document.querySelectorAll('.anno-pill').forEach(b => {
                const isActive = b.dataset.anno === udaFilters.anno;
                b.classList.toggle('active', isActive);
                b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
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
        document.querySelectorAll('.anno-pill').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        expandedUda.clear();
        render();
    });

    document.getElementById('uda-list').addEventListener('click', event => {
        const button = event.target.closest('.uda-acc-header');
        if (button) toggleUda(button.dataset.udaId);
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
        const isExpanded = expandedUda.has(id);
        element.classList.toggle('group-expanded', isExpanded);
        element.querySelector('.uda-acc-header')?.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        const body = element.querySelector('.uda-acc-body');
        if (body) body.hidden = !isExpanded;
    }
    notifyParentHeight();
}
// Insegnamenti coinvolti nella UDA, ordinati per numero di voci di cui sono referenti
function insegnamentiOrdinati(u) {
    const score = new Map();
    [...u.abilita, ...u.saperi].forEach(item => {
        item.ins.forEach((ins, idx) => {
            score.set(ins, (score.get(ins) || 0) + (idx === 0 ? 10 : 1));
        });
    });
    return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(e => e[0]);
}

function renderInsChips(insList) {
    return insList.map(ins => {
        const hl = udaFilters.insegnamento === ins ? ' ins-chip-highlight' : '';
        return `<span class="ins-chip ${INS_CLASS[ins] || ''}${hl}">${escapeHTML(ins)}</span>`;
    }).join('');
}

// Voce sintetica: testo + chip degli insegnamenti che la sviluppano (referente per primo)
function renderVoce(item) {
    return `<li>${escapeHTML(item.t)} ${renderInsChips(item.ins)}</li>`;
}

function renderUdaCard(u, autoExpand) {
    const expanded = autoExpand || expandedUda.has(u.id);
    const compTitolo = udaData.meta.competenze[String(u.competenza)] || '';
    const insTotali = insegnamentiOrdinati(u);
    const panelId = `uda-panel-${String(u.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const svilHtml = u.sviluppata
        ? `<div class="sin-row"><div class="sin-label">Materiali</div>
               <div class="sin-value"><span class="pill pill-stato">📂 ${escapeHTML(u.sviluppata)}</span></div></div>`
        : '';

    return `
        <div class="uda-acc ${expanded ? 'group-expanded' : ''}" data-id="${escapeHTML(u.id)}" data-uda-revisione-key="${escapeHTML(u.id)}">
            <button type="button" class="uda-acc-header" data-uda-id="${escapeHTML(u.id)}" aria-expanded="${expanded}" aria-controls="${panelId}">
                <span class="uda-num ${ANNO_CLASS[u.anno]}">${u.id}</span>
                <span class="uda-acc-main">
                    <span class="uda-acc-title">${escapeHTML(u.titolo)}</span>
                    <span class="uda-acc-sub">C${u.competenza} · ${escapeHTML(compTitolo)}</span>
                </span>
                <span class="uda-acc-pills">
                    <span class="pill ${ANNO_CLASS[u.anno]}">${ANNO_LABEL[u.anno]}</span>
                    <span class="pill pill-qnq">QNQ ${escapeHTML(u.qnq)}</span>
                    <span class="pill pill-comp">⏱ ${escapeHTML(u.ore)} ore</span>
                </span>
                <span class="group-chevron" aria-hidden="true">▸</span>
            </button>
            <div class="uda-acc-body" id="${panelId}" ${expanded ? '' : 'hidden'}>
                <div class="uda-sintetica">
                    <div class="sin-row">
                        <div class="sin-label">Competenza in uscita</div>
                        <div class="sin-value">C${u.competenza} — ${escapeHTML(compTitolo)} (Allegato 2-i, D.I. 92/2018)</div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Traguardo intermedio</div>
                        <div class="sin-value">${escapeHTML(u.traguardo)}</div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Compito di realtà</div>
                        <div class="sin-value">${escapeHTML(u.compito)}</div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Abilità essenziali</div>
                        <div class="sin-value"><ul class="sin-list">${u.abilita.map(renderVoce).join('')}</ul></div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Saperi essenziali</div>
                        <div class="sin-value"><ul class="sin-list">${u.saperi.map(renderVoce).join('')}</ul></div>
                    </div>
                    ${svilHtml}
                    <div class="sin-row">
                        <div class="sin-label">Insegnamenti · Ore</div>
                        <div class="sin-value">${renderInsChips(insTotali)}
                            <span class="sin-ore">· Monte ore indicativo: ${escapeHTML(u.ore)}</span></div>
                    </div>
                </div>
                <div class="uda-revisione-slot" data-uda-revisione-slot="${escapeHTML(u.id)}"></div>
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
    document.dispatchEvent(new CustomEvent('curricolo:uda-rendered'));
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
