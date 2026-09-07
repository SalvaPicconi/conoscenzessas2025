// Proposta di UDA unificate — rendering e filtri
//
// Stessa struttura del fascicolo d'asse (uda.js), con due differenze:
//   · ogni scheda porta due competenze in uscita invece di una;
//   · mostra le schede d'asse da cui nasce, con i traguardi di origine.
//
// I dati stanno in data-uda-unificate.json, generato da
// tools/genera_uda_unificate.py. Il fascicolo d'asse resta invariato: questa
// è una proposta di lavoro, non lo sostituisce.

if (window.parent !== window) {
    document.documentElement.classList.add('embedded');
}

let udaData = null;
const udaFilters = { anno: '', competenza: '', insegnamento: '', search: '' };
const expandedUda = new Set();

const ANNO_LABEL = { 1: '1° anno', 2: '2° anno', 3: '3° anno', 4: '4° anno', 5: '5° anno' };
const ANNO_CLASS = { 1: 'per-biennio', 2: 'per-biennio', 3: 'per-terzo', 4: 'per-quarto', 5: 'per-quinto' };

// Colore identificativo per insegnamento: lo decide assets/insegnamenti.js, che
// riconosce la materia comunque sia scritta nel catalogo.
const classeIns = nome => (window.Insegnamenti ? window.Insegnamenti.classe(nome) : '');
const nomeIns = nome => (window.Insegnamenti && window.Insegnamenti.canonico(nome)) || nome;
const stessoIns = (uno, altro) => (window.Insegnamenti ? window.Insegnamenti.stesso(uno, altro) : uno === altro);

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const response = await fetch('data-uda-unificate.json', { cache: 'no-store' });
        udaData = await response.json();
        setupIntestazione();
        setupToolbar();
        render();
    } catch (error) {
        console.error('Errore caricamento proposta UDA unificate:', error);
        const list = document.getElementById('uda-list');
        if (list) list.innerHTML = '<p class="empty-placeholder">Impossibile caricare la proposta.</p>';
    } finally {
        const loading = document.getElementById('uda-loading');
        if (loading) loading.classList.add('hidden');
        notifyParentHeight();
    }
}

function setupIntestazione() {
    const fasi = document.getElementById('uda-fasi');
    if (fasi) fasi.innerHTML = udaData.meta.fasiStandard.map(f => `<li>${escapeHTML(f)}</li>`).join('');
    const valutazione = document.getElementById('uda-valutazione');
    if (valutazione) valutazione.textContent = "Osservare gli aspetti essenziali di ciascuna competenza. Rubriche dettagliate da sviluppare in seguito.";
    const nota = document.getElementById('uda-nota-piano');
    if (nota) nota.textContent = "Proposta di lavoro: attività e ore da concordare.";
}

function setupToolbar() {
    const compSelect = document.getElementById('uda-competenza');
    Object.entries(udaData.meta.competenze).forEach(([num, titolo]) => {
        const option = document.createElement('option');
        option.value = num;
        option.textContent = `C${num} — ${titolo}`;
        compSelect.appendChild(option);
    });

    const insSelect = document.getElementById('uda-insegnamento');
    const insSet = new Set();
    udaData.uda.forEach(u => [...u.abilita, ...u.saperi].forEach(x => x.ins.forEach(i => insSet.add(i))));
    [...insSet].sort((a, b) => a.localeCompare(b)).forEach(ins => {
        const option = document.createElement('option');
        option.value = ins;
        option.textContent = ins;
        insSelect.appendChild(option);
    });

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
    // La scheda risponde al filtro se la competenza compare fra le sue, non
    // solo se è la prima: le schede unificate ne portano due.
    if (udaFilters.competenza && !u.competenze.map(String).includes(udaFilters.competenza)) return false;
    if (udaFilters.insegnamento) {
        const involved = [...u.abilita, ...u.saperi].some(x => x.ins.some(i => stessoIns(i, udaFilters.insegnamento)));
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
        const hl = udaFilters.insegnamento && stessoIns(ins, udaFilters.insegnamento) ? ' ins-chip-highlight' : '';
        return `<span class="ins-chip ${classeIns(ins)}${hl}">${escapeHTML(ins)}</span>`;
    }).join('');
}

function renderVoce(item) {
    const nota = item.notaAttribuzione
        ? `<span class="voce-nota">${escapeHTML(item.notaAttribuzione)}</span>`
        : '';
    return `<li>${escapeHTML(item.t)} ${renderInsChips(item.ins)}${nota}</li>`;
}

function etichettaCompetenze(u) {
    return u.competenze.map(n => `C${n}`).join(' + ');
}

function renderCompetenzeRow(u) {
    return u.competenze.map(n => `
        <div class="unif-competenza">
            <span class="unif-competenza-num">C${n}</span>
            <span>${escapeHTML(udaData.meta.competenze[String(n)] || '')}</span>
        </div>`).join('');
}

function renderTraguardiOrigine(u) {
    return u.traguardiOrigine.map(t => `
        <li><strong>C${t.competenza}</strong> ${escapeHTML(t.testo)}
            <span class="unif-rif">scheda ${escapeHTML(t.scheda)}</span></li>`).join('');
}

function renderFonde(u) {
    if (u.fonde.length === 1) {
        return `<p class="unif-fonde-nota">Scheda non accorpata: resta la ${escapeHTML(u.fonde[0].id)} —
            «${escapeHTML(u.fonde[0].titolo)}».</p>`;
    }
    return `<ul class="unif-fonde">${u.fonde.map(f => `
        <li><span class="unif-fonde-id">${escapeHTML(f.id)}</span>
            <span class="unif-fonde-titolo">${escapeHTML(f.titolo)}</span>
            <span class="unif-rif">C${f.competenza}</span></li>`).join('')}</ul>`;
}

function renderPianificazione(u) {
    const p = u.pianificazione;
    return `<p><strong>${escapeHTML(p.stato)}</strong></p>
        <p>${escapeHTML(p.nota)}</p>
        <p>Origini: ${p.oreOrigine.map(o => `${escapeHTML(o.scheda)}: ${escapeHTML(o.ore)} ore`).join(' · ')}.
        Ore della proposta: <strong>da deliberare</strong>.</p>
        <ol>${p.fasi.map(f => `<li>${escapeHTML(f.attivita)} — ore, insegnamenti e periodo da definire.</li>`).join('')}</ol>
        <p>Decisioni necessarie:</p><ul>${p.decisioniNecessarie.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>`;
}

function renderRubrica(u) {
    return `<ul class="sin-list">${u.rubrica.map(d => `<li class="unif-rubrica"><strong>C${d.competenza}</strong> — ${escapeHTML(d.indicatore)}</li>`).join('')}</ul>`;
}

function renderMateriali(u) {
    return u.materialiOrigine.length ? `<ul>${u.materialiOrigine.map(m => `<li><strong>${escapeHTML(m.scheda)}</strong> — ${escapeHTML(m.riferimento)}. ${escapeHTML(m.stato)}.</li>`).join('')}</ul>`
        : '<p>Nessun riferimento a schede già sviluppate segnalato nei record di origine.</p>';
}

function renderUdaCard(u, autoExpand) {
    const expanded = autoExpand || expandedUda.has(u.id);
    const insTotali = insegnamentiOrdinati(u);
    const panelId = `uda-panel-${String(u.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const accorpata = u.fonde.length > 1;

    return `
        <div class="uda-acc ${expanded ? 'group-expanded' : ''}" data-id="${escapeHTML(u.id)}" data-uda-revisione-key="${escapeHTML(u.id)}">
            <button type="button" class="uda-acc-header" data-uda-id="${escapeHTML(u.id)}" aria-expanded="${expanded}" aria-controls="${panelId}">
                <span class="uda-num ${ANNO_CLASS[u.anno]}">${escapeHTML(u.id)}</span>
                <span class="uda-acc-main">
                    <span class="uda-acc-title">${escapeHTML(u.titolo)}</span>
                    <span class="uda-acc-sub">${etichettaCompetenze(u)} ·
                        ${accorpata ? `fonde le schede ${u.fonde.map(f => escapeHTML(f.id)).join(' e ')}` : 'scheda mantenuta autonoma'}</span>
                </span>
                <span class="uda-acc-pills">
                    <span class="pill ${ANNO_CLASS[u.anno]}">${ANNO_LABEL[u.anno]}</span>
                    <span class="pill pill-qnq">QNQ ${escapeHTML(u.qnq)}</span>
                    <span class="pill pill-comp">Ore da definire</span>
                </span>
                <span class="group-chevron" aria-hidden="true">▸</span>
            </button>
            <div class="uda-acc-body" id="${panelId}" ${expanded ? '' : 'hidden'}>
                <div class="uda-sintetica">
                    <div class="sin-row">
                        <div class="sin-label">Competenze in uscita</div>
                        <div class="sin-value">${renderCompetenzeRow(u)}</div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Traguardo dell'UDA</div>
                        <div class="sin-value">${escapeHTML(u.traguardo)}</div>
                    </div>



                    <div class="sin-row">
                        <div class="sin-label">Compito di realtà</div>
                        <div class="sin-value">${escapeHTML(u.sintesi)}${u.collegataA ? `<p>Collegabile a ${escapeHTML(u.collegataA)} · attività e valutazione autonome.</p>` : ''}</div>
                    </div>


                    <div class="sin-row">
                        <div class="sin-label">Abilità essenziali</div>
                        <div class="sin-value"><ul class="sin-list">${u.abilita.map(renderVoce).join('')}</ul></div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Saperi essenziali</div>
                        <div class="sin-value"><ul class="sin-list">${u.saperi.map(renderVoce).join('')}</ul></div>
                    </div>
                    <div class="sin-row">
                        <div class="sin-label">Insegnamenti · Ore</div>
                        <div class="sin-value">${renderInsChips(insTotali)}
                            <span class="sin-ore">· Somma ore di origine: ${escapeHTML(u.ore)}. Ore della proposta da deliberare.</span></div>
                    </div>

                    <div class="sin-row">
                        <div class="sin-label">Valutazione · aspetti essenziali</div>
                        <div class="sin-value">${renderRubrica(u)}</div>
                    </div>

                    <div class="sin-row">
                        <div class="sin-label">Schede d'asse di origine</div>
                        <div class="sin-value">${renderFonde(u)}</div>
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
                <p>Nessuna scheda corrisponde ai filtri selezionati.</p>
                <p>Modifica i filtri o azzerali.</p>
            </div>`;
        notifyParentHeight();
        return;
    }

    const sections = [];
    [1, 2, 3, 4, 5].forEach(anno => {
        const inAnno = visible.filter(u => u.anno === anno);
        if (!inAnno.length) return;
        const origine = inAnno.reduce((n, u) => n + u.fonde.length, 0);
        sections.push(`
            <div class="uda-section">
                <div class="uda-section-header">
                    <span class="uda-icon anno-badge ${ANNO_CLASS[anno]}">${anno}°</span>
                    <h2>${ANNO_LABEL[anno].toUpperCase()} — ${inAnno.length} ${inAnno.length === 1 ? 'scheda' : 'schede'}
                        da ${origine} del fascicolo d'asse</h2>
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
    if (window.parent === window) return;
    requestAnimationFrame(() => {
        const height = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
        );
        window.parent.postMessage({ type: 'iframeContentHeight', height }, '*');
    });
}

function escapeHTML(value) {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
