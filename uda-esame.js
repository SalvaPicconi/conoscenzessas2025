// UDA per la preparazione progressiva alla prova professionale.
// La pagina rende una struttura di progettazione: non assegna automaticamente
// tipologie, argomenti, competenze, nuclei o ore alle sei UDA del triennio.

if (window.parent !== window) {
    document.documentElement.classList.add('embedded');
}

let esameData = null;
let annoAttivo = '';
const schedeAperte = new Set();

document.addEventListener('DOMContentLoaded', initEsame);

async function initEsame() {
    try {
        const response = await fetch('data-uda-esame.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        esameData = await response.json();
        renderMeta();
        renderFonti();
        renderPrincipi();
        renderTipologie();
        renderStruttura();
        setupFiltri();
        renderSchede();
    } catch (error) {
        console.error('Errore nel caricamento della sezione UDA Esame di Stato:', error);
        document.getElementById('esame-schede').innerHTML =
            '<p class="esame-empty">Impossibile caricare la struttura della sezione.</p>';
    } finally {
        document.getElementById('esame-loading')?.classList.add('hidden');
        notifyParentHeight();
    }
}

function renderMeta() {
    const { meta } = esameData;
    document.getElementById('esame-titolo').textContent = meta.titolo;
    document.getElementById('esame-sottotitolo').textContent = meta.sottotitolo;
    document.getElementById('esame-stato').textContent = meta.stato;
    document.getElementById('esame-scopo').textContent = meta.scopo;
    document.getElementById('esame-nota').textContent = meta.nota;
}

function renderFonti() {
    document.getElementById('esame-fonti').innerHTML = esameData.fonti.map((fonte, index) => {
        const classe = sourceClass(fonte.livello);
        const documento = fonte.url
            ? `<a href="${escapeHTML(fonte.url)}" target="_blank" rel="noopener">${escapeHTML(fonte.documento)}</a>`
            : `<span>${escapeHTML(fonte.documento)}</span>`;
        return `
            <article class="esame-source-card">
                <span class="esame-source-tag ${classe}">${escapeHTML(fonte.livello)}</span>
                <h3>${escapeHTML(fonte.natura)}</h3>
                <p>${escapeHTML(fonte.uso)}</p>
                <div class="esame-source-document">${documento}</div>
            </article>
        `;
    }).join('');
}

function renderPrincipi() {
    document.getElementById('esame-principi-rete').innerHTML =
        esameData.principiRete2024.map(voce => `<li>${escapeHTML(voce)}</li>`).join('');
    document.getElementById('esame-principi-curricolo').innerHTML =
        esameData.principiCurricolari.map(voce => `<li>${escapeHTML(voce)}</li>`).join('');
}

function renderTipologie() {
    document.getElementById('esame-tipologie').innerHTML = esameData.tipologie.map(tipo => `
        <article class="esame-type-card" id="tipologia-${escapeHTML(tipo.id)}">
            <div class="esame-type-head">
                <span class="esame-type-letter">${escapeHTML(tipo.id)}</span>
                <span class="esame-source-tag quadro">Quadro d’esame</span>
            </div>
            <h3>${escapeHTML(tipo.definizione)}</h3>
            <p class="esame-type-performance"><strong>Prestazione attesa:</strong> ${escapeHTML(tipo.prestazione)}</p>
            <details>
                <summary>Indicazioni metodologiche 2024</summary>
                <ul>${tipo.attenzioni2024.map(voce => `<li>${escapeHTML(voce)}</li>`).join('')}</ul>
            </details>
        </article>
    `).join('');
}

function renderStruttura() {
    document.getElementById('esame-struttura').innerHTML = esameData.strutturaScheda.map(campo => `
        <li>
            <span class="esame-template-number">${escapeHTML(campo.numero)}</span>
            <div><strong>${escapeHTML(campo.titolo)}</strong><p>${escapeHTML(campo.contenuto)}</p></div>
        </li>
    `).join('');
}

function setupFiltri() {
    document.querySelectorAll('.esame-year-button').forEach(button => {
        button.addEventListener('click', () => {
            annoAttivo = button.dataset.anno;
            document.querySelectorAll('.esame-year-button').forEach(candidate => {
                const attivo = candidate === button;
                candidate.classList.toggle('active', attivo);
                candidate.setAttribute('aria-pressed', attivo ? 'true' : 'false');
            });
            renderSchede();
        });
    });

    document.getElementById('esame-schede').addEventListener('click', event => {
        const button = event.target.closest('.esame-slot-header');
        if (!button) return;
        const id = button.dataset.id;
        if (schedeAperte.has(id)) schedeAperte.delete(id);
        else schedeAperte.add(id);
        renderSchede();
    });
}

function renderSchede() {
    const schede = esameData.schede.filter(scheda => !annoAttivo || String(scheda.anno) === annoAttivo);
    document.getElementById('esame-count').textContent =
        `${schede.length} ${schede.length === 1 ? 'scheda' : 'schede'} visualizzate su ${esameData.schede.length}`;

    document.getElementById('esame-schede').innerHTML = schede.map(scheda => {
        const aperta = schedeAperte.has(scheda.id);
        const panelId = `esame-panel-${scheda.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        return `
            <article class="esame-slot ${aperta ? 'open' : ''}">
                <button type="button" class="esame-slot-header" data-id="${escapeHTML(scheda.id)}"
                    aria-expanded="${aperta}" aria-controls="${panelId}">
                    <span class="esame-slot-id">${escapeHTML(scheda.id)}</span>
                    <span class="esame-slot-main">
                        <strong>Classe ${escapeHTML(scheda.anno)}ª · UDA ${escapeHTML(scheda.id.split('.')[1])}</strong>
                        <small>${escapeHTML(scheda.stato)}</small>
                    </span>
                    <span class="esame-slot-type">Tipologia: ${escapeHTML(scheda.tipologia)}</span>
                    <span class="esame-slot-chevron" aria-hidden="true">▸</span>
                </button>
                <div class="esame-slot-body" id="${panelId}" ${aperta ? '' : 'hidden'}>
                    <dl>
                        <div><dt>Argomento</dt><dd>${escapeHTML(scheda.argomento)}</dd></div>
                        <div><dt>Stato</dt><dd>${escapeHTML(scheda.stato)}</dd></div>
                        <div><dt>Nota</dt><dd>${escapeHTML(scheda.nota)}</dd></div>
                    </dl>
                    <p class="esame-slot-warning">La scheda sarà compilata solo dopo la mappatura dei contenuti curricolari dell’anno e la scelta esplicita di una tipologia.</p>
                </div>
            </article>
        `;
    }).join('');
    notifyParentHeight();
}

function sourceClass(livello) {
    if (livello.includes('Quadro')) return 'quadro';
    if (livello.includes('RE.NA.I.SAN.S.')) return 'rete';
    if (livello.includes('Curricolo')) return 'curricolo';
    return 'scelta';
}

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function notifyParentHeight() {
    if (window.parent === window) return;
    requestAnimationFrame(() => {
        const height = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
            document.body.offsetHeight
        );
        window.parent.postMessage({ type: 'iframeContentHeight', height }, '*');
    });
}

window.addEventListener('resize', notifyParentHeight);
