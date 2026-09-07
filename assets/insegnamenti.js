// Riconoscimento dei nomi degli insegnamenti.
//
// Lo stesso insegnamento nei cataloghi è scritto in modi diversi: «Scienze Umane»,
// «SCIENZE UMANE», «Scienze umane e sociali», e in qualche scheda con
// un'annotazione fra parentesi come «Scienze Umane (II ANNO)». Sono la stessa
// materia. Nessun confronto fra nomi va fatto a stringa esatta: passa da qui.
//
// canonico() riporta qualunque scrittura al nome usato dal quadro orario
// dell'istituto (data-quadro-orario.json), che resta la sorgente unica: nomi,
// alias ed etichette lunghe sono ripresi da lì e tools/verifica_insegnamenti.cjs
// controlla che questo file non se ne discosti.
//
// Chi aggiunge una materia al quadro orario la aggiunge anche qui, con la sua
// classe di colore in style.css / uda.css.

(function (globale) {
    'use strict';

    // Nome canonico → classe di colore ed etichetta lunga del quadro orario.
    const INSEGNAMENTI = {
        'Italiano': { classe: 'ins-ita', etichetta: 'Lingua e letteratura italiana' },
        'Inglese': { classe: 'ins-lin', etichetta: 'Lingua inglese' },
        'Spagnolo': { classe: 'ins-lin', etichetta: 'Lingua spagnola' },
        'Matematica': { classe: 'ins-mat', etichetta: 'Matematica' },
        'Storia': { classe: 'ins-sto', etichetta: 'Storia' },
        'Geografia': { classe: 'ins-sto', etichetta: 'Geografia' },
        'Diritto': { classe: 'ins-dir', etichetta: 'Diritto ed economia' },
        'Scienze Umane': { classe: 'ins-su', etichetta: 'Scienze umane e sociali' },
        'Metodologie Operative': { classe: 'ins-met', etichetta: 'Metodologie operative' },
        'Scienze Integrate': { classe: 'ins-si', etichetta: 'Scienze integrate (Fisica/Chimica e Scienze della Terra/Biologia)' },
        'TIC': { classe: 'ins-tic', etichetta: 'Informatica (TIC)' },
        'Diritto e T.A.': { classe: 'ins-dir', etichetta: 'Diritto, economia e tecnica amministrativa del settore socio-sanitario' },
        'Igiene e Cultura M.S.': { classe: 'ins-igi', etichetta: 'Igiene e cultura medico-sanitaria' },
        'Psicologia': { classe: 'ins-psi', etichetta: 'Psicologia generale ed applicata' },
        'Scienze Motorie': { classe: 'ins-sm', etichetta: 'Scienze motorie e sportive' },
        'Religione': { classe: '', etichetta: 'Religione cattolica o attività alternative' }
    };

    // Scritture alternative in circolazione nei cataloghi, oltre alle etichette
    // lunghe e alle varianti di maiuscole, che normalizza() gestisce da sé.
    const VARIANTI = {
        'metodologie operative': 'Metodologie Operative',
        'igiene e cultura medico sanitaria': 'Igiene e Cultura M.S.',
        'igiene e cultura medico-sanitaria': 'Igiene e Cultura M.S.',
        'igiene e cultura ms': 'Igiene e Cultura M.S.',
        'psicologia generale ed applicata': 'Psicologia',
        'psicologia generale e applicata': 'Psicologia',
        'diritto e tec amm': 'Diritto e T.A.',
        'diritto e tecnica amministrativa': 'Diritto e T.A.',
        'diritto e ta': 'Diritto e T.A.',
        'scienze umane e sociali': 'Scienze Umane',
        'scienze umane': 'Scienze Umane',
        'informatica': 'TIC',
        'tecnologie dell informazione e della comunicazione': 'TIC',
        'tic tecnologie informazione e comunicazione': 'TIC',
        'lingua e letteratura italiana': 'Italiano',
        'lingua inglese': 'Inglese',
        'lingua spagnola': 'Spagnolo',
        'diritto ed economia': 'Diritto',
        'scienze motorie e sportive': 'Scienze Motorie',
        'religione cattolica o attivita alternative': 'Religione'
    };

    // Minuscole, senza accenti, senza punteggiatura e senza le annotazioni fra
    // parentesi: «Scienze Umane (II ANNO)» e «scienze umane» diventano la stessa
    // cosa. Quello che resta è la chiave con cui si cerca.
    function normalizza(nome) {
        return String(nome == null ? '' : nome)
            .replace(/\([^)]*\)/g, ' ')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    const INDICE = {};
    Object.keys(INSEGNAMENTI).forEach(nome => {
        INDICE[normalizza(nome)] = nome;
        INDICE[normalizza(INSEGNAMENTI[nome].etichetta)] = nome;
    });
    Object.keys(VARIANTI).forEach(variante => {
        INDICE[normalizza(variante)] = VARIANTI[variante];
    });

    // Chiavi note dalla più lunga alla più corta: serve al ripiego per prefisso,
    // perché «diritto e ta» deve vincere su «diritto».
    const CHIAVI = Object.keys(INDICE).sort((a, b) => b.length - a.length);

    // Nome canonico dell'insegnamento, o null se non è riconoscibile. Il ripiego
    // per prefisso raccoglie le annotazioni scritte senza parentesi, tipo
    // «Scienze Umane II ANNO».
    function canonico(nome) {
        const chiave = normalizza(nome);
        if (!chiave) return null;
        if (INDICE[chiave]) return INDICE[chiave];
        const prefisso = CHIAVI.find(k => chiave === k || chiave.startsWith(k + ' '));
        return prefisso ? INDICE[prefisso] : null;
    }

    // Due scritture della stessa materia.
    function stesso(uno, altro) {
        const a = canonico(uno);
        const b = canonico(altro);
        return a && b ? a === b : normalizza(uno) === normalizza(altro);
    }

    // Classe di colore della targhetta; vuota se l'insegnamento non è noto.
    function classe(nome) {
        const nome_canonico = canonico(nome);
        return nome_canonico ? INSEGNAMENTI[nome_canonico].classe : '';
    }

    // Nome per esteso, per le stampe e per le tabelle delle ore.
    function etichetta(nome) {
        const nome_canonico = canonico(nome);
        return nome_canonico ? INSEGNAMENTI[nome_canonico].etichetta : String(nome || '');
    }

    // Elenco senza doppioni: le scritture diverse della stessa materia si
    // fondono nel nome canonico, le sconosciute restano come sono.
    function elenco(nomi) {
        const visti = new Map();
        (nomi || []).forEach(nome => {
            const chiave = canonico(nome) || normalizza(nome);
            if (chiave && !visti.has(chiave)) visti.set(chiave, canonico(nome) || nome);
        });
        return [...visti.values()];
    }

    // La nota fra parentesi che accompagna il nome — «(II ANNO)» — va conservata
    // a video: dice qualcosa che il docente ha scritto apposta.
    function annotazione(nome) {
        const trovata = String(nome || '').match(/\(([^)]*)\)/);
        return trovata ? trovata[1].trim() : '';
    }

    globale.Insegnamenti = { normalizza, canonico, stesso, classe, etichetta, elenco, annotazione, INSEGNAMENTI };
}(typeof window !== 'undefined' ? window : globalThis));

// Nel browser il file si carica con un normale <script> e lascia
// window.Insegnamenti. Gli strumenti in tools/ lo caricano allo stesso modo e
// leggono globalThis.Insegnamenti: qui non si usano né import né module.exports,
// perché la cartella superiore dichiara i .js come moduli ES.
