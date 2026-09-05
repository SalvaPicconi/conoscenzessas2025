// Generatore di documenti Word veri (.docx) e della loro versione a schermo.
//
// Prima i documenti erano HTML con l'estensione .doc. È un trucco vecchio che
// ha smesso di funzionare: Word 2016 e successivi rifiutano il file perché il
// contenuto non corrisponde all'estensione, Pages e Google Documenti non lo
// aprono affatto, e quando Word riesce ad aprirlo lo tratta come pagina web —
// al primo salvataggio pianta accanto al documento la cartella «nome_files»
// con dentro fogli di stile e immagini.
//
// Qui il .docx si scrive per davvero: è un archivio ZIP con dentro le parti
// XML del formato Office Open XML (ECMA-376). Non servono librerie esterne —
// il sito non ne carica nessuna — quindi ci sono anche il CRC32 e lo ZIP,
// scritti senza compressione: un archivio «stored» è valido e sta in pochi
// chilobyte.
//
// Il contenuto si descrive una volta sola, come elenco di blocchi, e da lì
// escono due rese: il .docx e l'HTML che il browser stampa in PDF. Così il
// documento consegnato al consiglio è lo stesso che si è visto a schermo.

(function () {
    'use strict';

    // ------------------------------------------------------------------
    // Modello: i blocchi con cui si descrive un documento
    // ------------------------------------------------------------------

    function testo(valore, opzioni = {}) {
        return { t: String(valore ?? ''), ...opzioni };
    }

    function frammenti(valore) {
        if (valore === undefined || valore === null) return [];
        if (Array.isArray(valore)) return valore.map(voce => (typeof voce === 'object' ? voce : testo(voce)));
        if (typeof valore === 'object') return [valore];
        return [testo(valore)];
    }

    const blocchi = {
        titolo: (livello, contenuto, numero) => ({ b: 'titolo', livello, frammenti: frammenti(contenuto), numero }),
        paragrafo: (contenuto, stile) => ({ b: 'paragrafo', frammenti: frammenti(contenuto), stile }),
        tabella: (spec) => ({ b: 'tabella', ...spec }),
        elenco: (voci, ordinato = false) => ({ b: 'elenco', ordinato, voci: voci.map(frammenti) }),
        righe: (quantita = 3) => ({ b: 'righe', quantita }),
        interruzione: () => ({ b: 'interruzione' }),
        linea: () => ({ b: 'linea' }),
        riquadro: (nodi) => ({ b: 'riquadro', nodi }),
        firme: (colonne) => ({ b: 'firme', colonne })
    };

    // ------------------------------------------------------------------
    // Utilità
    // ------------------------------------------------------------------

    function esc(valore) {
        if (valore === undefined || valore === null) return '';
        return String(valore).replace(/[&<>"']/g, carattere =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[carattere]));
    }

    // Nell'XML del pacchetto gli apici non vanno toccati, ma i caratteri di
    // controllo sì: uno solo rende il documento illeggibile a Word.
    function escXml(valore) {
        return String(valore ?? '')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function nomeFile(parti, estensione) {
        const base = (Array.isArray(parti) ? parti : [parti]).filter(Boolean).join(' ')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .slice(0, 90)
            .replace(/^-+|-+$/g, '');
        return `${base || 'documento'}.${estensione}`;
    }

    const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    // ------------------------------------------------------------------
    // ZIP senza compressione
    // ------------------------------------------------------------------

    const tabellaCrc = (() => {
        const tabella = new Uint32Array(256);
        for (let i = 0; i < 256; i += 1) {
            let valore = i;
            for (let bit = 0; bit < 8; bit += 1) {
                valore = valore & 1 ? (valore >>> 1) ^ 0xedb88320 : valore >>> 1;
            }
            tabella[i] = valore >>> 0;
        }
        return tabella;
    })();

    function crc32(byte) {
        let crc = 0xffffffff;
        for (let i = 0; i < byte.length; i += 1) {
            crc = (crc >>> 8) ^ tabellaCrc[(crc ^ byte[i]) & 0xff];
        }
        return (crc ^ 0xffffffff) >>> 0;
    }

    function scriviZip(voci, mime = MIME_DOCX) {
        const codificatore = new TextEncoder();
        const preparate = voci.map(voce => {
            const dati = codificatore.encode(voce.contenuto);
            return { nome: codificatore.encode(voce.nome), dati, crc: crc32(dati) };
        });

        // Data e ora in formato MS-DOS: Word non le guarda, ma un archivio con
        // zeri lì dentro insospettisce qualche estrattore.
        const adesso = new Date();
        const ora = ((adesso.getHours() << 11) | (adesso.getMinutes() << 5) | Math.floor(adesso.getSeconds() / 2)) & 0xffff;
        const data = (((adesso.getFullYear() - 1980) << 9) | ((adesso.getMonth() + 1) << 5) | adesso.getDate()) & 0xffff;

        const pezzi = [];
        const centrale = [];
        let posizione = 0;

        preparate.forEach(voce => {
            const testata = new DataView(new ArrayBuffer(30));
            testata.setUint32(0, 0x04034b50, true);
            testata.setUint16(4, 20, true);        // versione necessaria
            testata.setUint16(6, 0, true);         // nessun flag
            testata.setUint16(8, 0, true);         // metodo 0: nessuna compressione
            testata.setUint16(10, ora, true);
            testata.setUint16(12, data, true);
            testata.setUint32(14, voce.crc, true);
            testata.setUint32(18, voce.dati.length, true);
            testata.setUint32(22, voce.dati.length, true);
            testata.setUint16(26, voce.nome.length, true);
            testata.setUint16(28, 0, true);
            pezzi.push(new Uint8Array(testata.buffer), voce.nome, voce.dati);

            const voceCentrale = new DataView(new ArrayBuffer(46));
            voceCentrale.setUint32(0, 0x02014b50, true);
            voceCentrale.setUint16(4, 20, true);   // versione di chi ha scritto
            voceCentrale.setUint16(6, 20, true);
            voceCentrale.setUint16(8, 0, true);
            voceCentrale.setUint16(10, 0, true);
            voceCentrale.setUint16(12, ora, true);
            voceCentrale.setUint16(14, data, true);
            voceCentrale.setUint32(16, voce.crc, true);
            voceCentrale.setUint32(20, voce.dati.length, true);
            voceCentrale.setUint32(24, voce.dati.length, true);
            voceCentrale.setUint16(28, voce.nome.length, true);
            voceCentrale.setUint32(42, posizione, true);
            centrale.push(new Uint8Array(voceCentrale.buffer), voce.nome);

            posizione += 30 + voce.nome.length + voce.dati.length;
        });

        const inizioCentrale = posizione;
        let lunghezzaCentrale = 0;
        centrale.forEach(pezzo => { lunghezzaCentrale += pezzo.length; });

        const coda = new DataView(new ArrayBuffer(22));
        coda.setUint32(0, 0x06054b50, true);
        coda.setUint16(8, preparate.length, true);
        coda.setUint16(10, preparate.length, true);
        coda.setUint32(12, lunghezzaCentrale, true);
        coda.setUint32(16, inizioCentrale, true);

        return new Blob([...pezzi, ...centrale, new Uint8Array(coda.buffer)], { type: mime });
    }

    // ------------------------------------------------------------------
    // Resa in WordprocessingML
    // ------------------------------------------------------------------

    const PAGINA = {
        larghezza: 11906,   // A4 in twip (1/20 di punto)
        altezza: 16838,
        margine: 1134,      // 2 cm
        margineAlto: 1134
    };
    const LARGHEZZA_UTILE = PAGINA.larghezza - PAGINA.margine * 2;
    // Mezzi punti: 18 vale 9pt, la misura del testo dentro le tabelle.
    const MISURA_CELLA = 18;

    function corsaDocx(frammento, dimensione) {
        const proprieta = [];
        if (frammento.grassetto) proprieta.push('<w:b/>');
        if (frammento.corsivo) proprieta.push('<w:i/>');
        if (frammento.piccolo) {
            const misura = dimensione ? dimensione - 2 : 16;
            proprieta.push(`<w:color w:val="444444"/><w:sz w:val="${misura}"/><w:szCs w:val="${misura}"/>`);
        } else if (dimensione) {
            proprieta.push(`<w:sz w:val="${dimensione}"/><w:szCs w:val="${dimensione}"/>`);
        }
        const rPr = proprieta.length ? `<w:rPr>${proprieta.join('')}</w:rPr>` : '';
        // Gli a capo dentro un campo libero restano a capo anche nel documento.
        const parti = String(frammento.t ?? '').split('\n');
        const contenuto = parti.map((riga, indice) =>
            `${indice ? '<w:br/>' : ''}<w:t xml:space="preserve">${escXml(riga)}</w:t>`).join('');
        return `<w:r>${rPr}${contenuto}</w:r>`;
    }

    const STILI_PARAGRAFO = {
        istituto: { grassetto: true, allineamento: 'center', dopo: 0 },
        sede: { allineamento: 'center', dopo: 0, dimensione: 19 },
        indirizzo: { allineamento: 'center', corsivo: true, dopo: 120, dimensione: 19 },
        occhiello: { allineamento: 'center', dimensione: 19, maiuscoletto: true, dopo: 60 },
        sottotitolo: { allineamento: 'center', grassetto: true, dopo: 40 },
        catenaccio: { allineamento: 'center', corsivo: true, dimensione: 19, dopo: 240 },
        fonte: { corsivo: true, dimensione: 16, colore: '444444', dopo: 120 },
        nota: { dimensione: 18, dopo: 120 },
        piede: { dimensione: 16, colore: '444444', prima: 240, dopo: 0 }
    };

    function paragrafoDocx(nodo) {
        const stile = STILI_PARAGRAFO[nodo.stile] || {};
        // L'ordine dei figli di w:pPr e w:rPr non è libero: lo schema ECMA-376
        // lo fissa, e chi lo rispetta meno di Word — LibreOffice, Google
        // Documenti, Pages — dichiara il file danneggiato.
        const proprieta = [];
        proprieta.push(`<w:spacing w:before="${stile.prima ?? 0}" w:after="${stile.dopo ?? 120}" w:line="264" w:lineRule="auto"/>`);
        if (stile.allineamento) proprieta.push(`<w:jc w:val="${stile.allineamento}"/>`);
        const rPr = [];
        if (stile.grassetto) rPr.push('<w:b/>');
        if (stile.corsivo) rPr.push('<w:i/>');
        if (stile.maiuscoletto) rPr.push('<w:caps/>');
        if (stile.colore) rPr.push(`<w:color w:val="${stile.colore}"/>`);
        if (stile.maiuscoletto) rPr.push('<w:spacing w:val="30"/>');
        if (stile.dimensione) rPr.push(`<w:sz w:val="${stile.dimensione}"/><w:szCs w:val="${stile.dimensione}"/>`);
        if (rPr.length) proprieta.push(`<w:rPr>${rPr.join('')}</w:rPr>`);

        const corse = nodo.frammenti.map(frammento => corsaDocx({
            ...frammento,
            grassetto: frammento.grassetto || stile.grassetto,
            corsivo: frammento.corsivo || stile.corsivo
        }));
        return `<w:p><w:pPr>${proprieta.join('')}</w:pPr>${corse.join('')}</w:p>`;
    }

    function titoloDocx(nodo) {
        const etichetta = nodo.numero ? [testo(`${nodo.numero}  `, { grassetto: true })] : [];
        const corse = [...etichetta, ...nodo.frammenti].map(frammento => corsaDocx({ ...frammento, grassetto: true }));
        return `<w:p><w:pPr><w:pStyle w:val="Titolo${nodo.livello}"/><w:keepNext/></w:pPr>${corse.join('')}</w:p>`;
    }

    function cellaDocx(cella, larghezza, intestazione) {
        const voce = typeof cella === 'object' && cella !== null && !Array.isArray(cella) && 'frammenti' in cella
            ? cella
            : { frammenti: frammenti(cella) };
        const sfondo = voce.sfondo || (intestazione ? 'E8E8E8' : null);
        const bordi = '<w:tcBorders>'
            + ['top', 'left', 'bottom', 'right'].map(lato =>
                `<w:${lato} w:val="single" w:sz="4" w:space="0" w:color="666666"/>`).join('')
            + '</w:tcBorders>';
        const proprieta = `<w:tcPr><w:tcW w:w="${larghezza}" w:type="dxa"/>${bordi}`
            + (sfondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${sfondo}"/>` : '')
            + '<w:vAlign w:val="top"/></w:tcPr>';
        const grassetto = intestazione || voce.grassetto;
        const allineamento = voce.allineamento ? `<w:jc w:val="${voce.allineamento}"/>` : '';
        const corse = voce.frammenti.length
            ? voce.frammenti.map(frammento =>
                corsaDocx({ ...frammento, grassetto: frammento.grassetto || grassetto }, MISURA_CELLA)).join('')
            : `<w:r><w:rPr><w:sz w:val="${MISURA_CELLA}"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`;
        const paragrafo = `<w:p><w:pPr><w:spacing w:before="20" w:after="20"/>${allineamento}`
            + `<w:rPr><w:sz w:val="${MISURA_CELLA}"/><w:szCs w:val="${MISURA_CELLA}"/></w:rPr></w:pPr>`
            + corse + '</w:p>';
        return `<w:tc>${proprieta}${paragrafo}</w:tc>`;
    }

    function tabellaDocx(nodo) {
        const colonne = (nodo.intestazioni && nodo.intestazioni.length)
            || (nodo.righe[0] ? nodo.righe[0].length : 1);
        const percentuali = nodo.larghezze && nodo.larghezze.length === colonne
            ? nodo.larghezze
            : Array.from({ length: colonne }, () => 100 / colonne);
        const larghezze = percentuali.map(percentuale => Math.round(LARGHEZZA_UTILE * percentuale / 100));

        const griglia = `<w:tblGrid>${larghezze.map(l => `<w:gridCol w:w="${l}"/>`).join('')}</w:tblGrid>`;
        const proprieta = '<w:tblPr><w:tblW w:w="5000" w:type="pct"/>'
            + '<w:tblBorders>'
            + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(lato =>
                `<w:${lato} w:val="single" w:sz="4" w:space="0" w:color="666666"/>`).join('')
            + '</w:tblBorders>'
            + '<w:tblLayout w:type="fixed"/>'
            + '<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>'
            + '<w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>'
            + '</w:tblPr>';

        const righe = [];
        if (nodo.intestazioni && nodo.intestazioni.length) {
            // tblHeader ripete l'intestazione su ogni pagina: una tabella lunga
            // che continua senza intestazione non si legge.
            righe.push(`<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${
                nodo.intestazioni.map((cella, indice) => cellaDocx(cella, larghezze[indice], true)).join('')
            }</w:tr>`);
        }
        nodo.righe.forEach(riga => {
            righe.push(`<w:tr><w:trPr><w:cantSplit/></w:trPr>${
                riga.map((cella, indice) => cellaDocx(cella, larghezze[indice] ?? larghezze[0], false)).join('')
            }</w:tr>`);
        });

        return `<w:tbl>${proprieta}${griglia}${righe.join('')}</w:tbl>`
            + '<w:p><w:pPr><w:spacing w:after="120"/><w:rPr><w:sz w:val="8"/></w:rPr></w:pPr></w:p>';
    }

    function elencoDocx(nodo) {
        return nodo.voci.map(voce =>
            `<w:p><w:pPr><w:pStyle w:val="Elenco"/><w:numPr><w:ilvl w:val="0"/>`
            + `<w:numId w:val="${nodo.ordinato ? 2 : 1}"/></w:numPr></w:pPr>`
            + voce.map(corsaDocx).join('') + '</w:p>').join('');
    }

    // Righe da compilare a mano: un bordo inferiore su un paragrafo vuoto.
    function righeDocx(nodo) {
        const riga = '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="999999"/></w:pBdr>'
            + '<w:spacing w:before="0" w:after="180"/></w:pPr></w:p>';
        return riga.repeat(Math.max(1, nodo.quantita));
    }

    function riquadroDocx(nodo) {
        // Word non annida i blocchi: il riquadro è una tabella di una cella.
        const interno = nodo.nodi.map(bloccoDocx).join('');
        const bordi = '<w:tcBorders>'
            + ['top', 'left', 'bottom', 'right'].map(lato =>
                `<w:${lato} w:val="single" w:sz="8" w:space="0" w:color="000000"/>`).join('')
            + '</w:tcBorders>';
        return '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>'
            + '<w:tblLayout w:type="fixed"/>'
            + '<w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/>'
            + '<w:bottom w:w="120" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tblCellMar>'
            + '</w:tblPr>'
            + `<w:tblGrid><w:gridCol w:w="${LARGHEZZA_UTILE}"/></w:tblGrid>`
            + `<w:tr><w:tc><w:tcPr><w:tcW w:w="${LARGHEZZA_UTILE}" w:type="dxa"/>${bordi}</w:tcPr>`
            + (interno || '<w:p/>') + '</w:tc></w:tr></w:tbl>'
            + '<w:p><w:pPr><w:spacing w:after="120"/><w:rPr><w:sz w:val="8"/></w:rPr></w:pPr></w:p>';
    }

    function firmeDocx(nodo) {
        const larghezza = Math.round(LARGHEZZA_UTILE / nodo.colonne.length);
        const cella = etichetta =>
            `<w:tc><w:tcPr><w:tcW w:w="${larghezza}" w:type="dxa"/>`
            + '<w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders>'
            + '</w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="0"/>'
            + '<w:rPr><w:sz w:val="18"/></w:rPr></w:pPr>'
            + `<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${escXml(etichetta)}</w:t></w:r></w:p></w:tc>`;
        const vuota = `<w:tc><w:tcPr><w:tcW w:w="${larghezza}" w:type="dxa"/></w:tcPr>`
            + '<w:p><w:pPr><w:spacing w:before="440" w:after="0"/></w:pPr></w:p></w:tc>';
        return '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/></w:tblPr>'
            + `<w:tblGrid>${nodo.colonne.map(() => `<w:gridCol w:w="${larghezza}"/>`).join('')}</w:tblGrid>`
            + `<w:tr>${nodo.colonne.map(() => vuota).join('')}</w:tr>`
            + `<w:tr>${nodo.colonne.map(cella).join('')}</w:tr></w:tbl>`;
    }

    function bloccoDocx(nodo) {
        switch (nodo.b) {
            case 'titolo': return titoloDocx(nodo);
            case 'paragrafo': return paragrafoDocx(nodo);
            case 'tabella': return tabellaDocx(nodo);
            case 'elenco': return elencoDocx(nodo);
            case 'righe': return righeDocx(nodo);
            case 'riquadro': return riquadroDocx(nodo);
            case 'firme': return firmeDocx(nodo);
            case 'interruzione': return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
            case 'linea': return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="000000"/></w:pBdr><w:spacing w:after="180"/></w:pPr></w:p>';
            default: return '';
        }
    }

    // ------------------------------------------------------------------
    // Parti del pacchetto
    // ------------------------------------------------------------------

    const NS_W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    const INTESTAZIONE_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

    function partiDocx(nodi, meta) {
        const titolo = meta.titolo || 'Documento';
        const corpo = nodi.map(bloccoDocx).join('');
        const sezione = '<w:sectPr>'
            + '<w:footerReference w:type="default" r:id="rId3"/>'
            + `<w:pgSz w:w="${PAGINA.larghezza}" w:h="${PAGINA.altezza}"/>`
            + `<w:pgMar w:top="${PAGINA.margineAlto}" w:right="${PAGINA.margine}" w:bottom="${PAGINA.margineAlto}"`
            + ` w:left="${PAGINA.margine}" w:header="567" w:footer="567" w:gutter="0"/>`
            + '</w:sectPr>';

        return [
            {
                nome: '[Content_Types].xml',
                contenuto: `${INTESTAZIONE_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
                    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                    + '<Default Extension="xml" ContentType="application/xml"/>'
                    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                    + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                    + '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
                    + '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
                    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
                    + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
                    + '</Types>'
            },
            {
                nome: '_rels/.rels',
                contenuto: `${INTESTAZIONE_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
                    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
                    + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
                    + '</Relationships>'
            },
            {
                nome: 'word/_rels/document.xml.rels',
                contenuto: `${INTESTAZIONE_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
                    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
                    + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
                    + '</Relationships>'
            },
            {
                nome: 'word/document.xml',
                contenuto: `${INTESTAZIONE_XML}<w:document ${NS_W} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
                    + `<w:body>${corpo}${sezione}</w:body></w:document>`
            },
            { nome: 'word/styles.xml', contenuto: stiliXml() },
            { nome: 'word/numbering.xml', contenuto: numerazioneXml() },
            { nome: 'word/footer1.xml', contenuto: piedeXml(meta) },
            {
                nome: 'docProps/core.xml',
                contenuto: `${INTESTAZIONE_XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"`
                    + ' xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"'
                    + ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
                    + `<dc:title>${escXml(titolo)}</dc:title>`
                    + `<dc:creator>${escXml(meta.autore || 'Curricolo Verticale SSAS')}</dc:creator>`
                    + `<cp:lastModifiedBy>${escXml(meta.autore || 'Curricolo Verticale SSAS')}</cp:lastModifiedBy>`
                    + `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created>`
                    + `<dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:modified>`
                    + '</cp:coreProperties>'
            },
            {
                nome: 'docProps/app.xml',
                contenuto: `${INTESTAZIONE_XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"`
                    + ' xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
                    + '<Application>Curricolo Verticale SSAS</Application></Properties>'
            }
        ];
    }

    function stiliXml() {
        const titolo = (livello, dimensione, prima) =>
            `<w:style w:type="paragraph" w:styleId="Titolo${livello}"><w:name w:val="heading ${livello}"/>`
            + '<w:basedOn w:val="Normale"/><w:qFormat/>'
            + '<w:pPr><w:keepNext/>'
            + (livello === 2 ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="000000"/></w:pBdr>' : '')
            + `<w:spacing w:before="${prima}" w:after="80"/>`
            + `<w:outlineLvl w:val="${livello - 1}"/></w:pPr>`
            + `<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/><w:b/><w:sz w:val="${dimensione}"/><w:szCs w:val="${dimensione}"/></w:rPr></w:style>`;

        return `${INTESTAZIONE_XML}<w:styles ${NS_W}>`
            + '<w:docDefaults><w:rPrDefault><w:rPr>'
            + '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'
            + '<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="it-IT"/>'
            + '</w:rPr></w:rPrDefault>'
            + '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault>'
            + '</w:docDefaults>'
            + '<w:style w:type="paragraph" w:default="1" w:styleId="Normale"><w:name w:val="Normal"/><w:qFormat/></w:style>'
            + titolo(1, 32, 0)
            + titolo(2, 23, 280)
            + titolo(3, 21, 180)
            + '<w:style w:type="paragraph" w:styleId="Elenco"><w:name w:val="List Paragraph"/>'
            + '<w:basedOn w:val="Normale"/><w:qFormat/>'
            + '<w:pPr><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="220"/></w:pPr></w:style>'
            + '</w:styles>';
    }

    function numerazioneXml() {
        const astratto = (id, formato, testoNumero) =>
            `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="singleLevel"/>`
            + `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${formato}"/>`
            + `<w:lvlText w:val="${testoNumero}"/><w:lvlJc w:val="left"/>`
            + '<w:pPr><w:ind w:left="360" w:hanging="220"/></w:pPr>'
            + (formato === 'bullet' ? '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>' : '')
            + '</w:lvl></w:abstractNum>';
        return `${INTESTAZIONE_XML}<w:numbering ${NS_W}>`
            + astratto(0, 'bullet', '\uF0B7')
            + astratto(1, 'decimal', '%1.')
            + '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
            + '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>'
            + '</w:numbering>';
    }

    function piedeXml(meta) {
        const etichetta = [meta.istituto, meta.titolo].filter(Boolean).join(' — ');
        const misura = '<w:color w:val="444444"/><w:sz w:val="16"/><w:szCs w:val="16"/>';
        const corsa = contenuto =>
            `<w:r><w:rPr>${misura}</w:rPr><w:t xml:space="preserve">${escXml(contenuto)}</w:t></w:r>`;
        const campo = istruzione =>
            `<w:fldSimple w:instr=" ${istruzione} "><w:r><w:rPr>${misura}</w:rPr>`
            + '<w:t>1</w:t></w:r></w:fldSimple>';
        return `${INTESTAZIONE_XML}<w:ftr ${NS_W}>`
            + '<w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr>'
            + corsa(`${etichetta} — pag. `)
            + campo('PAGE')
            + corsa(' di ')
            + campo('NUMPAGES')
            + '</w:p></w:ftr>';
    }

    // ------------------------------------------------------------------
    // Resa a schermo, per la stampa in PDF
    // ------------------------------------------------------------------

    function corsaHtml(frammento) {
        let contenuto = esc(frammento.t).replace(/\n/g, '<br>');
        if (frammento.piccolo) contenuto = `<span class="doc-piccolo">${contenuto}</span>`;
        if (frammento.corsivo) contenuto = `<em>${contenuto}</em>`;
        if (frammento.grassetto) contenuto = `<strong>${contenuto}</strong>`;
        return contenuto;
    }

    function frammentiHtml(elenco) {
        return elenco.map(corsaHtml).join('');
    }

    function cellaHtml(cella, intestazione) {
        const voce = typeof cella === 'object' && cella !== null && !Array.isArray(cella) && 'frammenti' in cella
            ? cella
            : { frammenti: frammenti(cella) };
        const tag = intestazione ? 'th' : 'td';
        const classi = [voce.grassetto ? 'doc-forte' : '', voce.allineamento === 'center' ? 'doc-centro' : ''].filter(Boolean).join(' ');
        const stile = voce.sfondo ? ` style="background:#${voce.sfondo}"` : '';
        return `<${tag}${classi ? ` class="${classi}"` : ''}${stile}>${frammentiHtml(voce.frammenti) || '&nbsp;'}</${tag}>`;
    }

    function bloccoHtml(nodo) {
        switch (nodo.b) {
            case 'titolo': {
                const tag = `h${Math.min(nodo.livello, 4)}`;
                const numero = nodo.numero ? `<span class="doc-num">${esc(nodo.numero)}</span> ` : '';
                return `<${tag}>${numero}${frammentiHtml(nodo.frammenti)}</${tag}>`;
            }
            case 'paragrafo':
                return `<p class="doc-${nodo.stile || 'testo'}">${frammentiHtml(nodo.frammenti)}</p>`;
            case 'tabella': {
                const colgroup = nodo.larghezze && nodo.larghezze.length
                    ? `<colgroup>${nodo.larghezze.map(l => `<col style="width:${l}%">`).join('')}</colgroup>`
                    : '';
                const testa = nodo.intestazioni && nodo.intestazioni.length
                    ? `<thead><tr>${nodo.intestazioni.map(cella => cellaHtml(cella, true)).join('')}</tr></thead>`
                    : '';
                const corpo = nodo.righe.map(riga =>
                    `<tr>${riga.map(cella => cellaHtml(cella, false)).join('')}</tr>`).join('');
                return `<table class="doc-tab">${colgroup}${testa}<tbody>${corpo}</tbody></table>`;
            }
            case 'elenco': {
                const tag = nodo.ordinato ? 'ol' : 'ul';
                return `<${tag} class="doc-lista">${nodo.voci.map(voce => `<li>${frammentiHtml(voce)}</li>`).join('')}</${tag}>`;
            }
            case 'righe':
                return `<div class="doc-righe">${'<span class="doc-riga"></span>'.repeat(Math.max(1, nodo.quantita))}</div>`;
            case 'riquadro':
                return `<div class="doc-riquadro">${nodo.nodi.map(bloccoHtml).join('')}</div>`;
            case 'firme':
                return `<table class="doc-firme"><tr>${nodo.colonne.map(() => '<td class="doc-firma-spazio"></td>').join('')}</tr>`
                    + `<tr>${nodo.colonne.map(voce => `<td class="doc-firma">${esc(voce)}</td>`).join('')}</tr></table>`;
            case 'interruzione':
                return '<div class="doc-salto"></div>';
            case 'linea':
                return '<hr class="doc-filo">';
            default:
                return '';
        }
    }

    function stileHtml() {
        return `
    @page { size: A4; margin: 20mm; }
    body { font-family: Calibri, Carlito, "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.32; color: #000; background: #fff; margin: 0; }
    p { margin: 0 0 6pt; }
    h1, h2, h3, h4 { font-family: Cambria, Caladea, Georgia, serif; page-break-after: avoid; }
    h1 { font-size: 16pt; text-align: center; margin: 0 0 4pt; }
    h2 { font-size: 11.5pt; margin: 14pt 0 4pt; padding-bottom: 2pt; border-bottom: 0.75pt solid #000; }
    h3 { font-size: 10.5pt; margin: 9pt 0 4pt; }
    .doc-num { display: inline-block; min-width: 15pt; font-family: Calibri, Arial, sans-serif; font-size: 9pt; }
    .doc-istituto { text-align: center; font-weight: bold; font-size: 11pt; margin: 0; }
    .doc-sede { text-align: center; font-size: 9.5pt; margin: 0; }
    .doc-indirizzo { text-align: center; font-size: 9.5pt; font-style: italic; margin: 0 0 6pt; }
    .doc-occhiello { text-align: center; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 1.2pt; margin: 0 0 3pt; }
    .doc-sottotitolo { text-align: center; font-size: 11pt; font-weight: bold; margin: 0 0 2pt; }
    .doc-catenaccio { text-align: center; font-size: 9.5pt; font-style: italic; margin: 0 0 12pt; }
    .doc-fonte { font-size: 8pt; color: #444; font-style: italic; margin: 3pt 0 6pt; }
    .doc-nota { font-size: 9pt; margin: 0 0 6pt; }
    .doc-piede { margin-top: 12pt; font-size: 8pt; color: #444; }
    .doc-piccolo { font-size: 8.5pt; color: #333; }
    .doc-filo { border: 0; border-top: 1pt solid #000; margin: 7pt 0 9pt; }
    .doc-salto { page-break-before: always; }
    .doc-tab { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 8pt; }
    .doc-tab th, .doc-tab td { border: 0.5pt solid #666; padding: 3pt 4.5pt; vertical-align: top; font-size: 9pt; text-align: left; word-wrap: break-word; overflow-wrap: anywhere; }
    .doc-tab th { background: #e8e8e8; font-weight: bold; }
    .doc-tab .doc-forte { font-weight: bold; }
    .doc-tab .doc-centro { text-align: center; }
    .doc-tab thead { display: table-header-group; }
    .doc-tab tr { page-break-inside: avoid; }
    .doc-lista { margin: 0 0 6pt; padding-left: 16pt; }
    .doc-lista li { margin-bottom: 2.5pt; }
    .doc-riquadro { border: 0.75pt solid #000; padding: 8pt 10pt; margin: 0 0 8pt; }
    .doc-riquadro p:last-child { margin-bottom: 0; }
    .doc-righe { margin: 2pt 0 8pt; }
    .doc-riga { display: block; border-bottom: 0.5pt solid #999; height: 15pt; }
    .doc-firme { width: 100%; border-collapse: collapse; margin-top: 14pt; }
    .doc-firme td { border: none; padding: 0 8pt; font-size: 9pt; }
    .doc-firma-spazio { height: 34pt; }
    .doc-firma { border-top: 0.5pt solid #000; padding-top: 3pt; }
    @media screen { body { max-width: 21cm; margin: 0 auto; padding: 16px; } }
`;
    }

    function html(nodi, meta = {}) {
        const titolo = esc(meta.titolo || 'Documento');
        return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>${titolo}</title>`
            + `<style>${stileHtml()}</style></head><body>${nodi.map(bloccoHtml).join('')}</body></html>`;
    }

    // ------------------------------------------------------------------
    // Foglio di calcolo vero (.xlsx)
    // ------------------------------------------------------------------
    //
    // Stessa storia del Word: un .xls che dentro è HTML Excel non lo apre più.
    // Qui il foglio è SpreadsheetML in un pacchetto ZIP, con le stringhe scritte
    // in linea invece che nella tabella condivisa — meno parti da tenere
    // coerenti, e per una tabella di poche centinaia di righe non cambia nulla.

    function colonnaExcel(indice) {
        let nome = '';
        let n = indice + 1;
        while (n > 0) {
            const resto = (n - 1) % 26;
            nome = String.fromCharCode(65 + resto) + nome;
            n = Math.floor((n - 1) / 26);
        }
        return nome;
    }

    function cellaExcel(valore, riga, colonna, stile) {
        const testoCella = String(valore ?? '');
        if (!testoCella) return '';
        const riferimento = `${colonnaExcel(colonna)}${riga}`;
        // Un numero resta un numero, così Excel lo somma e lo ordina.
        if (/^-?\d+(?:[.,]\d+)?$/.test(testoCella.trim())) {
            return `<c r="${riferimento}" s="${stile}"><v>${escXml(testoCella.trim().replace(',', '.'))}</v></c>`;
        }
        return `<c r="${riferimento}" t="inlineStr" s="${stile}"><is><t xml:space="preserve">${escXml(testoCella)}</t></is></c>`;
    }

    function foglioXml(foglio) {
        const larghezze = foglio.larghezze || [];
        const colonne = larghezze.length
            ? `<cols>${larghezze.map((l, i) => `<col min="${i + 1}" max="${i + 1}" width="${l}" customWidth="1"/>`).join('')}</cols>`
            : '';
        const righe = [];
        let numero = 0;
        if (foglio.intestazioni && foglio.intestazioni.length) {
            numero += 1;
            righe.push(`<row r="${numero}" ht="28" customHeight="1">${
                foglio.intestazioni.map((cella, i) => cellaExcel(cella, numero, i, 1)).join('')
            }</row>`);
        }
        (foglio.righe || []).forEach(riga => {
            numero += 1;
            righe.push(`<row r="${numero}">${riga.map((cella, i) => cellaExcel(cella, numero, i, 2)).join('')}</row>`);
        });
        const blocca = foglio.intestazioni && foglio.intestazioni.length
            ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
            : '';
        return `${INTESTAZIONE_XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
            + blocca + colonne + `<sheetData>${righe.join('')}</sheetData></worksheet>`;
    }

    function stiliFoglio() {
        return `${INTESTAZIONE_XML}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
            + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
            + '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            // Excel pretende che i primi due riempimenti siano questi due.
            + '<fills count="3"><fill><patternFill patternType="none"/></fill>'
            + '<fill><patternFill patternType="gray125"/></fill>'
            + '<fill><patternFill patternType="solid"><fgColor rgb="FFE8E8E8"/><bgColor indexed="64"/></patternFill></fill></fills>'
            + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
            + '<border><left style="thin"><color rgb="FF999999"/></left><right style="thin"><color rgb="FF999999"/></right>'
            + '<top style="thin"><color rgb="FF999999"/></top><bottom style="thin"><color rgb="FF999999"/></bottom>'
            + '<diagonal/></border></borders>'
            + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            + '<cellXfs count="3">'
            + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
            + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
            + '</cellXfs>'
            + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            + '</styleSheet>';
    }

    function partiXlsx(fogli, meta) {
        const elenco = Array.isArray(fogli) ? fogli : [fogli];
        const parti = [
            {
                nome: '[Content_Types].xml',
                contenuto: `${INTESTAZIONE_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
                    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                    + '<Default Extension="xml" ContentType="application/xml"/>'
                    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                    + elenco.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
                    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
                    + '</Types>'
            },
            {
                nome: '_rels/.rels',
                contenuto: `${INTESTAZIONE_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
                    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
                    + '</Relationships>'
            },
            {
                nome: 'xl/workbook.xml',
                contenuto: `${INTESTAZIONE_XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`
                    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
                    + elenco.map((foglio, i) => `<sheet name="${escXml((foglio.nome || `Foglio ${i + 1}`).slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
                    + '</sheets></workbook>'
            },
            {
                nome: 'xl/_rels/workbook.xml.rels',
                contenuto: `${INTESTAZIONE_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
                    + elenco.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
                    + `<Relationship Id="rId${elenco.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
                    + '</Relationships>'
            },
            { nome: 'xl/styles.xml', contenuto: stiliFoglio() },
            {
                nome: 'docProps/core.xml',
                contenuto: `${INTESTAZIONE_XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"`
                    + ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
                    + `<dc:title>${escXml((meta && meta.titolo) || 'Foglio')}</dc:title>`
                    + `<dc:creator>${escXml((meta && meta.autore) || 'Curricolo Verticale SSAS')}</dc:creator>`
                    + '</cp:coreProperties>'
            }
        ];
        elenco.forEach((foglio, i) => {
            parti.push({ nome: `xl/worksheets/sheet${i + 1}.xml`, contenuto: foglioXml(foglio) });
        });
        return parti;
    }

    function scaricaXlsx(nome, fogli, meta = {}) {
        scarica(scriviZip(partiXlsx(fogli, meta), MIME_XLSX), nome);
    }

    // ------------------------------------------------------------------
    // Consegna
    // ------------------------------------------------------------------

    function scarica(blob, nome) {
        const url = URL.createObjectURL(blob);
        const collegamento = document.createElement('a');
        collegamento.href = url;
        collegamento.download = nome;
        collegamento.rel = 'noopener';
        document.body.appendChild(collegamento);
        collegamento.click();
        document.body.removeChild(collegamento);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function scaricaDocx(nome, nodi, meta = {}) {
        scarica(scriviZip(partiDocx(nodi, meta)), nome);
    }

    // La stampa passa da un iframe fuori schermo invece che da una finestra
    // nuova: le pagine vivono dentro l'iframe della pagina principale e una
    // window.open verrebbe bloccata. L'iframe ha misure vere — uno di 0×0 in
    // certi browser stampa una pagina bianca.
    function stampa(nodi, meta = {}) {
        const telaio = document.createElement('iframe');
        telaio.setAttribute('aria-hidden', 'true');
        telaio.setAttribute('title', 'Anteprima di stampa');
        telaio.style.cssText = 'position:fixed;left:-10000px;top:0;width:21cm;height:29.7cm;border:0;opacity:0;';
        telaio.srcdoc = html(nodi, meta);
        telaio.addEventListener('load', () => {
            const finestra = telaio.contentWindow;
            if (!finestra) return telaio.remove();
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

    window.DocumentoOffice = {
        ...blocchi,
        testo,
        frammenti,
        esc,
        nomeFile,
        html,
        docx: (nodi, meta) => scriviZip(partiDocx(nodi, meta)),
        xlsx: (fogli, meta) => scriviZip(partiXlsx(fogli, meta), MIME_XLSX),
        scaricaDocx,
        scaricaXlsx,
        scarica,
        stampa
    };
})();
