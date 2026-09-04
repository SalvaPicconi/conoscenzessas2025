// Catalogo autonomo delle UDA trasversali — rendering e filtri
// Dati: data-uda-trasversali.json (10 schede interdisciplinari, due per anno)

if (window.parent !== window) {
    document.documentElement.classList.add('embedded');
}

let trasversaliData = null;
const trasversaliFilters = { anno: '', asse: '', insegnamento: '', search: '' };
const expandedTrasversali = new Set();
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
        const response = await fetch('data-uda-trasversali.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Catalogo trasversale: HTTP ${response.status}`);
        trasversaliData = await response.json();
        setupTrasversaliToolbar();
        renderTrasversali();
    } catch (error) {
        console.error('Errore caricamento UDA trasversali:', error);
        const list = document.getElementById('trasversali-list');
        if (list) list.innerHTML = '<p class="empty-placeholder">Impossibile caricare le UDA trasversali.</p>';
    } finally {
        document.getElementById('trasversali-loading')?.classList.add('hidden');
        notifyParentHeight();
    }
}
function setupTrasversaliToolbar() {
    const asseSelect = document.getElementById('trasversali-asse');
    const insSelect = document.getElementById('trasversali-insegnamento');

    (trasversaliData.meta.assi || []).forEach(asse => {
        const option = document.createElement('option');
        option.value = asse;
        option.textContent = asse;
        asseSelect.appendChild(option);
    });

    const insSet = new Set();
    trasversaliData.uda.forEach(u => [...u.abilita, ...u.saperi].forEach(x => x.ins.forEach(i => insSet.add(i))));
    [...insSet].sort((a, b) => a.localeCompare(b)).forEach(ins => {
        const option = document.createElement('option');
        option.value = ins;
        option.textContent = ins;
        insSelect.appendChild(option);
    });

    document.querySelectorAll('.trasversale-anno-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            trasversaliFilters.anno = btn.dataset.anno === trasversaliFilters.anno ? '' : btn.dataset.anno;
            document.querySelectorAll('.trasversale-anno-pill').forEach(b => {
                const isActive = b.dataset.anno === trasversaliFilters.anno;
                b.classList.toggle('active', isActive);
                b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
            renderTrasversali();
        });
    });

    asseSelect.addEventListener('change', e => { trasversaliFilters.asse = e.target.value; renderTrasversali(); });
    insSelect.addEventListener('change', e => { trasversaliFilters.insegnamento = e.target.value; renderTrasversali(); });
    document.getElementById('trasversali-search').addEventListener('input', e => {
        trasversaliFilters.search = e.target.value.trim().toLowerCase();
        renderTrasversali();
    });
    document.getElementById('trasversali-reset').addEventListener('click', () => {
        trasversaliFilters.anno = trasversaliFilters.asse = trasversaliFilters.insegnamento = trasversaliFilters.search = '';
        asseSelect.value = '';
        insSelect.value = '';
        document.getElementById('trasversali-search').value = '';
        document.querySelectorAll('.trasversale-anno-pill').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        expandedTrasversali.clear();
        renderTrasversali();
    });

    document.getElementById('trasversali-list').addEventListener('click', event => {
        const button = event.target.closest('.uda-acc-header');
        if (button) toggleTrasversale(button.dataset.udaId);
    });

    document.getElementById('uda-trasversali-nota').textContent = trasversaliData.meta.nota || '';
}

function insegnamentiOrdinati(u) {
    const score = new Map();
    [...u.abilita, ...u.saperi].forEach(item => {
        item.ins.forEach((ins, idx) => {
            score.set(ins, (score.get(ins) || 0) + (idx === 0 ? 10 : 1));
        });
    });
    return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(e => e[0]);
}

function renderInsChips(insList, highlighted = trasversaliFilters.insegnamento) {
    return insList.map(ins => {
        const hl = highlighted === ins ? ' ins-chip-highlight' : '';
        return `<span class="ins-chip ${INS_CLASS[ins] || ''}${hl}">${escapeHTML(ins)}</span>`;
    }).join('');
}

function hasActiveTrasversaliFilters() {
    return Boolean(trasversaliFilters.anno || trasversaliFilters.asse ||
        trasversaliFilters.insegnamento || trasversaliFilters.search);
}

function trasversaleMatches(u) {
    if (trasversaliFilters.anno && String(u.anno) !== trasversaliFilters.anno) return false;
    if (trasversaliFilters.asse && !(u.assi || []).includes(trasversaliFilters.asse)) return false;
    if (trasversaliFilters.insegnamento) {
        const involved = [...u.abilita, ...u.saperi].some(x => x.ins.includes(trasversaliFilters.insegnamento));
        if (!involved) return false;
    }
    if (trasversaliFilters.search) {
        const haystack = JSON.stringify(u).toLowerCase();
        if (!haystack.includes(trasversaliFilters.search)) return false;
    }
    return true;
}

function toggleTrasversale(id) {
    if (expandedTrasversali.has(id)) {
        expandedTrasversali.delete(id);
    } else {
        expandedTrasversali.add(id);
    }
    const element = document.querySelector(`#trasversali-list .uda-acc[data-id="${id}"]`);
    if (element) {
        const isExpanded = expandedTrasversali.has(id);
        element.classList.toggle('group-expanded', isExpanded);
        element.querySelector('.uda-acc-header')?.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        const body = element.querySelector('.uda-acc-body');
        if (body) body.hidden = !isExpanded;
    }
    notifyParentHeight();
}

function renderCompetenzaList(numbers, catalog, prefix) {
    return (numbers || []).map(num =>
        `<li><strong>${escapeHTML(prefix)}${escapeHTML(num)}</strong> — ${escapeHTML(catalog[String(num)] || '')}</li>`
    ).join('');
}

function renderTextList(items) {
    return (items || []).map(item => `<li>${escapeHTML(item)}</li>`).join('');
}

function renderTrasversaleCard(u, autoExpand) {
    const expanded = autoExpand || expandedTrasversali.has(u.id);
    const insTotali = insegnamentiOrdinati(u);
    const panelId = `trasversale-panel-${String(u.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const meta = trasversaliData.meta;

    return `
        <div class="uda-acc uda-acc-trasversale ${expanded ? 'group-expanded' : ''}" data-id="${escapeHTML(u.id)}" data-uda-revisione-key="${escapeHTML(u.id)}">
            <button type="button" class="uda-acc-header" data-uda-id="${escapeHTML(u.id)}" aria-expanded="${expanded}" aria-controls="${panelId}">
                <span class="uda-num ${ANNO_CLASS[u.anno]}">${escapeHTML(u.id)}</span>
                <span class="uda-acc-main">
                    <span class="uda-acc-title">${escapeHTML(u.titolo)}</span>
                    <span class="uda-acc-sub">${escapeHTML(u.periodo)} · ${(u.assi || []).length} assi culturali · ${insTotali.length} insegnamenti</span>
                </span>
                <span class="uda-acc-pills">
                    <span class="pill ${ANNO_CLASS[u.anno]}">${ANNO_LABEL[u.anno]}</span>
                    <span class="pill pill-qnq">QNQ ${escapeHTML(u.qnq)}</span>
                    <span class="pill pill-comp">⏱ ${escapeHTML(u.ore)} ore</span>
                </span>
                <span class="group-chevron" aria-hidden="true">▸</span>
            </button>
            <div class="uda-acc-body" id="${panelId}" ${expanded ? '' : 'hidden'}>
                <div class="trasversale-assi" aria-label="Assi culturali coinvolti">
                    ${(u.assi || []).map(asse => `<span class="asse-chip">${escapeHTML(asse)}</span>`).join('')}
                </div>
                <div class="uda-sintetica">
                    <div class="sin-row">
                        <div class="sin-label">Competenze chiave europee 2018</div>
                        <div class="sin-value"><ul class="sin-list">${renderTextList(u.competenzeEuropee)}</ul></div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Competenze area generale</div>
                        <div class="sin-value"><ul class="sin-list">${renderCompetenzaList(u.competenzeGenerali, meta.competenzeGenerali, 'G')}</ul></div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Competenze SSAS</div>
                        <div class="sin-value"><ul class="sin-list">${renderCompetenzaList(u.competenzeSSAS, meta.competenzeSSAS, 'C')}</ul></div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Traguardo</div>
                        <div class="sin-value">${escapeHTML(u.traguardo)}</div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Situazione / problema</div>
                        <div class="sin-value">${escapeHTML(u.situazione)}</div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Compito di realtà</div>
                        <div class="sin-value">${escapeHTML(u.compito)}</div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Prodotto</div>
                        <div class="sin-value">${escapeHTML(u.prodotto)}</div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Beneficiari</div>
                        <div class="sin-value">${escapeHTML(u.beneficiari)}${u.ambito ? ` <span class="pill pill-ambito">${escapeHTML(u.ambito)}</span>` : ''}</div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Abilità per insegnamento</div>
                        <div class="sin-value"><ul class="sin-list">${u.abilita.map(item => renderVoceTrasversale(item)).join('')}</ul></div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Saperi per insegnamento</div>
                        <div class="sin-value"><ul class="sin-list">${u.saperi.map(item => renderVoceTrasversale(item)).join('')}</ul></div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Insegnamenti coinvolti</div>
                        <div class="sin-value">${renderInsChips(insTotali, trasversaliFilters.insegnamento)}
                            <span class="sin-ore">· Monte ore indicativo: ${escapeHTML(u.ore)}</span></div>
                    </div>
                </div>
                <div class="uda-revisione-slot" data-uda-revisione-slot="${escapeHTML(u.id)}"></div>
            </div>
        </div>
    `;
}

function renderVoceTrasversale(item) {
    return `<li>${escapeHTML(item.t)} ${renderInsChips(item.ins, trasversaliFilters.insegnamento)}</li>`;
}

function renderTrasversali() {
    const list = document.getElementById('trasversali-list');
    const counter = document.getElementById('trasversali-count');
    if (!list || !trasversaliData) return;

    const autoExpand = hasActiveTrasversaliFilters();
    const visible = trasversaliData.uda.filter(trasversaleMatches);

    counter.textContent = `${visible.length} ${visible.length === 1 ? 'scheda trasversale' : 'schede trasversali'} su ${trasversaliData.uda.length}` +
        (trasversaliFilters.insegnamento ? ` · evidenziato: ${trasversaliFilters.insegnamento}` : '');

    if (!visible.length) {
        list.innerHTML = `
            <div class="empty-state">
                <p>Nessuna UDA trasversale corrisponde ai filtri selezionati.</p>
                <p>Modifica i filtri o usa Azzera filtri.</p>
            </div>`;
        notifyParentHeight();
        return;
    }

    const sections = [];
    [1, 2, 3, 4, 5].forEach(anno => {
        const inAnno = visible.filter(u => u.anno === anno);
        if (!inAnno.length) return;
        sections.push(`
            <div class="uda-section uda-section-trasversale">
                <div class="uda-section-header">
                    <span class="uda-icon anno-badge ${ANNO_CLASS[anno]}">${anno}°</span>
                    <h3>${ANNO_LABEL[anno].toUpperCase()} — ${inAnno.length} ${inAnno.length === 1 ? 'proposta interdisciplinare' : 'proposte interdisciplinari'}</h3>
                    <span class="uda-rule"></span>
                </div>
                ${inAnno.map(u => renderTrasversaleCard(u, autoExpand)).join('')}
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
