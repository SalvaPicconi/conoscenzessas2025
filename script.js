// Variabili globali
let allData = [];
let filteredData = [];
let filters = {
    competenza: '',
    periodo: '',
    livelloQNQ: '',
    insegnamento: '',
    searchTerm: ''
};
let groupBy = 'competenzaNum';
let expandedGroups = new Set();

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

// Caricamento dati
async function loadData() {
    try {
        showLoading(true);
        console.log('Inizio caricamento dati...');
        
        const response = await fetch('data-area-indirizzo.json');
        console.log('Response status:', response.status);
        
        allData = await response.json();
        console.log('Dati caricati:', allData.length, 'elementi');
        console.log('Primo elemento:', allData[0]);
        
        // Prova a caricare correzioni dei titoli (opzionale)
        await applyTitleCorrections();
        
        setupFilters();
        filterAndDisplay();
        renderStatsTable();
        notifyParentHeight();
        showLoading(false);
        
        console.log('Caricamento completato con successo');
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        alert('Errore nel caricamento dei dati: ' + error.message);
        showLoading(false);
    }
}

// Carica ed applica correzioni titoli, se presente un file correzioni_competenze.json
async function applyTitleCorrections() {
    try {
        const res = await fetch('correzioni_competenze.json', { cache: 'no-store' });
        if (!res.ok) {
            console.log('Nessun file correzioni_competenze.json trovato (status', res.status, ')');
            return;
        }
        const corrections = await res.json();
        console.log('Correzioni titoli trovate:', corrections);

        // Supporta sia array di oggetti {competenzaNum, titoloCorretto} sia mappa { "1": "..." }
        let map = {};
        if (Array.isArray(corrections)) {
            corrections.forEach(entry => {
                if (entry && (entry.competenzaNum !== undefined) && entry.titoloCorretto) {
                    map[String(entry.competenzaNum)] = entry.titoloCorretto;
                }
            });
        } else if (typeof corrections === 'object' && corrections !== null) {
            map = corrections;
        }

        if (Object.keys(map).length === 0) {
            console.warn('Il file correzioni_competenze.json non contiene dati validi.');
            return;
        }

        // Applica le correzioni su allData
        allData = allData.map(item => {
            const key = String(item.competenzaNum);
            if (map[key]) {
                return { ...item, competenzaTitolo: map[key] };
            }
            return item;
        });

        console.log('Correzioni titoli applicate.');
    } catch (e) {
        console.log('Nessuna correzione applicata (file assente o non valido):', e.message);
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('competenza-filter').addEventListener('change', handleFilterChange);
    document.getElementById('periodo-filter').addEventListener('change', handleFilterChange);
    document.getElementById('livello-filter').addEventListener('change', handleFilterChange);
    document.getElementById('insegnamento-filter').addEventListener('change', handleFilterChange);
    document.getElementById('search-input').addEventListener('input', handleSearchChange);
    document.getElementById('group-by').addEventListener('change', handleGroupByChange);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    // Export buttons
    const exportExcelBtn = document.getElementById('export-excel');
    const exportWordBtn = document.getElementById('export-word');
    const exportJsonBtn = document.getElementById('export-json');
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel);
    if (exportWordBtn) exportWordBtn.addEventListener('click', exportWord);
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJSON);
}

// Setup filtri
function setupFilters() {
    // Estrai competenze uniche
    const competenze = [...new Set(allData.map(item => 
        `${item.competenzaNum}. ${item.competenzaTitolo.substring(0, 60)}${item.competenzaTitolo.length > 60 ? '...' : ''}`
    ))].sort((a, b) => {
        const numA = parseInt(a.split('.')[0]);
        const numB = parseInt(b.split('.')[0]);
        return numA - numB;
    });
    
    // Estrai periodi unici
    const periodi = [...new Set(allData.map(item => item.periodo))];
    
    // Estrai livelli QNQ unici
    const livelli = [...new Set(allData.map(item => String(item.livelloQNQ)))].sort();
    
    // Estrai tutti gli insegnamenti dai dati reali
    const insegnamentiSet = new Set();
    allData.forEach(item => {
        if (item.insegnamentoCoinvolti) {
            item.insegnamentoCoinvolti.forEach(ins => insegnamentiSet.add(ins));
        }
    });
    const insegnamenti = [...insegnamentiSet].sort();

    console.log('Setup filtri completato:', {
        competenze: competenze.length,
        periodi: periodi.length,
        livelli: livelli.length,
        insegnamenti: insegnamenti.length
    });

    populateSelect('competenza-filter', competenze);
    populateSelect('periodo-filter', periodi);
    populateSelect('livello-filter', livelli.map(l => `Livello ${l}`));
    populateSelect('insegnamento-filter', insegnamenti);
}

// Popola select
function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

// Handler cambio filtri
function handleFilterChange(event) {
    const filterId = event.target.id.replace('-filter', '');
    let value = event.target.value;
    
    if (filterId === 'competenza' && value) {
        value = parseInt(value.split('.')[0]);
    } else if (filterId === 'livello' && value) {
        value = value.replace('Livello ', '');
    } else if (filterId === 'periodo') {
        // Mantieni il valore così com'è
    } else if (filterId === 'insegnamento') {
        // Mantieni il valore così com'è
    }
    
    filters[filterId === 'livello' ? 'livelloQNQ' : filterId] = value;
    filterAndDisplay();
}

// Handler ricerca
function handleSearchChange(event) {
    filters.searchTerm = event.target.value.toLowerCase();
    filterAndDisplay();
}

// Handler raggruppamento
function handleGroupByChange(event) {
    groupBy = event.target.value;
    filterAndDisplay();
}

// Reset filtri
function resetFilters() {
    filters = {
        competenza: '',
        periodo: '',
        livelloQNQ: '',
        insegnamento: '',
        searchTerm: ''
    };
    
    document.getElementById('competenza-filter').value = '';
    document.getElementById('periodo-filter').value = '';
    document.getElementById('livello-filter').value = '';
    document.getElementById('insegnamento-filter').value = '';
    document.getElementById('search-input').value = '';
    document.getElementById('group-by').value = 'competenzaNum';
    
    groupBy = 'competenzaNum';
    filterAndDisplay();
}

// Filtra e visualizza dati
function filterAndDisplay() {
    console.log('Filtri applicati:', filters);
    console.log('Dati totali disponibili:', allData.length);
    
    // Applica filtri
    filteredData = allData.filter(item => {
        const matchesCompetenza = !filters.competenza || 
            item.competenzaNum === filters.competenza;
        const matchesPeriodo = !filters.periodo || item.periodo === filters.periodo;
        const matchesLivello = !filters.livelloQNQ || String(item.livelloQNQ) === filters.livelloQNQ;
        const matchesInsegnamento = !filters.insegnamento || 
            item.insegnamentoCoinvolti.includes(filters.insegnamento);
        
        // Ricerca avanzata in tutte le proprietà
        const matchesSearch = !filters.searchTerm || (() => {
            const searchLower = filters.searchTerm.toLowerCase();
            
            // Ricerca nel titolo e descrizione
            if (item.competenzaTitolo.toLowerCase().includes(searchLower) ||
                item.competenzaIntermedia.toLowerCase().includes(searchLower)) {
                return true;
            }
            
            // Ricerca nelle abilità
            if (item.abilita.some(abilita => 
                abilita.toLowerCase().includes(searchLower))) {
                return true;
            }
            
            // Ricerca nelle conoscenze
            if (item.conoscenze.some(conoscenza => 
                conoscenza.nome.toLowerCase().includes(searchLower))) {
                return true;
            }
            
            // Ricerca negli insegnamenti
            if (item.insegnamentoCoinvolti.some(insegnamento => 
                insegnamento.toLowerCase().includes(searchLower))) {
                return true;
            }
            
            return false;
        })();
        
        return matchesCompetenza && matchesPeriodo && matchesLivello && 
               matchesInsegnamento && matchesSearch;
    });

    console.log('Dati filtrati:', filteredData.length);

    // Aggiorna contatore
    document.getElementById('filtered-count').textContent = filteredData.length;

    // Raggruppa dati
    const groupedData = groupData(filteredData);
    console.log('Dati raggruppati:', Object.keys(groupedData).length, 'gruppi');
    
    // Renderizza tabella principale
    renderMainTable(groupedData);
    
    // Mostra/nascondi empty state
    showEmptyState(filteredData.length === 0);
    notifyParentHeight();
}

// Export helpers
function exportExcel() {
    const data = (filteredData && filteredData.length ? filteredData : allData);
    if (!data || !data.length) {
        alert('Non ci sono dati da esportare.');
        return;
    }
    const headerHtml = buildExportHeader();
    const htmlTable = buildHtmlTable(data);
    const content = `\uFEFF<html><head><meta charset="UTF-8"></head><body>${headerHtml}${htmlTable}</body></html>`;
    // Usa MIME legacy per compatibilità Excel
    downloadFile(content, 'application/vnd.ms-excel', 'curricolo_ssas_area_indirizzo.xls');
}

function exportWord() {
    const data = (filteredData && filteredData.length ? filteredData : allData);
    if (!data || !data.length) {
        alert('Non ci sono dati da esportare.');
        return;
    }
    const headerHtml = buildExportHeader(true);
    const htmlTable = buildHtmlTable(data, true);
    const content = `\uFEFF<html><head><meta charset=\"UTF-8\"></head><body>${headerHtml}${htmlTable}</body></html>`;
    // MIME per Word
    downloadFile(content, 'application/msword', 'curricolo_ssas_area_indirizzo.doc');
}

function exportJSON() {
    const data = (filteredData && filteredData.length ? filteredData : allData);
    if (!data || !data.length) {
        alert('Non ci sono dati da esportare.');
        return;
    }
    const jsonStr = JSON.stringify(data, null, 2);
    downloadFile(jsonStr, 'application/json;charset=utf-8;', 'curricolo_ssas_area_indirizzo.json');
}

// Costruisce una tabella HTML per l'esportazione (Excel/Word)
function buildHtmlTable(data, rich = false) {
    const header = ['Competenza', 'Titolo', 'Periodo', 'Livello QNQ', 'Comp. Intermedia', 'Abilità', 'Conoscenze', 'Insegnamenti'];
    // Filtra eventuali elementi non validi per evitare righe vuote
    const safeData = (data || []).filter(item => item && item.competenzaNum !== undefined && item.competenzaTitolo !== undefined);
    const rows = safeData.map(item => {
        const abilita = (item.abilita || []).join(' \u2022 ');
        const conoscenze = (item.conoscenze || []).map(c => c.nome).join(' \u2022 ');
        const insegnamenti = (item.insegnamentoCoinvolti || []).join(' \u2022 ');
        return [
            `Competenza ${item.competenzaNum}`,
            escapeHtml(item.competenzaTitolo),
            escapeHtml(item.periodo),
            escapeHtml(String(item.livelloQNQ)),
            escapeHtml(item.competenzaIntermedia),
            escapeHtml(abilita),
            escapeHtml(conoscenze),
            escapeHtml(insegnamenti)
        ];
    });

    // Larghezze colonne pensate per Word con table-layout:fixed
    const colPerc = ['8%','22%','9%','7%','20%','12%','12%','10%'];
    const thBase = 'text-align:left;border:1px solid #ddd;padding:6px;background:#f3f4f6';
    const thead = `<thead><tr>${header.map((h,i) => `<th style=\"${thBase};width:${colPerc[i]}\">${h}</th>`).join('')}</tr></thead>`;
    const tdBase = 'border:1px solid #ddd;padding:6px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere;white-space:normal;page-break-inside:avoid';
    const tbody = `<tbody>${rows.map(r => `<tr style=\"page-break-inside:avoid\">${r.map((c,i) => `<td style=\"${tdBase};width:${colPerc[i]}\">${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
    const fontSize = rich ? '11px' : '12px';
    const tableAttrs = rich ? ` style=\"width:95%;margin:0 auto;table-layout:fixed;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:${fontSize}\"` : '';
    return `<table${tableAttrs}>${thead}${tbody}</table>`;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Costruisce l'header per i documenti esportati
function buildExportHeader(rich = false) {
    const title = document.querySelector('.header h1')?.textContent?.trim() || '';
    const subline = document.querySelector('.header .subline')?.textContent?.trim() || '';
    const subtitle = document.querySelector('.header .subtitle')?.textContent?.trim() || '';
    const style = rich
        ? '<style>h1{margin:0 0 4px 0;font-size:18px} .exp-subline{margin:0 0 2px 0;font-size:12px;color:#374151;font-weight:600} .exp-subtitle{margin:0 0 12px 0;font-size:11px;color:#6b7280;font-style:italic}</style>'
        : '';
    const titleHtml = title ? `<h1>${escapeHtml(title)}</h1>` : '';
    const sublineHtml = subline ? `<div class="exp-subline">${escapeHtml(subline)}</div>` : '';
    const subtitleHtml = subtitle ? `<div class="exp-subtitle">${escapeHtml(subtitle)}</div>` : '';
    return `${style}${titleHtml}${sublineHtml}${subtitleHtml}`;
}

function downloadFile(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Raggruppa dati
function groupData(data) {
    const groups = {};
    
    data.forEach(item => {
        let key;
        switch (groupBy) {
            case 'competenzaNum':
                key = `Competenza ${item.competenzaNum}`;
                break;
            case 'periodo':
                key = item.periodo;
                break;
            case 'livelloQNQ':
                key = `Livello ${item.livelloQNQ}`;
                break;
            case 'insegnamento':
                key = 'Per Insegnamento';
                break;
            default:
                key = 'Tutti';
        }
        
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
    });
    
    return groups;
}

// Renderizza tabella principale
function renderMainTable(groupedData) {
    const container = document.getElementById('main-table-container');
    container.innerHTML = '';

    Object.entries(groupedData).forEach(([groupKey, items]) => {
        const groupElement = createGroupElement(groupKey, items);
        container.appendChild(groupElement);
    });
}

// Crea elemento gruppo
function createGroupElement(groupKey, items) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-container';
    
    const isExpanded = expandedGroups.has(groupKey);
    if (isExpanded) {
        groupDiv.classList.add('group-expanded');
    }

    groupDiv.innerHTML = `
        <div class="group-header" onclick="toggleGroup('${groupKey}')">
            <div class="group-title">
                <span class="group-chevron">${isExpanded ? '▼' : '▶'}</span>
                <span class="group-name">${groupKey}</span>
                <span class="group-count">(${items.length} elementi)</span>
            </div>
        </div>
        <div class="group-content">
            <div class="item-grid">
                ${items.map(item => createItemElement(item)).join('')}
            </div>
        </div>
    `;

    return groupDiv;
}

// Crea elemento item
function createItemElement(item) {
    const insegnamentiChips = item.insegnamentoCoinvolti.map(ins => `<span>${escapeHtml(ins)}</span>`).join('');
    const insegnamentiSection = item.insegnamentoCoinvolti.length
        ? `<div class="insegnamenti-chips">${insegnamentiChips}</div>`
        : '<p class="empty-placeholder">Nessun insegnamento associato.</p>';

    const abilitaHtml = item.abilita.length
        ? `<ul>${item.abilita.map(abilita => `<li>${escapeHtml(abilita)}</li>`).join('')}</ul>`
        : '<p class="empty-placeholder">Nessuna abilità indicata.</p>';

    const conoscenzeHtml = item.conoscenze.length
        ? item.conoscenze.map(conoscenza => `
            <div class="knowledge-chip">
                <div class="knowledge-title">${escapeHtml(conoscenza.nome)}</div>
                <div class="knowledge-subjects">
                    ${conoscenza.insegnamenti.map(ins => `<span>${escapeHtml(ins)}</span>`).join('')}
                </div>
            </div>
        `).join('')
        : '<p class="empty-placeholder">Nessuna conoscenza indicata.</p>';

    return `
        <article class="competence-card">
            <header>
                <h3>Competenza ${item.competenzaNum}</h3>
                <div class="competence-meta">
                    <span class="meta-pill">${escapeHtml(item.periodo)}</span>
                    <span class="meta-pill">Livello ${escapeHtml(String(item.livelloQNQ))}</span>
                </div>
                <p>${escapeHtml(item.competenzaTitolo)}</p>
            </header>
            <div class="competence-metrics">
                <span class="metric-pill">${item.abilita.length} abilità</span>
                <span class="metric-pill">${item.conoscenze.length} conoscenze</span>
                <span class="metric-pill">${item.insegnamentoCoinvolti.length} insegnamenti</span>
            </div>
            ${insegnamentiSection}
            <div class="competence-layout">
                <div class="info-block">
                    <h4>Competenza intermedia</h4>
                    <p style="font-size:0.82rem;color:#374151;line-height:1.5;">${escapeHtml(item.competenzaIntermedia)}</p>
                </div>
                <div class="info-block">
                    <h4>Abilità (${item.abilita.length})</h4>
                    ${abilitaHtml}
                </div>
                <div class="info-block">
                    <h4>Conoscenze (${item.conoscenze.length})</h4>
                    ${conoscenzeHtml}
                </div>
            </div>
        </article>
    `;
}

// Toggle gruppo
function toggleGroup(groupKey) {
    if (expandedGroups.has(groupKey)) {
        expandedGroups.delete(groupKey);
    } else {
        expandedGroups.add(groupKey);
    }
    
    // Re-renderizza solo per aggiornare lo stato del gruppo
    filterAndDisplay();
}

// Renderizza tabella statistiche
function renderStatsTable() {
    const statsData = [
        { nome: "METODOLOGIE OPERATIVE", competenze: 10, conoscenze: 84, periodi: 4, correlazioni: 89 },
        { nome: "PSICOLOGIA GENERALE ED APPLICATA", competenze: 9, conoscenze: 54, periodi: 4, correlazioni: 67 },
        { nome: "IGIENE E CULTURA MEDICO SANITARIA", competenze: 5, conoscenze: 33, periodi: 4, correlazioni: 41 },
        { nome: "DIRITTO E TEC. AMM.", competenze: 8, conoscenze: 25, periodi: 4, correlazioni: 28 },
        { nome: "SCIENZE UMANE", competenze: 7, conoscenze: 19, periodi: 4, correlazioni: 24 },
        { nome: "TIC - TECNOLOGIE INFORMAZIONE E COMUNICAZIONE", competenze: 6, conoscenze: 18, periodi: 4, correlazioni: 21 },
        { nome: "MATEMATICA", competenze: 4, conoscenze: 15, periodi: 4, correlazioni: 18 }
    ];

    const tbody = document.getElementById('stats-tbody');
    const maxCorrelazioni = Math.max(...statsData.map(s => s.correlazioni));

    tbody.innerHTML = statsData.map(stat => `
        <tr>
            <td style="font-weight: 500; font-size: 0.75rem;">${stat.nome}</td>
            <td><span class="stat-badge badge-blue">${stat.competenze}/10</span></td>
            <td><span class="stat-badge badge-green">${stat.conoscenze}</span></td>
            <td><span class="stat-badge badge-purple">${stat.periodi}/4</span></td>
            <td><span class="stat-badge badge-orange">${stat.correlazioni}</span></td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(stat.correlazioni / maxCorrelazioni) * 100}%"></div>
                </div>
            </td>
        </tr>
    `).join('');
}

// Utility functions
function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

function showEmptyState(show) {
    document.getElementById('empty-state').classList.toggle('hidden', !show);
}

function notifyParentHeight() {
    if (window.parent === window) {
        return;
    }
    requestAnimationFrame(() => {
        const height = document.body.scrollHeight;
        window.parent.postMessage({ type: 'iframeContentHeight', height }, '*');
    });
}

// Rendi disponibile globalmente per onclick
window.toggleGroup = toggleGroup;
