/**
 * Utilità per migliorare l'accessibilità e l'usabilità
 */

class AccessibilityUtils {
    constructor() {
        this.init();
    }

    init() {
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.setupFocusManagement();
        this.setupHighContrastMode();
    }

    // Navigazione da tastiera migliorata
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Escape per chiudere modal e menu
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeAllDropdowns();
            }

            // Tab per navigazione sequenziale
            if (e.key === 'Tab') {
                this.manageFocusOrder(e);
            }

            // Enter e Space per attivare elementi
            if (e.key === 'Enter' || e.key === ' ') {
                this.handleKeyboardActivation(e);
            }

            // Frecce per navigazione nelle tabelle
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.handleArrowNavigation(e);
            }
        });
    }

    // Supporto per screen reader
    setupScreenReaderSupport() {
        // Annunci dinamici per cambiamenti di contenuto
        this.createLiveRegion();
        
        // Descrizioni per elementi interattivi
        this.addAriaDescriptions();
    }

    createLiveRegion() {
        if (!document.getElementById('liveRegion')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'liveRegion';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            document.body.appendChild(liveRegion);
        }
    }

    announce(message) {
        const liveRegion = document.getElementById('liveRegion');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }

    addAriaDescriptions() {
        // Aggiungi descrizioni aria per elementi interattivi
        const pivotCells = document.querySelectorAll('.pivot-cell');
        pivotCells.forEach(cell => {
            if (!cell.getAttribute('aria-label')) {
                const value = cell.textContent.trim();
                cell.setAttribute('aria-label', `${value} conoscenze, clicca per dettagli`);
            }
        });
    }

    // Gestione del focus
    setupFocusManagement() {
        this.focusStack = [];
        
        // Mantieni il focus visibile
        document.addEventListener('mousedown', () => {
            document.body.classList.add('using-mouse');
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.remove('using-mouse');
            }
        });
    }

    storeFocus() {
        this.focusStack.push(document.activeElement);
    }

    restoreFocus() {
        const lastFocused = this.focusStack.pop();
        if (lastFocused && lastFocused.focus) {
            lastFocused.focus();
        }
    }

    // Modalità alto contrasto
    setupHighContrastMode() {
        // Rileva preferenza sistema per alto contrasto
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.enableHighContrast();
        }

        // Toggle manuale alto contrasto
        this.addContrastToggle();
    }

    enableHighContrast() {
        document.body.classList.add('high-contrast');
    }

    addContrastToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'contrast-toggle';
        toggle.innerHTML = '🎨 Alto Contrasto';
        toggle.setAttribute('aria-label', 'Attiva/disattiva modalità alto contrasto');
        toggle.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 1000;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background: #666;
            color: white;
            font-size: 12px;
            cursor: pointer;
        `;
        
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
            const isActive = document.body.classList.contains('high-contrast');
            this.announce(`Alto contrasto ${isActive ? 'attivato' : 'disattivato'}`);
        });
        
        document.body.appendChild(toggle);
    }

    // Gestione navigazione con frecce
    handleArrowNavigation(e) {
        const target = e.target;
        const table = target.closest('table');
        
        if (table && target.tagName === 'TD') {
            e.preventDefault();
            this.navigateTable(target, e.key, table);
        }
    }

    navigateTable(currentCell, direction, table) {
        const cells = Array.from(table.querySelectorAll('td'));
        const currentIndex = cells.indexOf(currentCell);
        const rows = table.querySelectorAll('tr');
        const cellsPerRow = rows[0]?.querySelectorAll('td, th').length || 0;
        
        let newIndex;
        
        switch (direction) {
            case 'ArrowLeft':
                newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
                break;
            case 'ArrowRight':
                newIndex = currentIndex < cells.length - 1 ? currentIndex + 1 : currentIndex;
                break;
            case 'ArrowUp':
                newIndex = currentIndex - cellsPerRow;
                break;
            case 'ArrowDown':
                newIndex = currentIndex + cellsPerRow;
                break;
        }
        
        if (newIndex >= 0 && newIndex < cells.length && cells[newIndex]) {
            cells[newIndex].focus();
            cells[newIndex].setAttribute('tabindex', '0');
            currentCell.setAttribute('tabindex', '-1');
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    closeAllDropdowns() {
        document.querySelectorAll('.dropdown.open').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }

    handleKeyboardActivation(e) {
        const target = e.target;
        
        if (target.classList.contains('pivot-cell')) {
            e.preventDefault();
            target.click();
        }
    }
}

/**
 * Utilità per migliorare le prestazioni
 */
class PerformanceUtils {
    constructor() {
        this.observers = [];
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupPerformanceMonitoring();
        this.optimizeImages();
    }

    // Lazy loading per elementi pesanti
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadElement(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px'
        });

        // Osserva elementi da caricare in lazy
        document.querySelectorAll('[data-lazy]').forEach(el => {
            observer.observe(el);
        });

        this.observers.push(observer);
    }

    loadElement(element) {
        const src = element.dataset.lazy;
        if (src) {
            element.src = src;
            element.removeAttribute('data-lazy');
        }
    }

    // Monitoraggio prestazioni
    setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            // Monitor paint metrics
            const paintObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    console.log(`${entry.name}: ${entry.startTime}ms`);
                });
            });
            paintObserver.observe({ entryTypes: ['paint'] });

            // Monitor layout shifts
            const clsObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    if (entry.value > 0.1) {
                        console.warn('Layout shift detected:', entry.value);
                    }
                });
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        }
    }

    // Ottimizzazione immagini
    optimizeImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // Aggiungi loading lazy per immagini
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            
            // Decoding asincrono per immagini
            img.setAttribute('decoding', 'async');
        });
    }

    // Debounce utility
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle utility
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

/**
 * Gestione errori centralizzata
 */
class ErrorHandler {
    constructor() {
        this.setupGlobalErrorHandling();
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', (e) => {
            this.logError('JavaScript Error', e.error, e.filename, e.lineno);
        });

        window.addEventListener('unhandledrejection', (e) => {
            this.logError('Unhandled Promise Rejection', e.reason);
        });
    }

    logError(type, error, filename = '', line = '') {
        console.error(`${type}:`, {
            message: error.message || error,
            filename,
            line,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Invia errore al servizio di logging (opzionale)
        // this.sendErrorToService(type, error, filename, line);
    }

    sendErrorToService(type, error, filename, line) {
        // Implementa invio errori a servizio esterno se necessario
        fetch('/api/errors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type,
                message: error.message || error,
                filename,
                line,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            })
        }).catch(err => {
            console.warn('Failed to send error to service:', err);
        });
    }
}

// Inizializzazione utilità
document.addEventListener('DOMContentLoaded', () => {
    new AccessibilityUtils();
    new PerformanceUtils();
    new ErrorHandler();
});

// Esporta utilità per uso globale
window.AccessibilityUtils = AccessibilityUtils;
window.PerformanceUtils = PerformanceUtils;
window.ErrorHandler = ErrorHandler;