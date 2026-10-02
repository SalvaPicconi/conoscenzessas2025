// Stampa della singola UDA dalle pagine del fascicolo.
//
// Ogni scheda aperta porta due comandi: il file Word, che il docente completa
// nelle sezioni lasciate in bianco, e la stampa, da cui esce il PDF. Il
// contenuto lo compone assets/uda-documento.js, uguale per entrambe le strade.
//
// I comandi si riagganciano a ogni ridisegno dell'elenco (filtri, revisione,
// voto) perché il corpo della scheda viene ricostruito da capo ogni volta.

const FONTE_UDA = document.documentElement.dataset.udaSource || 'data-uda.json';
const GENERE = document.documentElement.dataset.udaKind || 'asse';
const FONTE_RIPARTIZIONE = 'data-ripartizione-ore.json';

const stato = { uda: new Map(), meta: null, ripartizione: {}, pronto: false };

document.addEventListener('DOMContentLoaded', avvia);
document.addEventListener('curricolo:uda-rendered', disegnaComandi);

async function avvia() {
    const [dati, ore] = await Promise.all([
        carica(FONTE_UDA),
        carica(FONTE_RIPARTIZIONE)
    ]);
    if (dati) {
        stato.uda = new Map(elencoUda(dati).map(uda => [String(uda.id), uda]));
        stato.meta = dati.meta || {};
    }
    stato.ripartizione = (ore && ore.uda) || {};
    sommaOreDelleOrigini();
    stato.pronto = Boolean(dati);
    disegnaComandi();
}

// I cataloghi non hanno tutti la stessa forma: quello d'asse e i trasversali
// espongono un elenco piatto, l'Esame lo chiama "schede" e le scelte del
// Dipartimento stanno annidate per classe e per decisione. La stampa della
// singola scheda vale per tutti, quindi la forma si appiattisce qui.
function elencoUda(dati) {
    if (Array.isArray(dati.uda)) return dati.uda;
    if (Array.isArray(dati.schede)) return dati.schede;
    const unita = [];
    (dati.classi || []).forEach(classe =>
        (classe.decisioni || []).forEach(decisione => unita.push(...(decisione.unita || []))));
    ((dati.simulazioni && dati.simulazioni.voci) || []).forEach(voce => unita.push(...(voce.unita || [])));
    return unita;
}

// La ripartizione oraria è calcolata sulle schede di origine. Un'unità che ne
// accorpa più d'una non ha una voce propria: si somma, come fa il Piano delle
// UDA, altrimenti la tabella delle ore esce vuota proprio nelle unità adottate.
function sommaOreDelleOrigini() {
    for (const [id, uda] of stato.uda) {
        if (stato.ripartizione[id]) continue;
        const origini = (uda.fonde || []).map(voce => stato.ripartizione[voce.id]);
        if (!origini.length || origini.some(voce => !voce)) continue;
        const materie = new Map();
        for (const origine of origini) {
            for (const voce of origine.voci) {
                const somma = materie.get(voce.ins) || { ins: voce.ins, oreSett: voce.oreSett, min: 0, max: 0 };
                somma.min += voce.min;
                somma.max += voce.max;
                materie.set(voce.ins, somma);
            }
        }
        stato.ripartizione[id] = { voci: [...materie.values()] };
    }
}

async function carica(percorso) {
    try {
        const risposta = await fetch(percorso, { cache: 'no-store' });
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        return await risposta.json();
    } catch (errore) {
        console.error(`Stampa UDA — ${percorso} non disponibile:`, errore);
        return null;
    }
}

function disegnaComandi() {
    if (!stato.pronto || !window.CurricoloDocumento) return;
    document.querySelectorAll('[data-uda-revisione-key]').forEach(scheda => {
        const chiave = scheda.dataset.udaRevisioneKey;
        const uda = stato.uda.get(String(chiave));
        // Il corpo della scheda si chiama diversamente da pagina a pagina.
        const corpo = scheda.querySelector('.uda-acc-body, .esame-slot-body');
        // Le UDA nate in revisione non stanno nel file dati: non c'è ancora
        // una scheda da stampare e i comandi non compaiono.
        if (!uda || !corpo || corpo.querySelector('.uda-stampa')) return;
        corpo.insertBefore(creaBarra(uda), corpo.firstChild);
    });
    notificaAltezza();
}

function creaBarra(uda) {
    const barra = document.createElement('div');
    barra.className = 'uda-stampa';

    const etichetta = document.createElement('span');
    etichetta.className = 'uda-stampa-etichetta';
    etichetta.textContent = 'Scheda UDA';

    const word = creaBottone('📄 Scarica in Word', 'uda-stampa-primario');
    word.addEventListener('click', () => consegna(uda, 'word', word));

    const pdf = creaBottone('🖨 Stampa / PDF', 'uda-stampa-secondario');
    pdf.addEventListener('click', () => consegna(uda, 'stampa', pdf));

    const nota = document.createElement('p');
    nota.className = 'uda-stampa-nota';
    nota.textContent = 'Format delle Linee guida (D.M. 766/2019, Box n. 8): le sezioni su fasi, accompagnamento, documentazione e rubrica escono predisposte da compilare in consiglio.';

    barra.append(etichetta, word, pdf, nota);
    return barra;
}

function creaBottone(testo, classe) {
    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = classe;
    bottone.textContent = testo;
    return bottone;
}

function consegna(uda, modo, bottone) {
    const documento = window.CurricoloDocumento;
    const etichettaOriginale = bottone.textContent;
    bottone.disabled = true;
    try {
        const { nodi, meta } = documento.documentoUda(uda, {
            meta: stato.meta,
            genere: GENERE,
            ripartizione: stato.ripartizione
        });
        if (modo === 'word') {
            documento.scaricaDocx(documento.nomeFile(['UDA', uda.id, uda.titolo], 'docx'), nodi, meta);
        } else {
            documento.stampa(nodi, meta);
        }
        bottone.textContent = modo === 'word' ? '✓ File pronto' : '✓ Anteprima aperta';
    } catch (errore) {
        console.error('Scheda UDA non generata:', errore);
        bottone.textContent = '✕ Non riuscito';
    }
    setTimeout(() => {
        bottone.textContent = etichettaOriginale;
        bottone.disabled = false;
    }, 2200);
}

function notificaAltezza() {
    setTimeout(() => {
        if (window.parent === window) return;
        const altezza = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        window.parent.postMessage({ type: 'iframeContentHeight', height: altezza }, window.location.origin);
    }, 20);
}
