if (window.parent !== window) document.documentElement.classList.add('embedded');

const aperte = new Set();
let datiDipartimento = null;

const esc = valore => String(valore ?? '').replace(/[&<>'"]/g, carattere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[carattere]);

document.addEventListener('DOMContentLoaded', inizializza);

async function inizializza() {
    try {
        const risposta = await fetch('data-uda-dipartimento.json', { cache: 'no-store' });
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        datiDipartimento = await risposta.json();
        collegaEventi();
        disegna();
    } catch (errore) {
        document.getElementById('dip-classi').innerHTML = `<p class="error">Impossibile caricare le UDA adottate: ${esc(errore.message)}</p>`;
    } finally {
        document.getElementById('dip-loading')?.classList.add('hidden');
        notificaAltezza();
    }
}

function collegaEventi() {
    document.getElementById('dip-classi').addEventListener('click', gestisciApertura);
    document.getElementById('simulazioni').addEventListener('click', gestisciApertura);
}

function gestisciApertura(evento) {
    const bottone = evento.target.closest('.uda-acc-header');
    if (!bottone) return;
    const scheda = bottone.closest('.uda-acc');
    const id = scheda.dataset.id;
    if (aperte.has(id)) aperte.delete(id); else aperte.add(id);
    const aperta = aperte.has(id);
    scheda.classList.toggle('group-expanded', aperta);
    bottone.setAttribute('aria-expanded', String(aperta));
    scheda.querySelector('.uda-acc-body').hidden = !aperta;
    notificaAltezza();
}

function disegna() {
    const decisioni = datiDipartimento.classi.flatMap(classe => classe.decisioni);
    document.getElementById('dip-total-biennio').textContent = datiDipartimento.classi.filter(classe => classe.anno <= 2).flatMap(classe => classe.decisioni).length;
    document.getElementById('dip-total-fsl').textContent = decisioni.filter(voce => voce.categoria === 'FSL').length;
    document.getElementById('dip-total-asse').textContent = decisioni.filter(voce => voce.categoria === 'UDA d’asse').length;
    document.getElementById('dip-total-sim').textContent = datiDipartimento.simulazioni.voci.length;
    document.getElementById('dip-summary-note').textContent = datiDipartimento.meta.nota;
    document.getElementById('dip-classi').innerHTML = datiDipartimento.classi.map(disegnaClasse).join('');
    document.getElementById('simulazioni').innerHTML = disegnaSimulazioni(datiDipartimento.simulazioni);
    document.dispatchEvent(new CustomEvent('curricolo:uda-rendered'));
    notificaAltezza();
}

function disegnaClasse(classe) {
    return `<section id="classe-${classe.anno}" class="dip-section dip-class" aria-labelledby="dip-class-${classe.anno}">
        <div class="dip-section-head">
            <div class="dip-year">${classe.anno}ª</div>
            <div><p class="dip-eyebrow">Classe ${nomeAnno(classe.anno)}</p><h2 id="dip-class-${classe.anno}">${esc(classe.sintesi)}</h2></div>
        </div>
        <div class="dip-catalogue">${classe.decisioni.map(disegnaDecisione).join('')}</div>
    </section>`;
}

function disegnaDecisione(decisione) {
    return decisione.unita.map(uda => disegnaUda(uda, decisione.categoria, decisione.stato)).join('');
}

function disegnaSimulazioni(simulazioni) {
    return `<div class="dip-section-head dip-section-head-wide">
        <div class="dip-year dip-year-exam" aria-hidden="true">2</div>
        <div><p class="dip-eyebrow">Classe quinta · Esame di Stato</p><h2 id="dip-sim-title">${esc(simulazioni.titolo)}</h2><p>${esc(simulazioni.calendario)}</p></div>
    </div>
    <div class="dip-catalogue">${simulazioni.voci.map(voce => disegnaUda(voce.unita[0], voce.categoria, voce.stato)).join('')}</div>`;
}

function disegnaUda(uda, categoria, stato) {
    const aperta = aperte.has(uda.id);
    const pannello = `dip-panel-${String(uda.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    return `<article class="uda-acc dip-full-uda ${aperta ? 'group-expanded' : ''}" data-id="${esc(uda.id)}" data-uda-revisione-key="${esc(uda.id)}">
        <button type="button" class="uda-acc-header" aria-expanded="${aperta}" aria-controls="${pannello}">
            <span class="dip-unit-kind">${esc(categoria)}</span>
            <span class="uda-acc-main"><span class="uda-acc-title">${esc(uda.titolo)}</span><span class="uda-acc-sub">${esc(metadatiUda(uda))}</span></span>
            <span class="dip-status">${esc(stato)}</span><span class="group-chevron" aria-hidden="true">▸</span>
        </button>
        <div class="uda-acc-body" id="${pannello}" ${aperta ? '' : 'hidden'}>
            ${Array.isArray(uda.nuclei) && uda.compitoAtteso ? dettaglioEsame(uda) : dettaglioUda(uda)}
            <div class="uda-revisione-slot" data-uda-revisione-slot="${esc(uda.id)}"></div>
        </div>
    </article>`;
}

function metadatiUda(uda) {
    const parti = [`Classe ${uda.anno}ª`];
    if (uda.qnq) parti.push(`QNQ ${uda.qnq}`);
    if (uda.periodo) parti.push(uda.periodo);
    else if (uda.collocazione) parti.push(uda.collocazione);
    if (uda.durata) parti.push(`${uda.durata} ore`);
    else if (uda.ore) parti.push(`${uda.ore} ore`);
    return parti.join(' · ');
}

function dettaglioUda(uda) {
    const competenze = disegnaCompetenze(uda);
    return `<div class="dip-detail-grid">
        ${dettaglioCivica(uda)}
        ${competenze ? sezione('Competenze', competenze) : ''}
        ${testo('Traguardo formativo', uda.traguardo)}
        ${testo('Situazione-problema', uda.situazione)}
        ${testo('Compito di realtà', uda.compito || uda.sintesi)}
        ${testo('Prodotto atteso', uda.prodotto)}
        ${testo('Beneficiari', uda.beneficiari)}
        ${testo('Ambito', uda.ambito)}
        ${testo('Area di tirocinio', uda.areaTirocinio)}
        ${ripartizioneOre(uda.oreRipartizione)}
        ${listaDidattica('Abilità', uda.abilita)}
        ${listaDidattica('Saperi', uda.saperi)}
        ${listaDidattica('Saperi integrativi', uda.integrazioniSaperi)}
        ${pianificazione(uda.pianificazione)}
        ${rubrica(uda.rubrica)}
        ${testo('Condizioni di realizzazione', uda.condizioniRealizzazione)}
        ${testo('Criterio di valutazione', uda.criterioValutazione)}
        ${listaTesti('Raccordo con il profilo', uda.raccordoProfilo)}
        ${testo('Collocazione', uda.collocazione)}
    </div>`;
}

function dettaglioCivica(uda) {
    if (!uda.nucleoEducazioneCivica) return '';
    const descrizione = datiDipartimento.riferimentiCurricolari.competenzeEducazioneCivica?.[uda.competenzaEducazioneCivica] || '';
    return `${testo('Nucleo concettuale di Educazione civica', uda.nucleoEducazioneCivica)}
        ${testo(`Competenza nazionale EC${uda.competenzaEducazioneCivica}`, descrizione)}
        ${testo('Obiettivo di apprendimento', uda.obiettivoEducazioneCivica)}`;
}

function disegnaCompetenze(uda) {
    const blocchi = [];
    if (uda.competenza && !uda.nucleoEducazioneCivica) blocchi.push(`<p><strong>Competenza in uscita:</strong> C${esc(uda.competenza)}</p>`);
    if (uda.competenzeGenerali?.length) blocchi.push(listaCompetenze('Area generale', uda.competenzeGenerali, 'G', datiDipartimento.riferimentiCurricolari.competenzeGenerali));
    if (uda.competenzeSSAS?.length) blocchi.push(listaCompetenze('Profilo SSAS', uda.competenzeSSAS, 'C', datiDipartimento.riferimentiCurricolari.competenzeSSAS));
    if (uda.competenzeEuropee?.length) blocchi.push(`<div><strong>Competenze chiave europee</strong><ul>${uda.competenzeEuropee.map(voce => `<li>${esc(voce)}</li>`).join('')}</ul></div>`);
    if (uda.assi?.length) blocchi.push(`<div><strong>Assi culturali</strong><ul>${uda.assi.map(voce => `<li>${esc(voce)}</li>`).join('')}</ul></div>`);
    if (uda.competenze?.length) blocchi.push(`<div><strong>Competenze in uscita</strong><ul>${uda.competenze.map(voce => typeof voce === 'object'
        ? `<li><strong>C${esc(voce.numero)}</strong> — ${esc(voce.traguardo)}</li>`
        : `<li>C${esc(voce)}</li>`).join('')}</ul></div>`);
    return blocchi.join('');
}

function listaCompetenze(titolo, numeri, prefisso, catalogo = {}) {
    return `<div><strong>${esc(titolo)}</strong><ul>${numeri.map(numero => `<li><strong>${prefisso}${esc(numero)}</strong>${catalogo?.[numero] ? ` — ${esc(catalogo[numero])}` : ''}</li>`).join('')}</ul></div>`;
}

function dettaglioEsame(uda) {
    const tipo = datiDipartimento.riferimentiCurricolari.tipologieEsame.find(voce => voce.id === uda.tipologia);
    const oreContributi = (uda.contributi || []).reduce((totale, voce) => totale + Number(voce.ore || 0), 0);
    const oreFasi = (uda.fasi || []).reduce((totale, voce) => totale + Number(voce.ore || 0), 0);
    return `<div class="dip-detail-grid dip-exam-detail">
        ${sezione('Quadro della prova', `<dl class="dip-definition-list">
            ${rigaDefinizione('Tipologia', `${uda.tipologia}${tipo?.definizione ? ` · ${tipo.definizione}` : ''}`)}
            ${rigaDefinizione('Periodo', uda.periodo)}
            ${rigaDefinizione('Durata', `${uda.durata} ore, di cui ${uda.provaFinaleOre} per la prova individuale`)}
            ${rigaDefinizione('Argomento', uda.argomento)}
        </dl>`)}
        ${sezione('Nuclei tematici', `<ul>${uda.nuclei.map(voce => `<li><strong>Nucleo ${esc(voce.id)}</strong> — ${esc(voce.testo)}</li>`).join('')}</ul>`)}
        ${sezione('Competenze e traguardi', `<ul>${uda.competenze.map(voce => `<li><strong>C${esc(voce.numero)}</strong> — ${esc(voce.traguardo)}</li>`).join('')}</ul>`)}
        ${sezione('Compito atteso', `<dl class="dip-definition-list">
            ${rigaDefinizione('Situazione-problema', uda.compitoAtteso.situazione)}
            ${rigaDefinizione('Ruolo', uda.compitoAtteso.ruolo)}
            ${rigaDefinizione('Committente', uda.compitoAtteso.committente)}
            ${rigaDefinizione('Destinatario', uda.compitoAtteso.destinatario)}
            ${rigaDefinizione('Prodotto', uda.compitoAtteso.prodotto)}
            ${rigaDefinizione('Autonomia nel compito', uda.compitoAtteso.autonomiaOperativa)}
        </dl>`)}
        ${sezione('Contributi degli insegnamenti', tabellaContributi(uda.contributi, oreContributi))}
        ${coinvolgimenti(uda.coinvolgimentiOpzionali)}
        ${sezione('Percorso didattico', `<ol class="dip-phase-list">${uda.fasi.map(voce => `<li><strong>${esc(voce.titolo)} · ${esc(voce.ore)} ore</strong><p>${esc(voce.attivita)}</p></li>`).join('')}</ol><p><strong>Totale:</strong> ${oreFasi} ore</p>`)}
        ${sezione('Dossier documentale', `<div class="dip-dossier">${uda.dossier.map(voce => `<article><h4>${voce.url ? `<a href="${esc(voce.url)}" target="_blank" rel="noopener">${esc(voce.titolo)}</a>` : esc(voce.titolo)}</h4><p>${esc(voce.uso)}</p></article>`).join('')}</div>`)}
        ${testo('Consegna conclusiva individuale', uda.traccia)}
        ${sezione('Criteri di valutazione', `<ul>${uda.focusValutazione.map(voce => `<li>${esc(voce)}</li>`).join('')}</ul>`)}
        ${testo('Personalizzazione e accessibilità', uda.personalizzazione)}
    </div>`;
}

function tabellaContributi(contributi = [], totale) {
    return `<div class="dip-table-wrap"><table><thead><tr><th>Insegnamento</th><th>Ore</th><th>Saperi</th><th>Abilità</th><th>Evidenza</th></tr></thead><tbody>${contributi.map(voce => `<tr><th>${esc(voce.insegnamento)}</th><td>${esc(voce.ore)}</td><td>${esc(voce.saperi)}</td><td>${esc(voce.abilita)}</td><td>${esc(voce.evidenza)}</td></tr>`).join('')}</tbody><tfoot><tr><th>Totale</th><td>${totale}</td><td colspan="3"></td></tr></tfoot></table></div>`;
}

function coinvolgimenti(voci = []) {
    if (!voci.length) return '';
    return sezione('Possibile coinvolgimento di altri insegnamenti', `<ul>${voci.map(voce => `<li><strong>${esc(voce.insegnamento)}</strong> — ${esc(voce.contributo)}</li>`).join('')}</ul>`);
}

function testo(titolo, valore) {
    return valore ? sezione(titolo, `<p>${esc(valore)}</p>`) : '';
}

function sezione(titolo, contenuto) {
    return `<section class="dip-detail-section"><h3>${esc(titolo)}</h3>${contenuto}</section>`;
}

function listaDidattica(titolo, voci = []) {
    if (!voci.length) return '';
    return sezione(titolo, `<ul class="dip-learning-list">${voci.map(voce => `<li><span>${esc(voce.t)}</span>${voce.ins?.length ? `<small>${voce.ins.map(esc).join(' · ')}</small>` : ''}</li>`).join('')}</ul>`);
}

function listaTesti(titolo, voci = []) {
    if (!Array.isArray(voci) || !voci.length) return '';
    return sezione(titolo, `<ul>${voci.map(voce => `<li>${esc(typeof voce === 'object' ? (voce.testo || voce.titolo || '') : voce)}</li>`).join('')}</ul>`);
}

function ripartizioneOre(voci) {
    if (!voci || typeof voci !== 'object' || !Object.keys(voci).length) return '';
    const totale = Object.values(voci).reduce((somma, ore) => somma + Number(ore || 0), 0);
    return sezione('Ripartizione oraria', `<ul>${Object.entries(voci).map(([insegnamento, ore]) => `<li><strong>${esc(insegnamento)}</strong> — ${esc(ore)} ore</li>`).join('')}</ul><p><strong>Totale:</strong> ${totale} ore</p>`);
}

function pianificazione(voci = []) {
    if (!voci) return '';
    const fasi = Array.isArray(voci) ? voci : (voci.fasi || []);
    const dettagli = Array.isArray(voci) ? '' : [
        testoPianificazione('Stato', voci.stato),
        voci.oreOrigine?.length ? `<div><strong>Monte ore di riferimento</strong><ul>${voci.oreOrigine.map(voce => `<li>${esc(voce.scheda)} · ${esc(voce.ore)} ore</li>`).join('')}</ul></div>` : '',
        testoPianificazione('Nota', voci.nota),
        voci.decisioniNecessarie?.length ? `<div><strong>Decisioni operative</strong><ul>${voci.decisioniNecessarie.map(voce => `<li>${esc(voce)}</li>`).join('')}</ul></div>` : ''
    ].join('');
    if (!fasi.length && !dettagli) return '';
    const elenco = fasi.length ? `<ol class="dip-phase-list">${fasi.map(voce => `<li><strong>${esc(voce.fase || voce.titolo || voce.attivita || '')}${voce.ore ? ` · ${esc(voce.ore)} ore` : ''}</strong>${(voce.fase || voce.titolo) && (voce.attivita || voce.descrizione) ? `<p>${esc(voce.attivita || voce.descrizione)}</p>` : ''}</li>`).join('')}</ol>` : '';
    return sezione('Pianificazione', `${dettagli}${elenco}`);
}

function rubrica(voci = []) {
    if (!voci.length) return '';
    return sezione('Valutazione', `<div class="dip-rubrics">${voci.map(voce => `<article><h4>${esc(voce.indicatore || voce.criterio || '')}</h4>${voce.descrittore || voce.descrizione ? `<p>${esc(voce.descrittore || voce.descrizione)}</p>` : ''}${voce.evidenzaIndividuale ? `<p><strong>Evidenza individuale:</strong> ${esc(voce.evidenzaIndividuale)}</p>` : ''}${voce.livelli?.length ? `<ul>${voce.livelli.map(livello => `<li><strong>${esc(livello.livello)}</strong> — ${esc(livello.descrittore)}</li>`).join('')}</ul>` : ''}</article>`).join('')}</div>`);
}

function testoPianificazione(etichetta, valore) {
    return valore ? `<p><strong>${esc(etichetta)}:</strong> ${esc(valore)}</p>` : '';
}

function rigaDefinizione(etichetta, valore) {
    return valore ? `<div><dt>${esc(etichetta)}</dt><dd>${esc(valore)}</dd></div>` : '';
}

function nomeAnno(anno) {
    return ({ 1: 'prima', 2: 'seconda', 3: 'terza', 4: 'quarta', 5: 'quinta' })[anno] || anno;
}

function notificaAltezza() {
    setTimeout(() => {
        if (window.parent !== window) window.parent.postMessage({
            type: 'iframeContentHeight',
            height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
        }, window.location.origin);
    }, 30);
}
