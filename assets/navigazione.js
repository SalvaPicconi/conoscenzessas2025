// Navigazione fra le sezioni del curricolo.
//
// Le sei sezioni vivono in due modi: dentro index.html, come linguette che
// caricano un iframe, e da sole, quando si apre direttamente uda.html o si
// arriva da un collegamento. Nel secondo caso mancava qualsiasi via di ritorno.
//
// Lo stesso file copre i tre casi:
//   · pagina principale → barra rapida che compare quando le linguette escono
//     dallo schermo, per cambiare sezione senza risalire;
//   · pagina autonoma   → barra fissa in cima, con il ritorno al curricolo;
//   · pagina in iframe  → niente, perché le linguette della madre bastano.

const SEZIONI = [
    { id: 'indirizzo', etichetta: 'Area di indirizzo', pagina: 'area-indirizzo.html' },
    { id: 'generale', etichetta: 'Area generale', pagina: 'area-generale.html' },
    { id: 'uda', etichetta: 'UDA d’asse', pagina: 'uda.html' },
    { id: 'trasversali', etichetta: 'UDA trasversali', pagina: 'uda-trasversali.html' },
    { id: 'fsl', etichetta: 'UDA FSL', pagina: 'uda-fsl.html' },
    { id: 'pfi', etichetta: 'PFI', pagina: 'pfi.html' }
];

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.tab-navigation')) return costruisciBarraRapida();
    if (window.parent !== window) return;
    costruisciBarraPagina();
});

function sezioneCorrente() {
    const percorso = window.location.pathname.split('/').pop() || 'index.html';
    return SEZIONI.find(sezione => sezione.pagina === percorso) || null;
}

// Barra fissa in cima alle pagine aperte da sole.
function costruisciBarraPagina() {
    const corrente = sezioneCorrente();
    const barra = document.createElement('nav');
    barra.className = 'nav-curricolo';
    barra.setAttribute('aria-label', 'Sezioni del curricolo');

    const ritorno = document.createElement('a');
    ritorno.className = 'nav-curricolo-home';
    ritorno.href = 'index.html';
    ritorno.innerHTML = '<span aria-hidden="true">←</span> Curricolo SSAS';
    ritorno.title = 'Torna alla pagina principale del curricolo';

    const elenco = document.createElement('div');
    elenco.className = 'nav-curricolo-sezioni';
    SEZIONI.forEach(sezione => {
        const voce = document.createElement('a');
        // Il collegamento riporta dentro la pagina principale, già sulla sezione
        // scelta: da lì restano disponibili tutte le altre.
        voce.href = `index.html#${sezione.id}`;
        voce.className = 'nav-curricolo-voce';
        voce.textContent = sezione.etichetta;
        if (corrente && sezione.id === corrente.id) {
            voce.setAttribute('aria-current', 'page');
            voce.href = '#';
            voce.addEventListener('click', evento => {
                evento.preventDefault();
                window.scrollTo({ top: 0, behavior: preferisceMenoMovimento() ? 'auto' : 'smooth' });
            });
        }
        elenco.appendChild(voce);
    });

    barra.append(ritorno, elenco);
    document.body.prepend(barra);
    const aggiornaBordi = segnalaScorrimento(elenco);
    if (corrente) portaInVista(elenco, elenco.querySelector('[aria-current="page"]'));
    aggiornaBordi();
}

// Barra rapida della pagina principale: compare quando le linguette non si vedono più.
function costruisciBarraRapida() {
    const linguette = document.querySelector('.tab-navigation');
    const bottoni = [...document.querySelectorAll('.tab-button')];
    if (!bottoni.length) return;

    const barra = document.createElement('nav');
    barra.className = 'nav-rapida';
    barra.setAttribute('aria-label', 'Cambia sezione');
    barra.hidden = true;

    const titolo = document.createElement('span');
    titolo.className = 'nav-rapida-titolo';
    titolo.textContent = 'Sezioni';

    const elenco = document.createElement('div');
    elenco.className = 'nav-curricolo-sezioni';
    const voci = new Map();
    bottoni.forEach(bottone => {
        const voce = document.createElement('button');
        voce.type = 'button';
        voce.className = 'nav-curricolo-voce';
        voce.textContent = bottone.querySelector('.tab-label')?.textContent || bottone.dataset.tab;
        // Riusa la linguetta vera: cambio sezione, stato e scorrimento restano
        // definiti in un posto solo, in script-main.js.
        voce.addEventListener('click', () => bottone.click());
        voci.set(bottone.dataset.tab, voce);
        elenco.appendChild(voce);
    });

    barra.append(titolo, elenco);
    document.body.appendChild(barra);
    const aggiornaBordi = segnalaScorrimento(elenco);

    const segnaAttiva = () => {
        const attiva = bottoni.find(bottone => bottone.classList.contains('active'))?.dataset.tab;
        voci.forEach((voce, id) => {
            if (id === attiva) voce.setAttribute('aria-current', 'true');
            else voce.removeAttribute('aria-current');
        });
        const voceAttiva = voci.get(attiva);
        if (voceAttiva && !barra.hidden) {
            portaInVista(elenco, voceAttiva);
            aggiornaBordi();
        }
    };
    bottoni.forEach(bottone => bottone.addEventListener('click', () => setTimeout(segnaAttiva, 0)));
    window.addEventListener('hashchange', () => setTimeout(segnaAttiva, 0));
    segnaAttiva();

    // La barra compare quando il blocco delle linguette è uscito dallo schermo.
    // Un ascoltatore di scorrimento, non un IntersectionObserver: quest'ultimo
    // dipende dai cicli di disegno e resta muto quando la pagina non è dipinta.
    let atteso = false;
    const verifica = () => {
        atteso = false;
        const fuoriVista = linguette.getBoundingClientRect().bottom <= 8;
        if (barra.hidden !== !fuoriVista) {
            barra.hidden = !fuoriVista;
            // Spazio in fondo perché la barra non copra l'ultima riga: lo mette
            // il codice, non il foglio di stile, perché :has() manca nei Safari
            // meno recenti e proprio lì il difetto si vedrebbe.
            document.body.style.paddingBottom = fuoriVista ? `${barra.offsetHeight}px` : '';
            if (fuoriVista) segnaAttiva();
        }
    };
    const programma = () => {
        if (atteso) return;
        atteso = true;
        setTimeout(verifica, 80);
    };
    window.addEventListener('scroll', programma, { passive: true });
    window.addEventListener('resize', programma, { passive: true });
    verifica();
}

// Sfuma i bordi della riga quando ci sono voci fuori campo: senza questo segnale
// le voci tagliate sembrano un difetto invece di un invito a scorrere.
function segnalaScorrimento(elenco) {
    const verifica = () => {
        const eccedenza = elenco.scrollWidth - elenco.clientWidth;
        if (eccedenza <= 1) return elenco.removeAttribute('data-bordi');
        const aSinistra = elenco.scrollLeft > 1;
        const aDestra = elenco.scrollLeft < eccedenza - 1;
        elenco.dataset.bordi = aSinistra && aDestra ? 'entrambi' : aSinistra ? 'sinistra' : 'destra';
    };
    elenco.addEventListener('scroll', verifica, { passive: true });
    window.addEventListener('resize', verifica, { passive: true });
    verifica();
    return verifica;
}

// Porta la voce attiva sotto gli occhi senza trascinare con sé tutta la pagina.
function portaInVista(contenitore, voce) {
    if (!voce) return;
    const scostamento = voce.offsetLeft - (contenitore.clientWidth - voce.offsetWidth) / 2;
    contenitore.scrollTo({ left: Math.max(0, scostamento), behavior: 'auto' });
}

function preferisceMenoMovimento() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
