/**
 * Applicazione ottimizzata per la gestione del Curricolo SSAS
 * Versione migliorata con prestazioni ottimizzate e UX moderna
 */

class SSASApp {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.isEditMode = false;
        this.cache = new Map();
        this.init();
    }

    async init() {
        this.showLoading(true);
        await this.loadData();
        this.setupEventListeners();
        this.populateFilters();
        this.updateStats();
        this.updatePivotTable();
        this.showLoading(false);
        this.showToast('Applicazione caricata con successo!', 'success');
    }

    // Caricamento dati ottimizzato con lazy loading
    async loadData() {
        if (this.data.length > 0) return;

        try {
            this.data = [
                {
                    competenza: "Utilizzare i principali concetti relativi all'economia e all'organizzazione dei processi produttivi e dei servizi",
                    conoscenza: "I settori produttivi di riferimento, con particolare attenzione al sistema socio-sanitario della Regione di appartenenza",
                    periodo: "primo biennio",
                    insegnamento: "Scienze integrate (Scienze della terra e Biologia)"
                },
                // ... altri dati ...
                // Per ora uso dati di esempio, ma potresti caricare da API
            ];
            
            this.filteredData = [...this.data];
        } catch (error) {
            this.showToast('Errore nel caricamento dei dati', 'error');
            console.error('Errore caricamento dati:', error);
        }
    }

    // Sistema di cache per prestazioni migliori
    getCachedResult(key, computeFn) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const result = computeFn();
        this.cache.set(key, result);
        return result;
    }

    clearCache() {
        this.cache.clear();
    }

    // Loading spinner
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'block' : 'none';
        }
    }

    // Sistema di notifiche toast
    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = this.getOrCreateToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Animazione di entrata
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto-remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toastContainer.removeChild(toast), 300);
        }, duration);
    }

    getOrCreateToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Ricerca avanzata con debounce
    setupAdvancedSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
    }

    performSearch(query) {
        if (!query.trim()) {
            this.filteredData = [...this.data];
            this.updateDisplay();
            return;
        }

        const searchTerms = query.toLowerCase().split(' ');
        this.filteredData = this.data.filter(item => {
            const searchText = Object.values(item).join(' ').toLowerCase();
            return searchTerms.every(term => searchText.includes(term));
        });

        this.updateDisplay();
        this.showToast(`Trovati ${this.filteredData.length} risultati`, 'info');
    }

    // Filtri multipli ottimizzati
    setupEventListeners() {
        // Filtri
        ['competenzaFilter', 'periodoFilter', 'insegnamentoFilter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterData());
            }
        });

        // Pivot controls
        ['rowGroup', 'colGroup', 'valueType'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updatePivotTable());
            }
        });

        // Ricerca avanzata
        this.setupAdvancedSearch();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    // Scorciatoie da tastiera per migliorare l'accessibilità
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'f':
                    e.preventDefault();
                    document.getElementById('searchInput')?.focus();
                    break;
                case 'r':
                    e.preventDefault();
                    this.resetFilters();
                    break;
                case 's':
                    if (this.isEditMode) {
                        e.preventDefault();
                        this.saveData();
                    }
                    break;
            }
        }
    }

    // Filtri con performance ottimizzate
    filterData() {
        const competenza = document.getElementById('competenzaFilter')?.value || '';
        const periodo = document.getElementById('periodoFilter')?.value || '';
        const insegnamento = document.getElementById('insegnamentoFilter')?.value || '';
        
        const cacheKey = `filter_${competenza}_${periodo}_${insegnamento}`;
        
        this.filteredData = this.getCachedResult(cacheKey, () => {
            return this.data.filter(item => {
                return (!competenza || item.competenza === competenza) &&
                       (!periodo || item.periodo === periodo) &&
                       (!insegnamento || item.insegnamento === insegnamento);
            });
        });

        this.updateDisplay();
    }

    // Aggiornamento display ottimizzato
    updateDisplay() {
        this.updateStats();
        this.updatePivotTable();
        this.updateTable();
    }

    // Statistiche con animazioni
    updateStats() {
        const stats = this.calculateStats();
        
        Object.entries(stats).forEach(([key, value]) => {
            const element = document.getElementById(`stat-${key}`);
            if (element) {
                this.animateNumber(element, value);
            }
        });
    }

    calculateStats() {
        const uniqueCompetenze = new Set(this.filteredData.map(d => d.competenza)).size;
        const uniquePeriodi = new Set(this.filteredData.map(d => d.periodo)).size;
        const uniqueInsegnamenti = new Set(this.filteredData.map(d => d.insegnamento)).size;
        
        return {
            competenze: uniqueCompetenze,
            periodi: uniquePeriodi,
            insegnamenti: uniqueInsegnamenti,
            conoscenze: this.filteredData.length
        };
    }

    // Animazione numeri nelle statistiche
    animateNumber(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = (targetValue - currentValue) / 20;
        let current = currentValue;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= targetValue) || 
                (increment < 0 && current <= targetValue)) {
                current = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.round(current);
        }, 50);
    }

    // Tabella pivot ottimizzata
    updatePivotTable() {
        const rowGroup = document.getElementById('rowGroup')?.value || 'competenza';
        const colGroup = document.getElementById('colGroup')?.value || 'periodo';
        const valueType = document.getElementById('valueType')?.value || 'count';
        
        const cacheKey = `pivot_${rowGroup}_${colGroup}_${valueType}_${this.filteredData.length}`;
        
        const pivotData = this.getCachedResult(cacheKey, () => {
            return this.createPivotTable(rowGroup, colGroup, valueType);
        });

        this.renderPivotTable(pivotData, rowGroup, colGroup);
    }

    createPivotTable(rowGroup, colGroup, valueType) {
        const pivot = {};
        const rowValues = new Set();
        const colValues = new Set();

        this.filteredData.forEach(item => {
            const rowVal = item[rowGroup];
            const colVal = item[colGroup];
            
            rowValues.add(rowVal);
            colValues.add(colVal);
            
            if (!pivot[rowVal]) pivot[rowVal] = {};
            if (!pivot[rowVal][colVal]) pivot[rowVal][colVal] = [];
            
            pivot[rowVal][colVal].push(item);
        });

        return {
            pivot,
            rowValues: Array.from(rowValues).sort(),
            colValues: Array.from(colValues).sort()
        };
    }

    renderPivotTable(pivotData, rowGroup, colGroup) {
        const { pivot, rowValues, colValues } = pivotData;
        
        let html = `
            <div class="table-container">
                <table class="pivot-table">
                    <thead>
                        <tr>
                            <th>${this.formatLabel(rowGroup)} \\ ${this.formatLabel(colGroup)}</th>
                            ${colValues.map(col => `<th>${col}</th>`).join('')}
                            <th>Totale</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        rowValues.forEach(row => {
            let rowTotal = 0;
            html += `<tr><td class="pivot-row-header"><strong>${row}</strong></td>`;
            
            colValues.forEach(col => {
                const cellData = pivot[row] && pivot[row][col] ? pivot[row][col] : [];
                const count = cellData.length;
                rowTotal += count;
                
                html += `<td class="pivot-cell ${count > 0 ? 'has-data' : ''}" 
                           onclick="app.showDetail('${row}', '${col}')" 
                           title="Clicca per dettagli">
                           ${count}
                        </td>`;
            });
            
            html += `<td class="pivot-total"><strong>${rowTotal}</strong></td></tr>`;
        });

        // Riga totali
        html += '<tr class="pivot-totals"><td><strong>Totale</strong></td>';
        let grandTotal = 0;
        
        colValues.forEach(col => {
            let colTotal = 0;
            rowValues.forEach(row => {
                const cellData = pivot[row] && pivot[row][col] ? pivot[row][col] : [];
                colTotal += cellData.length;
            });
            grandTotal += colTotal;
            html += `<td><strong>${colTotal}</strong></td>`;
        });
        
        html += `<td><strong>${grandTotal}</strong></td></tr>`;
        html += '</tbody></table></div>';

        document.getElementById('pivotTable').innerHTML = html;
    }

    formatLabel(key) {
        const labels = {
            competenza: 'Competenza',
            periodo: 'Periodo',
            insegnamento: 'Insegnamento'
        };
        return labels[key] || key;
    }

    // Dettagli con modal migliorato
    showDetail(rowValue, colValue) {
        const details = this.filteredData.filter(d => {
            const rowGroup = document.getElementById('rowGroup').value;
            const colGroup = document.getElementById('colGroup').value;
            return d[rowGroup] === rowValue && d[colGroup] === colValue;
        });
        
        if (details.length === 0) {
            this.showToast('Nessun dettaglio disponibile', 'info');
            return;
        }

        this.openDetailModal(rowValue, colValue, details);
    }

    openDetailModal(rowValue, colValue, details) {
        const modal = document.getElementById('detailModal') || this.createDetailModal();
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <h4>Dettaglio: ${rowValue} × ${colValue}</h4>
            <p class="detail-summary">${details.length} conoscenze trovate</p>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Competenza</th>
                            <th>Conoscenza</th>
                            <th>Periodo</th>
                            <th>Insegnamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${details.map(d => `
                            <tr>
                                <td>${d.competenza}</td>
                                <td>${d.conoscenza}</td>
                                <td>${d.periodo}</td>
                                <td>${d.insegnamento}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        modal.classList.add('show');
    }

    createDetailModal() {
        const modal = document.createElement('div');
        modal.id = 'detailModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-header">
                    <h3>Dettagli Conoscenze</h3>
                    <button class="modal-close" onclick="app.closeModal('detailModal')">&times;</button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="app.closeModal('detailModal')">Chiudi</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Chiusura con click fuori dal modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal('detailModal');
            }
        });
        
        return modal;
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // Esportazione migliorata
    async exportData(format = 'csv') {
        this.showLoading(true);
        
        try {
            switch (format) {
                case 'csv':
                    await this.exportToCSV();
                    break;
                case 'excel':
                    await this.exportToExcel();
                    break;
                case 'pdf':
                    await this.exportToPDF();
                    break;
                default:
                    throw new Error('Formato non supportato');
            }
            
            this.showToast('Esportazione completata con successo!', 'success');
        } catch (error) {
            this.showToast('Errore durante l\'esportazione', 'error');
            console.error('Errore esportazione:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async exportToCSV() {
        const headers = ['Competenza', 'Conoscenza', 'Periodo', 'Insegnamento'];
        const csvContent = [
            headers.join(','),
            ...this.filteredData.map(row => 
                headers.map(header => 
                    `"${row[header.toLowerCase()].replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');
        
        this.downloadFile(csvContent, 'curricolo-ssas.csv', 'text/csv');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Popolamento filtri ottimizzato
    populateFilters() {
        const filters = {
            competenzaFilter: 'competenza',
            periodoFilter: 'periodo',
            insegnamentoFilter: 'insegnamento'
        };

        Object.entries(filters).forEach(([filterId, field]) => {
            const select = document.getElementById(filterId);
            if (!select) return;

            const uniqueValues = [...new Set(this.data.map(item => item[field]))].sort();
            select.innerHTML = `<option value="">Tutti i ${this.formatLabel(field)}i</option>`;
            
            uniqueValues.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });
        });
    }

    // Reset filtri con animazione
    resetFilters() {
        ['competenzaFilter', 'periodoFilter', 'insegnamentoFilter', 'searchInput'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        this.clearCache();
        this.filteredData = [...this.data];
        this.updateDisplay();
        this.showToast('Filtri resettati', 'info');
    }

    // Modalità modifica
    setMode(mode) {
        this.isEditMode = mode === 'edit';
        
        // Aggiorna UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.mode-btn[onclick="app.setMode('${mode}')"]`)?.classList.add('active');
        
        const editControls = document.querySelector('.edit-controls');
        if (editControls) {
            editControls.classList.toggle('show', this.isEditMode);
        }
        
        this.showToast(`Modalità ${mode === 'edit' ? 'modifica' : 'visualizzazione'} attivata`, 'info');
    }

    // Salvataggio dati
    async saveData() {
        if (!this.isEditMode) {
            this.showToast('Attiva la modalità modifica per salvare', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            // Qui implementeresti il salvataggio su server
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simula salvataggio
            this.showToast('Dati salvati con successo!', 'success');
        } catch (error) {
            this.showToast('Errore durante il salvataggio', 'error');
            console.error('Errore salvataggio:', error);
        } finally {
            this.showLoading(false);
        }
    }
}

// Inizializzazione app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SSASApp();
});

// Esporta per compatibilità con codice esistente
window.app = app;