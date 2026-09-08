// Glossario normativo: le parole del curricolo e la norma su cui si reggono.
//
// Nel sito girano termini che sembrano di senso comune e non lo sono: unità di
// apprendimento, traguardo intermedio, compito di realtà, prova esperta, PFI.
// Alcuni li definisce la legge parola per parola, altri li usa senza definirli,
// altri ancora non compaiono in nessuna norma e appartengono al mestiere. Finché
// la differenza resta implicita, in collegio si finisce per citare come norma
// qualcosa che norma non è.
//
// Il file fa due cose sole. Legge data-normativa.json una volta per pagina e lo
// tiene a disposizione di chi lo chiede; e trasforma ogni elemento marcato con
// data-termine in una voce cliccabile che apre la definizione con la sua fonte.
// Non tocca il testo della pagina: aggiunge un segno accanto alla parola.
//
// La pagina normativa.html usa lo stesso file per disegnare glossario ed elenco
// delle fonti: una sola sorgente, due usi, nessun rischio che l'elenco stampato
// e quello a schermo dicano cose diverse.

(function () {
    'use strict';

    const FONTE = 'data-normativa.json';

    // Le pagine del sito vivono anche dentro l'iframe di index.html: il percorso
    // relativo funziona in entrambi i casi perché il file sta nella radice.
    let promessa = null;
    let dati = null;

    function carica() {
        if (promessa) return promessa;
        promessa = fetch(FONTE, { cache: 'no-store' })
            .then(risposta => {
                if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
                return risposta.json();
            })
            .then(json => {
                dati = json;
                indicizza(json);
                return json;
            })
            .catch(errore => {
                console.warn('Glossario normativo non disponibile:', errore);
                dati = null;
                return null;
            });
        return promessa;
    }

    const perId = new Map();
    const perAlias = new Map();
    const fontiPerId = new Map();

    function normalizza(testo) {
        return String(testo || '')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[’']/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    function indicizza(json) {
        (json.fonti || []).forEach(fonte => fontiPerId.set(fonte.id, fonte));
        (json.glossario || []).forEach(voce => {
            perId.set(voce.id, voce);
            // Gli alias servono a marcare una parola nella pagina senza dover
            // ricordare l'identificatore: data-termine="prova esperta" basta.
            [voce.id, voce.termine, ...(voce.alias || [])].forEach(alias => {
                const chiave = normalizza(alias);
                if (chiave && !perAlias.has(chiave)) perAlias.set(chiave, voce);
            });
        });
    }

    function termine(chiave) {
        if (!dati) return null;
        return perId.get(chiave) || perAlias.get(normalizza(chiave)) || null;
    }

    function fonte(id) {
        return fontiPerId.get(id) || null;
    }

    // «D.M. 92/2018, art. 4, comma 6» — la forma con cui una citazione va letta
    // ad alta voce in consiglio.
    function citazioneBreve(riferimento) {
        const norma = fonte(riferimento.fonte);
        const sigla = norma ? norma.sigla : riferimento.fonte;
        return riferimento.luogo ? `${sigla}, ${riferimento.luogo}` : sigla;
    }

    function citazioneEstesa(riferimento) {
        const norma = fonte(riferimento.fonte);
        const testa = norma ? norma.norma : riferimento.fonte;
        return riferimento.luogo ? `${testa}, ${riferimento.luogo}` : testa;
    }

    // Una riga sola con tutte le fonti del termine: è quella che finisce sotto
    // le schede e dentro i documenti stampati.
    function riferimentiInLinea(voce) {
        if (!voce || !(voce.riferimenti || []).length) return '';
        return voce.riferimenti.map(citazioneBreve).join('; ');
    }

    const ETICHETTA_FONDAMENTO = {
        definizione: 'Definizione di legge',
        termine: 'Termine normativo',
        uso: 'Termine d’uso professionale'
    };

    function etichettaFondamento(voce) {
        return ETICHETTA_FONDAMENTO[voce && voce.fondamento] || '';
    }

    // ------------------------------------------------------------------
    // Segno accanto alla parola
    // ------------------------------------------------------------------

    let pannello = null;
    let apertoDa = null;

    function creaPannello() {
        if (pannello) return pannello;
        pannello = document.createElement('div');
        pannello.className = 'norma-pop';
        pannello.setAttribute('role', 'dialog');
        pannello.setAttribute('aria-label', 'Definizione e riferimento normativo');
        pannello.hidden = true;
        document.body.appendChild(pannello);

        document.addEventListener('click', evento => {
            if (pannello.hidden) return;
            if (pannello.contains(evento.target)) return;
            if (apertoDa && apertoDa.contains(evento.target)) return;
            chiudi();
        });
        document.addEventListener('keydown', evento => {
            if (evento.key === 'Escape' && !pannello.hidden) {
                const tornaA = apertoDa;
                chiudi();
                if (tornaA) tornaA.focus();
            }
        });
        window.addEventListener('resize', chiudi, { passive: true });
        window.addEventListener('scroll', chiudi, { passive: true, capture: true });
        return pannello;
    }

    function chiudi() {
        if (!pannello || pannello.hidden) return;
        pannello.hidden = true;
        if (apertoDa) apertoDa.setAttribute('aria-expanded', 'false');
        apertoDa = null;
    }

    function esc(valore) {
        if (valore === undefined || valore === null) return '';
        return String(valore).replace(/[&<>"']/g, carattere =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[carattere]));
    }

    function contenutoPannello(voce) {
        const fondamento = etichettaFondamento(voce);
        const riferimenti = (voce.riferimenti || []).map(riferimento => {
            const dettaglio = riferimento.dettaglio ? ` — ${esc(riferimento.dettaglio)}` : '';
            return `<li><strong>${esc(citazioneEstesa(riferimento))}</strong>${dettaglio}</li>`;
        }).join('');
        return `
            <p class="norma-pop-occhiello">${esc(fondamento)}</p>
            <h3 class="norma-pop-titolo">${esc(voce.termine)}</h3>
            ${voce.citazione ? `<p class="norma-pop-citazione">${esc(voce.citazione)}</p>` : ''}
            <p class="norma-pop-testo">${esc(voce.definizione)}</p>
            ${voce.avvertenza ? `<p class="norma-pop-avvertenza">${esc(voce.avvertenza)}</p>` : ''}
            ${riferimenti ? `<p class="norma-pop-etichetta">Si regge su</p><ul class="norma-pop-fonti">${riferimenti}</ul>` : ''}
            <p class="norma-pop-vai"><a href="normativa.html#${esc(voce.id)}" target="_top">Apri i riferimenti normativi →</a></p>`;
    }

    function apri(bottone, voce) {
        const riquadro = creaPannello();
        riquadro.innerHTML = contenutoPannello(voce);
        riquadro.hidden = false;
        apertoDa = bottone;
        bottone.setAttribute('aria-expanded', 'true');
        posiziona(bottone, riquadro);
    }

    // Il pannello sta sotto la parola, ma rientra da solo quando la parola è
    // vicina al bordo: dentro l'iframe lo spazio a destra finisce presto.
    function posiziona(bottone, riquadro) {
        const punto = bottone.getBoundingClientRect();
        const larghezza = riquadro.offsetWidth;
        const margine = 12;
        let sinistra = punto.left + window.scrollX;
        const massimo = window.scrollX + document.documentElement.clientWidth - larghezza - margine;
        sinistra = Math.max(window.scrollX + margine, Math.min(sinistra, massimo));

        const sopra = punto.bottom + window.scrollY + 8;
        const altezza = riquadro.offsetHeight;
        const fondoVisibile = window.scrollY + window.innerHeight;
        const sotto = punto.top + window.scrollY - altezza - 8;
        const alto = sopra + altezza > fondoVisibile && sotto > window.scrollY ? sotto : sopra;

        riquadro.style.left = `${Math.round(sinistra)}px`;
        riquadro.style.top = `${Math.round(alto)}px`;
    }

    // Marca gli elementi con data-termine. Si può richiamare dopo aver disegnato
    // schede nuove: gli elementi già marcati vengono saltati.
    function marca(radice = document) {
        if (!dati) return;
        radice.querySelectorAll('[data-termine]').forEach(nodo => {
            if (nodo.dataset.normaPronta === 'si') return;
            const voce = termine(nodo.dataset.termine);
            if (!voce) return;
            nodo.dataset.normaPronta = 'si';
            nodo.classList.add('norma-termine');

            const bottone = document.createElement('button');
            bottone.type = 'button';
            bottone.className = 'norma-chip';
            bottone.setAttribute('aria-expanded', 'false');
            bottone.setAttribute('aria-label', `Definizione e riferimento normativo di ${voce.termine}`);
            bottone.title = riferimentiInLinea(voce) || voce.termine;
            bottone.textContent = 'ⓘ';
            // Il segno può stare dentro un <summary> o un'intestazione che
            // apre e chiude: il clic sul segno riguarda solo il segno.
            bottone.addEventListener('click', evento => {
                evento.preventDefault();
                evento.stopPropagation();
                if (apertoDa === bottone) return chiudi();
                chiudi();
                apri(bottone, voce);
            });
            nodo.appendChild(bottone);
        });
    }

    function avvia() {
        carica().then(json => {
            if (!json) return;
            marca(document);
            if (document.getElementById('norma-glossario')) disegnaPagina(json);
        });
        // I cataloghi ridisegnano le schede a ogni filtro: i segni vanno
        // rimessi sulle etichette appena create, non solo su quelle di partenza.
        // Il rinvio di un giro serve perché sullo stesso evento lavorano anche
        // ripartizione oraria e revisione: si marca quando hanno
        // finito, altrimenti le loro etichette resterebbero scoperte.
        document.addEventListener('curricolo:uda-rendered', () => setTimeout(() => marca(document), 0));
    }

    // ------------------------------------------------------------------
    // Pagina del glossario
    // ------------------------------------------------------------------

    function schedaTermine(voce) {
        const riferimenti = (voce.riferimenti || []).map(riferimento => {
            const dettaglio = riferimento.dettaglio ? ` — ${esc(riferimento.dettaglio)}` : '';
            const norma = fonte(riferimento.fonte);
            const ancora = norma ? `<a href="#fonte-${esc(norma.id)}">${esc(citazioneEstesa(riferimento))}</a>`
                : esc(citazioneEstesa(riferimento));
            return `<li>${ancora}${dettaglio}</li>`;
        }).join('');

        const cerca = [voce.termine, voce.definizione, ...(voce.alias || []),
            ...(voce.riferimenti || []).map(citazioneEstesa)].join(' ');

        return `<article class="norma-voce" id="${esc(voce.id)}" data-cerca="${esc(normalizza(cerca))}" data-fondamento="${esc(voce.fondamento)}">
            <header class="norma-voce-testa">
                <h3>${esc(voce.termine)}</h3>
                <span class="norma-badge norma-badge-${esc(voce.fondamento)}">${esc(etichettaFondamento(voce))}</span>
            </header>
            ${voce.citazione ? `<p class="norma-voce-citazione">${esc(voce.citazione)}</p>` : ''}
            <p class="norma-voce-definizione">${esc(voce.definizione)}</p>
            ${voce.avvertenza ? `<p class="norma-voce-avvertenza">${esc(voce.avvertenza)}</p>` : ''}
            ${riferimenti ? `<div class="norma-voce-fonti"><p class="norma-voce-etichetta">Si regge su</p><ul>${riferimenti}</ul></div>` : ''}
            ${voce.usoNelSito ? `<p class="norma-voce-uso"><strong>Nel sito:</strong> ${esc(voce.usoNelSito)}</p>` : ''}
        </article>`;
    }

    function schedaFonte(norma) {
        const titolo = norma.url
            ? `<a href="${esc(norma.url)}" target="_blank" rel="noopener noreferrer">${esc(norma.norma)}</a>`
            : esc(norma.norma);
        return `<article class="norma-fonte" id="fonte-${esc(norma.id)}">
            <h3>${titolo}</h3>
            <p class="norma-fonte-titolo">${esc(norma.titolo)}</p>
            ${norma.pubblicazione ? `<p class="norma-fonte-gu">${esc(norma.pubblicazione)}</p>` : ''}
            ${norma.nota ? `<p class="norma-fonte-nota">${esc(norma.nota)}</p>` : ''}
            <p class="norma-fonte-oggetto">${esc(norma.oggetto)}</p>
            ${norma.url ? `<p class="norma-fonte-gu"><a href="${esc(norma.url)}" target="_blank" rel="noopener noreferrer">Consulta la fonte istituzionale ↗</a></p>` : ''}
        </article>`;
    }

    function disegnaPagina(json) {
        const meta = json.meta || {};
        const intro = document.getElementById('norma-intro');
        if (intro) {
            intro.innerHTML = `
                <p>${esc(meta.nota || '')}</p>
                <p class="norma-avvertenza">${esc(meta.avvertenza || '')}</p>`;
        }

        const legenda = document.getElementById('norma-legenda');
        if (legenda && meta.legenda) {
            legenda.innerHTML = Object.entries(meta.legenda).map(([chiave, testo]) =>
                `<li><span class="norma-badge norma-badge-${esc(chiave)}">${esc(ETICHETTA_FONDAMENTO[chiave] || chiave)}</span> ${esc(testo)}</li>`).join('');
        }

        const glossario = document.getElementById('norma-glossario');
        if (glossario) glossario.innerHTML = (json.glossario || []).map(schedaTermine).join('');

        const fonti = document.getElementById('norma-fonti');
        if (fonti) fonti.innerHTML = (json.fonti || []).map(schedaFonte).join('');

        const conteggio = document.getElementById('norma-conteggio');
        if (conteggio) {
            conteggio.textContent = `${(json.glossario || []).length} termini · ${(json.fonti || []).length} fonti normative`;
        }

        collegaRicerca();
        // L'indirizzo normativa.html#uda arriva dal segno accanto alla parola:
        // la voce va portata sotto gli occhi anche se è stata appena disegnata.
        if (window.location.hash) {
            const bersaglio = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
            if (bersaglio) {
                bersaglio.scrollIntoView({ block: 'start' });
                bersaglio.classList.add('norma-voce-evidenziata');
            }
        }
    }

    function collegaRicerca() {
        const campo = document.getElementById('norma-ricerca');
        const filtro = document.getElementById('norma-filtro');
        const esito = document.getElementById('norma-esito');
        if (!campo && !filtro) return;

        const applica = () => {
            const testo = normalizza(campo ? campo.value : '');
            const genere = filtro ? filtro.value : '';
            let visibili = 0;
            document.querySelectorAll('.norma-voce').forEach(voce => {
                const perTesto = !testo || voce.dataset.cerca.includes(testo);
                const perGenere = !genere || voce.dataset.fondamento === genere;
                const mostra = perTesto && perGenere;
                voce.hidden = !mostra;
                if (mostra) visibili += 1;
            });
            if (esito) {
                esito.textContent = visibili === 0 ? 'Nessun termine corrisponde alla ricerca.'
                    : `${visibili} ${visibili === 1 ? 'termine' : 'termini'}`;
            }
        };
        if (campo) campo.addEventListener('input', applica);
        if (filtro) filtro.addEventListener('change', applica);
        applica();
    }

    window.Normativa = {
        carica,
        termine,
        fonte,
        marca,
        citazioneBreve,
        citazioneEstesa,
        riferimentiInLinea,
        etichettaFondamento,
        get dati() { return dati; }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
})();
