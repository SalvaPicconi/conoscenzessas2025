// UDA per la preparazione progressiva alla prova professionale.
// Le sei schede distinguono dati curricolari, quadro della prova e scelte
// progettuali ancora soggette a discussione e delibera.

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
                <span class="esame-source-tag quadro">Testo del Quadro di riferimento</span>
            </div>
            <h3>${escapeHTML(tipo.definizione)}</h3>
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
                        <strong>${escapeHTML(scheda.titolo)}</strong>
                        <small>Classe ${escapeHTML(scheda.anno)}ª · ${escapeHTML(scheda.durata)} ore</small>
                    </span>
                    <span class="esame-slot-type">Tipologia ${escapeHTML(scheda.tipologia)}</span>
                    <span class="esame-slot-chevron" aria-hidden="true">▸</span>
                </button>
                <div class="esame-slot-body" id="${panelId}" ${aperta ? '' : 'hidden'}>
                    ${renderSchedaCompleta(scheda)}
                </div>
            </article>
        `;
    }).join('');
    notifyParentHeight();
}

function renderSchedaCompleta(scheda) {
    const oreContributi = scheda.contributi.reduce((totale, voce) => totale + voce.ore, 0);
    const oreFasi = scheda.fasi.reduce((totale, voce) => totale + voce.ore, 0);
    const tipo = esameData.tipologie.find(voce => voce.id === scheda.tipologia);
    return `
        <div class="esame-identity-grid">
            <div><span>Classe e livello</span><strong>${escapeHTML(scheda.anno)}ª · QNQ ${escapeHTML(scheda.qnq)}</strong></div>
            <div><span>Periodo</span><strong>${escapeHTML(scheda.periodo)}</strong></div>
            <div><span>Durata</span><strong>${escapeHTML(scheda.durata)} ore, di cui ${escapeHTML(scheda.provaFinaleOre)} individuali</strong></div>
            <div><span>Tipologia assegnata</span><strong>${escapeHTML(scheda.tipologia)} · ${escapeHTML(tipo?.definizione || '')}</strong></div>
        </div>

        <section class="esame-detail-section esame-topic">
            <h3>Argomento</h3>
            <p>${escapeHTML(scheda.argomento)}</p>
        </section>

        <section class="esame-detail-section">
            <h3>Nuclei tematici</h3>
            <div class="esame-chip-list">${scheda.nuclei.map(nucleo => `
                <div class="esame-nucleus-chip">
                    <strong>Nucleo ${escapeHTML(nucleo.id)}</strong>
                    <span>${escapeHTML(nucleo.testo)}</span>
                </div>
            `).join('')}</div>
        </section>

        <section class="esame-detail-section">
            <span class="esame-source-tag curricolo">Curricolo SSAS</span>
            <h3>Competenze e traguardi dell’anno</h3>
            <ul class="esame-competence-list">${scheda.competenze.map(competenza => `
                <li><strong>C${escapeHTML(competenza.numero)}</strong><span>${escapeHTML(competenza.traguardo)}</span></li>
            `).join('')}</ul>
        </section>

        <section class="esame-detail-section">
            <h3>Compito atteso / prova esperta</h3>
            <dl class="esame-task-grid">
                ${taskRow('Situazione-problema', scheda.compitoAtteso.situazione)}
                ${taskRow('Ruolo', scheda.compitoAtteso.ruolo)}
                ${taskRow('Committente', scheda.compitoAtteso.committente)}
                ${taskRow('Destinatario', scheda.compitoAtteso.destinatario)}
                ${taskRow('Prodotto', scheda.compitoAtteso.prodotto)}
                ${taskRow('Autonomia nel compito', scheda.compitoAtteso.autonomiaOperativa)}
            </dl>
        </section>

        <section class="esame-detail-section">
            <h3>Insegnamenti dell’area di indirizzo</h3>
            <p class="esame-method-note">Metodologie Operative, Diritto e Tecnica Amministrativa, Igiene e Cultura Medico-Sanitaria e Psicologia Generale e Applicata sono sempre coinvolti. Le ore sono ripartite in proporzione al quadro orario: 3 + 4 + 5 + 4.</p>
            <div class="esame-table-wrap">
                <table class="esame-contributions-table">
                    <thead><tr><th>Insegnamento</th><th>Ore</th><th>Saperi e abilità</th><th>Evidenza disciplinare</th></tr></thead>
                    <tbody>${scheda.contributi.map(voce => `
                        <tr>
                            <th>${escapeHTML(voce.insegnamento)}</th>
                            <td>${escapeHTML(voce.ore)}</td>
                            <td><strong>${escapeHTML(voce.saperi)}</strong><br>${escapeHTML(voce.abilita)}</td>
                            <td>${escapeHTML(voce.evidenza)}</td>
                        </tr>
                    `).join('')}</tbody>
                    <tfoot><tr><th>Totale</th><td>${escapeHTML(oreContributi)}</td><td colspan="2">Coerente con la durata dichiarata: ${oreContributi === scheda.durata ? 'sì' : 'da verificare'}</td></tr></tfoot>
                </table>
            </div>
            ${renderCoinvolgimentiOpzionali(scheda)}
        </section>

        <section class="esame-detail-section">
            <h3>Percorso didattico</h3>
            <ol class="esame-phase-list">${scheda.fasi.map(fase => `
                <li><span>${escapeHTML(fase.ore)} h</span><div><strong>${escapeHTML(fase.titolo)}</strong><p>${escapeHTML(fase.attivita)}</p></div></li>
            `).join('')}</ol>
            <p class="esame-hours-check">Totale fasi: ${escapeHTML(oreFasi)} ore · ${oreFasi === scheda.durata ? 'quadratura verificata' : 'quadratura da verificare'}</p>
        </section>

        <section class="esame-detail-section">
            <h3>Dossier documentale</h3>
            <div class="esame-dossier-grid">${scheda.dossier.map(documento => `
                <article>
                    <h4>${documento.url ? `<a href="${escapeHTML(documento.url)}" target="_blank" rel="noopener">${escapeHTML(documento.titolo)}</a>` : escapeHTML(documento.titolo)}</h4>
                    <p><strong>Uso:</strong> ${escapeHTML(documento.uso)}</p>
                </article>
            `).join('')}</div>
        </section>

        <section class="esame-detail-section esame-prompt">
            <span class="esame-source-tag scelta">Traccia proposta</span>
            <h3>Consegna conclusiva individuale</h3>
            <p>${escapeHTML(scheda.traccia)}</p>
        </section>

        <section class="esame-detail-section">
            <h3>Valutazione della prova esperta · 20 punti</h3>
            <div class="esame-table-wrap">
                <table class="esame-rubric-table">
                    <thead><tr><th>Indicatore del quadro</th><th>Max</th><th>Focus nell’UDA</th><th>Descrittori comuni</th></tr></thead>
                    <tbody>${esameData.grigliaComune.map((indicatore, index) => `
                        <tr>
                            <th>${escapeHTML(indicatore.indicatore)}</th>
                            <td>${escapeHTML(indicatore.max)}</td>
                            <td>${escapeHTML(scheda.focusValutazione[index])}</td>
                            <td><details><summary>Mostra livelli</summary><ul>${indicatore.livelli.map(livello => `<li>${escapeHTML(livello)}</li>`).join('')}</ul></details></td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
        </section>

        <section class="esame-detail-section">
            <h3>Personalizzazione e accessibilità</h3>
            <p>${escapeHTML(scheda.personalizzazione)}</p>
        </section>
    `;
}

function renderCoinvolgimentiOpzionali(scheda) {
    const opzionali = scheda.coinvolgimentiOpzionali || [];
    if (!opzionali.length) return '';
    return `
        <div class="esame-optional-subjects">
            <h4>Possibile coinvolgimento di altri insegnamenti</h4>
            <p>Il coinvolgimento è eventuale e viene concordato con i docenti interessati.</p>
            <ul>${opzionali.map(voce => `<li><strong>${escapeHTML(voce.insegnamento)}:</strong> ${escapeHTML(voce.contributo)}</li>`).join('')}</ul>
        </div>
    `;
}

function taskRow(label, value) {
    return `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`;
}

function sourceClass(livello) {
    if (livello.includes('Quadro')) return 'quadro';
    if (livello.includes('Redazione')) return 'rete';
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
