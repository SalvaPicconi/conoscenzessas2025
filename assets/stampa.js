/* Stampa di UDA, piani, curricolo, PFI e rubriche senza modificare i dati. */
(() => {
    'use strict';
    let copia = null;
    const selezionate = new Map();
    const periodiPiano = new Map();
    const listaUda = '#uda-list, #trasversali-list, #civica-list, #fsl-list';
    const testate = '.uda-acc-header, .gen-acc-header, .group-header';
    const pannelli = '.uda-acc-body, .gen-acc-body, .group-content';

    function sorgente() {
        const frame = document.querySelector('.tab-content.active iframe');
        try { return frame ? frame.contentWindow : window; } catch { return window; }
    }
    function testo(tag, valore, classe) {
        const el = document.createElement(tag);
        el.textContent = valore;
        if (classe) el.className = classe;
        return el;
    }
    function visibili(doc = document) {
        return [...(doc.querySelector(listaUda)?.querySelectorAll('.uda-acc') || [])];
    }

    // I campi diventano testo nella sola copia: nessun taglio da altezza fissa.
    function clona(originale) {
        const nodo = originale.cloneNode(true);
        const campi = [...originale.querySelectorAll('input, select, textarea')];
        nodo.querySelectorAll('input, select, textarea').forEach((campo, i) => {
            const fonte = campi[i];
            if (['hidden', 'file', 'password'].includes(fonte.type)) { campo.remove(); return; }
            const valore = testo('span', '', 'stampa-valore');
            if (['checkbox', 'radio'].includes(fonte.type)) {
                valore.textContent = fonte.checked ? '☑' : '☐';
                valore.classList.add('stampa-spunta');
            } else if (fonte.tagName === 'SELECT') {
                valore.textContent = [...fonte.selectedOptions].map(o => o.textContent).join(', ') || '—';
            } else valore.textContent = fonte.value || '—';
            campo.replaceWith(valore);
        });
        // Prima di rimuovere gli elementi nascosti si aprono tutte le schede.
        nodo.querySelectorAll(pannelli).forEach(e => { e.hidden = false; e.classList.remove('hidden'); });
        nodo.querySelectorAll(testate).forEach(e => {
            const h = document.createElement('h2');
            h.className = 'stampa-scheda-titolo';
            h.append(...e.childNodes);
            e.replaceWith(h);
        });
        nodo.querySelectorAll('details').forEach(e => e.open = true);
        nodo.querySelectorAll('img').forEach(e => { e.loading = 'eager'; });
        nodo.querySelectorAll('.no-print, .stampa-comandi, .stampa-scelta, button, .button-group, .pfi-legenda, script, dialog, nav, .filter-panel, .loading, .scroll-hint, .group-chevron, .uda-acc-arrow, .uda-revisione-accesso, .uda-revisione-auth, .uda-revisione-toolbar, .uda-revisione-pannello, .uda-revisione-new-slot, .uda-revisione-slot, .uda-voto-slot, #voto-auth, .voto-intro, .voto-salvataggio, [hidden], .hidden').forEach(e => e.remove());
        [nodo, ...nodo.querySelectorAll('[id]')].forEach(e => e.removeAttribute('id'));
        return nodo;
    }

    function riepilogo(schede) {
        const table = document.createElement('table');
        table.className = 'stampa-piano';
        const head = table.createTHead().insertRow();
        ['UDA e durata', 'Insegnamenti e ore', 'Compito e prodotto'].forEach(s => head.append(testo('th', s)));
        const body = table.createTBody();
        for (const scheda of schede) {
            const row = body.insertRow();
            const prima = row.insertCell();
            const header = scheda.querySelector('.uda-acc-header');
            prima.append(testo('strong', [scheda.dataset.id, header?.querySelector('.uda-acc-title')?.textContent].filter(Boolean).join(' · ')));
            prima.append(testo('p', [header?.querySelector('.uda-acc-sub')?.textContent, header?.querySelector('.uda-acc-pills')?.textContent].filter(Boolean).join(' · ')));
            const competenze = [...scheda.querySelectorAll('.sin-row')].filter(e => /competenz[ae] in uscita|competenz[ae] target/i.test(e.querySelector('.sin-label')?.textContent || ''));
            competenze.forEach(e=>prima.append(testo('p',e.querySelector('.sin-value')?.textContent || '')));
            const periodo = scheda.querySelector('[data-periodo-piano]')?.value || periodiPiano.get(scheda.dataset.id) || '';
            prima.append(testo('p', 'Periodo: ' + (periodo || 'Da concordare')));
            const materie = row.insertCell();
            const ore = scheda.querySelector('.uda-ore-box');
            if (ore) materie.append(clona(ore));
            else {
                const chips = [...scheda.querySelectorAll('.ins-chip')].map(e => e.textContent.trim());
                materie.append(testo('p', [...new Set(chips)].join(', ')));
                materie.append(testo('p', 'Ripartizione oraria non disponibile.'));
            }
            const compito = row.insertCell();
            scheda.querySelectorAll('.sin-row, .uda-detail-section').forEach(sezione => {
                const label = sezione.querySelector('.sin-label, h3')?.textContent || '';
                if (/compito|prodotto/i.test(label)) compito.append(clona(sezione));
            });
            const criteri = [...scheda.querySelectorAll('.sin-row, .uda-detail-section')].find(e => /valutazione/i.test(e.querySelector('.sin-label, h3')?.textContent || ''));
            compito.append(testo('p','Valutazione: ' + ((criteri?.querySelector('.sin-value') || criteri)?.textContent?.trim() || 'Criteri essenziali da concordare')));
        }
        return table;
    }

    function prepara(orig = sorgente(), opzioni = {}) {
        if (copia) return;
        let doc;
        try { doc = orig.document; } catch { return; }
        const form = doc.getElementById('pfi-form');
        const risultato = doc.getElementById('step3');
        const catalogo = doc.querySelector(listaUda);
        const principale = doc.querySelector('main.container, body > .container');
        if (!principale && !form && !risultato) return;
        const rubrica = risultato && !risultato.classList.contains('hidden');
        const pianoPfi = form && opzioni.tipo === 'piano-pfi';
        copia = document.createElement('article');
        copia.className = 'stampa-documento';
        const titolo = pianoPfi ? 'Piano didattico delle UDA'
            : form ? 'Progetto Formativo Individuale'
            : opzioni.tipo === 'piano' ? 'Piano delle UDA — ' + (doc.querySelector('header h1')?.textContent || '')
            : doc.querySelector('header h1')?.textContent || doc.title;
        copia.append(testo('h1', titolo));
        const hero = doc.querySelector('header.page-hero, body > .container > header');
        if (!form) hero?.querySelectorAll('.subline, p, .qnq-badge').forEach(r => copia.append(testo('p', r.textContent)));

        if (catalogo) {
            const schede = opzioni.schede || visibili(doc);
            if(opzioni.tipo === 'piano') copia.append(testo('p', 'Bozza di piano · sequenza nell’ordine delle righe · scelta e periodi da concordare nel consiglio di classe.'));
            copia.append(testo('p', `${schede.length} UDA ${opzioni.schede ? 'selezionate per la stampa' : 'visualizzate con i filtri attuali'}.`));
            const filtri = [...doc.querySelectorAll('.filter-panel select, .filter-panel input')]
                .filter(e => e.value).map(e => e.tagName === 'SELECT' ? e.selectedOptions[0]?.textContent : e.value);
            const anno = doc.querySelector('.anno-pill[aria-pressed="true"]')?.textContent;
            if (!opzioni.schede && (anno || filtri.length)) copia.append(testo('p', 'Filtri: ' + [anno && `Anno ${anno}`, ...filtri].filter(Boolean).join(' · ')));
            if (opzioni.tipo === 'piano') copia.append(riepilogo(schede));
            else schede.forEach(s => copia.append(clona(s)));
            if (!schede.length) copia.append(testo('p', 'Nessuna UDA da stampare: modifica i filtri o seleziona le schede.'));
        } else if (pianoPfi) {
            copia.append(clona(doc.getElementById('q0')));
            const leggi = nome => doc.querySelector(`[name="${nome}"]`)?.value || '';
            copia.append(testo('p', ['Classe: ' + (leggi('classe') || '—'),
                'Studente: ' + ([leggi('cognome'), leggi('nome')].filter(Boolean).join(' ') || '—')].join(' · ')));
            copia.append(clona(doc.getElementById('q7')));
        } else {
            const contenuto = clona(form || (rubrica ? risultato : principale));
            contenuto.querySelector('header.page-hero')?.remove();
            copia.append(contenuto);
        }
        document.body.append(copia);
        document.body.classList.add('stampa-in-corso');
    }
    function ripristina() {
        copia?.remove(); copia = null;
        document.body.classList.remove('stampa-in-corso');
    }
    async function stampa(orig = window, opzioni = {}) {
        try {
            if (window.parent !== window && window.parent.CurricoloStampa) {
                return window.parent.CurricoloStampa.stampa(orig, opzioni);
            }
        } catch { /* Origine diversa: stampa della pagina autonoma. */ }
        prepara(orig, opzioni);
        await Promise.allSettled([...(copia?.querySelectorAll('img') || [])].map(img => img.decode()));
        try { window.print(); } catch (errore) { ripristina(); throw errore; }
    }
    function bottone(label, azione) {
        const b = testo('button', label, 'stampa-bottone');
        b.type = 'button'; b.addEventListener('click', azione); return b;
    }
    function aggiungiComandi() {
        // Le quattro illustrazioni devono essere pronte anche per Stampa da tastiera.
        document.querySelectorAll('.ci-visual img').forEach(img => { img.loading = 'eager'; });
        const lista = document.querySelector(listaUda);
        if (lista) {
            let barra = document.getElementById('stampa-catalogo');
            if (!barra) {
                barra = document.createElement('section'); barra.id = 'stampa-catalogo'; barra.className = 'stampa-comandi no-print';
                barra.setAttribute('aria-label', 'Stampa UDA e piano');
                barra.append(bottone('Stampa UDA visualizzate', () => stampa()));
                const scelte = bottone('Stampa UDA selezionate', () => stampa(window, {schede: [...selezionate.values()]}));
                scelte.id = 'stampa-selezionate'; barra.append(scelte);
                barra.append(bottone('Stampa piano UDA', () => stampa(window, {tipo: 'piano', ...(selezionate.size ? {schede: [...selezionate.values()]} : {})})));
                barra.append(bottone('Azzera selezione', () => { selezionate.clear(); aggiungiComandi(); }));
                barra.append(testo('p', 'Le stampe seguono i filtri. Per il piano si usano le UDA selezionate, oppure quelle visualizzate se non hai selezionato nulla. La selezione resta disponibile quando cambi filtro. Periodi e selezione si azzerano ricaricando la pagina.'));
                lista.before(barra);
            }
            for (const scheda of visibili()) {
                const id = scheda.dataset.id;
                if (!scheda.querySelector('[data-periodo-piano]')) {
                    const label = testo('label','Periodo previsto nel piano ', 'no-print');
                    const input = document.createElement('input'); input.type='text'; input.dataset.periodoPiano=id;
                    input.placeholder='Da concordare'; input.value=periodiPiano.get(id) || '';
                    input.addEventListener('input',()=>periodiPiano.set(id,input.value));
                    label.append(input); scheda.querySelector('.uda-acc-body')?.prepend(label);
                }
                if (selezionate.has(id)) selezionate.set(id, scheda);
                let scelta = scheda.querySelector('.stampa-scelta');
                if (!scelta) {
                    scelta = document.createElement('div'); scelta.className = 'stampa-scelta no-print';
                    const label = document.createElement('label');
                    const check = document.createElement('input'); check.type = 'checkbox';
                    check.setAttribute('aria-label', 'Seleziona UDA ' + id + ' per la stampa');
                    check.addEventListener('change', () => {
                        if (check.checked) selezionate.set(id, scheda); else selezionate.delete(id);
                        aggiungiComandi();
                    });
                    label.append(check, document.createTextNode(' Seleziona per la stampa'));
                    scelta.append(label, bottone('Stampa questa UDA', () => stampa(window, {schede: [scheda]})));
                    scheda.querySelector('.uda-acc-header').after(scelta);
                }
                scelta.querySelector('input').checked = selezionate.has(id);
            }
            const b = document.getElementById('stampa-selezionate');
            b.textContent = `Stampa UDA selezionate (${selezionate.size})`; b.disabled = !selezionate.size;
        } else if (document.getElementById('pfi-form')) {
            if (!document.getElementById('pfi-stampa-piano')) {
                const b = bottone('Stampa solo il piano UDA', () => stampa(window, {tipo: 'piano-pfi'}));
                b.id = 'pfi-stampa-piano'; b.classList.add('no-print');
                document.querySelector('#q7 .pfi-uda-azioni').append(b);
                const alto = bottone('Stampa piano UDA', () => stampa(window, {tipo: 'piano-pfi'}));
                document.querySelector('.pfi-toolbar-group').append(alto);
            }
        } else if (!document.querySelector('.content-iframe') && !document.getElementById('step3')) {
            const main = document.querySelector('main.container, body > .container');
            if (main && !document.getElementById('stampa-sezione')) {
                const barra = document.createElement('div'); barra.id = 'stampa-sezione'; barra.className = 'stampa-comandi no-print';
                barra.append(bottone('Stampa / PDF — sezione corrente', () => stampa()));
                (main.querySelector('.filter-panel') || main.querySelector('header'))?.after(barra);
            }
        }
    }
    window.CurricoloStampa = { stampa };
    window.addEventListener('beforeprint', () => prepara());
    window.addEventListener('afterprint', ripristina);
    document.addEventListener('curricolo:uda-rendered', aggiungiComandi);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aggiungiComandi);
    else aggiungiComandi();
})();
