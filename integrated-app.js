/**
 * Sistema integrato di notifiche e feedback per l'applicazione SSAS
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 4000;
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.setupNotificationStyles();
        this.setupProgressIndicators();
    }

    createNotificationContainer() {
        if (document.getElementById('notificationContainer')) return;

        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-label', 'Notifiche sistema');
        
        document.body.appendChild(container);
    }

    setupNotificationStyles() {
        if (document.getElementById('notificationStyles')) return;

        const styles = document.createElement('style');
        styles.id = 'notificationStyles';
        styles.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            }

            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                margin-bottom: 12px;
                padding: 16px;
                border-left: 4px solid #007bff;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                pointer-events: auto;
                position: relative;
                overflow: hidden;
                max-width: 100%;
                word-wrap: break-word;
            }

            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .notification.success {
                border-left-color: #28a745;
            }

            .notification.success .notification-icon {
                color: #28a745;
            }

            .notification.error {
                border-left-color: #dc3545;
            }

            .notification.error .notification-icon {
                color: #dc3545;
            }

            .notification.warning {
                border-left-color: #ffc107;
            }

            .notification.warning .notification-icon {
                color: #ffc107;
            }

            .notification.info {
                border-left-color: #17a2b8;
            }

            .notification.info .notification-icon {
                color: #17a2b8;
            }

            .notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .notification-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 14px;
                color: #333;
            }

            .notification-icon {
                font-size: 18px;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .notification-close:hover {
                background: #f5f5f5;
                color: #666;
            }

            .notification-body {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
            }

            .notification-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
            }

            .notification-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-weight: 500;
            }

            .notification-btn.primary {
                background: #007bff;
                color: white;
            }

            .notification-btn.primary:hover {
                background: #0056b3;
            }

            .notification-btn.secondary {
                background: #f8f9fa;
                color: #6c757d;
                border: 1px solid #dee2e6;
            }

            .notification-btn.secondary:hover {
                background: #e2e6ea;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: currentColor;
                opacity: 0.3;
                transition: width linear;
            }

            .progress-bar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: rgba(0,0,0,0.1);
                z-index: 10001;
                display: none;
            }

            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #007bff, #28a745);
                width: 0%;
                transition: width 0.3s ease;
            }

            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.8);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(2px);
            }

            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-text {
                margin-top: 16px;
                font-size: 14px;
                color: #666;
                text-align: center;
            }

            @media (max-width: 480px) {
                .notification-container {
                    left: 20px;
                    right: 20px;
                    max-width: none;
                }
                
                .notification {
                    margin-bottom: 8px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    setupProgressIndicators() {
        // Crea barra di progresso globale
        const progressBar = document.createElement('div');
        progressBar.id = 'globalProgressBar';
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = '<div class="progress-bar-fill"></div>';
        document.body.appendChild(progressBar);

        // Crea overlay di caricamento
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Caricamento in corso...</div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    // Metodi pubblici per le notifiche
    show(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        this.addNotification(notification);
        return notification.id;
    }

    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { ...options, duration: 6000 });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    createNotification(message, type, options) {
        const id = 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const {
            title = this.getDefaultTitle(type),
            duration = this.defaultDuration,
            closable = true,
            actions = [],
            showProgress = true
        } = options;

        const notification = {
            id,
            message,
            type,
            title,
            duration,
            closable,
            actions,
            showProgress,
            element: null,
            timer: null
        };

        notification.element = this.renderNotification(notification);
        return notification;
    }

    renderNotification(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.type}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');
        
        element.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    <span class="notification-icon">${this.getTypeIcon(notification.type)}</span>
                    <span>${notification.title}</span>
                </div>
                ${notification.closable ? '<button class="notification-close" aria-label="Chiudi notifica">&times;</button>' : ''}
            </div>
            <div class="notification-body">${notification.message}</div>
            ${notification.actions.length > 0 ? this.renderActions(notification.actions) : ''}
            ${notification.showProgress && notification.duration > 0 ? '<div class="notification-progress"></div>' : ''}
        `;

        // Event listeners
        if (notification.closable) {
            element.querySelector('.notification-close').addEventListener('click', () => {
                this.dismiss(notification.id);
            });
        }

        return element;
    }

    renderActions(actions) {
        return `
            <div class="notification-actions">
                ${actions.map(action => `
                    <button class="notification-btn ${action.style || 'secondary'}" 
                            onclick="${action.handler}">
                        ${action.text}
                    </button>
                `).join('')}
            </div>
        `;
    }

    addNotification(notification) {
        const container = document.getElementById('notificationContainer');
        
        // Rimuovi notifiche eccedenti
        while (this.notifications.length >= this.maxNotifications) {
            this.dismiss(this.notifications[0].id, false);
        }

        this.notifications.push(notification);
        container.appendChild(notification.element);

        // Animazione di entrata
        requestAnimationFrame(() => {
            notification.element.classList.add('show');
        });

        // Progress bar
        if (notification.showProgress && notification.duration > 0) {
            this.startProgress(notification);
        }

        // Auto dismiss
        if (notification.duration > 0) {
            notification.timer = setTimeout(() => {
                this.dismiss(notification.id);
            }, notification.duration);
        }
    }

    startProgress(notification) {
        const progressElement = notification.element.querySelector('.notification-progress');
        if (!progressElement) return;

        progressElement.style.width = '100%';
        progressElement.style.transition = `width ${notification.duration}ms linear`;
        
        requestAnimationFrame(() => {
            progressElement.style.width = '0%';
        });
    }

    dismiss(notificationId, animate = true) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index === -1) return;

        const notification = this.notifications[index];
        
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        if (animate) {
            notification.element.classList.add('hide');
            setTimeout(() => {
                this.removeNotification(index);
            }, 300);
        } else {
            this.removeNotification(index);
        }
    }

    removeNotification(index) {
        const notification = this.notifications[index];
        if (notification.element.parentNode) {
            notification.element.parentNode.removeChild(notification.element);
        }
        this.notifications.splice(index, 1);
    }

    dismissAll() {
        this.notifications.forEach(notification => {
            this.dismiss(notification.id, false);
        });
    }

    // Progress bar globale
    showProgress(show = true) {
        const progressBar = document.getElementById('globalProgressBar');
        if (progressBar) {
            progressBar.style.display = show ? 'block' : 'none';
        }
    }

    setProgress(percentage) {
        const fill = document.querySelector('.progress-bar-fill');
        if (fill) {
            fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
    }

    // Loading overlay
    showLoading(show = true, text = 'Caricamento in corso...') {
        const overlay = document.getElementById('loadingOverlay');
        const textElement = overlay?.querySelector('.loading-text');
        
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
            if (textElement) {
                textElement.textContent = text;
            }
        }
    }

    // Utilità
    getDefaultTitle(type) {
        const titles = {
            success: 'Successo',
            error: 'Errore',
            warning: 'Attenzione',
            info: 'Informazione'
        };
        return titles[type] || 'Notifica';
    }

    getTypeIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    // Notifiche di conferma
    confirm(message, title = 'Conferma', options = {}) {
        return new Promise((resolve) => {
            const actions = [
                {
                    text: options.confirmText || 'Conferma',
                    style: 'primary',
                    handler: `notificationSystem.handleConfirm('${message}', true)`
                },
                {
                    text: options.cancelText || 'Annulla',
                    style: 'secondary',
                    handler: `notificationSystem.handleConfirm('${message}', false)`
                }
            ];

            this.confirmResolvers = this.confirmResolvers || new Map();
            this.confirmResolvers.set(message, resolve);

            this.show(message, 'warning', {
                title,
                duration: 0,
                actions,
                showProgress: false
            });
        });
    }

    handleConfirm(message, result) {
        if (this.confirmResolvers && this.confirmResolvers.has(message)) {
            this.confirmResolvers.get(message)(result);
            this.confirmResolvers.delete(message);
        }
        this.dismissAll();
    }

    // Notifiche contestuali
    showOperationFeedback(operation, status, details = '') {
        const messages = {
            save: {
                success: 'Dati salvati con successo',
                error: 'Errore durante il salvataggio',
                loading: 'Salvataggio in corso...'
            },
            export: {
                success: 'Esportazione completata',
                error: 'Errore durante l\'esportazione',
                loading: 'Esportazione in corso...'
            },
            filter: {
                success: 'Filtri applicati',
                info: 'Filtri rimossi'
            },
            search: {
                success: 'Ricerca completata',
                info: 'Nessun risultato trovato'
            }
        };

        const message = messages[operation]?.[status] || 'Operazione completata';
        const fullMessage = details ? `${message}: ${details}` : message;

        if (status === 'loading') {
            this.showLoading(true, message);
        } else {
            this.showLoading(false);
            this[status](fullMessage);
        }
    }
}

// Integrazione con l'app principale
class IntegratedSSASApp extends SSASApp {
    constructor() {
        super();
        this.notificationSystem = new NotificationSystem();
        this.setupIntegratedFeatures();
    }

    setupIntegratedFeatures() {
        // Integra ricerca avanzata
        this.advancedSearch = new AdvancedSearch(this);
        
        // Integra modulo di esportazione
        this.exportModule = new ExportModule(this);
        
        // Integra utilità di accessibilità e performance
        this.accessibilityUtils = new AccessibilityUtils();
        this.performanceUtils = new PerformanceUtils();

        // Override dei metodi per includere notifiche
        this.setupNotificationIntegration();
    }

    setupNotificationIntegration() {
        // Override del metodo showToast
        this.showToast = (message, type = 'info', duration = 3000) => {
            this.notificationSystem.show(message, type, { duration });
        };

        // Override del metodo showLoading
        this.showLoading = (show = true, text = 'Caricamento in corso...') => {
            this.notificationSystem.showLoading(show, text);
        };

        // Integra feedback per operazioni
        this.originalFilterData = this.filterData.bind(this);
        this.filterData = () => {
            this.originalFilterData();
            const count = this.filteredData.length;
            this.notificationSystem.showOperationFeedback('filter', 'success', `${count} risultati`);
        };

        this.originalPerformSearch = this.performSearch.bind(this);
        this.performSearch = (query) => {
            this.originalPerformSearch(query);
            const count = this.filteredData.length;
            if (count === 0) {
                this.notificationSystem.showOperationFeedback('search', 'info');
            } else {
                this.notificationSystem.showOperationFeedback('search', 'success', `${count} risultati`);
            }
        };
    }

    // Metodi migliorati con notifiche
    async saveData() {
        if (!this.isEditMode) {
            this.notificationSystem.warning('Attiva la modalità modifica per salvare');
            return;
        }

        try {
            this.notificationSystem.showOperationFeedback('save', 'loading');
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simula salvataggio
            this.notificationSystem.showOperationFeedback('save', 'success');
        } catch (error) {
            this.notificationSystem.showOperationFeedback('save', 'error', error.message);
        }
    }

    async deleteSelectedRows() {
        const confirmed = await this.notificationSystem.confirm(
            'Sei sicuro di voler eliminare gli elementi selezionati?',
            'Conferma Eliminazione',
            { confirmText: 'Elimina', cancelText: 'Annulla' }
        );

        if (confirmed) {
            try {
                // Simula eliminazione
                this.notificationSystem.success('Elementi eliminati con successo');
            } catch (error) {
                this.notificationSystem.error('Errore durante l\'eliminazione');
            }
        }
    }
}

// Inizializzazione globale
let app, notificationSystem, advancedSearch, exportModule;

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza il sistema di notifiche
    notificationSystem = new NotificationSystem();
    
    // Inizializza l'app integrata
    app = new IntegratedSSASApp();
    
    // Rendi disponibili globalmente
    window.app = app;
    window.notificationSystem = notificationSystem;
    window.advancedSearch = app.advancedSearch;
    window.exportModule = app.exportModule;
});

// Esporta le classi
window.NotificationSystem = NotificationSystem;
window.IntegratedSSASApp = IntegratedSSASApp;