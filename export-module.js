/**
 * Modulo per esportazione avanzata in diversi formati
 */

class ExportModule {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.setupExportUI();
        this.loadExternalLibraries();
    }

    setupExportUI() {
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-container';
        exportContainer.innerHTML = `
            <h3>Esportazione Dati</h3>
            <div class="export-options">
                <button class="export-btn csv" onclick="exportModule.exportToCSV()">
                    📊 Esporta CSV
                </button>
                <button class="export-btn excel" onclick="exportModule.exportToExcel()">
                    📈 Esporta Excel
                </button>
                <button class="export-btn pdf" onclick="exportModule.exportToPDF()">
                    📄 Esporta PDF
                </button>
                <button class="export-btn print" onclick="exportModule.openPrintPreview()">
                    🖨️ Anteprima Stampa
                </button>
                <button class="export-btn json" onclick="exportModule.exportToJSON()">
                    📋 Esporta JSON
                </button>
            </div>
            <div class="export-settings">
                <h4>Opzioni Esportazione</h4>
                <label>
                    <input type="checkbox" id="includeFilters" checked> Includi filtri applicati
                </label>
                <label>
                    <input type="checkbox" id="includePivot" checked> Includi tabella pivot
                </label>
                <label>
                    <input type="checkbox" id="includeStats" checked> Includi statistiche
                </label>
                <label>
                    Formato data: 
                    <select id="dateFormat">
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                </label>
            </div>
        `;

        // Aggiungi al pannello di controllo edit
        const editControls = document.querySelector('.edit-controls');
        editControls.appendChild(exportContainer);
    }

    async loadExternalLibraries() {
        // Carica SheetJS per Excel
        if (!window.XLSX) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        }

        // Carica jsPDF per PDF
        if (!window.jsPDF) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Esportazione CSV migliorata
    async exportToCSV() {
        try {
            this.app.showLoading(true);
            
            const data = this.getExportData();
            const includeFilters = document.getElementById('includeFilters')?.checked;
            const includePivot = document.getElementById('includePivot')?.checked;
            const includeStats = document.getElementById('includeStats')?.checked;

            let csvContent = '';

            // Intestazione del documento
            csvContent += `"Curricolo Verticale SSAS - Esportazione del ${new Date().toLocaleDateString()}"\n\n`;

            // Statistiche (se richieste)
            if (includeStats) {
                csvContent += this.generateStatsCSV() + '\n';
            }

            // Filtri applicati (se richiesti)
            if (includeFilters) {
                csvContent += this.generateFiltersCSV() + '\n';
            }

            // Dati principali
            csvContent += this.generateMainDataCSV(data);

            // Tabella pivot (se richiesta)
            if (includePivot) {
                csvContent += '\n' + this.generatePivotCSV();
            }

            this.downloadFile(csvContent, `curricolo-ssas-${this.getTimestamp()}.csv`, 'text/csv;charset=utf-8;');
            this.app.showToast('CSV esportato con successo!', 'success');

        } catch (error) {
            this.app.showToast('Errore durante l\'esportazione CSV', 'error');
            console.error('Errore CSV:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    // Esportazione Excel avanzata
    async exportToExcel() {
        try {
            this.app.showLoading(true);
            
            if (!window.XLSX) {
                throw new Error('Libreria XLSX non caricata');
            }

            const workbook = XLSX.utils.book_new();
            const data = this.getExportData();

            // Foglio dati principali
            const mainSheet = this.createMainDataSheet(data);
            XLSX.utils.book_append_sheet(workbook, mainSheet, 'Dati Curricolo');

            // Foglio statistiche
            if (document.getElementById('includeStats')?.checked) {
                const statsSheet = this.createStatsSheet();
                XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistiche');
            }

            // Foglio pivot
            if (document.getElementById('includePivot')?.checked) {
                const pivotSheet = this.createPivotSheet();
                XLSX.utils.book_append_sheet(workbook, pivotSheet, 'Tabella Pivot');
            }

            // Foglio riepilogo
            const summarySheet = this.createSummarySheet();
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Riepilogo');

            // Esporta il file
            XLSX.writeFile(workbook, `curricolo-ssas-${this.getTimestamp()}.xlsx`);
            this.app.showToast('Excel esportato con successo!', 'success');

        } catch (error) {
            this.app.showToast('Errore durante l\'esportazione Excel', 'error');
            console.error('Errore Excel:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    // Esportazione PDF avanzata
    async exportToPDF() {
        try {
            this.app.showLoading(true);
            
            if (!window.jsPDF) {
                throw new Error('Libreria jsPDF non caricata');
            }

            const { jsPDF } = window.jsPDF;
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
            
            const data = this.getExportData();
            let yPosition = 20;

            // Intestazione
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('Curricolo Verticale SSAS', 20, yPosition);
            yPosition += 10;

            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Generato il: ${new Date().toLocaleDateString()}`, 20, yPosition);
            yPosition += 15;

            // Statistiche
            if (document.getElementById('includeStats')?.checked) {
                yPosition = this.addStatsToPDF(doc, yPosition);
            }

            // Filtri applicati
            if (document.getElementById('includeFilters')?.checked) {
                yPosition = this.addFiltersToPDF(doc, yPosition);
            }

            // Tabella dati
            yPosition = this.addDataTableToPDF(doc, data, yPosition);

            // Tabella pivot (se richiesta e c'è spazio)
            if (document.getElementById('includePivot')?.checked) {
                doc.addPage();
                this.addPivotTableToPDF(doc, 20);
            }

            doc.save(`curricolo-ssas-${this.getTimestamp()}.pdf`);
            this.app.showToast('PDF esportato con successo!', 'success');

        } catch (error) {
            this.app.showToast('Errore durante l\'esportazione PDF', 'error');
            console.error('Errore PDF:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    // Anteprima di stampa ottimizzata
    openPrintPreview() {
        const printWindow = window.open('', '_blank');
        const data = this.getExportData();
        
        const printContent = this.generatePrintHTML(data);
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    generatePrintHTML(data) {
        const includeStats = document.getElementById('includeStats')?.checked;
        const includePivot = document.getElementById('includePivot')?.checked;
        const includeFilters = document.getElementById('includeFilters')?.checked;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Curricolo SSAS - Stampa</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
                    .stat-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
                    .stat-number { font-size: 24px; font-weight: bold; color: #333; }
                    .stat-label { font-size: 12px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .filters { background: #f9f9f9; padding: 15px; margin-bottom: 20px; }
                    .page-break { page-break-before: always; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Curricolo Verticale Servizi per la Sanità e l'Assistenza Sociale (SSAS)</h1>
                    <p>Allegato C del Regolamento del 24 maggio 2018, n. 92</p>
                    <p>Generato il: ${new Date().toLocaleDateString()}</p>
                </div>

                ${includeStats ? this.generateStatsPrintHTML() : ''}
                ${includeFilters ? this.generateFiltersPrintHTML() : ''}
                
                <h2>Dati Curricolo</h2>
                ${this.generateDataTableHTML(data)}
                
                ${includePivot ? '<div class="page-break"></div>' + this.generatePivotPrintHTML() : ''}
            </body>
            </html>
        `;
    }

    // Esportazione JSON
    exportToJSON() {
        try {
            const data = this.getExportData();
            const exportData = {
                metadata: {
                    title: 'Curricolo Verticale SSAS',
                    exportDate: new Date().toISOString(),
                    totalRecords: data.length,
                    version: '2.0'
                },
                filters: this.getCurrentFilters(),
                statistics: this.app.calculateStats(),
                data: data
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            this.downloadFile(jsonString, `curricolo-ssas-${this.getTimestamp()}.json`, 'application/json');
            this.app.showToast('JSON esportato con successo!', 'success');

        } catch (error) {
            this.app.showToast('Errore durante l\'esportazione JSON', 'error');
            console.error('Errore JSON:', error);
        }
    }

    // Utility functions
    getExportData() {
        return document.getElementById('includeFilters')?.checked ? 
            this.app.filteredData : this.app.data;
    }

    getCurrentFilters() {
        return {
            competenza: document.getElementById('competenzaFilter')?.value || '',
            periodo: document.getElementById('periodoFilter')?.value || '',
            insegnamento: document.getElementById('insegnamentoFilter')?.value || '',
            search: document.getElementById('searchInput')?.value || ''
        };
    }

    getTimestamp() {
        return new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    }

    downloadFile(content, filename, mimeType) {
        const BOM = '\uFEFF'; // Byte Order Mark per UTF-8
        const blob = new Blob([BOM + content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Helper methods per generazione contenuti
    generateStatsCSV() {
        const stats = this.app.calculateStats();
        return `"STATISTICHE"\n"Competenze","${stats.competenze}"\n"Conoscenze","${stats.conoscenze}"\n"Periodi","${stats.periodi}"\n"Insegnamenti","${stats.insegnamenti}"\n`;
    }

    generateFiltersCSV() {
        const filters = this.getCurrentFilters();
        let filtersText = '"FILTRI APPLICATI"\n';
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                filtersText += `"${key}","${value}"\n`;
            }
        });
        return filtersText;
    }

    generateMainDataCSV(data) {
        const headers = ['Competenza', 'Conoscenza', 'Periodo', 'Insegnamento'];
        let csv = '"DATI CURRICOLO"\n';
        csv += headers.map(h => `"${h}"`).join(',') + '\n';
        
        data.forEach(row => {
            csv += headers.map(header => 
                `"${row[header.toLowerCase()].replace(/"/g, '""')}"`
            ).join(',') + '\n';
        });
        
        return csv;
    }

    generatePivotCSV() {
        // Genera CSV della tabella pivot attuale
        const pivotTable = document.querySelector('.pivot-table');
        if (!pivotTable) return '';

        let csv = '"TABELLA PIVOT"\n';
        const rows = pivotTable.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            const rowData = Array.from(cells).map(cell => 
                `"${cell.textContent.trim().replace(/"/g, '""')}"`
            );
            csv += rowData.join(',') + '\n';
        });
        
        return csv;
    }

    createMainDataSheet(data) {
        const headers = ['Competenza', 'Conoscenza', 'Periodo', 'Insegnamento'];
        const sheetData = [headers];
        
        data.forEach(row => {
            sheetData.push([
                row.competenza,
                row.conoscenza,
                row.periodo,
                row.insegnamento
            ]);
        });

        return XLSX.utils.aoa_to_sheet(sheetData);
    }

    createStatsSheet() {
        const stats = this.app.calculateStats();
        const sheetData = [
            ['Statistica', 'Valore'],
            ['Competenze', stats.competenze],
            ['Conoscenze', stats.conoscenze],
            ['Periodi', stats.periodi],
            ['Insegnamenti', stats.insegnamenti],
            ['Data Export', new Date().toLocaleDateString()]
        ];

        return XLSX.utils.aoa_to_sheet(sheetData);
    }

    createSummarySheet() {
        const filters = this.getCurrentFilters();
        const sheetData = [
            ['Curricolo Verticale SSAS - Riepilogo Export'],
            [''],
            ['Data Export', new Date().toLocaleDateString()],
            ['Ora Export', new Date().toLocaleTimeString()],
            [''],
            ['Filtri Applicati:'],
            ['Competenza', filters.competenza || 'Tutte'],
            ['Periodo', filters.periodo || 'Tutti'],
            ['Insegnamento', filters.insegnamento || 'Tutti'],
            ['Ricerca', filters.search || 'Nessuna'],
            [''],
            ['Totale Records Esportati', this.getExportData().length]
        ];

        return XLSX.utils.aoa_to_sheet(sheetData);
    }

    generateStatsPrintHTML() {
        const stats = this.app.calculateStats();
        return `
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${stats.competenze}</div>
                    <div class="stat-label">Competenze</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.conoscenze}</div>
                    <div class="stat-label">Conoscenze</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.periodi}</div>
                    <div class="stat-label">Periodi</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.insegnamenti}</div>
                    <div class="stat-label">Insegnamenti</div>
                </div>
            </div>
        `;
    }

    generateFiltersPrintHTML() {
        const filters = this.getCurrentFilters();
        const activeFilters = Object.entries(filters).filter(([key, value]) => value);
        
        if (activeFilters.length === 0) return '';

        return `
            <div class="filters">
                <h3>Filtri Applicati</h3>
                ${activeFilters.map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
            </div>
        `;
    }

    generateDataTableHTML(data) {
        return `
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
                    ${data.map(row => `
                        <tr>
                            <td>${row.competenza}</td>
                            <td>${row.conoscenza}</td>
                            <td>${row.periodo}</td>
                            <td>${row.insegnamento}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generatePivotPrintHTML() {
        const pivotTable = document.querySelector('.pivot-table');
        return pivotTable ? `<h2>Tabella Pivot</h2>${pivotTable.outerHTML}` : '';
    }
}

// Esporta per uso globale
window.ExportModule = ExportModule;