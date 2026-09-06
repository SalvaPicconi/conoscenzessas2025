// Motore documentale delle UDA — schede Word e stampa PDF.
//
// Un solo generatore di HTML alimenta due usi: il file .doc che si apre in Word
// e la stampa del browser, da cui esce il PDF. Le due strade devono produrre la
// stessa pagina, altrimenti il documento consegnato al consiglio non è quello
// che il docente ha visto a schermo.
//
// Il file .doc è HTML con le estensioni Office: `@page WordSection1` fissa il
// formato A4 e i margini, `mso-footer` aggancia il piè di pagina con il numero
// progressivo. Word e LibreOffice li leggono entrambi; un browser che aprisse
// lo stesso file ignorerebbe le sole regole `mso-` e mostrerebbe comunque il
// documento impaginato.
//
// La stampa passa da un iframe nascosto invece che da una finestra nuova: le
// pagine UDA vivono dentro l'iframe di index.html e una window.open verrebbe
// bloccata, mentre un iframe con srcdoc resta nello stesso documento e stampa
// solo il proprio contenuto.

(function () {
    'use strict';

    const ISTITUTO = 'IIS Meucci - Mattei Cagliari';
    const SEDE = 'Sede di Decimomannu';
    const INDIRIZZO = 'Servizi per la Sanità e l’Assistenza Sociale';

    // Riferimenti normativi e glossario dei termini: la fonte è
    // data-normativa.json, la stessa che alimenta la pagina del glossario. Qui
    // non se ne tiene una seconda copia, altrimenti l'elenco stampato in calce
    // al Piano e quello letto a schermo finirebbero prima o poi per divergere.
    //
    // I due elenchi si riempiono dopo il caricamento ma conservano la loro
    // identità: chi li ha già in mano — piano-uda.js li scorre per disegnare le
    // norme — continua a vedere l'array giusto. La stampa avviene sempre dopo
    // un clic, quindi molto più tardi del caricamento.
    const RIFERIMENTI = [];
    const GLOSSARIO = [];

    const pronto = fetch('data-normativa.json', { cache: 'no-store' })
        .then(risposta => {
            if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
            return risposta.json();
        })
        .then(json => {
            (json.fonti || []).forEach(fonte => RIFERIMENTI.push({
                id: fonte.id,
                norma: fonte.norma,
                oggetto: fonte.oggetto
            }));
            (json.glossario || []).forEach(voce => GLOSSARIO.push(voce));
            return json;
        })
        .catch(errore => {
            console.warn('Riferimenti normativi non disponibili:', errore);
            return null;
        });

    // Sigla breve di una norma, per le citazioni dentro il glossario stampato.
    function siglaNorma(id) {
        const voce = RIFERIMENTI.find(riga => riga.id === id);
        return voce ? voce.norma : id;
    }

    const ANNO_ETICHETTA = { 1: '1° anno', 2: '2° anno', 3: '3° anno', 4: '4° anno', 5: '5° anno' };

    // I tre cataloghi nominano le stesse discipline in modi diversi: le UDA di
    // formazione scuola-lavoro usano le denominazioni in maiuscolo del quadro
    // orario, le altre quelle brevi delle schede. Nel documento vale una sola
    // forma, altrimenti nel riepilogo di terza la stessa materia comparirebbe
    // due volte.
    const ETICHETTA_INS = {
        'METODOLOGIE OPERATIVE': 'Metodologie Operative',
        'IGIENE E CULTURA MEDICO SANITARIA': 'Igiene e Cultura M.S.',
        'DIRITTO E TEC. AMM.': 'Diritto e T.A.',
        'PSICOLOGIA GENERALE ED APPLICATA': 'Psicologia'
    };

    function etichettaInsegnamento(nome) {
        return ETICHETTA_INS[nome] || nome;
    }

    function esc(valore) {
        if (valore === undefined || valore === null) return '';
        return String(valore).replace(/[&<>"']/g, carattere =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[carattere]));
    }

    // Testo dell'utente: gli a capo digitati in un campo libero devono restare
    // a capo anche nel documento stampato.
    function paragrafo(testo) {
        const pulito = esc(testo).trim();
        return pulito ? `<p>${pulito.replace(/\n+/g, '<br>')}</p>` : '';
    }

    function nomeFile(parti, estensione) {
        const base = parti.filter(Boolean).join(' ')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 90);
        return `${base || 'documento'}.${estensione}`;
    }

    function dataItaliana(iso) {
        if (!iso) return '';
        const data = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(data.getTime())) return esc(iso);
        return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).format(data);
    }

    // ------------------------------------------------------------------
    // Mattoni di impaginazione
    // ------------------------------------------------------------------

    // Tabella etichetta/valore. Le righe senza valore spariscono: una scheda
    // piena di trattini è più difficile da leggere di una scheda corta.
    function tabellaVoci(righe, opzioni = {}) {
        const utili = righe.filter(riga => riga && (opzioni.tieniVuote || String(riga[1] ?? '').trim()));
        if (!utili.length) return '';
        const corpo = utili.map(([etichetta, valore]) =>
            `<tr><th scope="row" class="lab">${esc(etichetta)}</th><td>${valore || '&nbsp;'}</td></tr>`).join('');
        return `<table class="doc-tab"><tbody>${corpo}</tbody></table>`;
    }

    function tabellaColonne(intestazioni, righe, classe = '') {
        if (!righe.length) return '';
        const testa = intestazioni.map(voce => `<th scope="col">${esc(voce)}</th>`).join('');
        const corpo = righe.map(riga => `<tr>${riga.map(cella => `<td>${cella ?? ''}</td>`).join('')}</tr>`).join('');
        return `<table class="doc-tab doc-tab-griglia ${classe}"><thead><tr>${testa}</tr></thead><tbody>${corpo}</tbody></table>`;
    }

    function elencoPuntato(voci) {
        const utili = (voci || []).filter(voce => String(voce ?? '').trim());
        if (!utili.length) return '';
        return `<ul class="doc-lista">${utili.map(voce => `<li>${voce}</li>`).join('')}</ul>`;
    }

    // Spazio da compilare a mano o in Word: righe rigate al posto del vuoto,
    // così il documento stampato resta un modulo e non un foglio bianco.
    function righeDaCompilare(quantita = 3) {
        return `<div class="doc-righe">${'<span class="doc-riga"></span>'.repeat(Math.max(1, quantita))}</div>`;
    }

    function sezione(numero, titolo, contenuto, nota) {
        const corpo = String(contenuto ?? '').trim();
        if (!corpo) return '';
        const etichetta = numero ? `<span class="doc-num">${esc(numero)}</span> ` : '';
        const piede = nota ? `<p class="doc-fonte">${nota}</p>` : '';
        return `<section class="doc-sezione">
            <h2>${etichetta}${esc(titolo)}</h2>
            ${corpo}
            ${piede}
        </section>`;
    }

    // ------------------------------------------------------------------
    // Documento completo
    // ------------------------------------------------------------------

    function stile() {
        return `
    @page WordSection1 {
        size: 21cm 29.7cm;
        margin: 2cm 1.8cm 2cm 1.8cm;
        mso-header-margin: 1cm;
        mso-footer-margin: 1cm;
        mso-footer: f1;
        mso-paper-source: 0;
    }
    div.WordSection1 { page: WordSection1; }
    @page { size: A4; margin: 18mm 16mm; }

    body {
        font-family: Calibri, Carlito, "Segoe UI", Arial, sans-serif;
        font-size: 10.5pt;
        line-height: 1.38;
        color: #000;
        background: #fff;
        margin: 0;
    }
    p { margin: 0 0 6pt; }
    strong { font-weight: bold; }

    .doc-testata { text-align: center; margin-bottom: 10pt; }
    .doc-istituto { font-size: 11pt; font-weight: bold; letter-spacing: 0.4pt; margin: 0; }
    .doc-sede { font-size: 9.5pt; margin: 0 0 1pt; }
    .doc-indirizzo { font-size: 9.5pt; font-style: italic; margin: 0; }
    .doc-filo { border: 0; border-top: 1pt solid #000; margin: 7pt 0 9pt; }

    h1 {
        font-family: Cambria, Caladea, Georgia, serif;
        font-size: 16pt;
        text-align: center;
        letter-spacing: 0.6pt;
        margin: 0 0 3pt;
    }
    .doc-occhiello { text-align: center; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 1.2pt; margin: 0 0 4pt; }
    .doc-sottotitolo { text-align: center; font-size: 11pt; font-weight: bold; margin: 0 0 2pt; }
    .doc-catenaccio { text-align: center; font-size: 9.5pt; font-style: italic; margin: 0 0 12pt; }

    h2 {
        font-family: Cambria, Caladea, Georgia, serif;
        font-size: 11.5pt;
        margin: 14pt 0 5pt;
        padding-bottom: 2pt;
        border-bottom: 0.75pt solid #000;
        page-break-after: avoid;
    }
    h3 { font-family: Cambria, Caladea, Georgia, serif; font-size: 10.5pt; margin: 9pt 0 4pt; page-break-after: avoid; }
    .doc-num {
        display: inline-block;
        min-width: 15pt;
        margin-right: 3pt;
        font-family: Calibri, Carlito, Arial, sans-serif;
        font-size: 9pt;
    }
    .doc-sezione { page-break-inside: auto; }

    .doc-tab { width: 100%; border-collapse: collapse; margin: 0 0 8pt; }
    .doc-tab th, .doc-tab td {
        border: 0.5pt solid #666;
        padding: 3.5pt 5pt;
        vertical-align: top;
        font-size: 9.5pt;
        text-align: left;
    }
    .doc-tab .lab { width: 27%; font-weight: bold; background: #f2f2f2; }
    .doc-tab-griglia thead th { background: #e6e6e6; font-weight: bold; font-size: 9pt; }
    .doc-tab thead { display: table-header-group; }
    .doc-tab tfoot { display: table-footer-group; }
    .doc-tab .num { text-align: center; white-space: nowrap; }
    .doc-tab .tot td, .doc-tab .tot th { font-weight: bold; background: #f2f2f2; }

    .doc-lista { margin: 0 0 6pt; padding-left: 15pt; }
    .doc-lista li { margin-bottom: 2.5pt; }
    .doc-ins { font-size: 8.5pt; color: #333; font-style: italic; }

    .doc-fonte { font-size: 8pt; color: #444; font-style: italic; margin: 3pt 0 6pt; }
    .doc-nota { font-size: 9pt; margin: 0 0 6pt; }
    .doc-delibera { border: 0.75pt solid #000; padding: 8pt 10pt; margin: 0 0 8pt; }
    .doc-delibera p:last-child { margin-bottom: 0; }

    .doc-righe { margin: 2pt 0 8pt; }
    .doc-riga { display: block; border-bottom: 0.5pt solid #999; height: 15pt; }

    .doc-scheda { page-break-before: auto; }
    .doc-scheda + .doc-scheda { margin-top: 14pt; padding-top: 10pt; border-top: 1.5pt solid #000; }
    .doc-scheda-nuova { page-break-before: always; }
    .doc-scheda > h2:first-child { margin-top: 0; }

    /* Schede allegate al Piano: una per pagina, quindi il passo va stretto. */
    .doc-compatta { font-size: 9.5pt; }
    .doc-compatta h2 { font-size: 10.5pt; margin: 9pt 0 4pt; }
    .doc-compatta h2:first-of-type { margin-top: 0; }
    .doc-compatta h3 { font-size: 9.5pt; margin: 6pt 0 3pt; }
    .doc-compatta p { margin: 0 0 4pt; }
    .doc-compatta .doc-tab { margin-bottom: 6pt; }
    .doc-compatta .doc-tab th,
    .doc-compatta .doc-tab td { padding: 2.5pt 4pt; font-size: 8.5pt; }
    .doc-compatta .doc-lista { margin-bottom: 4pt; }
    .doc-compatta .doc-lista li { margin-bottom: 1.5pt; }
    .doc-compatta .doc-fonte { margin: 2pt 0 4pt; font-size: 7.5pt; }

    .doc-firme { width: 100%; border-collapse: collapse; margin-top: 16pt; }
    .doc-firme td {
        width: 50%;
        border: none;
        padding: 22pt 8pt 3pt;
        font-size: 9pt;
        vertical-align: bottom;
    }
    .doc-firme .linea { border-bottom: 0.5pt solid #000; height: 1pt; padding: 0; }
    .doc-piede { margin-top: 14pt; font-size: 8pt; color: #444; border-top: 0.5pt solid #999; padding-top: 4pt; }

    p.MsoFooter { font-size: 8pt; color: #444; margin: 0; text-align: center; }

    @media screen { body { max-width: 21cm; margin: 0 auto; padding: 16px; } }
`;
    }

    function testata() {
        return `<div class="doc-testata">
            <p class="doc-istituto">${esc(ISTITUTO)}</p>
            <p class="doc-sede">${esc(SEDE)}</p>
            <p class="doc-indirizzo">${esc(INDIRIZZO)}</p>
        </div>
        <hr class="doc-filo">`;
    }

    // Riferimenti normativi in coda: la richiesta del consiglio è che il
    // documento dica su quale norma si regge, non che lo si dia per scontato.
    function bloccoRiferimenti(titolo = 'Riferimenti normativi') {
        const voci = RIFERIMENTI.map(voce =>
            `<li><strong>${esc(voce.norma)}</strong> — ${esc(voce.oggetto)}</li>`).join('');
        return `<section class="doc-sezione">
            <h2>${esc(titolo)}</h2>
            <ul class="doc-lista">${voci}</ul>
        </section>`;
    }

    // Le parole della scheda con la loro definizione e la norma che le regge.
    // Serve a chi legge il documento fuori dal consiglio — dirigenza, famiglie,
    // ispezione — e non ha davanti il glossario del sito.
    const TERMINI_SCHEDA = ['uda', 'competenza', 'traguardo-intermedio', 'situazione-problema',
        'compito-di-realta', 'abilita', 'saperi-essenziali', 'quadro-orario', 'rubrica',
        'livelli-padronanza', 'qnq'];

    function bloccoGlossario(termini = TERMINI_SCHEDA, titolo = 'Glossario dei termini usati nella scheda') {
        if (!GLOSSARIO.length) return '';
        const voci = termini
            .map(chiave => GLOSSARIO.find(voce => voce.id === chiave))
            .filter(Boolean)
            .map(voce => {
                const fonti = (voce.riferimenti || [])
                    .map(riferimento => riferimento.luogo
                        ? `${siglaNorma(riferimento.fonte)}, ${riferimento.luogo}`
                        : siglaNorma(riferimento.fonte))
                    .join('; ');
                const avvertenza = voce.avvertenza ? ` <em>${esc(voce.avvertenza)}</em>` : '';
                return `<li><strong>${esc(voce.termine)}</strong> — ${esc(voce.definizione)}${avvertenza}${fonti ? `<br><span class="doc-ins">Fonte: ${esc(fonti)}</span>` : ''}</li>`;
            }).join('');
        if (!voci) return '';
        return `<section class="doc-sezione">
            <h2>${esc(titolo)}</h2>
            <ul class="doc-lista">${voci}</ul>
        </section>`;
    }

    function documento({ titolo, corpo, nomeDocumento }) {
        const nome = esc(nomeDocumento || titolo || 'Documento');
        return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="it">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Curricolo Verticale SSAS">
<title>${nome}</title>
<!--[if gte mso 9]><xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
<style>${stile()}</style>
</head>
<body>
<div class="WordSection1">
${corpo}
</div>
<div style="mso-element:footer" id="f1">
<p class="MsoFooter">${esc(ISTITUTO)} — ${nome} — pag. <span style="mso-field-code: PAGE "></span> di <span style="mso-field-code: NUMPAGES "></span></p>
</div>
</body>
</html>`;
    }

    // ------------------------------------------------------------------
    // Consegna: file Word e stampa
    // ------------------------------------------------------------------

    function scaricaWord(nome, html) {
        // Il BOM davanti all'HTML è quello che fa aprire a Word il file come
        // UTF-8: senza, le vocali accentate arrivano corrotte.
        const blob = new Blob(['﻿' + html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const collegamento = document.createElement('a');
        collegamento.href = url;
        collegamento.download = nome;
        document.body.appendChild(collegamento);
        collegamento.click();
        document.body.removeChild(collegamento);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function stampa(html) {
        const telaio = document.createElement('iframe');
        telaio.setAttribute('aria-hidden', 'true');
        telaio.setAttribute('title', 'Anteprima di stampa');
        telaio.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
        telaio.srcdoc = html;
        telaio.addEventListener('load', () => {
            const finestra = telaio.contentWindow;
            if (!finestra) return telaio.remove();
            // Il foglio va rimosso solo dopo che la finestra di stampa si è
            // chiusa: toglierlo subito annullerebbe la stampa in Safari.
            const chiudi = () => setTimeout(() => telaio.remove(), 500);
            finestra.addEventListener('afterprint', chiudi);
            try {
                finestra.focus();
                finestra.print();
            } catch (errore) {
                console.error('Stampa non disponibile:', errore);
                telaio.remove();
                return;
            }
            setTimeout(chiudi, 60000);
        }, { once: true });
        document.body.appendChild(telaio);
    }

    // ------------------------------------------------------------------
    // Scheda della singola UDA
    // ------------------------------------------------------------------

    function insegnamentiOrdinati(uda) {
        const punteggio = new Map();
        [...(uda.abilita || []), ...(uda.saperi || [])].forEach(voce => {
            (voce.ins || []).forEach((insegnamento, posizione) => {
                punteggio.set(insegnamento, (punteggio.get(insegnamento) || 0) + (posizione === 0 ? 10 : 1));
            });
        });
        return [...punteggio.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))
            .map(voce => voce[0]);
    }

    function vociConInsegnamenti(voci) {
        if (!voci || !voci.length) return '';
        const righe = voci.map(voce => [
            esc(voce.t ?? voce),
            `<span class="doc-ins">${esc((voce.ins || []).map(etichettaInsegnamento).join(' · '))}</span>`
        ]);
        return tabellaColonne(['Voce', 'Insegnamenti referenti'], righe, 'doc-tab-voci');
    }

    function competenzeUda(uda, contesto) {
        const voci = [];
        const meta = contesto.meta || {};
        if (uda.competenza && meta.competenze) {
            voci.push(`<strong>C${esc(uda.competenza)}</strong> — ${esc(meta.competenze[String(uda.competenza)] || '')} <span class="doc-ins">(Allegato 2-I, D.M. 92/2018)</span>`);
        }
        (uda.competenzeSSAS || []).forEach(numero => {
            const titolo = (meta.competenzeSSAS || {})[String(numero)] || (meta.competenze || {})[String(numero)] || '';
            voci.push(`<strong>C${esc(numero)}</strong> — ${esc(titolo)} <span class="doc-ins">(competenza di indirizzo SSAS)</span>`);
        });
        (uda.competenzeGenerali || []).forEach(numero => {
            const titolo = (meta.competenzeGenerali || {})[String(numero)] || '';
            voci.push(`<strong>G${esc(numero)}</strong> — ${esc(titolo)} <span class="doc-ins">(area generale, Allegato 1 al D.M. 92/2018)</span>`);
        });
        (uda.competenzeEuropee || []).forEach(nome => {
            voci.push(`${esc(nome)} <span class="doc-ins">(competenza chiave europea 2018)</span>`);
        });
        return elencoPuntato(voci);
    }

    function tabellaOre(uda, contesto) {
        const ripartizione = (contesto.ripartizione || {})[String(uda.id)];
        if (!ripartizione || !ripartizione.voci || !ripartizione.voci.length) {
            const insegnamenti = insegnamentiOrdinati(uda);
            if (!insegnamenti.length) return '';
            return `<p>${esc(insegnamenti.map(etichettaInsegnamento).join(' · '))}</p>`;
        }
        const righe = ripartizione.voci.map(voce => [
            esc(etichettaInsegnamento(voce.ins)),
            `<span class="num">${esc(voce.oreSett)}</span>`,
            `<span class="num">${voce.min === voce.max ? esc(voce.min) : `${esc(voce.min)}–${esc(voce.max)}`}</span>`
        ]);
        const totaleMin = ripartizione.voci.reduce((somma, voce) => somma + (voce.min || 0), 0);
        const totaleMax = ripartizione.voci.reduce((somma, voce) => somma + (voce.max || 0), 0);
        const tabella = tabellaColonne(
            ['Insegnamento', 'Ore settimanali', 'Ore nell’UDA'],
            [...righe, [
                '<strong>Totale</strong>',
                '<span class="num">—</span>',
                `<span class="num"><strong>${totaleMin === totaleMax ? totaleMin : `${totaleMin}–${totaleMax}`}</strong></span>`
            ]],
            'doc-tab-ore'
        );
        // Le UDA di formazione scuola-lavoro non hanno un monte ore proprio: il
        // totale qui sopra è convenzionale e va detto, o sembra deliberato.
        const nota = ripartizione.convenzionale
            ? '<p class="doc-nota">Monte ore convenzionale, usato solo per rendere calcolabile la ripartizione: quello effettivo è deliberato nel piano di formazione scuola-lavoro d’istituto e nel progetto formativo individuale.</p>'
            : '';
        return tabella + nota;
    }

    // Le fasi standard diventano le righe della tabella delle attività: il
    // consiglio ci scrive dentro tempi e metodologie invece di ricopiare
    // l'impianto ogni volta.
    function tabellaFasi(contesto) {
        const fasi = (contesto.meta && contesto.meta.fasiStandard) || [
            'Attivazione e consegna del compito',
            'Sviluppo dei saperi essenziali nelle discipline',
            'Realizzazione del compito di realtà',
            'Presentazione, valutazione con rubrica e autovalutazione'
        ];
        const righe = fasi.map((fase, indice) => [
            `<span class="num">${indice + 1}</span>`,
            esc(fase),
            '&nbsp;',
            '&nbsp;',
            '&nbsp;'
        ]);
        return tabellaColonne(['#', 'Fase', 'Attività degli studenti', 'Metodologia e strumenti', 'Ore'], righe, 'doc-tab-fasi');
    }

    // Il campo dice cose diverse nei tre cataloghi: nelle UDA d'asse è la
    // descrizione del materiale già prodotto, nelle altre solo un sì o un no.
    function materialiSviluppati(uda) {
        const valore = uda.sviluppata;
        if (valore === true) return 'Materiali già disponibili';
        if (!valore) return '';
        return esc(valore);
    }

    function intestazioneUda(uda, contesto) {
        const meta = contesto.meta || {};
        const genere = contesto.genere || 'asse';
        const nomeGenere = genere === 'trasversale' ? 'UDA trasversale'
            : genere === 'fsl' ? 'UDA di formazione scuola-lavoro'
            : 'UDA d’asse';
        return tabellaVoci([
            ['Codice e denominazione', `<strong>${esc(uda.id)} — ${esc(uda.titolo)}</strong>`],
            ['Tipologia', esc(nomeGenere)],
            ['Anno di corso', esc(ANNO_ETICHETTA[uda.anno] || uda.anno)],
            ['Periodo', esc(uda.periodo || '')],
            ['Area di tirocinio', esc(uda.areaTirocinio || '')],
            ['Assi culturali coinvolti', esc((uda.assi || []).join(' · '))],
            ['Livello QNQ di riferimento', esc(uda.qnq || '')],
            ['Monte ore indicativo', esc(uda.ore || '')],
            ['Materiali già sviluppati', materialiSviluppati(uda)],
            ['Fonte del curricolo', esc(meta.titolo || '')]
        ]);
    }

    // Scheda completa: le sezioni con i dati del curricolo sono compilate, le
    // altre restano da compilare in consiglio ma già intitolate e numerate
    // secondo il format delle Linee guida.
    function schedaUda(uda, contesto = {}) {
        const compatta = contesto.compatta === true;
        const parti = [];

        parti.push(sezione('1', 'Denominazione e collocazione', intestazioneUda(uda, contesto)));

        const competenze = competenzeUda(uda, contesto);
        const traguardo = paragrafo(uda.traguardo);
        if (competenze || traguardo) {
            parti.push(sezione('2', 'Competenze di riferimento e traguardo intermedio',
                `${competenze}${traguardo ? `<h3>Traguardo intermedio</h3>${traguardo}` : ''}`,
                'Competenze del profilo di uscita — D.M. 92/2018, Allegato 2-I; traguardi intermedi — Linee guida D.M. 766/2019, Parte seconda.'));
        }

        parti.push(sezione('3', 'Contestualizzazione — situazione-problema', paragrafo(uda.situazione)));

        const compito = [
            uda.compito ? `<h3>Compito di realtà</h3>${paragrafo(uda.compito)}` : '',
            uda.prodotto && uda.prodotto !== uda.compito ? `<h3>Prodotto atteso</h3>${paragrafo(uda.prodotto)}` : '',
            tabellaVoci([
                ['Beneficiari', esc(uda.beneficiari || '')],
                ['Ambito del prodotto', esc(uda.ambito || '')]
            ])
        ].join('');
        parti.push(sezione('4', 'Compito di realtà, prodotto e destinatari', compito));

        parti.push(sezione('5', 'Abilità mobilitate', vociConInsegnamenti(uda.abilita)));
        parti.push(sezione('6', 'Saperi essenziali', vociConInsegnamenti(uda.saperi)));
        if ((uda.integrazioniSaperi || []).length) {
            parti.push(sezione('6 bis', 'Saperi integrativi proposti dai docenti',
                elencoPuntato((uda.integrazioniSaperi || []).map(voce => esc(voce.t ?? voce)))));
        }

        parti.push(sezione('7', 'Insegnamenti coinvolti e ripartizione oraria', tabellaOre(uda, contesto),
            'Proposta proporzionale calcolata sul quadro orario d’istituto. Lo scostamento massimo del 40% è una regola operativa dell’applicativo, ferma restando la copertura del monte ore complessivo.'));

        if (compatta) return parti.filter(Boolean).join('');

        parti.push(sezione('8', 'Fasi di applicazione e attività degli studenti', tabellaFasi(contesto),
            'Format dell’unità di apprendimento — Linee guida D.M. 766/2019, Box n. 8.'));

        parti.push(sezione('9', 'Attività di accompagnamento dei docenti', righeDaCompilare(4)));

        parti.push(sezione('10', 'Prodotti in esito e documentazione del percorso', righeDaCompilare(4)));

        const valutazione = (contesto.meta && contesto.meta.valutazioneStandard) || '';
        parti.push(sezione('11', 'Criteri per la valutazione e la certificazione',
            `${valutazione ? `<p>${esc(valutazione)}</p>` : ''}
            ${tabellaColonne(['Evidenza osservabile', 'Livello iniziale', 'Livello base', 'Livello intermedio', 'Livello avanzato'],
                [['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;'], ['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;'], ['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;']],
                'doc-tab-rubrica')}`,
            'Rubrica ad almeno quattro livelli — Linee guida D.M. 766/2019, Box n. 8, voce 8; valutazione di competenze, abilità e conoscenze in relazione alle UDA e al PFI — D.M. 92/2018, art. 4, comma 6.'));

        parti.push(sezione('12', 'Note del consiglio di classe', righeDaCompilare(3)));

        return parti.filter(Boolean).join('');
    }

    // Documento pronto per una sola UDA: testata, titolo, scheda, riferimenti,
    // firme del referente e del coordinatore.
    function documentoUda(uda, contesto = {}) {
        const nomeDocumento = `UDA ${uda.id} — ${uda.titolo}`;
        const corpo = `
${testata()}
<p class="doc-occhiello">Unità di apprendimento</p>
<h1>${esc(uda.titolo)}</h1>
<p class="doc-sottotitolo">${esc(uda.id)} · ${esc(ANNO_ETICHETTA[uda.anno] || '')}${uda.qnq ? ` · Livello QNQ ${esc(uda.qnq)}` : ''}</p>
<p class="doc-catenaccio">Scheda redatta secondo il format delle Linee guida dell’istruzione professionale (D.M. 766/2019, Box n. 8)</p>
${schedaUda(uda, contesto)}
${bloccoGlossario()}
${bloccoRiferimenti()}
<table class="doc-firme">
    <tr><td class="linea"></td><td class="linea"></td></tr>
    <tr><td>Il/La docente referente dell’UDA</td><td>Il/La coordinatore/coordinatrice del consiglio di classe</td></tr>
</table>
<p class="doc-piede">Documento generato dal Curricolo Verticale SSAS dell’${esc(ISTITUTO)} — ${esc(SEDE)}. Il profilo finale deriva dal D.M. 92/2018, Allegato 2-I; i risultati intermedi dalle Linee guida D.M. 766/2019, Parte seconda, Allegato C, sezione i).</p>`;
        return { html: documento({ titolo: nomeDocumento, corpo, nomeDocumento }), nomeDocumento };
    }

    window.CurricoloDocumento = {
        ISTITUTO,
        SEDE,
        INDIRIZZO,
        RIFERIMENTI,
        GLOSSARIO,
        pronto,
        bloccoGlossario,
        ANNO_ETICHETTA,
        esc,
        paragrafo,
        nomeFile,
        dataItaliana,
        tabellaVoci,
        tabellaColonne,
        elencoPuntato,
        righeDaCompilare,
        sezione,
        testata,
        bloccoRiferimenti,
        documento,
        scaricaWord,
        stampa,
        insegnamentiOrdinati,
        etichettaInsegnamento,
        schedaUda,
        documentoUda
    };
})();
