// Controllo del riconoscimento dei nomi degli insegnamenti.
//
// Ogni nome usato nei cataloghi deve risalire a un insegnamento del quadro
// orario, comunque sia scritto: maiuscole, etichetta lunga, abbreviazione o
// annotazione fra parentesi. Se questo controllo fallisce, da qualche parte nel
// sito quella materia perde il colore, sparisce da un filtro o — peggio — resta
// fuori dalla ripartizione oraria.
//
//     node tools/verifica_insegnamenti.cjs

const fs = require('node:fs');
const path = require('node:path');

const RADICE = path.resolve(__dirname, '..');
const leggi = nome => JSON.parse(fs.readFileSync(path.join(RADICE, nome), 'utf8'));

// assets/insegnamenti.js è pensato per il browser: si carica come testo e lascia
// il riconoscitore su globalThis, senza import né module.exports.
new Function(fs.readFileSync(path.join(RADICE, 'assets/insegnamenti.js'), 'utf8')).call(globalThis);
const I = globalThis.Insegnamenti;

const quadro = leggi('data-quadro-orario.json');
const errori = [];
const avvisi = [];

// 1 — il riconoscitore conosce esattamente gli insegnamenti del quadro orario
const nelQuadro = Object.keys(quadro.insegnamenti).sort();
const nelRiconoscitore = Object.keys(I.INSEGNAMENTI).sort();
if (JSON.stringify(nelQuadro) !== JSON.stringify(nelRiconoscitore)) {
    errori.push(`assets/insegnamenti.js e data-quadro-orario.json non hanno gli stessi insegnamenti.\n` +
        `  solo nel quadro: ${nelQuadro.filter(n => !nelRiconoscitore.includes(n)).join(', ') || '—'}\n` +
        `  solo nel riconoscitore: ${nelRiconoscitore.filter(n => !nelQuadro.includes(n)).join(', ') || '—'}`);
}

// 2 — etichette lunghe e alias del quadro tornano al proprio insegnamento
Object.entries(quadro.insegnamenti).forEach(([nome, voce]) => {
    if (I.canonico(nome) !== nome) errori.push(`«${nome}» non è riconosciuto come sé stesso.`);
    if (voce.etichetta && I.canonico(voce.etichetta) !== nome) {
        errori.push(`l'etichetta «${voce.etichetta}» non riporta a ${nome}.`);
    }
});
Object.entries(quadro.alias).forEach(([variante, nome]) => {
    if (I.canonico(variante) !== nome) errori.push(`l'alias «${variante}» non riporta a ${nome}.`);
});

// 3 — le scritture che hanno già creato problemi restano riconosciute
[
    ['Scienze Umane (II ANNO)', 'Scienze Umane'],
    ['scienze umane', 'Scienze Umane'],
    ['SCIENZE UMANE', 'Scienze Umane'],
    ['Scienze umane e sociali', 'Scienze Umane'],
    ['Scienze Umane II ANNO', 'Scienze Umane'],
    ['METODOLOGIE OPERATIVE', 'Metodologie Operative'],
    ['metodologie operative (ITP)', 'Metodologie Operative'],
    ['DIRITTO E TEC. AMM.', 'Diritto e T.A.'],
    ['Diritto', 'Diritto'],
    ['TIC - TECNOLOGIE INFORMAZIONE E COMUNICAZIONE', 'TIC'],
    ['PSICOLOGIA GENERALE ED APPLICATA', 'Psicologia']
].forEach(([scritto, atteso]) => {
    const trovato = I.canonico(scritto);
    if (trovato !== atteso) errori.push(`«${scritto}» → ${trovato || 'non riconosciuto'}, atteso ${atteso}.`);
});

// 4 — ogni nome usato nei quattro cataloghi è riconosciuto
const CATALOGHI = ['data-uda.json', 'data-uda-trasversali.json', 'data-uda-civica.json', 'data-uda-fsl.json', 'data-uda-unificate.json'];
const usati = new Map();
CATALOGHI.forEach(file => {
    leggi(file).uda.forEach(u => ['abilita', 'saperi'].forEach(campo => (u[campo] || []).forEach(voce => {
        (voce.ins || []).forEach(ins => {
            if (!usati.has(ins)) usati.set(ins, `${file} · ${u.id}`);
        });
    })));
});
usati.forEach((dove, ins) => {
    if (!I.canonico(ins)) errori.push(`«${ins}» (${dove}) non risale a nessun insegnamento del quadro orario.`);
});

// 5 — nella ripartizione oraria nessuno resta senza ore per un nome scritto male
const ripartizione = leggi('data-ripartizione-ore.json');
Object.entries(ripartizione.uda).forEach(([id, voce]) => {
    (voce.senzaOre || []).forEach(ins => {
        const nome = I.canonico(ins);
        if (!nome) {
            errori.push(`${id}: «${ins}» è senza ore e non è nemmeno riconosciuto.`);
            return;
        }
        const ore = quadro.insegnamenti[nome].ore[voce.anno - 1];
        if (ore > 0) {
            errori.push(`${id}: ${nome} è senza ore pur avendone ${ore} in ${voce.anno}ª — nome non riconosciuto dal calcolo.`);
        } else {
            avvisi.push(`${id}: ${nome} concorre ai contenuti ma in ${voce.anno}ª non ha ore proprie.`);
        }
    });
});

console.log(`Nomi di insegnamento usati nei cataloghi: ${usati.size}, tutti ricondotti a ${new Set([...usati.keys()].map(n => I.canonico(n))).size} insegnamenti del quadro orario.`);
avvisi.forEach(a => console.log(`  nota: ${a}`));
if (errori.length) {
    console.error(`\nFALLITO — ${errori.length} problemi:`);
    errori.forEach(e => console.error(`  · ${e}`));
    process.exit(1);
}
console.log('PASS: quadro orario e riconoscitore allineati; varianti storiche riconosciute; nessun insegnamento perso nella ripartizione.');
