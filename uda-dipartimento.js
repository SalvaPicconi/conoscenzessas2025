if (window.parent !== window) document.documentElement.classList.add('embedded');

const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[char]);

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const response = await fetch('data-uda-dipartimento.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        render(data);
    } catch (error) {
        document.getElementById('dip-classi').innerHTML = `<p class="error">Impossibile caricare le scelte del Dipartimento: ${esc(error.message)}</p>`;
    } finally {
        document.getElementById('dip-loading')?.classList.add('hidden');
        notifyHeight();
    }
}

function render(data) {
    const decisioni = data.classi.flatMap(classe => classe.decisioni);
    document.getElementById('dip-total-biennio').textContent = data.classi.filter(classe => classe.anno <= 2).flatMap(classe => classe.decisioni).length;
    document.getElementById('dip-total-fsl').textContent = decisioni.filter(voce => voce.categoria === 'FSL').length;
    document.getElementById('dip-total-asse').textContent = decisioni.filter(voce => voce.categoria === 'UDA d’asse').length;
    document.getElementById('dip-total-sim').textContent = data.simulazioni.voci.length;
    document.getElementById('dip-summary-note').textContent = data.meta.nota;
    document.getElementById('dip-classi').innerHTML = data.classi.map(renderClasse).join('');
    document.getElementById('simulazioni').innerHTML = renderSimulazioni(data.simulazioni);
    document.getElementById('dip-verbale').innerHTML = `<p class="dip-eyebrow">Correzione necessaria</p><h2 id="dip-correction-title">Verbale del 9 settembre</h2><p>${esc(data.correzioneVerbale)}</p>`;
    const nonAdottate = data.nonAdottate || [];
    const sezioneNonAdottate = document.getElementById('dip-non-adottate');
    sezioneNonAdottate.hidden = nonAdottate.length === 0;
    sezioneNonAdottate.innerHTML = nonAdottate.length
        ? `<p class="dip-eyebrow">Da non confondere con le scelte</p><h2 id="dip-not-adopted-title">Proposte non ancora adottate</h2>${nonAdottate.map(renderNonAdottata).join('')}`
        : '';
}

function renderClasse(classe) {
    return `<section id="classe-${classe.anno}" class="dip-section dip-class" aria-labelledby="dip-class-${classe.anno}">
        <div class="dip-section-head">
            <div class="dip-year">${classe.anno}ª</div>
            <div><p class="dip-eyebrow">Classe ${nomeAnno(classe.anno)}</p><h2 id="dip-class-${classe.anno}">${esc(classe.sintesi)}</h2></div>
        </div>
        <div class="dip-card-grid">${classe.decisioni.map(renderDecisione).join('')}</div>
    </section>`;
}

function renderDecisione(voce) {
    const classe = voce.categoria === 'FSL' ? 'fsl' : 'asse';
    return `<article class="dip-card dip-card-${classe}" data-uda-revisione-key="${esc(voce.id)}">
        <div class="dip-card-top"><span class="dip-category">${esc(voce.categoria)}</span><span class="dip-status">${esc(voce.stato)}</span></div>
        <h3>${esc(voce.titolo)}</h3>
        <p>${esc(voce.descrizione)}</p>
        ${renderRiferimenti(voce.riferimenti)}
        <a class="dip-link" href="${esc(voce.catalogo)}">${esc(voce.catalogoEtichetta)} <span aria-hidden="true">→</span></a>
        <div class="uda-revisione-slot" data-uda-revisione-slot="${esc(voce.id)}"></div>
    </article>`;
}

function renderSimulazioni(simulazioni) {
    return `<div class="dip-section-head dip-section-head-wide">
        <div class="dip-year dip-year-exam" aria-hidden="true">2</div>
        <div><p class="dip-eyebrow">Classe quinta · prova professionale</p><h2 id="dip-sim-title">${esc(simulazioni.titolo)}</h2><p>${esc(simulazioni.calendario)}</p></div>
    </div>
    <div class="dip-timeline">${simulazioni.voci.map(renderSimulazione).join('')}</div>`;
}

function renderSimulazione(voce, indice) {
    return `<article class="dip-sim-card${voce.riferimenti.length ? '' : ' dip-sim-card-unknown'}" data-uda-revisione-key="${esc(voce.id)}">
        <div class="dip-sim-marker" aria-hidden="true">${indice + 1}</div>
        <div><p class="dip-sim-period">${esc(voce.periodo)}</p><span class="dip-status">${esc(voce.stato)}</span><h3>${esc(voce.titolo)}</h3><p>${esc(voce.descrizione)}</p>
        ${renderRiferimenti(voce.riferimenti)}<a class="dip-link" href="${esc(voce.catalogo)}">${esc(voce.catalogoEtichetta)} <span aria-hidden="true">→</span></a>
        <div class="uda-revisione-slot" data-uda-revisione-slot="${esc(voce.id)}"></div></div>
    </article>`;
}

function renderRiferimenti(riferimenti) {
    if (!riferimenti.length) return '<p class="dip-missing"><strong>Riferimento UDA:</strong> Dato non reperito</p>';
    return `<div class="dip-refs"><span>Riferimenti nel catalogo</span>${riferimenti.map(id => `<code>${esc(id)}</code>`).join('')}</div>`;
}

function renderNonAdottata(voce) {
    return `<article class="dip-not-adopted-card"><div><span class="dip-status">${esc(voce.stato)}</span><h3>${esc(voce.anno)}ª · ${esc(voce.titolo)}</h3></div><p>${esc(voce.descrizione)}</p></article>`;
}

function nomeAnno(anno) {
    return ({ 1: 'prima', 2: 'seconda', 3: 'terza', 4: 'quarta', 5: 'quinta' })[anno] || anno;
}

function notifyHeight() {
    setTimeout(() => {
        if (window.parent !== window) window.parent.postMessage({
            type: 'iframeContentHeight',
            height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
        }, window.location.origin);
    }, 40);
}
