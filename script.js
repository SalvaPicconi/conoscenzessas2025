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
        
        const response = await fetch('data.json');
        console.log('Response status:', response.status);
        
        allData = await response.json();
        console.log('Dati caricati:', allData.length, 'elementi');
        console.log('Primo elemento:', allData[0]);
        
        setupFilters();
        filterAndDisplay();
        renderStatsTable();
        showLoading(false);
        
        console.log('Caricamento completato con successo');
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        alert('Errore nel caricamento dei dati: ' + error.message);
        showLoading(false);
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
    const exportCsvBtn = document.getElementById('export-csv');
    const exportJsonBtn = document.getElementById('export-json');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);
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
}

// Export helpers
function exportCSV() {
    const data = (filteredData && filteredData.length ? filteredData : allData);
    if (!data || !data.length) {
        alert('Non ci sono dati da esportare.');
        return;
    }

    // Costruisci CSV con colonne chiave
    const header = [
        'CompetenzaNum',
        'CompetenzaTitolo',
        'Periodo',
        'LivelloQNQ',
        'CompetenzaIntermedia',
        'Abilita',
        'Conoscenze',
        'InsegnamentiCoinvolti'
    ];

    const rows = data.map(item => {
        const abilita = (item.abilita || []).join(' | ');
        const conoscenze = (item.conoscenze || []).map(c => c.nome).join(' | ');
        const insegnamenti = (item.insegnamentoCoinvolti || []).join(' | ');

        return [
            item.competenzaNum,
            sanitizeCSV(item.competenzaTitolo),
            sanitizeCSV(item.periodo),
            sanitizeCSV(String(item.livelloQNQ)),
            sanitizeCSV(item.competenzaIntermedia),
            sanitizeCSV(abilita),
            sanitizeCSV(conoscenze),
            sanitizeCSV(insegnamenti)
        ];
    });

    const csvContent = [header.join(','), ...rows.map(r => r.map(csvWrap).join(','))].join('\n');
    downloadFile(csvContent, 'text/csv;charset=utf-8;', 'curricolo_ssas.csv');
}

function exportJSON() {
    const data = (filteredData && filteredData.length ? filteredData : allData);
    if (!data || !data.length) {
        alert('Non ci sono dati da esportare.');
        return;
    }
    const jsonStr = JSON.stringify(data, null, 2);
    downloadFile(jsonStr, 'application/json;charset=utf-8;', 'curricolo_ssas.json');
}

function sanitizeCSV(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\r?\n|\r/g, ' ').trim();
}

function csvWrap(value) {
    const v = value === undefined || value === null ? '' : String(value);
    // Se contiene virgole, doppi apici o newline, avvolgi tra doppi apici e raddoppia gli apici interni
    if (/[",\n\r]/.test(v)) {
        return '"' + v.replace(/"/g, '""') + '"';
    }
    return v;
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
    return `
        <div class="item-card">
            <div class="item-meta">
                <div class="item-badges">
                    <span class="stat-badge badge-blue">${item.periodo} - Livello ${item.livelloQNQ}</span>
                    <span class="stat-badge badge-purple">Competenza ${item.competenzaNum}</span>
                </div>
                <h3 class="item-title">${item.competenzaTitolo}</h3>
                <p class="item-description">
                    <strong>Competenza Intermedia:</strong> ${item.competenzaIntermedia}
                </p>
                <div style="margin-bottom: 12px;">
                    <h4 style="font-size: 0.75rem; margin-bottom: 4px;">Insegnamenti Coinvolti (${item.insegnamentoCoinvolti.length})</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${item.insegnamentoCoinvolti.map(ins => 
                            `<span class="stat-badge badge-orange">${ins}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            
            <div class="item-content">
                <div class="item-section">
                    <h4>Abilità (${item.abilita.length})</h4>
                    <ul class="item-list">
                        ${item.abilita.map(abilita => `<li>${abilita}</li>`).join('')}
                    </ul>
                </div>

                <div class="item-section">
                    <h4>Conoscenze e Insegnamenti (${item.conoscenze.length})</h4>
                    <div style="max-height: 128px; overflow-y: auto;">
                        ${item.conoscenze.map(conoscenza => `
                            <div class="knowledge-item">
                                <div class="knowledge-name">${conoscenza.nome}</div>
                                <div class="knowledge-subjects">
                                    ${conoscenza.insegnamenti.map(ins => 
                                        `<span class="subject-tag">${ins}</span>`
                                    ).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
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

// Rendi disponibile globalmente per onclick
window.toggleGroup = toggleGroup;