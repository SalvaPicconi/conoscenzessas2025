// Se la pagina vive in un iframe, disattiva lo scroll interno:
// l'altezza è gestita dalla pagina madre (niente doppia scrollbar)
if (window.parent !== window) {
    document.documentElement.classList.add('embedded');
}

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
        updateHeaderCards();
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
    const visibleData = getVisibleData();
    document.getElementById('filtered-count').textContent = visibleData.length;

    // Raggruppa dati
    const groupedData = groupData(visibleData);
    console.log('Dati raggruppati:', Object.keys(groupedData).length, 'gruppi');
    
    // Renderizza tabella principale
    renderMainTable(groupedData);
    
    // Mostra/nascondi empty state
    showEmptyState(visibleData.length === 0);
    notifyParentHeight();
}

function getVisibleData() {
    if (!filters.insegnamento) {
        return [...filteredData];
    }
    return applyInsegnamentoFocus(filteredData, filters.insegnamento);
}

function applyInsegnamentoFocus(items, selectedSubject) {
    if (!selectedSubject) {
        return [...items];
    }

    return items.map(item => {
        const relevantKnowledge = (item.conoscenze || []).filter(conoscenza =>
            Array.isArray(conoscenza.insegnamenti) && conoscenza.insegnamenti.includes(selectedSubject)
        );

        if (!relevantKnowledge.length) {
            return {
                ...item,
                conoscenze: [],
                insegnamentoCoinvolti: [selectedSubject]
            };
        }

        const relatedSubjects = new Set();
        relevantKnowledge.forEach(conoscenza => {
            conoscenza.insegnamenti.forEach(ins => relatedSubjects.add(ins));
        });

        return {
            ...item,
            conoscenze: relevantKnowledge,
            insegnamentoCoinvolti: orderSubjectsByPriority(Array.from(relatedSubjects), selectedSubject)
        };
    });
}

function orderSubjectsByPriority(subjects, primary) {
    if (!subjects || !subjects.length) {
        return primary ? [primary] : [];
    }
    const sorted = [...subjects].sort((a, b) => a.localeCompare(b));
    if (!primary) {
        return sorted;
    }
    const index = sorted.indexOf(primary);
    if (index === -1) {
        sorted.unshift(primary);
    } else if (index > 0) {
        sorted.splice(index, 1);
        sorted.unshift(primary);
    }
    return sorted;
}

// Export helpers
function exportExcel() {
    const data = datiDaEsportare();
    if (!data) return;
    const D = window.DocumentoOffice;
    D.scaricaXlsx('curricolo_ssas_area_indirizzo.xlsx', {
        nome: 'Curricolo SSAS',
        intestazioni: ['Competenza', 'Titolo', 'Periodo', 'Livello QNQ', 'Competenza intermedia',
                       'Abilità', 'Conoscenze', 'Insegnamenti'],
        larghezze: [13, 38, 12, 11, 42, 46, 46, 26],
        righe: data.map(item => [
            `Competenza ${item.competenzaNum}`,
            item.competenzaTitolo,
            item.periodo,
            String(item.livelloQNQ ?? ''),
            item.competenzaIntermedia,
            (item.abilita || []).join('\n'),
            (item.conoscenze || []).map(c => c.nome).join('\n'),
            (item.insegnamentoCoinvolti || []).join(', ')
        ])
    }, { titolo: 'Curricolo SSAS — Area di indirizzo' });
}

function exportWord() {
    const data = datiDaEsportare();
    if (!data) return;
    const D = window.DocumentoOffice;
    const disciplina = filters.insegnamento || '_____________';
    const vuoto = '_____________';

    const nodi = [
        D.paragrafo('IIS Meucci - Mattei Cagliari, Sede Decimomannu', 'istituto'),
        D.paragrafo('Profilo di uscita SSAS: D.I. 24 maggio 2018, n. 92, Allegato 2-I · risultati intermedi: Linee guida D.M. 766/2019, Allegato C, sezione I', 'indirizzo'),
        D.linea(),
        D.titolo(1, `PIANO DI LAVORO DI ${disciplina.toUpperCase()}`),
        D.titolo(2, 'Informazioni generali'),
        tabellaModulo([
            ['Docente', vuoto],
            ['Disciplina', disciplina],
            ['Classe / sezione', vuoto],
            ['Anno scolastico', vuoto],
            ['Ore settimanali', vuoto]
        ]),
        D.titolo(2, 'Metodologia'),
        D.titolo(3, 'Attività'), D.righe(4),
        D.titolo(3, 'Strumenti'), D.righe(4),
        D.titolo(3, 'Verifiche'), D.righe(3),
        D.titolo(3, 'Criteri e modalità di valutazione'), D.righe(4),
        D.titolo(3, 'Attività di recupero in itinere'),
        D.paragrafo('Ogni qualvolta si rendesse necessario, si provvederà al recupero delle conoscenze e abilità pregresse.')
    ];

    raggruppaPerCompetenza(data).forEach(gruppo => {
        nodi.push(D.titolo(2, `Competenza ${gruppo.numero} — ${gruppo.titolo}`));

        const intermedie = [...gruppo.competenzeIntermedie.entries()].flatMap(([periodo, descrizioni]) =>
            [...descrizioni].map(descrizione => [
                D.testo(`${periodo}: `, { grassetto: true }),
                D.testo(descrizione)
            ]));
        if (intermedie.length) {
            nodi.push(D.titolo(3, 'Competenze intermedie'));
            nodi.push(D.elenco(intermedie));
        }
        if (gruppo.conoscenze.size) {
            nodi.push(D.titolo(3, 'Conoscenze'));
            nodi.push(D.elenco([...gruppo.conoscenze]));
        }
        if (gruppo.abilita.size) {
            nodi.push(D.titolo(3, 'Abilità'));
            nodi.push(D.elenco([...gruppo.abilita]));
        }
        if (gruppo.periods.size) {
            nodi.push(D.titolo(3, 'Contenuti per periodo'));
            nodi.push(D.tabella({
                intestazioni: ['Periodo', 'Contenuti'],
                larghezze: [28, 72],
                righe: [...gruppo.periods.keys()].map(periodo => [periodo, ''])
            }));
        }
    });

    nodi.push(D.firme(['Cagliari, __/__/______', 'Il/La docente']));

    D.scaricaDocx('Piano-di-lavoro-SSAS.docx', nodi, {
        titolo: `Piano di lavoro di ${disciplina}`,
        istituto: 'IIS Meucci - Mattei Cagliari'
    });
}

function exportJSON() {
    const data = datiDaEsportare();
    if (!data) return;
    downloadFile(JSON.stringify(data, null, 2), 'application/json;charset=utf-8;', 'curricolo_ssas_area_indirizzo.json');
}

// Le tre esportazioni partono dagli stessi dati: quelli visibili se ci sono
// filtri attivi, altrimenti tutti.
function datiDaEsportare() {
    const base = (filteredData && filteredData.length) ? getVisibleData() : allData;
    const data = (base && base.length) ? base : allData;
    if (!data || !data.length) {
        alert('Non ci sono dati da esportare.');
        return null;
    }
    return data.filter(item => item && item.competenzaNum !== undefined && item.competenzaTitolo !== undefined);
}

function tabellaModulo(righe) {
    const D = window.DocumentoOffice;
    return D.tabella({
        larghezze: [34, 66],
        righe: righe.map(([etichetta, valore]) => [
            { frammenti: D.frammenti(etichetta), grassetto: true, sfondo: 'FAFAFA' },
            valore
        ])
    });
}

function raggruppaPerCompetenza(data) {
    const mappa = new Map();
    data.forEach(item => {
        const chiave = item.competenzaNum;
        const voce = mappa.get(chiave) || {
            numero: item.competenzaNum,
            titolo: item.competenzaTitolo || '',
            periods: new Map(),
            competenzeIntermedie: new Map(),
            abilita: new Set(),
            conoscenze: new Set()
        };
        const periodo = item.periodo || 'Periodo non specificato';
        if (!voce.periods.has(periodo)) voce.periods.set(periodo, true);
        (item.abilita || []).forEach(a => voce.abilita.add(a));
        (item.conoscenze || []).forEach(c => { if (c && c.nome) voce.conoscenze.add(c.nome); });
        if (item.competenzaIntermedia) {
            const perPeriodo = voce.competenzeIntermedie.get(periodo) || new Set();
            perPeriodo.add(item.competenzaIntermedia);
            voce.competenzeIntermedie.set(periodo, perPeriodo);
        }
        mappa.set(chiave, voce);
    });
    return [...mappa.values()].sort((a, b) => a.numero - b.numero);
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
    const addToGroup = (key, item) => {
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
    };

    data.forEach(item => {
        switch (groupBy) {
            case 'competenzaNum':
                addToGroup(`Competenza ${item.competenzaNum}`, item);
                break;
            case 'periodo':
                addToGroup(item.periodo, item);
                break;
            case 'livelloQNQ':
                addToGroup(`Livello ${item.livelloQNQ}`, item);
                break;
            case 'insegnamento':
                // Una scheda compare in ogni insegnamento coinvolto
                (item.insegnamentoCoinvolti && item.insegnamentoCoinvolti.length
                    ? item.insegnamentoCoinvolti
                    : ['Senza insegnamento']).forEach(ins => addToGroup(ins, item));
                break;
            default:
                addToGroup('Tutti', item);
        }
    });

    if (groupBy === 'insegnamento') {
        return Object.fromEntries(
            Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
        );
    }
    return groups;
}

// Renderizza tabella principale
function renderMainTable(groupedData) {
    const container = document.getElementById('main-table-container');
    container.innerHTML = '';

    Object.entries(groupedData).forEach(([groupKey, items], index) => {
        const groupElement = createGroupElement(groupKey, items, index);
        container.appendChild(groupElement);
    });
}

// Con filtri o ricerca attivi i gruppi si aprono da soli
function hasActiveFilters() {
    return Boolean(filters.searchTerm || filters.competenza ||
        filters.periodo || filters.livelloQNQ || filters.insegnamento);
}

// Crea elemento gruppo
function createGroupElement(groupKey, items, index) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-container';
    const contentId = `group-content-${index}`;

    const isExpanded = expandedGroups.has(groupKey) || hasActiveFilters();
    if (isExpanded) {
        groupDiv.classList.add('group-expanded');
    }

    groupDiv.innerHTML = `
        <button type="button" class="group-header" aria-expanded="${isExpanded}" aria-controls="${contentId}">
            <span class="group-title">
                <span class="group-chevron" aria-hidden="true">▸</span>
                <span class="group-name">${escapeHtml(groupKey)}</span>
                <span class="group-count">(${items.length} ${items.length === 1 ? 'scheda' : 'schede'})</span>
            </span>
        </button>
        <div class="group-content" id="${contentId}" ${isExpanded ? '' : 'hidden'}>
            <div class="item-grid">
                ${items.map(item => createItemElement(item)).join('')}
            </div>
        </div>
    `;

    groupDiv.querySelector('.group-header').addEventListener('click', () => {
        toggleGroup(groupKey, groupDiv);
    });

    return groupDiv;
}

// Classe CSS della pill in base al periodo
function periodClass(periodo) {
    const p = String(periodo || '');
    if (p.startsWith('Biennio')) return 'per-biennio';
    if (p.startsWith('Terzo')) return 'per-terzo';
    if (p.startsWith('Quarto')) return 'per-quarto';
    if (p.startsWith('Quinto')) return 'per-quinto';
    return 'per-default';
}

// Titolo senza il prefisso "Competenza in uscita n° X:"
function shortCompetenceTitle(titolo) {
    return String(titolo || '').replace(/^Competenza in uscita n°\s*\d+:\s*/i, '');
}

// Crea elemento item
function createItemElement(item) {
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
            <div class="card-pills">
                <span class="pill ${periodClass(item.periodo)}">${escapeHtml(item.periodo)}</span>
                <span class="pill pill-qnq">QNQ ${escapeHtml(String(item.livelloQNQ))}</span>
                <span class="pill pill-comp">Competenza ${item.competenzaNum}</span>
            </div>
            <h3 class="card-title">${escapeHtml(item.competenzaIntermedia)}</h3>
            <p class="card-subtitle">${escapeHtml(shortCompetenceTitle(item.competenzaTitolo))}</p>
            <div class="competence-layout">
                <div class="info-block">
                    <h4>⚙️ Abilità (${item.abilita.length})</h4>
                    ${abilitaHtml}
                </div>
                <div class="info-block">
                    <h4>💡 Conoscenze (${item.conoscenze.length})</h4>
                    ${conoscenzeHtml}
                </div>
            </div>
        </article>
    `;
}

// Toggle gruppo
function toggleGroup(groupKey, groupElement) {
    const shouldExpand = !groupElement.classList.contains('group-expanded');
    if (shouldExpand) {
        expandedGroups.add(groupKey);
    } else {
        expandedGroups.delete(groupKey);
    }

    groupElement.classList.toggle('group-expanded', shouldExpand);
    const button = groupElement.querySelector('.group-header');
    const content = groupElement.querySelector('.group-content');
    button?.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');
    if (content) content.hidden = !shouldExpand;
    notifyParentHeight();
}

// Renderizza tabella statistiche (calcolata dai dati reali)
function renderStatsTable() {
    const totCompetenze = new Set(allData.map(item => item.competenzaNum)).size;
    const totPeriodi = new Set(allData.map(item => item.periodo)).size;

    const perInsegnamento = new Map();
    const getStat = ins => {
        if (!perInsegnamento.has(ins)) {
            perInsegnamento.set(ins, {
                nome: ins,
                competenze: new Set(),
                periodi: new Set(),
                conoscenze: 0,
                schede: 0
            });
        }
        return perInsegnamento.get(ins);
    };

    allData.forEach(item => {
        (item.insegnamentoCoinvolti || []).forEach(ins => {
            const stat = getStat(ins);
            stat.competenze.add(item.competenzaNum);
            stat.periodi.add(item.periodo);
            stat.schede += 1;
        });
        (item.conoscenze || []).forEach(conoscenza => {
            (conoscenza.insegnamenti || []).forEach(ins => {
                getStat(ins).conoscenze += 1;
            });
        });
    });

    const statsData = [...perInsegnamento.values()]
        .map(stat => ({
            nome: stat.nome,
            competenze: stat.competenze.size,
            conoscenze: stat.conoscenze,
            periodi: stat.periodi.size,
            schede: stat.schede
        }))
        .sort((a, b) => b.conoscenze - a.conoscenze);

    const tbody = document.getElementById('stats-tbody');
    const maxConoscenze = Math.max(...statsData.map(s => s.conoscenze), 1);

    tbody.innerHTML = statsData.map(stat => `
        <tr>
            <td style="font-weight: 500; font-size: 0.75rem;">${escapeHtml(stat.nome)}</td>
            <td><span class="stat-badge badge-blue">${stat.competenze}/${totCompetenze}</span></td>
            <td><span class="stat-badge badge-green">${stat.conoscenze}</span></td>
            <td><span class="stat-badge badge-purple">${stat.periodi}/${totPeriodi}</span></td>
            <td><span class="stat-badge badge-orange">${stat.schede}</span></td>
            <td>
                <div class="progress-bar" role="progressbar" aria-label="Carico didattico di ${escapeHtml(stat.nome)}" aria-valuemin="0" aria-valuemax="${maxConoscenze}" aria-valuenow="${stat.conoscenze}">
                    <div class="progress-fill" style="width: ${(stat.conoscenze / maxConoscenze) * 100}%"></div>
                </div>
            </td>
        </tr>
    `).join('');
}

// Aggiorna le card statistiche in testa alla pagina con i valori reali
function updateHeaderCards() {
    const competenze = new Set(allData.map(item => item.competenzaNum)).size;
    const insegnamenti = new Set();
    let correlazioni = 0;
    allData.forEach(item => {
        (item.insegnamentoCoinvolti || []).forEach(ins => insegnamenti.add(ins));
        correlazioni += (item.conoscenze || []).length;
    });

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    setText('stat-competenze', competenze);
    setText('stat-traguardi', allData.length);
    setText('stat-insegnamenti', insegnamenti.size);
    setText('stat-correlazioni', correlazioni);
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
        const height = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
        );
        window.parent.postMessage({ type: 'iframeContentHeight', height }, '*');
    });
}
