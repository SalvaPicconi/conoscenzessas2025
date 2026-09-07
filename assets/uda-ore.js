// Ripartizione oraria delle UDA per insegnamento.
//
// La proposta proporzionale arriva da data-ripartizione-ore.json, generato da
// tools/genera_ripartizione_ore.py sul quadro orario dell'istituto: le ore di
// ogni UDA sono divise fra gli insegnamenti coinvolti in proporzione alle loro
// ore settimanali in quell'anno di corso.
//
// A docente autenticato la proposta diventa modificabile entro una banda di
// tolleranza letta dal dato insieme alla proposta. Le modifiche di tutti i
// docenti sono ricomposte qui e confrontate con il monte ore dell'UDA: se la
// somma non lo copre, o lo supera, compare l'avviso di accordarsi.

const FONTE_RIPARTIZIONE = 'data-ripartizione-ore.json';
const CAMPO = 'oreRipartizione';

// Nome, colore ed equivalenza fra scritture diverse della stessa materia stanno
// in assets/insegnamenti.js: i cataloghi la scrivono in maiuscolo, per esteso o
// con un'annotazione fra parentesi, e qui devono coincidere lo stesso.
const RICONOSCITORE = window.Insegnamenti;
const nomeIns = ins => (RICONOSCITORE && RICONOSCITORE.canonico(ins)) || ins;
const classeIns = ins => (RICONOSCITORE ? RICONOSCITORE.classe(ins) : '');

let ripartizioni = null;
let tolleranza = 0.4;
// Il salvataggio provoca il ridisegno della scheda: l'esito va conservato qui,
// altrimenti sparirebbe insieme al nodo che lo mostrava.
const esitiInSospeso = new Map();

document.addEventListener('DOMContentLoaded', avvia);
document.addEventListener('curricolo:uda-rendered', disegnaTutte);
document.addEventListener('curricolo:uda-sessione', disegnaTutte);

async function avvia() {
    try {
        const risposta = await fetch(FONTE_RIPARTIZIONE, { cache: 'no-store' });
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        const dati = await risposta.json();
        ripartizioni = dati.uda || {};
        if (typeof dati.meta?.tolleranzaDocente === 'number') tolleranza = dati.meta.tolleranzaDocente;
    } catch (errore) {
        console.error('Ripartizione oraria non disponibile:', errore);
        ripartizioni = {};
    }
    disegnaTutte();
}

function disegnaTutte() {
    if (!ripartizioni) return;
    document.querySelectorAll('[data-uda-ore-slot]').forEach(slot => {
        const chiave = slot.dataset.udaOreSlot;
        const ripartizione = ripartizioni[chiave];
        slot.replaceChildren();
        if (!ripartizione) return;
        const righe = componiScelte(chiave, ripartizione);
        slot.appendChild(creaBlocco(chiave, ripartizione, righe));
        const scheda = slot.closest('[data-uda-revisione-key]');
        if (scheda) {
            marcaChips(scheda, righe);
            marcaDurata(scheda, righe);
        }
    });
    notificaAltezza();
}

// Settimane di lezione necessarie: le detta l'insegnamento che deve trovare più
// ore dentro il proprio orario settimanale, perché gli altri procedono in
// parallelo. È la durata minima, a piena dedizione.
//
// ATTENZIONE — convenzione ancora aperta. Questo numero presuppone che la
// materia più carica dedichi all'UDA tutte le proprie ore settimanali, cosa che
// nella pratica non succede: la 3.4 «Crescere insieme», 48 ore, risulta di 3
// settimane, ma a due ore a settimana per materia sarebbero 8. Finché la scelta
// non arriva, l'etichetta mostrata deve conservare il «min.» davanti al numero,
// o il dato inganna chi mette l'UDA in calendario. Se si passa alla stima
// realistica, il divisore diventa Math.min(oreDedicate, riga.oreSett) e va
// cambiato anche durata_settimane() in tools/genera_ripartizione_ore.py.
//
// Stessa formula in tools/genera_ripartizione_ore.py, per il documento stampabile.
function durata(righe) {
    let settimane = 0;
    let insegnamento = '';
    righe.forEach(riga => {
        const necessarie = riga.effettive / riga.oreSett;
        if (necessarie > settimane) {
            settimane = necessarie;
            insegnamento = riga.ins;
        }
    });
    return { settimane: Math.max(1, Math.ceil(settimane)), insegnamento };
}

function etichettaSettimane(quantita) {
    return quantita === 1 ? '1 settimana' : `${quantita} settimane`;
}

// Riallinea ciò che dipende dalle ore — pillola della durata e ore nei chip —
// mentre il docente le sta modificando, non solo dopo il salvataggio.
// Alla prima chiamata il riquadro non è ancora nel documento: pillola e chip li
// scrive disegnaTutte subito dopo.
//
// La scheda mostra solo il numero di settimane. Come lo si ricava — quale
// insegnamento detta il tempo, quante ore deve ricavare dalle proprie
// settimanali, che a dedizione dimezzata il tempo raddoppia — è ragionamento
// di lavoro nostro: sta nel commento a durata() qui sopra, non davanti a chi
// consulta il curricolo.
function aggiornaDerivati(box, campi, righe) {
    const correnti = righe.map(riga => {
        const valore = Number(campi.get(riga.ins)?.value);
        return Number.isFinite(valore) && valore > 0 ? { ...riga, effettive: valore } : riga;
    });
    const scheda = box.closest('[data-uda-revisione-key]');
    if (!scheda) return;
    const pillola = scheda.querySelector('[data-uda-ore-durata]');
    if (pillola) pillola.textContent = `📅 min. ${etichettaSettimane(durata(correnti).settimane)}`;
    if (campi.size) marcaChips(scheda, correnti);
}

// Ore di ciascun insegnamento accanto al suo nome, ovunque compaia nella scheda:
// così il docente le trova già di fianco alle abilità e ai saperi che lo riguardano.
function marcaChips(scheda, righe) {
    const perEtichetta = new Map(righe.map(riga => [nomeIns(riga.ins), riga]));
    scheda.querySelectorAll('.ins-chip').forEach(chip => {
        if (chip.closest('.uda-ore-box')) return;
        chip.querySelector('.ins-chip-ore')?.remove();
        const riga = perEtichetta.get(nomeIns(chip.textContent.trim()));
        if (!riga) return;
        const quota = document.createElement('span');
        quota.className = 'ins-chip-ore';
        quota.textContent = etichettaOreVoce(riga);
        chip.appendChild(quota);
    });
}

function etichettaOreVoce(riga) {
    if (riga.proposte.length || riga.min === riga.max) return `${riga.effettive} h`;
    return `${riga.min}–${riga.max} h`;
}

// Durata accanto al monte ore, nell'intestazione: visibile a scheda chiusa.
function marcaDurata(scheda, righe) {
    const testata = scheda.querySelector('.uda-acc-header');
    if (!testata) return;
    testata.querySelector('[data-uda-ore-durata]')?.remove();
    let contenitore = testata.querySelector('.uda-acc-pills');
    if (!contenitore) {
        contenitore = document.createElement('span');
        contenitore.className = 'uda-acc-pills';
        testata.insertBefore(contenitore, testata.querySelector('.uda-acc-arrow, .group-chevron'));
    }
    const { settimane } = durata(righe);
    const pillola = document.createElement('span');
    pillola.className = 'pill pill-durata';
    pillola.dataset.udaOreDurata = 'true';
    pillola.textContent = `📅 min. ${etichettaSettimane(settimane)}`;
    pillola.title = 'Durata minima in settimane di lezione.';
    contenitore.appendChild(pillola);
}

// Banda entro cui il docente può spostare le ore del proprio insegnamento,
// attorno alla proposta proporzionale e mai sotto un'ora.
function banda(base) {
    return [Math.max(1, Math.round(base * (1 - tolleranza))), Math.max(1, Math.round(base * (1 + tolleranza)))];
}

// Ore effettive per insegnamento: la proposta proporzionale, salvo che un
// docente l'abbia modificata. Fra più proposte per lo stesso insegnamento vale
// la più recente, ma le divergenze restano segnalate.
function componiScelte(chiave, ripartizione) {
    const revisioni = window.CurricoloRevisione?.revisioniUda?.(chiave) || [];
    const perInsegnamento = new Map();
    revisioni.forEach(voce => {
        const scelte = voce.modifiche?.[CAMPO];
        if (!scelte || typeof scelte !== 'object') return;
        Object.entries(scelte).forEach(([ins, quantita]) => {
            if (!Number.isFinite(Number(quantita))) return;
            const elenco = perInsegnamento.get(ins) || [];
            elenco.push({ docente: voce.author_name, ore: Number(quantita), aggiornata: voce.updated_at });
            perInsegnamento.set(ins, elenco);
        });
    });
    perInsegnamento.forEach(elenco => elenco.sort((a, b) => new Date(b.aggiornata) - new Date(a.aggiornata)));
    return ripartizione.voci.map(voce => {
        const proposte = perInsegnamento.get(voce.ins) || [];
        const distinte = new Set(proposte.map(proposta => proposta.ore));
        return {
            ...voce,
            effettive: proposte.length ? proposte[0].ore : voce.max,
            proposte,
            divergente: distinte.size > 1
        };
    });
}

function creaBlocco(chiave, ripartizione, righe) {
    const docente = window.CurricoloRevisione?.docente || '';
    const modificabile = Boolean(docente && window.CurricoloRevisione?.puoRevisionare);

    const box = document.createElement('section');
    box.className = 'uda-ore-box';

    const titolo = document.createElement('h4');
    titolo.textContent = 'Ripartizione oraria per insegnamento';
    const metodo = document.createElement('p');
    metodo.className = 'uda-ore-metodo';
    metodo.textContent = ripartizione.convenzionale
        ? `Le ore della Formazione scuola-lavoro sono deliberate dall'istituto: la ripartizione è calcolata su un monte convenzionale di ${ripartizione.totaleMax} ore, proporzionale alle ore settimanali di ciascun insegnamento.`
        : `Proposta proporzionale alle ore settimanali di ciascun insegnamento. Monte ore dell'UDA: ${etichettaTotale(ripartizione)}.`;
    box.append(titolo, metodo);

    const tabella = document.createElement('table');
    tabella.className = 'uda-ore-tabella';
    const intestazioni = ['Insegnamento', 'Ore sett.', 'Proposta', ...(modificabile ? ['Ore concordate'] : [])];
    const thead = document.createElement('thead');
    const rigaTesta = document.createElement('tr');
    intestazioni.forEach((testo, indice) => {
        const th = document.createElement('th');
        th.textContent = testo;
        if (indice) th.className = 'uda-ore-num';
        rigaTesta.appendChild(th);
    });
    thead.appendChild(rigaTesta);

    const tbody = document.createElement('tbody');
    const campi = new Map();
    righe.forEach(riga => {
        const tr = document.createElement('tr');
        const nome = document.createElement('td');
        const chip = document.createElement('span');
        chip.className = `ins-chip ${classeIns(riga.ins)}`;
        chip.textContent = nomeIns(riga.ins);
        nome.appendChild(chip);
        if (riga.proposte.length) nome.appendChild(creaFirma(riga));
        const settimanali = celleNumero(String(riga.oreSett), intestazioni[1]);
        const proposta = celleNumero(riga.min === riga.max ? String(riga.max) : `${riga.min}–${riga.max}`, intestazioni[2]);
        tr.append(nome, settimanali, proposta);
        if (modificabile) {
            const [minimo, massimo] = banda(riga.max);
            const cella = document.createElement('td');
            cella.className = 'uda-ore-num';
            cella.dataset.etichetta = intestazioni[3];
            const input = document.createElement('input');
            input.type = 'number';
            input.min = String(minimo);
            input.max = String(massimo);
            input.step = '1';
            input.value = String(riga.effettive);
            input.dataset.ins = riga.ins;
            input.dataset.base = String(riga.max);
            input.setAttribute('aria-label', `Ore concordate per ${nomeIns(riga.ins)}`);
            input.title = `Consentito da ${minimo} a ${massimo} ore: ${Math.round(tolleranza * 100)}% attorno alla proposta di ${ore(riga.max)}.`;
            input.addEventListener('input', () => aggiornaTotale(box, ripartizione, campi, righe));
            campi.set(riga.ins, input);
            cella.appendChild(input);
            tr.appendChild(cella);
        }
        if (riga.divergente) tr.dataset.divergente = 'true';
        tbody.appendChild(tr);
    });

    const tfoot = document.createElement('tfoot');
    const rigaPiede = document.createElement('tr');
    const etichettaPiede = document.createElement('th');
    etichettaPiede.textContent = 'Totale';
    // Nel piede le ore settimanali non si sommano: la cella resta vuota e sul
    // telefono, dove ogni cella diventa una riga a sé, sparisce del tutto.
    const vuota = document.createElement('td');
    vuota.className = 'uda-ore-vuota';
    const totaleProposta = celleNumero(etichettaTotale(ripartizione), intestazioni[2]);
    rigaPiede.append(etichettaPiede, vuota, totaleProposta);
    if (modificabile) {
        const totale = document.createElement('td');
        totale.className = 'uda-ore-num uda-ore-totale';
        totale.dataset.etichetta = intestazioni[3];
        rigaPiede.appendChild(totale);
    }
    tfoot.appendChild(rigaPiede);
    tabella.append(thead, tbody, tfoot);
    preservaRuoli(tabella);
    box.appendChild(tabella);

    if (ripartizione.senzaOre?.length) {
        const nota = document.createElement('p');
        nota.className = 'uda-ore-nota';
        const elenco = ripartizione.senzaOre.map(nomeIns).join(', ');
        nota.textContent = `${elenco}: concorre ai contenuti dell'UDA ma non ha ore proprie, perché non è presente nel quadro orario di questo anno di corso. I relativi compiti restano agli insegnamenti sopra elencati.`;
        box.appendChild(nota);
    }

    const avviso = document.createElement('p');
    avviso.className = 'uda-ore-avviso';
    avviso.setAttribute('role', 'status');
    box.appendChild(avviso);

    if (modificabile) {
        const piede = document.createElement('div');
        piede.className = 'uda-ore-azioni';
        const spiegazione = document.createElement('small');
        spiegazione.textContent = `${docente}: puoi modificare le ore entro il ${Math.round(tolleranza * 100)}% in più o in meno rispetto alla proposta. La modifica resta una proposta, non cambia il fascicolo pubblico.`;
        const esito = document.createElement('p');
        esito.className = 'uda-ore-messaggio';
        esito.setAttribute('role', 'status');
        const inSospeso = esitiInSospeso.get(chiave);
        if (inSospeso) {
            messaggio(esito, inSospeso.testo, inSospeso.tipo);
            esitiInSospeso.delete(chiave);
        }
        const ripristina = creaBottone('Ripristina la proposta', 'uda-revisione-secondary');
        const salva = creaBottone('Salva le ore', 'uda-revisione-primary');
        ripristina.addEventListener('click', () => {
            campi.forEach((input, ins) => {
                const voce = ripartizione.voci.find(riga => nomeIns(riga.ins) === nomeIns(ins));
                input.value = String(voce.max);
            });
            aggiornaTotale(box, ripartizione, campi, righe);
        });
        salva.addEventListener('click', () => salvaOre(chiave, ripartizione, campi, esito, salva));
        piede.append(spiegazione, ripristina, salva, esito);
        box.appendChild(piede);
    }

    aggiornaTotale(box, ripartizione, campi, righe);
    return box;
}

// Sul telefono il CSS impila le celle con display:block e i browser perdono i
// ruoli impliciti della tabella: dichiararli qui li conserva per chi legge con
// uno screen reader. Su schermo largo sono ridondanti e innocui.
function preservaRuoli(tabella) {
    tabella.setAttribute('role', 'table');
    tabella.querySelectorAll('thead, tbody, tfoot').forEach(gruppo => gruppo.setAttribute('role', 'rowgroup'));
    tabella.querySelectorAll('tr').forEach(riga => riga.setAttribute('role', 'row'));
    tabella.querySelectorAll('thead th').forEach(cella => cella.setAttribute('role', 'columnheader'));
    tabella.querySelectorAll('tbody th, tfoot th').forEach(cella => cella.setAttribute('role', 'rowheader'));
    tabella.querySelectorAll('td').forEach(cella => cella.setAttribute('role', 'cell'));
}

function creaFirma(riga) {
    const firma = document.createElement('small');
    firma.className = 'uda-ore-firma';
    firma.textContent = riga.divergente
        ? `proposte diverse: ${riga.proposte.map(proposta => `${proposta.docente} ${proposta.ore} h`).join(' · ')}`
        : `indicate da ${riga.proposte[0].docente}`;
    return firma;
}

// L'etichetta di colonna viaggia sulla cella: sul telefono il CSS impila la
// tabella e la riscrive davanti al valore, perché l'intestazione non è più in
// cima alla colonna.
function celleNumero(testo, etichetta) {
    const td = document.createElement('td');
    td.className = 'uda-ore-num';
    td.textContent = testo;
    if (etichetta) td.dataset.etichetta = etichetta;
    return td;
}

function etichettaTotale(ripartizione) {
    return ripartizione.totaleMin === ripartizione.totaleMax
        ? ore(ripartizione.totaleMax)
        : `${ripartizione.totaleMin}–${ripartizione.totaleMax} ore`;
}

function ore(quantita) {
    return quantita === 1 ? '1 ora' : `${quantita} ore`;
}

// Confronta la somma delle ore concordate con il monte ore dell'UDA e scrive
// l'avviso: è il punto in cui il consiglio di classe si accorge di dover parlare.
function aggiornaTotale(box, ripartizione, campi, righe) {
    aggiornaDerivati(box, campi, righe);
    const avviso = box.querySelector('.uda-ore-avviso');
    const cella = box.querySelector('.uda-ore-totale');
    if (!campi.size) {
        avviso.textContent = '';
        delete avviso.dataset.stato;
        return;
    }
    let totale = 0;
    let fuoriBanda = [];
    campi.forEach((input, ins) => {
        const valore = Number(input.value);
        const [minimo, massimo] = banda(Number(input.dataset.base));
        input.dataset.fuoriBanda = String(!Number.isInteger(valore) || valore < minimo || valore > massimo);
        if (Number.isFinite(valore)) totale += valore;
        if (input.dataset.fuoriBanda === 'true') fuoriBanda.push(nomeIns(ins));
    });
    if (cella) cella.textContent = ore(totale);
    const { totaleMin, totaleMax } = ripartizione;
    if (fuoriBanda.length) {
        avviso.dataset.stato = 'errore';
        avviso.textContent = `Fuori dalla banda consentita del ${Math.round(tolleranza * 100)}%: ${fuoriBanda.join(', ')}.`;
    } else if (totale < totaleMin) {
        const mancanti = totaleMin - totale;
        avviso.dataset.stato = 'attenzione';
        avviso.textContent = `${mancanti === 1 ? 'Manca un\'ora' : `Mancano ${mancanti} ore`} al monte ore dell'UDA (${etichettaTotale(ripartizione)}). Accordarsi con i docenti coinvolti per completare il monte orario.`;
    } else if (totale > totaleMax) {
        const eccesso = totale - totaleMax;
        avviso.dataset.stato = 'attenzione';
        avviso.textContent = `Il totale supera il monte ore dell'UDA (${etichettaTotale(ripartizione)}) di ${eccesso === 1 ? 'un\'ora' : `${eccesso} ore`}. Accordarsi con i docenti coinvolti per completare il monte orario.`;
    } else {
        avviso.dataset.stato = 'ok';
        avviso.textContent = `Monte ore coperto: ${ore(totale)} su ${etichettaTotale(ripartizione)}.`;
    }
    const divergenti = box.querySelectorAll('tr[data-divergente="true"]').length;
    if (divergenti) {
        avviso.textContent += ` ${divergenti === 1 ? 'Un insegnamento ha' : `${divergenti} insegnamenti hanno`} proposte diverse fra docenti: va scelta una sola cifra.`;
        if (avviso.dataset.stato === 'ok') avviso.dataset.stato = 'attenzione';
    }
}

async function salvaOre(chiave, ripartizione, campi, esito, bottone) {
    const scelte = {};
    const fuoriBanda = [];
    campi.forEach((input, ins) => {
        const valore = Number(input.value);
        const base = Number(input.dataset.base);
        const [minimo, massimo] = banda(base);
        if (!Number.isInteger(valore) || valore < minimo || valore > massimo) {
            fuoriBanda.push(`${nomeIns(ins)} (consentito ${minimo}–${massimo})`);
            return;
        }
        // Si registrano solo gli scostamenti: chi conferma la proposta non occupa la scheda.
        if (valore !== base) scelte[ins] = valore;
    });
    if (fuoriBanda.length) {
        return messaggio(esito, `Valori fuori dalla banda del ${Math.round(tolleranza * 100)}%: ${fuoriBanda.join('; ')}.`, 'errore');
    }
    bottone.disabled = true;
    messaggio(esito, 'Salvataggio…');
    try {
        await window.CurricoloRevisione.salvaCampo(chiave, CAMPO, scelte, proposte(ripartizione));
        esitiInSospeso.set(chiave, {
            testo: Object.keys(scelte).length
                ? 'Ore salvate nell’area condivisa.'
                : 'Proposta proporzionale confermata: nessuno scostamento registrato.',
            tipo: 'successo'
        });
    } catch (errore) {
        bottone.disabled = false;
        esitiInSospeso.set(chiave, { testo: errore.message || 'Salvataggio non riuscito.', tipo: 'errore' });
    }
    disegnaTutte();
}

function proposte(ripartizione) {
    return Object.fromEntries(ripartizione.voci.map(voce => [voce.ins, voce.max]));
}

function creaBottone(testo, classe) {
    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = classe;
    bottone.textContent = testo;
    return bottone;
}

function messaggio(elemento, testo, tipo = '') {
    elemento.textContent = testo;
    if (tipo) elemento.dataset.tipo = tipo; else delete elemento.dataset.tipo;
}

function notificaAltezza() {
    setTimeout(() => {
        if (window.parent === window) return;
        const altezza = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        window.parent.postMessage({ type: 'iframeContentHeight', height: altezza }, window.location.origin);
    }, 20);
}
