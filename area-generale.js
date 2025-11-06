const filters = {
    competenza: '',
    asse: '',
    insegnamento: '',
    search: '',
    sort: 'numero'
};

let normalizedData = [];
let filteredData = [];
let areaMetadata = {
    descrizione: ''
};

const AXIS_SUBJECTS = {
    'Asse dei linguaggi': ['Italiano', 'Inglese'],
    'Linguistico-letterario': ['Italiano', 'Inglese'],
    'Asse matematico': ['Matematica'],
    'Matematico': ['Matematica'],
    'Storico sociale': ['Storia', 'Geografia', 'Diritto ed economia'],
    'Storico-sociale': ['Storia', 'Geografia', 'Diritto ed economia'],
    'Scienze motorie': ['Scienze motorie'],
    'RC o attività alternative': ['Religione cattolica o attività alternative'],
    'IRC o attività alternative': ['Religione cattolica o attività alternative'],
    'Scientifico-tecnologico': ['Scienze integrate'],
    'Scientifico tecnologico': ['Scienze integrate']
};

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
});

async function initializeDashboard() {
    showLoading(true);
    try {
        const dataset = await fetchDataset();
        const { metadata, entries } = normalizeDataset(dataset);
        areaMetadata = metadata;
        normalizedData = entries;

        updateIntroDescription(areaMetadata.descrizione);
        setupFilters();
        bindEvents();
        applyFilters();
    } catch (error) {
        console.error('Errore nell\'inizializzazione area generale:', error);
        alert('Impossibile caricare i dati dell\'area generale. Verifica i log.');
    } finally {
        showLoading(false);
        notifyParentHeight();
    }
}

async function fetchDataset() {
    const response = await fetch('data-area-generale.json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Risposta non valida: ${response.status}`);
    }
    return response.json();
}

function normalizeDataset(rawData) {
    if (!rawData || typeof rawData !== 'object') {
        return { metadata: { descrizione: '' }, entries: [] };
    }

    const firstKey = Object.keys(rawData)[0];
    const area = firstKey ? rawData[firstKey] : null;
    if (!area || !Array.isArray(area.competenze)) {
        return { metadata: { descrizione: area?.descrizione || '' }, entries: [] };
    }

    const entries = [];
    area.competenze.forEach(competenza => {
        const numero = Number(competenza.numero);
        const titolo = competenza.titolo || '';
        const assi = Array.isArray(competenza.assi_culturali) ? competenza.assi_culturali : [];

        assi.forEach(asseInfo => {
            const asseNome = asseInfo?.asse || 'Asse non specificato';
            const abilita = Array.isArray(asseInfo?.abilita) ? asseInfo.abilita : [];
            const conoscenze = Array.isArray(asseInfo?.conoscenze) ? asseInfo.conoscenze : [];

            entries.push({
                competenzaNumero: numero,
                competenzaTitolo: titolo,
                asse: asseNome,
                abilita,
                conoscenze
            });
        });
    });

    return {
        metadata: {
            descrizione: area.descrizione || ''
        },
        entries
    };
}

function updateIntroDescription(descrizione) {
    if (!descrizione) {
        return;
    }
    const paragraph = document.getElementById('intro-description');
    if (paragraph) {
        paragraph.textContent = descrizione;
    }
}

function setupFilters() {
    const competenceSelect = document.getElementById('generale-competenza');
    const axisSelect = document.getElementById('generale-asse');
    const subjectSelect = document.getElementById('generale-insegnamento');
    const sortSelect = document.getElementById('generale-sort');

    const competenceMap = new Map();
    normalizedData.forEach(entry => {
        if (!competenceMap.has(entry.competenzaNumero)) {
            competenceMap.set(entry.competenzaNumero, entry.competenzaTitolo);
        }
    });

    const competenze = Array.from(competenceMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([numero, titolo]) => ({
            value: numero,
            label: `Competenza ${numero} - ${shorten(titolo, 68)}`
        }));

    const assi = Array.from(new Set(normalizedData.map(entry => entry.asse)))
        .sort((a, b) => a.localeCompare(b))
        .map(asse => ({ value: asse, label: asse }));

    const subjects = Array.from(collectSubjects())
        .sort((a, b) => a.localeCompare(b))
        .map(subject => ({ value: subject, label: subject }));

    populateSelect(competenceSelect, competenze);
    populateSelect(axisSelect, assi);
    populateSelect(subjectSelect, subjects);

    if (sortSelect) {
        sortSelect.value = filters.sort;
    }
}

function populateSelect(select, options) {
    if (!select) {
        return;
    }
    options.forEach(option => {
        const element = document.createElement('option');
        element.value = option.value;
        element.textContent = option.label;
        select.appendChild(element);
    });
}

function bindEvents() {
    const competenceSelect = document.getElementById('generale-competenza');
    const axisSelect = document.getElementById('generale-asse');
    const subjectSelect = document.getElementById('generale-insegnamento');
    const searchInput = document.getElementById('generale-search');
    const sortSelect = document.getElementById('generale-sort');
    const resetButton = document.getElementById('generale-reset');
    const exportButton = document.getElementById('generale-export-json');
    const exportExcelButton = document.getElementById('generale-export-excel');
    const exportWordButton = document.getElementById('generale-export-word');

    if (competenceSelect) {
        competenceSelect.addEventListener('change', event => {
            filters.competenza = event.target.value ? Number(event.target.value) : '';
            applyFilters();
        });
    }

    if (axisSelect) {
        axisSelect.addEventListener('change', event => {
            filters.asse = event.target.value;
            applyFilters();
        });
    }

    if (subjectSelect) {
        subjectSelect.addEventListener('change', event => {
            filters.insegnamento = event.target.value;
            applyFilters();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', event => {
            filters.sort = event.target.value || 'numero';
            applyFilters();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', event => {
            filters.search = event.target.value.trim().toLowerCase();
            applyFilters();
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            resetFilters();
        });
    }

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            exportJSON();
        });
    }

    if (exportExcelButton) {
        exportExcelButton.addEventListener('click', () => {
            exportExcel();
        });
    }

    if (exportWordButton) {
        exportWordButton.addEventListener('click', () => {
            exportWord();
        });
    }
}

function resetFilters() {
    filters.competenza = '';
    filters.asse = '';
    filters.insegnamento = '';
    filters.search = '';
    filters.sort = 'numero';

    const competenceSelect = document.getElementById('generale-competenza');
    const axisSelect = document.getElementById('generale-asse');
    const subjectSelect = document.getElementById('generale-insegnamento');
    const sortSelect = document.getElementById('generale-sort');
    const searchInput = document.getElementById('generale-search');

    if (competenceSelect) competenceSelect.value = '';
    if (axisSelect) axisSelect.value = '';
    if (subjectSelect) subjectSelect.value = '';
    if (sortSelect) sortSelect.value = 'numero';
    if (searchInput) searchInput.value = '';

    applyFilters();
}

function applyFilters() {
    filteredData = normalizedData.filter(entry => {
        const matchCompetenza = !filters.competenza || entry.competenzaNumero === filters.competenza;
        const matchAsse = !filters.asse || entry.asse === filters.asse;
        const subjects = getSubjectsForAxis(entry.asse);
        const matchSubject = !filters.insegnamento || subjects.some(subject => subject === filters.insegnamento);
        const matchSearch = !filters.search || matchesSearch(entry, filters.search);
        return matchCompetenza && matchAsse && matchSubject && matchSearch;
    });

    const dataForDisplay = getCurrentDataset();
    const groupedCompetences = buildCompetenceGroups(dataForDisplay);

    updateStatsCards(dataForDisplay);
    renderAxisOverview(dataForDisplay);
    renderCompetenceSummary(groupedCompetences);
    renderCompetenceCards(groupedCompetences);
    toggleEmptyState(dataForDisplay.length === 0);
    notifyParentHeight();
}

function getCurrentDataset() {
    return filteredData.length ? filteredData : normalizedData;
}

function matchesSearch(entry, term) {
    const toMatch = term.toLowerCase();
    if (String(entry.competenzaNumero).includes(toMatch)) return true;
    if (entry.competenzaTitolo.toLowerCase().includes(toMatch)) return true;
    if (entry.asse.toLowerCase().includes(toMatch)) return true;
    if (entry.abilita.some(abilita => abilita.toLowerCase().includes(toMatch))) return true;
    if (entry.conoscenze.some(conoscenza => conoscenza.toLowerCase().includes(toMatch))) return true;
    if (getSubjectsForAxis(entry.asse).some(subject => subject.toLowerCase().includes(toMatch))) return true;
    return false;
}

function buildCompetenceGroups(data) {
    const map = new Map();

    data.forEach(entry => {
        const key = entry.competenzaNumero;
        let group = map.get(key);
        if (!group) {
            group = {
                numero: entry.competenzaNumero,
                titolo: entry.competenzaTitolo,
                axes: new Map(),
                sectionCount: 0,
                abilityCount: 0,
                knowledgeCount: 0
            };
        }

        group.sectionCount += 1;
        group.abilityCount += entry.abilita.length;
        group.knowledgeCount += entry.conoscenze.length;

        const axisKey = entry.asse;
        const axisEntry = group.axes.get(axisKey) || {
            asse: axisKey,
            abilita: new Set(),
            conoscenze: new Set()
        };
        entry.abilita.forEach(abilita => axisEntry.abilita.add(abilita));
        entry.conoscenze.forEach(conoscenza => axisEntry.conoscenze.add(conoscenza));
        group.axes.set(axisKey, axisEntry);

        map.set(key, group);
    });

    const groups = Array.from(map.values()).map(group => ({
        numero: group.numero,
        titolo: group.titolo,
        axisCount: group.axes.size,
        abilityCount: group.abilityCount,
        knowledgeCount: group.knowledgeCount,
        sectionCount: group.sectionCount,
        axes: Array.from(group.axes.values()).map(axis => ({
            asse: axis.asse,
            abilita: Array.from(axis.abilita),
            conoscenze: Array.from(axis.conoscenze)
        }))
    }));

    return sortCompetenceGroups(groups);
}

function sortCompetenceGroups(groups) {
    switch (filters.sort) {
        case 'assi':
            return groups.sort((a, b) => {
                if (b.axisCount !== a.axisCount) return b.axisCount - a.axisCount;
                return a.numero - b.numero;
            });
        case 'ricchezza':
            return groups.sort((a, b) => {
                const totalA = a.abilityCount + a.knowledgeCount;
                const totalB = b.abilityCount + b.knowledgeCount;
                if (totalB !== totalA) return totalB - totalA;
                return a.numero - b.numero;
            });
        case 'numero':
        default:
            return groups.sort((a, b) => a.numero - b.numero);
    }
}

function updateStatsCards(data) {
    const uniqueCompetences = new Set();
    const abilities = new Set();
    const knowledge = new Set();
    const axes = new Set();

    data.forEach(entry => {
        uniqueCompetences.add(entry.competenzaNumero);
        entry.abilita.forEach(abilita => abilities.add(abilita));
        entry.conoscenze.forEach(conoscenza => knowledge.add(conoscenza));
        axes.add(entry.asse);
    });

    document.getElementById('total-records').textContent = data.length;
    document.getElementById('total-competencies').textContent = uniqueCompetences.size;
    document.getElementById('total-abilities').textContent = abilities.size;
    document.getElementById('total-knowledge').textContent = knowledge.size;
    document.getElementById('total-axes').textContent = axes.size;
}

function renderAxisOverview(data) {
    const container = document.getElementById('axis-summary');
    if (!container) {
        return;
    }
    container.innerHTML = '';

    if (!data.length) {
        container.innerHTML = '<p class="empty-placeholder">Nessun dato disponibile per i filtri selezionati.</p>';
        return;
    }

    const axisMap = new Map();
    data.forEach(entry => {
        const axisKey = entry.asse;
        const current = axisMap.get(axisKey) || {
            records: 0,
            competenze: new Set(),
            abilita: 0,
            conoscenze: 0,
            insegnamenti: new Set()
        };
        current.records += 1;
        current.competenze.add(entry.competenzaNumero);
        current.abilita += entry.abilita.length;
        current.conoscenze += entry.conoscenze.length;
        getSubjectsForAxis(axisKey).forEach(subject => current.insegnamenti.add(subject));
        axisMap.set(axisKey, current);
    });

    const values = Array.from(axisMap.entries());
    const maxRecords = Math.max(1, ...values.map(([, value]) => value.records));

    const cards = values
        .sort((a, b) => {
            if (b[1].records !== a[1].records) return b[1].records - a[1].records;
            return a[0].localeCompare(b[0]);
        })
        .map(([axis, value]) => {
            const percent = Math.round((value.records / maxRecords) * 100) || 5;
            return `
                <article class="period-card">
                    <h3>${escapeHTML(axis)}</h3>
                    <div class="period-metric"><span>Sezioni</span><span>${value.records}</span></div>
                    <div class="period-metric"><span>Competenze</span><span>${value.competenze.size}</span></div>
                    <div class="period-metric"><span>Abilità</span><span>${value.abilita}</span></div>
                    <div class="period-metric"><span>Conoscenze</span><span>${value.conoscenze}</span></div>
                    <div class="period-metric"><span>Insegnamenti</span><span>${value.insegnamenti.size}</span></div>
                    <div class="axis-subjects" style="margin-top:10px;">
                        ${Array.from(value.insegnamenti).sort((a, b) => a.localeCompare(b)).map(subject => `<span>${escapeHTML(subject)}</span>`).join('')}
                    </div>
                    <div class="period-progress"><span style="width: ${percent}%"></span></div>
                </article>
            `;
        });

    container.innerHTML = cards.join('');
}

function renderCompetenceSummary(groups) {
    const tbody = document.getElementById('competence-summary-body');
    if (!tbody) {
        return;
    }
    tbody.innerHTML = '';

    if (!groups.length) {
        tbody.innerHTML = '<tr><td colspan="5">Nessuna competenza disponibile.</td></tr>';
        return;
    }

    const rows = groups.map(group => {
        return `
            <tr>
                <td style="text-align:left;font-weight:600;">Competenza ${group.numero}</td>
                <td>${group.axisCount}</td>
                <td>${group.abilityCount}</td>
                <td>${group.knowledgeCount}</td>
                <td>${group.sectionCount}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rows.join('');
}

function renderCompetenceCards(groups) {
    const container = document.getElementById('competence-list');
    if (!container) {
        return;
    }
    container.innerHTML = '';

    if (!groups.length) {
        container.innerHTML = '<p class="empty-placeholder">Nessun dettaglio disponibile.</p>';
        return;
    }

    const cards = groups.map(group => {
        const metricsHtml = `
            <div class="competence-metrics">
                <span class="metric-pill">${group.axisCount} assi</span>
                <span class="metric-pill">${group.abilityCount} abilità</span>
                <span class="metric-pill">${group.knowledgeCount} conoscenze</span>
            </div>
        `;

        const axesHtml = group.axes.map(axis => {
            const subjects = getSubjectsForAxis(axis.asse);
            const subjectsHtml = subjects.length
                ? `<div class="axis-subjects">${subjects.map(subject => `<span>${escapeHTML(subject)}</span>`).join('')}</div>`
                : '<p class="empty-placeholder" style="padding:0;">Insegnamenti da definire</p>';
            const abilitaList = axis.abilita.length
                ? `<ul>${axis.abilita.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`
                : '<p class="empty-placeholder" style="padding:0;">Nessuna abilità</p>';
            const conoscenzeList = axis.conoscenze.length
                ? `<ul>${axis.conoscenze.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`
                : '<p class="empty-placeholder" style="padding:0;">Nessuna conoscenza</p>';

            return `
                <div class="competence-axis">
                    <h4>${escapeHTML(axis.asse)}</h4>
                    ${subjectsHtml}
                    <div class="axis-columns">
                        <div class="axis-block">
                            <h5>Abilità (${axis.abilita.length})</h5>
                            ${abilitaList}
                        </div>
                        <div class="axis-block">
                            <h5>Conoscenze (${axis.conoscenze.length})</h5>
                            ${conoscenzeList}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <article class="competence-card">
                <header>
                    <h3>Competenza ${group.numero}</h3>
                    <p>${escapeHTML(group.titolo)}</p>
                </header>
                ${metricsHtml}
                <div class="competence-axes">
                    ${axesHtml}
                </div>
            </article>
        `;
    });

    container.innerHTML = cards.join('');
}

function exportJSON() {
    const data = getCurrentDataset();
    if (!data.length) {
        alert('Non ci sono dati da esportare.');
        return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'curricolo_area_generale.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportExcel() {
    const data = getCurrentDataset();
    if (!data.length) {
        alert('Non ci sono dati da esportare.');
        return;
    }
    const headerHtml = buildExportHeader(false);
    const tableHtml = buildHtmlTable(data, false);
    const content = `\uFEFF<html><head><meta charset="UTF-8"></head><body>${headerHtml}${tableHtml}</body></html>`;
    downloadFile(content, 'application/vnd.ms-excel', 'curricolo_area_generale.xls');
}

function exportWord() {
    const data = getCurrentDataset();
    if (!data.length) {
        alert('Non ci sono dati da esportare.');
        return;
    }
    const documentHtml = buildWordDocument(data);
    const content = `\uFEFF<html><head><meta charset="UTF-8"></head><body>${documentHtml}</body></html>`;
    downloadFile(content, 'application/msword', 'curricolo_area_generale.doc');
}

function buildHtmlTable(data, rich = false) {
    const header = ['Competenza', 'Titolo', 'Asse culturale', 'Abilità', 'Conoscenze', 'Insegnamenti'];
    const safeData = (data || []).filter(item => item && item.competenzaNumero !== undefined);
    const rows = safeData.map(item => {
        const abilita = (item.abilita || []).join(' • ');
        const conoscenze = (item.conoscenze || []).join(' • ');
        const insegnamenti = getSubjectsForAxis(item.asse).join(' • ');
        return [
            `Competenza ${item.competenzaNumero}`,
            escapeHTML(item.competenzaTitolo),
            escapeHTML(item.asse),
            escapeHTML(abilita),
            escapeHTML(conoscenze),
            escapeHTML(insegnamenti)
        ];
    });

    const colPerc = ['10%', '28%', '14%', '18%', '18%', '12%'];
    const thBase = 'text-align:left;border:1px solid #ddd;padding:6px;background:#f3f4f6';
    const thead = `<thead><tr>${header.map((h, i) => `<th style=\"${thBase};width:${colPerc[i]}\">${h}</th>`).join('')}</tr></thead>`;
    const tdBase = 'border:1px solid #ddd;padding:6px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere;white-space:normal;page-break-inside:avoid';
    const tbody = `<tbody>${rows.map(row => `<tr style=\"page-break-inside:avoid\">${row.map((cell, i) => `<td style=\"${tdBase};width:${colPerc[i]}\">${cell}</td>`).join('')}</tr>`).join('')}</tbody>`;
    const fontSize = rich ? '11px' : '12px';
    const tableAttrs = rich ? ` style=\"width:95%;margin:0 auto;table-layout:fixed;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:${fontSize}\"` : '';
    return `<table${tableAttrs}>${thead}${tbody}</table>`;
}

function buildWordDocument(data) {
    const style = `
        <style>
            body { font-family: "Times New Roman", serif; font-size: 12pt; color: #000; }
            .word-heading { text-align: center; font-size: 11pt; margin: 0 0 4pt 0; }
            .word-title { text-align: center; font-size: 14pt; font-weight: 600; margin: 0 0 12pt 0; }
            .word-table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
            .word-table td { border: 1px solid #bfbfbf; padding: 6pt; vertical-align: top; }
            .word-table .header-cell { text-align: center; font-weight: 700; background: #f2f2f2; }
            .word-table .label-cell { width: 32%; font-weight: 600; }
            .word-section-title { text-align: center; font-weight: 700; margin: 0; }
            .word-list { margin: 0; padding-left: 16pt; }
            .word-list li { margin-bottom: 3pt; }
            .word-blank { margin: 4pt 0; }
            .word-footer { margin-top: 32pt; font-size: 12pt; }
        </style>
    `;
    const discipline = filters.insegnamento ? escapeHTML(filters.insegnamento) : '_____________';
    const sections = [];
    sections.push(style);
    sections.push(buildWordHeading());
    sections.push(`<p class="word-title">PIANO DI LAVORO DI ${discipline}</p>`);
    sections.push(renderGeneralInfoTable());
    sections.push(renderMethodologySection());

    const grouped = groupCompetencesForWord(data);
    grouped.forEach(group => sections.push(renderCompetenceBlock(group)));

    sections.push(renderWordFooter());
    return sections.join('');
}

function buildWordHeading() {
    const lines = [
        'IIS Meucci - Mattei Cagliari, Sede Decimomannu',
        'Competenze di indirizzo, ai sensi del Decreto del Ministro dell’istruzione, dell’università e della ricerca 24 maggio 2018, n. 92, Allegato C'
    ];
    return lines.map(line => `<p class="word-heading">${line}</p>`).join('');
}

function renderGeneralInfoTable() {
    const placeholder = '_____________';
    const discipline = filters.insegnamento ? escapeHTML(filters.insegnamento) : placeholder;
    const rows = [
        { label: 'DOCENTE', value: placeholder },
        { label: 'DISCIPLINA', value: discipline },
        { label: 'CLASSE/SEZIONE', value: placeholder },
        { label: 'ANNO SCOLASTICO', value: placeholder },
        { label: 'ORE SETTIMANALI _____________', value: placeholder },
        { label: 'ORE SETTIMANALI _____________', value: placeholder }
    ];

    const header = `
        <tr>
            <td class="header-cell" colspan="2">INFORMAZIONI GENERALI</td>
        </tr>
    `;
    const body = rows.map(row => `
        <tr>
            <td class="label-cell">${row.label}</td>
            <td>${row.value || placeholder}</td>
        </tr>
    `).join('');
    return `<table class="word-table">${header}${body}</table>`;
}

function renderMethodologySection() {
    const rows = [
        { title: 'METODOLOGIA', content: [], placeholders: 0 },
        { title: 'Attività', content: [], placeholders: 4 },
        { title: 'Strumenti', content: [], placeholders: 6 },
        { title: 'Verifiche', content: [], placeholders: 3 },
        { title: 'Criteri e modalità di valutazione', content: [], placeholders: 6 },
        {
            title: 'Attività di recupero in itinere',
            content: [
                'Ogni qualvolta si rendesse necessario, si provvederà al recupero delle conoscenze pregresse (es. morfologia, sintassi, ecc.)'
            ],
            placeholders: 0
        }
    ];

    const htmlRows = rows.map((row, index) => {
        const isHeader = index === 0;
        if (isHeader) {
            return `<tr><td class="header-cell">${row.title}</td></tr>`;
        }
        if (!row.content.length) {
            const placeholders = renderListOrPlaceholder([], row.placeholders || 1);
            return `
                <tr>
                    <td>
                        <p class="word-section-title">${row.title}</p>
                        ${placeholders}
                    </td>
                </tr>
            `;
        }
        const list = `<ul class="word-list">${row.content.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
        return `
            <tr>
                <td>
                    <p class="word-section-title">${row.title}</p>
                    ${list}
                </td>
            </tr>
        `;
    }).join('');

    return `<table class="word-table">${htmlRows}</table>`;
}

function groupCompetencesForWord(data) {
    const map = new Map();
    data.forEach(entry => {
        if (!entry || entry.competenzaNumero === undefined) {
            return;
        }
        const key = entry.competenzaNumero;
        const record = map.get(key) || {
            numero: entry.competenzaNumero,
            titolo: entry.competenzaTitolo || '',
            axes: new Map()
        };

        const axisKey = entry.asse || 'Asse non specificato';
        const axis = record.axes.get(axisKey) || {
            asse: axisKey,
            abilita: new Set(),
            conoscenze: new Set(),
            insegnamenti: new Set(getSubjectsForAxis(axisKey))
        };

        (entry.abilita || []).forEach(abilita => axis.abilita.add(abilita));
        (entry.conoscenze || []).forEach(conoscenza => axis.conoscenze.add(conoscenza));
        record.axes.set(axisKey, axis);
        map.set(key, record);
    });

    return Array.from(map.values())
        .sort((a, b) => a.numero - b.numero)
        .map(record => ({
            numero: record.numero,
            titolo: record.titolo,
            axes: Array.from(record.axes.values()).map(axis => ({
                asse: axis.asse,
                abilita: Array.from(axis.abilita),
                conoscenze: Array.from(axis.conoscenze),
                insegnamenti: Array.from(axis.insegnamenti)
            }))
        }));
}

function renderCompetenceBlock(group) {
    const competenceTable = renderSimpleTable('COMPETENZE', [
        `Competenza ${group.numero}: ${escapeHTML(group.titolo)}`
    ]);
    const axesHtml = group.axes.length
        ? group.axes.map(renderAxisTable).join('')
        : renderSimpleTable('Assi culturali', []);
    return `${competenceTable}${axesHtml}`;
}

function renderAxisTable(axis) {
    const subjectsBlock = axis.insegnamenti.length
        ? `<p class="word-section-title">Insegnamenti</p>${renderListOrPlaceholder(axis.insegnamenti, 2)}`
        : '';
    return `
        <table class="word-table">
            <tr><td class="header-cell">${escapeHTML(axis.asse)}</td></tr>
            <tr>
                <td>
                    ${subjectsBlock}
                    <p class="word-section-title">Abilità</p>
                    ${renderListOrPlaceholder(axis.abilita)}
                    <p class="word-section-title">Conoscenze</p>
                    ${renderListOrPlaceholder(axis.conoscenze)}
                </td>
            </tr>
        </table>
    `;
}

function renderSimpleTable(title, lines) {
    const header = `<tr><td class="header-cell">${title}</td></tr>`;
    const bodyContent = renderListOrPlaceholder(lines);
    const body = `<tr><td>${bodyContent}</td></tr>`;
    return `<table class="word-table">${header}${body}</table>`;
}

function renderListOrPlaceholder(items, minLines = 3) {
    if (items && items.length) {
        return `<ul class="word-list">${items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
    }
    return Array.from({ length: minLines }, () => '<p class="word-blank">_____________</p>').join('');
}

function renderWordFooter() {
    return `
        <p class="word-footer">
            Cagliari, __/__/____&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Il/La docente
        </p>
    `;
}

function buildExportHeader(rich = false) {
    const title = document.querySelector('.header h1')?.textContent?.trim() || '';
    const subline = document.querySelector('.header .subline')?.textContent?.trim() || '';
    const subtitle = document.querySelector('.header .subtitle')?.textContent?.trim() || '';
    const description = document.getElementById('intro-description')?.textContent?.trim() || '';
    const style = rich
        ? '<style>h1{margin:0 0 4px 0;font-size:18px} .exp-subline{margin:0 0 2px 0;font-size:12px;color:#374151;font-weight:600} .exp-subtitle{margin:0 0 6px 0;font-size:11px;color:#6b7280;font-style:italic} .exp-description{margin:0 0 12px 0;font-size:11px;color:#4b5563}</style>'
        : '';
    const titleHtml = title ? `<h1>${escapeHTML(title)}</h1>` : '';
    const sublineHtml = subline ? `<div class="exp-subline">${escapeHTML(subline)}</div>` : '';
    const subtitleHtml = subtitle ? `<div class="exp-subtitle">${escapeHTML(subtitle)}</div>` : '';
    const descriptionHtml = description ? `<div class="exp-description">${escapeHTML(description)}</div>` : '';
    return `${style}${titleHtml}${sublineHtml}${subtitleHtml}${descriptionHtml}`;
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

function getSubjectsForAxis(axisName) {
    if (!axisName) {
        return [];
    }
    const exact = AXIS_SUBJECTS[axisName];
    if (exact) {
        return Array.from(new Set(exact));
    }
    const key = Object.keys(AXIS_SUBJECTS).find(entry => entry.toLowerCase() === axisName.toLowerCase());
    return key ? Array.from(new Set(AXIS_SUBJECTS[key])) : [];
}

function collectSubjects() {
    const set = new Set();
    normalizedData.forEach(entry => {
        getSubjectsForAxis(entry.asse).forEach(subject => set.add(subject));
    });
    return set;
}

function showLoading(show) {
    document.getElementById('generale-loading').classList.toggle('hidden', !show);
}

function toggleEmptyState(show) {
    document.getElementById('generale-empty').classList.toggle('hidden', !show);
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

function shorten(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
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
