// Catalogo autonomo delle UDA di Educazione civica.
if (window.parent !== window) document.documentElement.classList.add('embedded');

let datiCivica = null;
const filtriCivica = { anno: '', insegnamento: '', search: '' };
const aperteCivica = new Set();
const ANNO_LABEL = { 1: '1° anno', 2: '2° anno', 3: '3° anno', 4: '4° anno', 5: '5° anno' };
const ANNO_CLASS = { 1: 'per-biennio', 2: 'per-biennio', 3: 'per-terzo', 4: 'per-quarto', 5: 'per-quinto' };
const classeIns = nome => (window.Insegnamenti ? window.Insegnamenti.classe(nome) : '');
const stessoIns = (uno, altro) => (window.Insegnamenti ? window.Insegnamenti.stesso(uno, altro) : uno === altro);

document.addEventListener('DOMContentLoaded', avviaCivica);

async function avviaCivica() {
    try {
        const risposta = await fetch('data-uda-civica.json', { cache: 'no-store' });
        if (!risposta.ok) throw new Error(`Catalogo Educazione civica: HTTP ${risposta.status}`);
        datiCivica = await risposta.json();
        preparaFiltriCivica();
        disegnaCivica();
    } catch (errore) {
        console.error('Errore caricamento UDA di Educazione civica:', errore);
        document.getElementById('civica-list').innerHTML = '<p class="empty-placeholder">Impossibile caricare le UDA di Educazione civica.</p>';
    } finally {
        document.getElementById('civica-loading')?.classList.add('hidden');
        notificaAltezzaCivica();
    }
}

function preparaFiltriCivica() {
    const insegnamento = document.getElementById('civica-insegnamento');
    const nomi = new Set(datiCivica.uda.flatMap(uda => [...(uda.abilita || []), ...(uda.saperi || [])].flatMap(voce => voce.ins || [])));
    [...nomi].sort((a, b) => a.localeCompare(b, 'it')).forEach(nome => {
        const opzione = document.createElement('option');
        opzione.value = nome;
        opzione.textContent = nome;
        insegnamento.appendChild(opzione);
    });
    document.querySelectorAll('.civica-anno-pill').forEach(bottone => bottone.addEventListener('click', () => {
        filtriCivica.anno = bottone.dataset.anno === filtriCivica.anno ? '' : bottone.dataset.anno;
        document.querySelectorAll('.civica-anno-pill').forEach(voce => {
            const attiva = voce.dataset.anno === filtriCivica.anno;
            voce.classList.toggle('active', attiva);
            voce.setAttribute('aria-pressed', attiva ? 'true' : 'false');
        });
        disegnaCivica();
    }));
    insegnamento.addEventListener('change', evento => { filtriCivica.insegnamento = evento.target.value; disegnaCivica(); });
    document.getElementById('civica-search').addEventListener('input', evento => { filtriCivica.search = evento.target.value.trim().toLowerCase(); disegnaCivica(); });
    document.getElementById('civica-reset').addEventListener('click', () => {
        Object.assign(filtriCivica, { anno: '', insegnamento: '', search: '' });
        insegnamento.value = '';
        document.getElementById('civica-search').value = '';
        document.querySelectorAll('.civica-anno-pill').forEach(voce => { voce.classList.remove('active'); voce.setAttribute('aria-pressed', 'false'); });
        aperteCivica.clear();
        disegnaCivica();
    });
    document.getElementById('civica-list').addEventListener('click', evento => {
        const bottone = evento.target.closest('.uda-acc-header');
        if (!bottone) return;
        const id = bottone.dataset.udaId;
        aperteCivica.has(id) ? aperteCivica.delete(id) : aperteCivica.add(id);
        disegnaCivica();
    });
}

function corrispondeCivica(uda) {
    if (filtriCivica.anno && String(uda.anno) !== filtriCivica.anno) return false;
    if (filtriCivica.insegnamento && ![...(uda.abilita || []), ...(uda.saperi || [])].some(voce => (voce.ins || []).some(nome => stessoIns(nome, filtriCivica.insegnamento)))) return false;
    return !filtriCivica.search || JSON.stringify(uda).toLowerCase().includes(filtriCivica.search);
}

function chipInsegnamenti(elenco) {
    return [...new Set(elenco)].map(nome => `<span class="ins-chip ${classeIns(nome)}">${htmlCivica(nome)}</span>`).join('');
}

function listaConInsegnamenti(elenco) {
    return (elenco || []).map(voce => `<li>${htmlCivica(voce.t)} ${chipInsegnamenti(voce.ins || [])}</li>`).join('');
}

function competenze(elenco, catalogo, prefisso) {
    return (elenco || []).map(numero => `<li><strong>${prefisso}${numero}</strong> — ${htmlCivica(catalogo?.[numero] || '')}</li>`).join('');
}

function schedaCivica(uda, apriTutte) {
    const aperta = apriTutte || aperteCivica.has(uda.id);
    const meta = datiCivica.meta;
    const insegnamenti = [...new Set([...(uda.abilita || []), ...(uda.saperi || [])].flatMap(voce => voce.ins || []))];
    const panel = `civica-panel-${uda.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const competenzaEc = meta.competenzeEducazioneCivica?.[uda.competenzaEducazioneCivica] || '';
    return `<div class="uda-acc uda-acc-trasversale ${aperta ? 'group-expanded' : ''}" data-id="${htmlCivica(uda.id)}" data-uda-revisione-key="${htmlCivica(uda.id)}">
        <button type="button" class="uda-acc-header" data-uda-id="${htmlCivica(uda.id)}" aria-expanded="${aperta}" aria-controls="${panel}">
            <span class="uda-num ${ANNO_CLASS[uda.anno]}">${htmlCivica(uda.id)}</span>
            <span class="uda-acc-main"><span class="uda-acc-title">${htmlCivica(uda.titolo)}</span><span class="uda-acc-sub">${htmlCivica(uda.periodo)} · Nucleo ${htmlCivica(uda.nucleoEducazioneCivica)} · Competenza EC${htmlCivica(uda.competenzaEducazioneCivica)}</span></span>
            <span class="uda-acc-pills"><span class="pill ${ANNO_CLASS[uda.anno]}">${ANNO_LABEL[uda.anno]}</span><span class="pill pill-qnq">QNQ ${htmlCivica(uda.qnq)}</span><span class="pill pill-comp">⏱ ${htmlCivica(uda.ore)} ore</span></span><span class="group-chevron" aria-hidden="true">▸</span>
        </button>
        <div class="uda-acc-body" id="${panel}" ${aperta ? '' : 'hidden'}>
            <div class="uda-sintetica">
                <div class="sin-row"><div class="sin-label">Nucleo concettuale</div><div class="sin-value">${htmlCivica(uda.nucleoEducazioneCivica)}</div></div>
                <div class="sin-row"><div class="sin-label">Competenza nazionale EC${htmlCivica(uda.competenzaEducazioneCivica)}</div><div class="sin-value">${htmlCivica(competenzaEc)}</div></div>
                <div class="sin-row"><div class="sin-label">Obiettivo di apprendimento</div><div class="sin-value">${htmlCivica(uda.obiettivoEducazioneCivica)}</div></div>
                <div class="sin-row"><div class="sin-label">Competenze area generale</div><div class="sin-value"><ul class="sin-list">${competenze(uda.competenzeGenerali, meta.competenzeGenerali, 'G')}</ul></div></div>
                <div class="sin-row"><div class="sin-label">Competenze SSAS</div><div class="sin-value"><ul class="sin-list">${competenze(uda.competenzeSSAS, meta.competenzeSSAS, 'C')}</ul></div></div>
                <div class="sin-row"><div class="sin-label">Traguardo</div><div class="sin-value">${htmlCivica(uda.traguardo)}</div></div>
                <div class="sin-row"><div class="sin-label">Situazione / problema</div><div class="sin-value">${htmlCivica(uda.situazione)}</div></div>
                <div class="sin-row"><div class="sin-label">Compito di realtà</div><div class="sin-value">${htmlCivica(uda.compito)}</div></div>
                <div class="sin-row"><div class="sin-label">Prodotto</div><div class="sin-value">${htmlCivica(uda.prodotto)}</div></div>
                <div class="sin-row"><div class="sin-label">Abilità per insegnamento</div><div class="sin-value"><ul class="sin-list">${listaConInsegnamenti(uda.abilita)}</ul></div></div>
                <div class="sin-row"><div class="sin-label">Saperi per insegnamento</div><div class="sin-value"><ul class="sin-list">${listaConInsegnamenti(uda.saperi)}</ul></div></div>
                <div class="sin-row"><div class="sin-label">Insegnamenti coinvolti</div><div class="sin-value">${chipInsegnamenti(insegnamenti)}</div></div>
            </div>
            <div class="uda-ore-slot" data-uda-ore-slot="${htmlCivica(uda.id)}"></div>
            <div class="uda-revisione-slot" data-uda-revisione-slot="${htmlCivica(uda.id)}"></div>
        </div>
    </div>`;
}

function disegnaCivica() {
    if (!datiCivica) return;
    const visibili = datiCivica.uda.filter(corrispondeCivica);
    const apriTutte = Boolean(filtriCivica.anno || filtriCivica.insegnamento || filtriCivica.search);
    document.getElementById('civica-count').textContent = `${visibili.length} ${visibili.length === 1 ? 'scheda' : 'schede'} su ${datiCivica.uda.length}`;
    document.getElementById('civica-list').innerHTML = visibili.length ? [1, 2, 3, 4, 5].map(anno => {
        const gruppo = visibili.filter(uda => uda.anno === anno);
        return gruppo.length ? `<div class="uda-section uda-section-trasversale"><div class="uda-section-header"><span class="uda-icon anno-badge ${ANNO_CLASS[anno]}">${anno}°</span><h3>${ANNO_LABEL[anno].toUpperCase()} — ${gruppo.length} ${gruppo.length === 1 ? 'proposta' : 'proposte'}</h3><span class="uda-rule"></span></div>${gruppo.map(uda => schedaCivica(uda, apriTutte)).join('')}</div>` : '';
    }).join('') : '<div class="empty-state"><p>Nessuna UDA di Educazione civica corrisponde ai filtri.</p></div>';
    document.dispatchEvent(new CustomEvent('curricolo:uda-rendered'));
    notificaAltezzaCivica();
}

function notificaAltezzaCivica() {
    if (window.parent === window) return;
    requestAnimationFrame(() => window.parent.postMessage({ type: 'iframeContentHeight', height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) }, '*'));
}

function htmlCivica(valore) {
    return String(valore ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
