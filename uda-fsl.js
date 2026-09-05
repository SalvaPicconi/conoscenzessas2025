if (window.parent !== window) document.documentElement.classList.add('embedded');

let fslData = null;
const filters = { anno: null, area: '', insegnamento: '', search: '' };
const expanded = new Set();
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const SUBJECT_CLASS = {
    'METODOLOGIE OPERATIVE': 'ins-met',
    'IGIENE E CULTURA MEDICO SANITARIA': 'ins-igi',
    'DIRITTO E TEC. AMM.': 'ins-dir',
    'PSICOLOGIA GENERALE ED APPLICATA': 'ins-psi'
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const response = await fetch('data-uda-fsl.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        fslData = await response.json();
        buildFilters();
        bindEvents();
        document.getElementById('fsl-nota').textContent = fslData.meta.nota || '';
        render();
    } catch (error) {
        document.getElementById('fsl-list').innerHTML = `<p class="error">Impossibile caricare le UDA FSL: ${esc(error.message)}</p>`;
    } finally { document.getElementById('fsl-loading')?.classList.add('hidden'); }
}

function buildFilters() {
    const area = document.getElementById('fsl-area');
    [...new Set(fslData.uda.map(u => u.areaTirocinio))].sort().forEach(value => addOption(area, value, value));
    const subject = document.getElementById('fsl-insegnamento');
    (fslData.meta.insegnamenti || []).forEach(value => addOption(subject, value, labelSubject(value)));
}

function addOption(select, value, label) { const o = document.createElement('option'); o.value = value; o.textContent = label; select.appendChild(o); }

function bindEvents() {
    document.querySelectorAll('.fsl-anno-pill').forEach(button => button.addEventListener('click', () => {
        filters.anno = filters.anno === Number(button.dataset.anno) ? null : Number(button.dataset.anno);
        document.querySelectorAll('.fsl-anno-pill').forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.anno) === filters.anno)));
        render();
    }));
    document.getElementById('fsl-area').addEventListener('change', event => { filters.area = event.target.value; render(); });
    document.getElementById('fsl-insegnamento').addEventListener('change', event => { filters.insegnamento = event.target.value; render(); });
    document.getElementById('fsl-search').addEventListener('input', event => { filters.search = event.target.value.trim().toLowerCase(); render(); });
    document.getElementById('fsl-reset').addEventListener('click', reset);
    document.getElementById('fsl-list').addEventListener('click', event => {
        const header = event.target.closest('.uda-acc-header'); if (!header) return;
        const id = header.closest('.uda-acc').dataset.id;
        expanded.has(id) ? expanded.delete(id) : expanded.add(id); render();
    });
}

function reset() {
    Object.assign(filters, { anno: null, area: '', insegnamento: '', search: '' });
    document.querySelectorAll('.fsl-anno-pill').forEach(item => item.setAttribute('aria-pressed', 'false'));
    document.getElementById('fsl-area').value = ''; document.getElementById('fsl-insegnamento').value = ''; document.getElementById('fsl-search').value = ''; render();
}

function matches(u) {
    if (filters.anno && u.anno !== filters.anno) return false;
    if (filters.area && u.areaTirocinio !== filters.area) return false;
    if (filters.insegnamento && ![...u.abilita, ...u.saperi].some(item => item.ins.includes(filters.insegnamento))) return false;
    if (filters.search) {
        const haystack = JSON.stringify(u).toLowerCase(); if (!haystack.includes(filters.search)) return false;
    }
    return true;
}

function render() {
    const items = fslData.uda.filter(matches);
    document.getElementById('fsl-count').textContent = `${items.length} ${items.length === 1 ? 'UDA FSL trovata' : 'UDA FSL trovate'} su ${fslData.uda.length}`;
    document.getElementById('fsl-list').innerHTML = items.length ? items.map(card).join('') : '<p class="uda-empty">Nessuna UDA FSL corrisponde ai filtri.</p>';
    document.dispatchEvent(new CustomEvent('curricolo:uda-rendered')); notifyHeight();
}

function card(u) {
    const open = expanded.has(u.id);
    const subjects = orderedSubjects(u);
    const competencies = (u.competenzeSSAS || []).map(n => `<span class="uda-chip uda-chip-primary">C${n}</span>`).join('');
    return `<article class="uda-acc uda-acc-trasversale ${open ? 'group-expanded' : ''}" data-id="${esc(u.id)}" data-uda-revisione-key="${esc(u.id)}">
        <button type="button" class="uda-acc-header" aria-expanded="${open}">
            <span class="uda-acc-id">${esc(u.id)}</span><span class="uda-acc-main"><span class="uda-acc-title">${esc(u.titolo)}</span><span class="uda-acc-sub">${u.anno}° anno · ${esc(u.areaTirocinio)} · QNQ ${esc(u.qnq)}</span></span>
            <span class="uda-acc-arrow" aria-hidden="true">⌄</span>
        </button>
        <div class="uda-acc-body" ${open ? '' : 'hidden'}>
            <div class="uda-chip-row" aria-label="Competenze coinvolte">${competencies}${(u.competenzeEuropee || []).map(c => `<span class="uda-chip uda-chip-secondary">${esc(c)}</span>`).join('')}</div>
            ${section('Traguardo formativo', `<p>${esc(u.traguardo)}</p>`, 'traguardo-intermedio')}
            ${section('Contesto adattabile', `<p>${esc(u.situazione)}</p><p><strong>Area:</strong> ${esc(u.ambito)}</p>`, 'situazione-problema')}
            ${section('Compito autentico', `<p>${esc(u.compito)}</p>`, 'compito-di-realta')}
            ${section('Prodotto ed evidenze', `<p>${esc(u.prodotto)}</p><p><strong>Beneficiari:</strong> ${esc(u.beneficiari)}</p><p><strong>Monte ore:</strong> ${esc(u.ore)}</p>`, 'prodotto')}
            <div class="sin-grid"><div class="sin-item"><div class="sin-label" data-termine="abilita">Abilità mobilitate</div><div class="sin-value"><ul class="sin-list">${u.abilita.map(row).join('')}</ul></div></div>
            <div class="sin-item"><div class="sin-label" data-termine="saperi-essenziali">Saperi essenziali documentali</div><div class="sin-value"><ul class="sin-list">${u.saperi.map(row).join('')}</ul><p class="pfi-nota">Base normativa da mantenere; eventuali nuovi saperi vengono affiancati in revisione.</p></div></div></div>
            <div class="uda-fsl-subjects"><strong>Insegnamenti coinvolti</strong><div class="uda-fsl-subject-list">${renderSubjectChips(subjects)}</div></div>
            <div class="uda-ore-slot" data-uda-ore-slot="${esc(u.id)}"></div>
            <div class="uda-revisione-slot" data-uda-revisione-slot="${esc(u.id)}"></div>
        </div></article>`;
}

// Il terzo argomento aggancia il titolo al glossario normativo: assets/normativa.js
// trasforma l'attributo in un segno cliccabile con definizione e fonte.
function section(title, body, termine) {
    const marca = termine ? ` data-termine="${termine}"` : '';
    return `<section class="uda-detail-section"><h3${marca}>${title}</h3>${body}</section>`;
}
function row(item) { return `<li>${esc(item.t)} ${renderSubjectChips(item.ins)}</li>`; }
function renderSubjectChips(subjects) {
    return (subjects || []).map(subject => {
        const highlighted = filters.insegnamento === subject ? ' ins-chip-highlight' : '';
        return `<span class="ins-chip ${SUBJECT_CLASS[subject] || ''}${highlighted}">${esc(labelSubject(subject))}</span>`;
    }).join('');
}
function orderedSubjects(u) {
    const used = new Set([...u.abilita, ...u.saperi].flatMap(item => item.ins || []));
    const ordered = (fslData.meta.insegnamenti || []).filter(subject => used.has(subject));
    [...used].filter(subject => !ordered.includes(subject)).sort().forEach(subject => ordered.push(subject));
    return ordered;
}
function labelSubject(value) { return ({'METODOLOGIE OPERATIVE':'Metodologie Operative','IGIENE E CULTURA MEDICO SANITARIA':'Igiene e Cultura M.S.','DIRITTO E TEC. AMM.':'Diritto e T.A.','PSICOLOGIA GENERALE ED APPLICATA':'Psicologia generale ed applicata'})[value] || value; }
function notifyHeight() { setTimeout(() => { if (window.parent !== window) window.parent.postMessage({ type: 'iframeContentHeight', height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) }, window.location.origin); }, 30); }
