/**
 * Modulo per ricerca avanzata e filtri intelligenti
 */

class AdvancedSearch {
    constructor(app) {
        this.app = app;
        this.searchHistory = [];
        this.suggestions = [];
        this.searchIndex = new Map();
        this.init();
    }

    init() {
        this.buildSearchIndex();
        this.setupAutoComplete();
        this.setupSmartFilters();
        this.setupSearchHistory();
    }

    // Costruisce un indice di ricerca per prestazioni migliori
    buildSearchIndex() {
        this.searchIndex.clear();
        
        this.app.data.forEach((item, index) => {
            const searchableText = Object.values(item).join(' ').toLowerCase();
            const words = searchableText.split(/\s+/);
            
            words.forEach(word => {
                if (word.length > 2) { // Ignora parole troppo corte
                    if (!this.searchIndex.has(word)) {
                        this.searchIndex.set(word, new Set());
                    }
                    this.searchIndex.get(word).add(index);
                }
            });
        });
    }

    // Ricerca con suggerimenti automatici
    setupAutoComplete() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const suggestionsContainer = this.createSuggestionsContainer();
        
        searchInput.addEventListener('input', this.app.performanceUtils.debounce((e) => {
            const query = e.target.value;
            if (query.length > 1) {
                this.showSuggestions(query, suggestionsContainer);
            } else {
                this.hideSuggestions(suggestionsContainer);
            }
        }, 200));

        searchInput.addEventListener('keydown', (e) => {
            this.handleSuggestionNavigation(e, suggestionsContainer);
        });

        // Nascondi suggerimenti quando si clicca fuori
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSuggestions(suggestionsContainer);
            }
        });
    }

    createSuggestionsContainer() {
        const container = document.createElement('div');
        container.className = 'search-suggestions';
        container.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;
        
        const searchBox = document.querySelector('.search-box');
        searchBox.style.position = 'relative';
        searchBox.appendChild(container);
        
        return container;
    }

    showSuggestions(query, container) {
        const suggestions = this.generateSuggestions(query);
        
        if (suggestions.length === 0) {
            this.hideSuggestions(container);
            return;
        }

        container.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-index="${index}" role="option">
                <span class="suggestion-text">${this.highlightMatch(suggestion, query)}</span>
                <span class="suggestion-type">${this.getSuggestionType(suggestion)}</span>
            </div>
        `).join('');

        container.style.display = 'block';
        
        // Aggiungi event listeners per i suggerimenti
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectSuggestion(item.querySelector('.suggestion-text').textContent);
                this.hideSuggestions(container);
            });
        });
    }

    generateSuggestions(query) {
        const queryLower = query.toLowerCase();
        const suggestions = new Set();
        
        // Cerca nelle competenze
        this.app.data.forEach(item => {
            if (item.competenza.toLowerCase().includes(queryLower)) {
                suggestions.add(item.competenza);
            }
            if (item.conoscenza.toLowerCase().includes(queryLower)) {
                suggestions.add(item.conoscenza);
            }
            if (item.insegnamento.toLowerCase().includes(queryLower)) {
                suggestions.add(item.insegnamento);
            }
        });

        return Array.from(suggestions).slice(0, 8); // Limita a 8 suggerimenti
    }

    highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    getSuggestionType(suggestion) {
        // Determina il tipo di suggerimento
        const item = this.app.data.find(d => 
            d.competenza === suggestion || 
            d.conoscenza === suggestion || 
            d.insegnamento === suggestion
        );
        
        if (!item) return '';
        
        if (item.competenza === suggestion) return 'Competenza';
        if (item.conoscenza === suggestion) return 'Conoscenza';
        if (item.insegnamento === suggestion) return 'Insegnamento';
        return '';
    }

    selectSuggestion(suggestion) {
        const searchInput = document.getElementById('searchInput');
        searchInput.value = suggestion;
        this.app.performSearch(suggestion);
        this.addToHistory(suggestion);
    }

    hideSuggestions(container) {
        container.style.display = 'none';
    }

    handleSuggestionNavigation(e, container) {
        const suggestions = container.querySelectorAll('.suggestion-item');
        const currentActive = container.querySelector('.suggestion-item.active');
        let activeIndex = currentActive ? parseInt(currentActive.dataset.index) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = (activeIndex + 1) % suggestions.length;
                this.updateActiveSuggestion(suggestions, activeIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1;
                this.updateActiveSuggestion(suggestions, activeIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (currentActive) {
                    this.selectSuggestion(currentActive.querySelector('.suggestion-text').textContent);
                    this.hideSuggestions(container);
                }
                break;
            case 'Escape':
                this.hideSuggestions(container);
                break;
        }
    }

    updateActiveSuggestion(suggestions, activeIndex) {
        suggestions.forEach((item, index) => {
            item.classList.toggle('active', index === activeIndex);
        });
    }

    // Filtri intelligenti con memoria
    setupSmartFilters() {
        this.filterPresets = new Map();
        this.createFilterPresets();
        this.setupFilterCombinations();
    }

    createFilterPresets() {
        const presetsContainer = document.createElement('div');
        presetsContainer.className = 'filter-presets';
        presetsContainer.innerHTML = `
            <h4>Filtri Rapidi</h4>
            <div class="preset-buttons">
                <button class="preset-btn" data-preset="primo-biennio">Primo Biennio</button>
                <button class="preset-btn" data-preset="secondo-biennio">Secondo Biennio</button>
                <button class="preset-btn" data-preset="quinto-anno">Quinto Anno</button>
                <button class="preset-btn" data-preset="scienze">Scienze</button>
                <button class="preset-btn" data-preset="psicologia">Psicologia</button>
            </div>
        `;

        const controlsSection = document.querySelector('.controls');
        controlsSection.appendChild(presetsContainer);

        // Definisci i preset
        this.filterPresets.set('primo-biennio', { periodo: 'primo biennio' });
        this.filterPresets.set('secondo-biennio', { periodo: 'secondo biennio' });
        this.filterPresets.set('quinto-anno', { periodo: 'quinto anno' });
        this.filterPresets.set('scienze', { insegnamento: 'Scienze integrate (Scienze della terra e Biologia)' });
        this.filterPresets.set('psicologia', { insegnamento: 'Psicologia generale ed applicata' });

        // Aggiungi event listeners
        presetsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('preset-btn')) {
                this.applyFilterPreset(e.target.dataset.preset);
            }
        });
    }

    applyFilterPreset(presetName) {
        const preset = this.filterPresets.get(presetName);
        if (!preset) return;

        // Applica i filtri del preset
        Object.entries(preset).forEach(([field, value]) => {
            const filterId = field + 'Filter';
            const filterElement = document.getElementById(filterId);
            if (filterElement) {
                filterElement.value = value;
            }
        });

        this.app.filterData();
        this.app.accessibilityUtils.announce(`Filtro rapido applicato: ${presetName}`);
    }

    setupFilterCombinations() {
        // Salva e ripristina combinazioni di filtri
        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-secondary';
        saveButton.innerHTML = '💾 Salva Filtri';
        saveButton.onclick = () => this.saveCurrentFilters();

        const loadButton = document.createElement('button');
        loadButton.className = 'btn btn-secondary';
        loadButton.innerHTML = '📂 Carica Filtri';
        loadButton.onclick = () => this.showSavedFilters();

        const controlGroup = document.querySelector('.control-group');
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'filter-actions';
        buttonContainer.appendChild(saveButton);
        buttonContainer.appendChild(loadButton);
        controlGroup.appendChild(buttonContainer);
    }

    saveCurrentFilters() {
        const filters = {
            competenza: document.getElementById('competenzaFilter')?.value || '',
            periodo: document.getElementById('periodoFilter')?.value || '',
            insegnamento: document.getElementById('insegnamentoFilter')?.value || '',
            search: document.getElementById('searchInput')?.value || ''
        };

        const name = prompt('Nome per questa combinazione di filtri:');
        if (name) {
            const savedFilters = JSON.parse(localStorage.getItem('ssas-saved-filters') || '{}');
            savedFilters[name] = filters;
            localStorage.setItem('ssas-saved-filters', JSON.stringify(savedFilters));
            this.app.showToast(`Filtri salvati come: ${name}`, 'success');
        }
    }

    showSavedFilters() {
        const savedFilters = JSON.parse(localStorage.getItem('ssas-saved-filters') || '{}');
        const names = Object.keys(savedFilters);

        if (names.length === 0) {
            this.app.showToast('Nessun filtro salvato', 'info');
            return;
        }

        const modal = this.createSavedFiltersModal(savedFilters);
        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    createSavedFiltersModal(savedFilters) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>Filtri Salvati</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="saved-filters-list">
                        ${Object.entries(savedFilters).map(([name, filters]) => `
                            <div class="saved-filter-item">
                                <h4>${name}</h4>
                                <p>${this.formatFilterSummary(filters)}</p>
                                <button class="btn btn-primary" onclick="advancedSearch.loadSavedFilter('${name}')">
                                    Carica
                                </button>
                                <button class="btn btn-danger" onclick="advancedSearch.deleteSavedFilter('${name}')">
                                    Elimina
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    formatFilterSummary(filters) {
        const parts = [];
        if (filters.competenza) parts.push(`Competenza: ${filters.competenza}`);
        if (filters.periodo) parts.push(`Periodo: ${filters.periodo}`);
        if (filters.insegnamento) parts.push(`Insegnamento: ${filters.insegnamento}`);
        if (filters.search) parts.push(`Ricerca: ${filters.search}`);
        return parts.length > 0 ? parts.join(', ') : 'Nessun filtro attivo';
    }

    loadSavedFilter(name) {
        const savedFilters = JSON.parse(localStorage.getItem('ssas-saved-filters') || '{}');
        const filters = savedFilters[name];
        
        if (!filters) return;

        // Applica i filtri
        if (filters.competenza) document.getElementById('competenzaFilter').value = filters.competenza;
        if (filters.periodo) document.getElementById('periodoFilter').value = filters.periodo;
        if (filters.insegnamento) document.getElementById('insegnamentoFilter').value = filters.insegnamento;
        if (filters.search) document.getElementById('searchInput').value = filters.search;

        this.app.filterData();
        this.app.performSearch(filters.search || '');
        
        // Chiudi modal
        document.querySelector('.modal.show')?.remove();
        this.app.showToast(`Filtri caricati: ${name}`, 'success');
    }

    deleteSavedFilter(name) {
        if (confirm(`Eliminare il filtro "${name}"?`)) {
            const savedFilters = JSON.parse(localStorage.getItem('ssas-saved-filters') || '{}');
            delete savedFilters[name];
            localStorage.setItem('ssas-saved-filters', JSON.stringify(savedFilters));
            
            // Ricarica la lista
            document.querySelector('.modal.show')?.remove();
            this.showSavedFilters();
            this.app.showToast(`Filtro eliminato: ${name}`, 'success');
        }
    }

    // Cronologia di ricerca
    setupSearchHistory() {
        this.loadSearchHistory();
        this.createSearchHistoryUI();
    }

    addToHistory(query) {
        if (!query || query.length < 2) return;
        
        // Rimuovi duplicati e aggiungi in testa
        this.searchHistory = this.searchHistory.filter(h => h !== query);
        this.searchHistory.unshift(query);
        
        // Mantieni solo gli ultimi 10
        this.searchHistory = this.searchHistory.slice(0, 10);
        
        this.saveSearchHistory();
        this.updateSearchHistoryUI();
    }

    loadSearchHistory() {
        this.searchHistory = JSON.parse(localStorage.getItem('ssas-search-history') || '[]');
    }

    saveSearchHistory() {
        localStorage.setItem('ssas-search-history', JSON.stringify(this.searchHistory));
    }

    createSearchHistoryUI() {
        const historyButton = document.createElement('button');
        historyButton.className = 'search-history-btn';
        historyButton.innerHTML = '📜';
        historyButton.title = 'Cronologia ricerche';
        historyButton.style.cssText = `
            position: absolute;
            right: 50px;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: none;
            font-size: 18px;
            cursor: pointer;
            padding: 5px;
        `;

        const searchBox = document.querySelector('.search-box');
        searchBox.appendChild(historyButton);

        historyButton.addEventListener('click', () => this.showSearchHistory());
    }

    showSearchHistory() {
        if (this.searchHistory.length === 0) {
            this.app.showToast('Cronologia ricerche vuota', 'info');
            return;
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'search-history-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            min-width: 200px;
            z-index: 1000;
        `;

        dropdown.innerHTML = `
            <div class="dropdown-header">Ricerche recenti</div>
            ${this.searchHistory.map(query => `
                <div class="history-item" data-query="${query}">
                    <span>${query}</span>
                    <button class="remove-history" data-query="${query}">&times;</button>
                </div>
            `).join('')}
            <div class="dropdown-footer">
                <button class="clear-history">Cancella cronologia</button>
            </div>
        `;

        const searchBox = document.querySelector('.search-box');
        searchBox.appendChild(dropdown);

        // Event listeners
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-item') || e.target.closest('.history-item')) {
                const query = e.target.dataset.query || e.target.closest('.history-item').dataset.query;
                document.getElementById('searchInput').value = query;
                this.app.performSearch(query);
                dropdown.remove();
            } else if (e.target.classList.contains('remove-history')) {
                this.removeFromHistory(e.target.dataset.query);
                dropdown.remove();
            } else if (e.target.classList.contains('clear-history')) {
                this.clearSearchHistory();
                dropdown.remove();
            }
        });

        // Rimuovi dropdown quando si clicca fuori
        setTimeout(() => {
            document.addEventListener('click', function handler(e) {
                if (!e.target.closest('.search-box')) {
                    dropdown.remove();
                    document.removeEventListener('click', handler);
                }
            });
        }, 100);
    }

    removeFromHistory(query) {
        this.searchHistory = this.searchHistory.filter(h => h !== query);
        this.saveSearchHistory();
    }

    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        this.app.showToast('Cronologia ricerche cancellata', 'info');
    }
}

// Esporta per uso globale
window.AdvancedSearch = AdvancedSearch;