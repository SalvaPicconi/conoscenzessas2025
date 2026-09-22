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

    // Riferimenti normativi citati in calce a ogni documento. Distinguono le
    // prescrizioni normative dalle scelte progettuali che il consiglio deve
    // ancora verificare e adottare.
    const RIFERIMENTI = [
        {
            norma: 'D.Lgs. 13 aprile 2017, n. 61',
            oggetto: 'Revisione dei percorsi dell’istruzione professionale. Art. 5, comma 1: lett. a) personalizzazione del percorso e PFI; lett. b) aggregazione delle discipline negli assi culturali; lett. c) progettazione interdisciplinare dei percorsi didattici; lett. d) metodologie di apprendimento di tipo induttivo, con esperienze laboratoriali e in contesti operativi; lett. f) organizzazione per unità di apprendimento.'
        },
        {
            norma: 'D.I. 24 maggio 2018, n. 92',
            oggetto: 'Regolamento sui profili di uscita degli indirizzi dell’istruzione professionale. Art. 2, comma 1: definizioni di unità di apprendimento e PFI, articolato per unità di apprendimento. Art. 4, comma 6: valutazione di competenze, abilità e conoscenze in relazione alle unità di apprendimento nelle quali è strutturato il PFI; comma 7: valutazione intermedia al termine del primo anno. Art. 6, comma 4: progettazione per unità di apprendimento lungo il quinquennio. Allegati 2-I e 3-I: profilo di uscita e quadro orario SSAS.'
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

    // I cataloghi nominano le stesse discipline in modi diversi: le UDA di
    // formazione scuola-lavoro usano le denominazioni in maiuscolo del quadro
    // orario, le altre quelle brevi delle schede. Nel documento vale una sola
    // forma, altrimenti nel riepilogo di terza la stessa materia comparirebbe
    // due volte.
    // Il riconoscimento sta in assets/insegnamenti.js: riporta al nome ufficiale
    // qualunque scrittura, comprese quelle in maiuscolo dei cataloghi FSL e le
    // annotazioni fra parentesi.
    function etichettaInsegnamento(nome) {
        return (window.Insegnamenti && window.Insegnamenti.canonico(nome)) || nome;
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
                voce.notaAttribuzione
                    ? `${String(voce.t ?? voce)}\nNota: ${voce.notaAttribuzione}`
                    : String(voce.t ?? voce),
                { frammenti: [D.testo((voce.ins || []).map(etichettaInsegnamento).join(' · '), { piccolo: true })] }
            ])
        })];
    }

    function competenzeUda(uda, contesto) {
        const meta = contesto.meta || {};
        const voci = [];
        if (uda.competenzaEducazioneCivica) {
            const numero = uda.competenzaEducazioneCivica;
            voci.push([
                D.testo(`EC${numero}`, { grassetto: true }),
                D.testo(` — ${(meta.competenzeEducazioneCivica || {})[String(numero)] || ''} `),
                D.testo('(Educazione civica: Linee guida allegate al D.M. 183/2024)', { piccolo: true })
            ]);
        }
        if (uda.competenza && meta.competenze && !uda.competenze?.length) {
            voci.push([
                D.testo(`C${uda.competenza}`, { grassetto: true }),
                D.testo(` — ${meta.competenze[String(uda.competenza)] || ''} `),
                D.testo('(profilo finale: Allegato 2-I, D.I. 92/2018; risultati intermedi: Linee guida D.M. 766/2019, Allegato C, sezione I)', { piccolo: true })
            ]);
        }
        (uda.competenzeSSAS || uda.competenze || []).forEach(numero => {
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
                D.testo('(area generale: Linee guida D.M. 766/2019, Allegato B)', { piccolo: true })
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
        let ripartizione = (contesto.ripartizione || {})[String(uda.id)];
        // Le UDA scelte dal Dipartimento portano la ripartizione dentro la
        // scheda, come mappa insegnamento → ore: senza questo innesto la
        // tabella uscirebbe vuota proprio dove le ore sono già deliberate.
        if ((!ripartizione || !(ripartizione.voci || []).length) && uda.oreRipartizione) {
            const voci = Object.entries(uda.oreRipartizione)
                .map(([ins, ore]) => ({ ins, oreSett: '—', min: Number(ore) || 0, max: Number(ore) || 0 }));
            if (voci.length) ripartizione = { voci };
        }
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

    // Il campo dice cose diverse nei cataloghi: nelle UDA d'asse è la
    // descrizione del materiale già prodotto, nelle altre solo un sì o un no.
    function materialiSviluppati(uda) {
        if (uda.sviluppata === true) return 'Materiali già disponibili';
        if (!uda.sviluppata) return '';
        return String(uda.sviluppata);
    }

    function nomeGenere(genere) {
        return genere === 'dipartimento' ? 'UDA adottata dal Dipartimento'
            : genere === 'trasversale' ? 'UDA trasversale'
            : genere === 'civica' ? 'UDA di Educazione civica'
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
            'Competenze del profilo di uscita — D.I. 92/2018, Allegato 2-I; risultati intermedi — Linee guida D.M. 766/2019, Allegato C, sezione I.'));

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
            'La proposta iniziale è calcolata sul quadro orario d’istituto. La distribuzione può essere modificata liberamente in base alla progettazione collegiale; l’eventuale differenza rispetto al monte ore indicativo resta visibile.'));

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
        ], 'Rubrica ad almeno quattro livelli — Linee guida D.M. 766/2019, Box n. 8, voce 8; valutazione di competenze, abilità e conoscenze in relazione alle UDA e al PFI — D.I. 92/2018, art. 4, comma 6.'));

        nodi.push(...sezione('12', 'Note del consiglio di classe', righeDaCompilare(3)));
        return nodi;
    }

    // Le schede per la prova professionale dell'Esame non hanno abilità e
    // saperi per insegnamento: hanno una tipologia, i nuclei assegnati, il
    // compito atteso e una griglia su 20 punti. Stampate con il format delle
    // altre uscirebbero mezze vuote, quindi hanno una scheda loro.
    function eScheda(uda) {
        return Array.isArray(uda.nuclei) && Boolean(uda.compitoAtteso);
    }

    function schedaEsame(uda, contesto = {}) {
        const nodi = [];
        const atteso = uda.compitoAtteso || {};

        nodi.push(...sezione('1', 'Quadro della prova', tabellaVoci([
            ['Codice e denominazione', [D.testo(`${uda.id} — ${uda.titolo}`, { grassetto: true })]],
            ['Tipologia', uda.tipologia || ''],
            ['Anno di corso', ANNO_ETICHETTA[uda.anno] || String(uda.anno || '')],
            ['Periodo', uda.periodo || ''],
            ['Durata', uda.durata ? `${uda.durata} ore, di cui ${uda.provaFinaleOre || 0} per la prova individuale` : ''],
            ['Livello QNQ di riferimento', uda.qnq || ''],
            ['Argomento', uda.argomento || ''],
            ['Stato', uda.stato || ''],
            ['Fonte del curricolo', (contesto.meta && contesto.meta.titolo) || '']
        ])));

        nodi.push(...sezione('2', 'Nuclei tematici assegnati',
            elencoPuntato((uda.nuclei || []).map(voce => `Nucleo ${voce.id} — ${voce.testo}`)),
            'Nuclei tematici fondamentali del quadro di riferimento della seconda prova.'));

        nodi.push(...sezione('3', 'Competenze e traguardi',
            elencoPuntato((uda.competenze || []).map(voce => `C${voce.numero} — ${voce.traguardo}`)),
            'Profilo di uscita SSAS — D.I. 92/2018, Allegato 2-I.'));

        nodi.push(...sezione('4', 'Compito atteso', tabellaVoci([
            ['Situazione-problema', atteso.situazione || ''],
            ['Ruolo dello studente', atteso.ruolo || ''],
            ['Committente', atteso.committente || ''],
            ['Destinatario', atteso.destinatario || ''],
            ['Prodotto', atteso.prodotto || ''],
            ['Autonomia nel compito', atteso.autonomiaOperativa || '']
        ])));

        const contributi = (uda.contributi || []).map(voce => [
            etichettaInsegnamento(voce.insegnamento),
            { frammenti: D.frammenti(String(voce.ore ?? '')), allineamento: 'center' },
            voce.saperi || '',
            voce.abilita || ''
        ]);
        nodi.push(...sezione('5', 'Contributi degli insegnamenti', contributi.length ? [D.tabella({
            intestazioni: ['Insegnamento', 'Ore', 'Saperi', 'Abilità'],
            larghezze: [22, 8, 35, 35],
            righe: contributi
        })] : []));

        if ((uda.coinvolgimentiOpzionali || []).length) {
            nodi.push(...sezione('5 bis', 'Coinvolgimenti opzionali',
                elencoPuntato(uda.coinvolgimentiOpzionali.map(voce => `${etichettaInsegnamento(voce.insegnamento)} — ${voce.contributo}`))));
        }

        const fasi = (uda.fasi || []).map((voce, indice) => [
            { frammenti: D.frammenti(String(indice + 1)), allineamento: 'center' },
            voce.titolo || '',
            { frammenti: D.frammenti(String(voce.ore ?? '')), allineamento: 'center' },
            voce.attivita || ''
        ]);
        nodi.push(...sezione('6', 'Percorso didattico', fasi.length ? [D.tabella({
            intestazioni: ['#', 'Fase', 'Ore', 'Attività'],
            larghezze: [5, 27, 8, 60],
            righe: fasi
        })] : []));

        nodi.push(...sezione('7', 'Dossier documentale',
            elencoPuntato((uda.dossier || []).map(voce => `${voce.titolo}${voce.uso ? ` — ${voce.uso}` : ''}`))));

        nodi.push(...sezione('8', 'Consegna conclusiva individuale',
            uda.traccia ? [D.paragrafo(uda.traccia)] : []));

        nodi.push(...sezione('9', 'Criteri di valutazione',
            elencoPuntato(uda.focusValutazione || []),
            'Griglia nazionale della seconda prova, su 20 punti.'));

        nodi.push(...sezione('10', 'Personalizzazione e accessibilità',
            uda.personalizzazione ? [D.paragrafo(uda.personalizzazione)] : []));

        nodi.push(...sezione('11', 'Note del consiglio di classe', righeDaCompilare(3)));
        return nodi;
    }

    // Documento pronto per una sola UDA.
    function documentoUda(uda, contesto = {}) {
        const nomeDocumento = `UDA ${uda.id} — ${uda.titolo}`;
        const esame = eScheda(uda);
        const nodi = [
            ...testata(),
            D.paragrafo(esame ? 'Simulazione della prova professionale' : 'Unità di apprendimento', 'occhiello'),
            D.titolo(1, uda.titolo),
            D.paragrafo(`${uda.id} · ${ANNO_ETICHETTA[uda.anno] || ''}${uda.qnq ? ` · Livello QNQ ${uda.qnq}` : ''}`, 'sottotitolo'),
            D.paragrafo(esame
                ? 'Scheda redatta sul quadro di riferimento della seconda prova dell’Esame di Stato'
                : 'Scheda redatta secondo il format delle Linee guida dell’istruzione professionale (D.M. 766/2019, Box n. 8)', 'catenaccio'),
            ...(esame ? schedaEsame(uda, contesto) : schedaUda(uda, contesto)),
            ...bloccoRiferimenti(),
            D.firme(['Il/La docente referente dell’UDA', 'Il/La coordinatore/coordinatrice del consiglio di classe']),
            D.paragrafo(`Documento generato dal Curricolo Verticale SSAS dell’${ISTITUTO} — ${SEDE}. Profilo finale SSAS: D.I. 92/2018, Allegato 2-I; risultati intermedi: Linee guida D.M. 766/2019, Allegato C, sezione I. La scheda è una proposta da verificare e adottare collegialmente.`, 'piede')
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
        schedaEsame,
        eScheda,
        documentoUda,
        scaricaDocx: D.scaricaDocx,
        stampa: D.stampa
    };
})();
