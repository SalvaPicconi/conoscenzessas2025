// Contenuto dei documenti delle UDA: la scheda della singola unità e i pezzi
// che il Piano del coordinatore riusa.
//
// Qui non si scrive né HTML né XML: si compongono i blocchi definiti in
// assets/documento-office.js, che poi li rende in due modi — il file Word vero
// (.docx) e la pagina che il browser stampa in PDF. Il contenuto è descritto
// una volta sola, quindi il documento consegnato al consiglio è lo stesso che
// si è visto a schermo.

(function () {
    'use strict';

    const D = window.DocumentoOffice;
    if (!D) {
        console.error('assets/documento-office.js non è stato caricato: i documenti non si possono comporre.');
        return;
    }

    const ISTITUTO = 'IIS Meucci - Mattei Cagliari';
    const SEDE = 'Sede di Decimomannu';
    const INDIRIZZO = 'Servizi per la Sanità e l’Assistenza Sociale';

    // Riferimenti normativi citati in calce a ogni documento. Sono le fonti su
    // cui si regge il fatto stesso che il percorso sia organizzato in UDA: senza
    // di esse il Piano non è allegabile alla programmazione di classe.
    const RIFERIMENTI = [
        {
            norma: 'D.Lgs. 13 aprile 2017, n. 61',
            oggetto: 'Revisione dei percorsi dell’istruzione professionale. Art. 2, comma 1: l’unità di apprendimento è l’insieme autonomamente significativo di competenze, abilità e conoscenze in cui è organizzato il percorso formativo dello studente e costituisce il riferimento per la valutazione, la certificazione e il riconoscimento dei crediti. Art. 5, comma 1: lett. b) aggregazione delle discipline negli assi culturali; lett. c) progettazione interdisciplinare dei percorsi didattici; lett. d) metodologie di apprendimento di tipo induttivo, con esperienze laboratoriali e in contesti operativi; lett. f) organizzazione per unità di apprendimento.'
        },
        {
            norma: 'D.M. 24 maggio 2018, n. 92',
            oggetto: 'Regolamento sui profili di uscita degli indirizzi dell’istruzione professionale. Art. 4, comma 6: le unità di apprendimento sono quelle «nelle quali è strutturato il Progetto formativo individuale». Art. 4, comma 7: la valutazione ha per oggetto i risultati delle unità di apprendimento. Art. 6, comma 4: la progettazione per unità di apprendimento accompagna l’intero quinquennio. Allegati 2-I e 3-I: profilo di uscita, competenze e quadro orario dell’indirizzo SSAS.'
        },
        {
            norma: 'D.M. 23 agosto 2019, n. 766',
            oggetto: 'Linee guida per favorire e sostenere l’adozione del nuovo assetto didattico e organizzativo dei percorsi di istruzione professionale. Box n. 7: carattere prioritariamente interdisciplinare delle UdA. Box n. 8: format di riferimento dell’UdA e rubrica ad almeno quattro livelli. § 3.2.2: valutazione riferita alle unità di apprendimento e livelli di padronanza.'
        },
        {
            norma: 'D.Lgs. 16 aprile 1994, n. 297, art. 5, comma 8',
            oggetto: 'Il consiglio di classe è presieduto dal dirigente scolastico oppure da un docente, suo delegato, membro del consiglio: è la delega su cui si fonda la funzione di coordinatore del consiglio di classe.'
        },
        {
            norma: 'D.P.R. 8 marzo 1999, n. 275, art. 4',
            oggetto: 'Autonomia didattica delle istituzioni scolastiche nella progettazione, nell’articolazione modulare e nell’aggregazione delle discipline.'
        },
        {
            norma: 'D.Lgs. 13 aprile 2017, n. 62',
            oggetto: 'Norme in materia di valutazione e certificazione delle competenze.'
        },
        {
            norma: 'L. 20 agosto 2019, n. 92 e D.M. 7 settembre 2024, n. 183',
            oggetto: 'Insegnamento trasversale dell’educazione civica e relative Linee guida, per le unità di apprendimento che ne sviluppano i nuclei concettuali (almeno 33 ore annue).'
        },
        {
            norma: 'Raccomandazione del Consiglio UE 22 maggio 2018',
            oggetto: 'Competenze chiave per l’apprendimento permanente, richiamate nelle schede delle UDA trasversali e di formazione scuola-lavoro.'
        }
    ];

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

    function dataItaliana(iso) {
        if (!iso) return '';
        const data = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(data.getTime())) return String(iso);
        return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).format(data);
    }

    // ------------------------------------------------------------------
    // Mattoni comuni
    // ------------------------------------------------------------------

    function testata() {
        return [
            D.paragrafo(ISTITUTO, 'istituto'),
            D.paragrafo(SEDE, 'sede'),
            D.paragrafo(INDIRIZZO, 'indirizzo'),
            D.linea()
        ];
    }

    // Etichetta a sinistra e valore a destra. Le righe senza valore spariscono:
    // una scheda piena di trattini è più difficile da leggere di una corta.
    function tabellaVoci(righe, opzioni = {}) {
        const utili = righe.filter(riga => riga && (opzioni.tieniVuote || testoDi(riga[1]).trim()));
        if (!utili.length) return [];
        return [D.tabella({
            larghezze: [30, 70],
            righe: utili.map(([etichetta, valore]) => [
                { frammenti: D.frammenti(etichetta), grassetto: true, sfondo: 'F2F2F2' },
                { frammenti: D.frammenti(valore) }
            ])
        })];
    }

    function testoDi(valore) {
        if (valore === undefined || valore === null) return '';
        if (Array.isArray(valore)) return valore.map(testoDi).join('');
        if (typeof valore === 'object') return String(valore.t ?? '');
        return String(valore);
    }

    function elencoPuntato(voci) {
        const utili = (voci || []).filter(voce => testoDi(voce).trim());
        return utili.length ? [D.elenco(utili)] : [];
    }

    // Spazio da compilare a mano o in Word: righe rigate al posto del vuoto,
    // così il documento stampato resta un modulo e non un foglio bianco.
    function righeDaCompilare(quantita = 3) {
        return [D.righe(quantita)];
    }

    function sezione(numero, titolo, contenuto, nota) {
        const nodi = (contenuto || []).filter(Boolean);
        if (!nodi.length) return [];
        return [
            D.titolo(2, titolo, numero),
            ...nodi,
            ...(nota ? [D.paragrafo(nota, 'fonte')] : [])
        ];
    }

    function bloccoRiferimenti(titolo = 'Riferimenti normativi') {
        return [
            D.titolo(2, titolo),
            D.elenco(RIFERIMENTI.map(voce => [
                D.testo(voce.norma, { grassetto: true }),
                D.testo(` — ${voce.oggetto}`)
            ]))
        ];
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
        if (!voci || !voci.length) return [];
        return [D.tabella({
            intestazioni: ['Voce', 'Insegnamenti referenti'],
            larghezze: [62, 38],
            righe: voci.map(voce => [
                String(voce.t ?? voce),
                { frammenti: [D.testo((voce.ins || []).map(etichettaInsegnamento).join(' · '), { piccolo: true })] }
            ])
        })];
    }

    function competenzeUda(uda, contesto) {
        const meta = contesto.meta || {};
        const voci = [];
        if (uda.competenza && meta.competenze) {
            voci.push([
                D.testo(`C${uda.competenza}`, { grassetto: true }),
                D.testo(` — ${meta.competenze[String(uda.competenza)] || ''} `),
                D.testo('(Allegato 2-I, D.M. 92/2018)', { piccolo: true })
            ]);
        }
        (uda.competenzeSSAS || []).forEach(numero => {
            const titolo = (meta.competenzeSSAS || {})[String(numero)] || (meta.competenze || {})[String(numero)] || '';
            voci.push([
                D.testo(`C${numero}`, { grassetto: true }),
                D.testo(` — ${titolo} `),
                D.testo('(competenza di indirizzo SSAS)', { piccolo: true })
            ]);
        });
        (uda.competenzeGenerali || []).forEach(numero => {
            voci.push([
                D.testo(`G${numero}`, { grassetto: true }),
                D.testo(` — ${(meta.competenzeGenerali || {})[String(numero)] || ''} `),
                D.testo('(area generale, Allegato 1 al D.M. 92/2018)', { piccolo: true })
            ]);
        });
        (uda.competenzeEuropee || []).forEach(nome => {
            voci.push([
                D.testo(`${nome} `),
                D.testo('(competenza chiave europea 2018)', { piccolo: true })
            ]);
        });
        return voci.length ? [D.elenco(voci)] : [];
    }

    function tabellaOre(uda, contesto) {
        const ripartizione = (contesto.ripartizione || {})[String(uda.id)];
        if (!ripartizione || !ripartizione.voci || !ripartizione.voci.length) {
            const insegnamenti = insegnamentiOrdinati(uda).map(etichettaInsegnamento);
            return insegnamenti.length ? [D.paragrafo(insegnamenti.join(' · '))] : [];
        }
        const intervallo = (min, max) => (min === max ? String(min) : `${min}–${max}`);
        const righe = ripartizione.voci.map(voce => [
            etichettaInsegnamento(voce.ins),
            { frammenti: D.frammenti(String(voce.oreSett)), allineamento: 'center' },
            { frammenti: D.frammenti(intervallo(voce.min, voce.max)), allineamento: 'center' }
        ]);
        const totaleMin = ripartizione.voci.reduce((somma, voce) => somma + (voce.min || 0), 0);
        const totaleMax = ripartizione.voci.reduce((somma, voce) => somma + (voce.max || 0), 0);
        righe.push([
            { frammenti: D.frammenti('Totale'), grassetto: true },
            { frammenti: D.frammenti('—'), allineamento: 'center' },
            { frammenti: D.frammenti(intervallo(totaleMin, totaleMax)), grassetto: true, allineamento: 'center' }
        ]);

        const nodi = [D.tabella({
            intestazioni: ['Insegnamento', 'Ore settimanali', 'Ore nell’UDA'],
            larghezze: [54, 23, 23],
            righe
        })];
        // Le UDA di formazione scuola-lavoro non hanno un monte ore proprio: il
        // totale qui sopra è convenzionale e va detto, o sembra deliberato.
        if (ripartizione.convenzionale) {
            nodi.push(D.paragrafo('Monte ore convenzionale, usato solo per rendere calcolabile la ripartizione: quello effettivo è deliberato nel piano di formazione scuola-lavoro d’istituto e nel progetto formativo individuale.', 'nota'));
        }
        return nodi;
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
        return [D.tabella({
            intestazioni: ['#', 'Fase', 'Attività degli studenti', 'Metodologia e strumenti', 'Ore'],
            larghezze: [5, 30, 27, 27, 11],
            righe: fasi.map((fase, indice) => [
                { frammenti: D.frammenti(String(indice + 1)), allineamento: 'center' },
                fase, '', '', ''
            ])
        })];
    }

    // Il campo dice cose diverse nei tre cataloghi: nelle UDA d'asse è la
    // descrizione del materiale già prodotto, nelle altre solo un sì o un no.
    function materialiSviluppati(uda) {
        if (uda.sviluppata === true) return 'Materiali già disponibili';
        if (!uda.sviluppata) return '';
        return String(uda.sviluppata);
    }

    function nomeGenere(genere) {
        return genere === 'trasversale' ? 'UDA trasversale'
            : genere === 'fsl' ? 'UDA di formazione scuola-lavoro'
            : 'UDA d’asse';
    }

    function intestazioneUda(uda, contesto) {
        return tabellaVoci([
            ['Codice e denominazione', [D.testo(`${uda.id} — ${uda.titolo}`, { grassetto: true })]],
            ['Tipologia', nomeGenere(contesto.genere || 'asse')],
            ['Anno di corso', ANNO_ETICHETTA[uda.anno] || String(uda.anno || '')],
            ['Periodo', uda.periodo || ''],
            ['Area di tirocinio', uda.areaTirocinio || ''],
            ['Assi culturali coinvolti', (uda.assi || []).join(' · ')],
            ['Livello QNQ di riferimento', uda.qnq || ''],
            ['Monte ore indicativo', uda.ore || ''],
            ['Materiali già sviluppati', materialiSviluppati(uda)],
            ['Fonte del curricolo', (contesto.meta && contesto.meta.titolo) || '']
        ]);
    }

    // Scheda completa: le sezioni con i dati del curricolo sono compilate, le
    // altre restano da compilare in consiglio ma già intitolate e numerate
    // secondo il format delle Linee guida.
    function schedaUda(uda, contesto = {}) {
        const compatta = contesto.compatta === true;
        const nodi = [];

        nodi.push(...sezione('1', 'Denominazione e collocazione', intestazioneUda(uda, contesto)));

        const competenze = competenzeUda(uda, contesto);
        const traguardo = uda.traguardo
            ? [D.titolo(3, 'Traguardo intermedio'), D.paragrafo(uda.traguardo)]
            : [];
        nodi.push(...sezione('2', 'Competenze di riferimento e traguardo intermedio',
            [...competenze, ...traguardo],
            'Competenze del profilo di uscita — D.M. 92/2018, Allegato 2-I; traguardi intermedi — Linee guida D.M. 766/2019, Parte seconda.'));

        nodi.push(...sezione('3', 'Contestualizzazione — situazione-problema',
            uda.situazione ? [D.paragrafo(uda.situazione)] : []));

        const compito = [];
        if (uda.compito) compito.push(D.titolo(3, 'Compito di realtà'), D.paragrafo(uda.compito));
        if (uda.prodotto && uda.prodotto !== uda.compito) {
            compito.push(D.titolo(3, 'Prodotto atteso'), D.paragrafo(uda.prodotto));
        }
        compito.push(...tabellaVoci([
            ['Beneficiari', uda.beneficiari || ''],
            ['Ambito del prodotto', uda.ambito || '']
        ]));
        nodi.push(...sezione('4', 'Compito di realtà, prodotto e destinatari', compito));

        nodi.push(...sezione('5', 'Abilità mobilitate', vociConInsegnamenti(uda.abilita)));
        nodi.push(...sezione('6', 'Saperi essenziali', vociConInsegnamenti(uda.saperi)));
        if ((uda.integrazioniSaperi || []).length) {
            nodi.push(...sezione('6 bis', 'Saperi integrativi proposti dai docenti',
                elencoPuntato((uda.integrazioniSaperi || []).map(voce => String(voce.t ?? voce)))));
        }

        nodi.push(...sezione('7', 'Insegnamenti coinvolti e ripartizione oraria', tabellaOre(uda, contesto),
            'Proposta proporzionale calcolata sul quadro orario d’istituto; ogni docente può modificarla entro il 40%, ferma restando la copertura del monte ore complessivo.'));

        if (compatta) return nodi;

        nodi.push(...sezione('8', 'Fasi di applicazione e attività degli studenti', tabellaFasi(contesto),
            'Format dell’unità di apprendimento — Linee guida D.M. 766/2019, Box n. 8.'));
        nodi.push(...sezione('9', 'Attività di accompagnamento dei docenti', righeDaCompilare(4)));
        nodi.push(...sezione('10', 'Prodotti in esito e documentazione del percorso', righeDaCompilare(4)));

        const valutazione = (contesto.meta && contesto.meta.valutazioneStandard) || '';
        nodi.push(...sezione('11', 'Criteri per la valutazione e la certificazione', [
            ...(valutazione ? [D.paragrafo(valutazione)] : []),
            D.tabella({
                intestazioni: ['Evidenza osservabile', 'Livello iniziale', 'Livello base', 'Livello intermedio', 'Livello avanzato'],
                larghezze: [28, 18, 18, 18, 18],
                righe: [['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']]
            })
        ], 'Rubrica ad almeno quattro livelli — Linee guida D.M. 766/2019, Box n. 8, voce 8; la valutazione ha per oggetto i risultati delle UDA — D.M. 92/2018, art. 4, comma 7.'));

        nodi.push(...sezione('12', 'Note del consiglio di classe', righeDaCompilare(3)));
        return nodi;
    }

    // Documento pronto per una sola UDA.
    function documentoUda(uda, contesto = {}) {
        const nomeDocumento = `UDA ${uda.id} — ${uda.titolo}`;
        const nodi = [
            ...testata(),
            D.paragrafo('Unità di apprendimento', 'occhiello'),
            D.titolo(1, uda.titolo),
            D.paragrafo(`${uda.id} · ${ANNO_ETICHETTA[uda.anno] || ''}${uda.qnq ? ` · Livello QNQ ${uda.qnq}` : ''}`, 'sottotitolo'),
            D.paragrafo('Scheda redatta secondo il format delle Linee guida dell’istruzione professionale (D.M. 766/2019, Box n. 8)', 'catenaccio'),
            ...schedaUda(uda, contesto),
            ...bloccoRiferimenti(),
            D.firme(['Il/La docente referente dell’UDA', 'Il/La coordinatore/coordinatrice del consiglio di classe']),
            D.paragrafo(`Documento generato dal Curricolo Verticale SSAS dell’${ISTITUTO} — ${SEDE}. I contenuti disciplinari derivano dal curricolo di indirizzo (D.M. 92/2018, Allegato C).`, 'piede')
        ];
        return { nodi, meta: { titolo: nomeDocumento, istituto: ISTITUTO }, nomeDocumento };
    }

    window.CurricoloDocumento = {
        ISTITUTO,
        SEDE,
        INDIRIZZO,
        RIFERIMENTI,
        ANNO_ETICHETTA,
        blocchi: D,
        esc: D.esc,
        nomeFile: D.nomeFile,
        dataItaliana,
        testoDi,
        testata,
        tabellaVoci,
        elencoPuntato,
        righeDaCompilare,
        sezione,
        bloccoRiferimenti,
        insegnamentiOrdinati,
        etichettaInsegnamento,
        nomeGenere,
        schedaUda,
        documentoUda,
        scaricaDocx: D.scaricaDocx,
        stampa: D.stampa
    };
})();
