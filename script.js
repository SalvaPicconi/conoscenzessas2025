let rawData = [];
let filteredData = [];

// Carica il dataset principale
fetch('dati.json')
  .then(response => {
    if (!response.ok) throw new Error('Errore durante il caricamento dei dati');
    return response.json();
  })
  .then(json => {
    const arr = Array.isArray(json.dati) ? json.dati : [];
    rawData = arr.map(d => ({
      ...d,
      competenza_completa: d.competenza_completa || d.competenza || '(Senza competenza)',
      competenza: d.competenza || d.competenza_completa || '(Senza competenza)',
      periodo: d.periodo || 'N/D',
      insegnamenti: Array.isArray(d.insegnamenti) ? d.insegnamenti : []
    }));
    filteredData = rawData;
    populateFilters();
    updateStats();
    updatePivotTable();
  })
  .catch(err => {
    console.error(err);
    showMessage('Impossibile caricare i dati', 'error');
  });

// Feedback UI
function showMessage(text, type = 'success') {
  const ok = document.getElementById('successMessage');
  const err = document.getElementById('errorMessage');
  if (!ok || !err) return;
  ok.textContent = '';
  err.textContent = '';
  if (type === 'success') {
    ok.textContent = text;
    ok.style.display = 'block';
    setTimeout(() => ok.style.display = 'none', 4000);
  } else {
    err.textContent = text;
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 5000);
  }
}

// Export CSV dei dati filtrati
function exportCSV() {
  if (!filteredData.length) {
    showMessage('Nessun dato da esportare', 'error');
    return;
  }
  const cols = ['competenza_completa', 'competenza', 'conoscenza', 'periodo', 'insegnamenti'];
  const head = cols.join(';');
  const righe = filteredData.map(d =>
    cols.map(c => {
      let v = d[c];
      if (Array.isArray(v)) v = v.join(', ');
      if (v == null) v = '';
      return '"' + String(v).replace(/"/g, '""') + '"';
    }).join(';')
  );
  const csv = [head, ...righe].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dati_filtrati.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showMessage('CSV esportato', 'success');
}

// Popola gli select dei filtri
function populateFilters() {
  const selComp = document.getElementById('competenzaFilter');
  const selPer = document.getElementById('periodoFilter');
  const selIns = document.getElementById('insegnamentoFilter');
  if (!selComp || !selPer || !selIns) return;

  const uniq = (arr) => Array.from(new Set(arr)).sort();

  const competenze = uniq(rawData.map(d => d.competenza_completa));
  const orderedPeriodi = ['Biennio', 'Terzo Anno', 'Quarto Anno', 'Quinto Anno'];
  const periodiUnici = Array.from(new Set(rawData.map(d => d.periodo || 'N/D')));
  let periodi = orderedPeriodi.filter(p => periodiUnici.includes(p));
  const extraPeriodi = periodiUnici
    .filter(p => p !== 'Secondo Biennio' && !orderedPeriodi.includes(p))
    .sort((a, b) => a.localeCompare(b, 'it'));
  periodi = [...periodi, ...extraPeriodi];
  const insegn = uniq(rawData.flatMap(d => d.insegnamenti));

  selComp.innerHTML = '<option value="">Tutte le Competenze</option>' +
    competenze.map(c => `<option value="${c}">${c}</option>`).join('');
  selPer.innerHTML = '<option value="">Tutti i Periodi</option>' +
    periodi.map(p => `<option value="${p}">${p}</option>`).join('');
  selIns.innerHTML = '<option value="">Tutti gli Insegnamenti</option>' +
    insegn.map(i => `<option value="${i}">${i}</option>`).join('');
}

// Applica i filtri correnti
function filterData() {
  const selComp = document.getElementById('competenzaFilter');
  const selPer = document.getElementById('periodoFilter');
  const selIns = document.getElementById('insegnamentoFilter');
  if (!selComp || !selPer || !selIns) return;

  const c = selComp.value;
  const p = selPer.value;
  const i = selIns.value;

  filteredData = rawData.filter(d => {
    const okC = !c || d.competenza_completa === c;
    const okP = !p || d.periodo === p;
    const okI = !i || d.insegnamenti.includes(i);
    return okC && okP && okI;
  });

  updateStats();
  updatePivotTable();
  const detail = document.getElementById('detailTable');
  if (detail) detail.innerHTML = '';
}

// Aggiorna le statistiche sintetiche
function updateStats() {
  const el = document.getElementById('stats');
  if (!el) return;
  const uniqueComp = new Set(filteredData.map(d => d.competenza_completa)).size;
  const uniqueCon = new Set(filteredData.map(d => d.conoscenza || d.competenza_completa)).size;
  el.innerHTML = `
    <div><b>Record:</b> ${filteredData.length}</div>
    <div><b>Competenze:</b> ${uniqueComp}</div>
    <div><b>Conoscenze:</b> ${uniqueCon}</div>
  `;
}

// Costruisce la tabella pivot
function updatePivotTable() {
  const rowSel = document.getElementById('rowGroup');
  const colSel = document.getElementById('colGroup');
  const valSel = document.getElementById('valueType');
  const pivotEl = document.getElementById('pivotTable');
  if (!rowSel || !colSel || !valSel || !pivotEl) return;

  const rowGroup = rowSel.value;
  const colGroup = colSel.value;
  const valueType = valSel.value;

  const getValues = (d, group) => {
    if (group === 'insegnamento') return d.insegnamenti && d.insegnamenti.length ? d.insegnamenti : ['(Nessuno)'];
    if (group === 'competenza') return [d.competenza_completa];
    return [d[group] || 'N/D'];
  };

  const rowKeysSet = new Set();
  const colKeysSet = new Set();
  const matrix = {};

  filteredData.forEach(d => {
    const rows = getValues(d, rowGroup);
    const cols = getValues(d, colGroup);
    rows.forEach(rk => {
      rowKeysSet.add(rk);
      cols.forEach(ck => {
        colKeysSet.add(ck);
        const key = rk + '||' + ck;
        if (!matrix[key]) matrix[key] = [];
        matrix[key].push(d);
      });
    });
  });

  const numberFromCompetenza = (value) => {
    if (typeof value !== 'string') return NaN;
    const match = value.match(/Competenza\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : NaN;
  };

  const sortKeys = (values, group) => {
    const arr = Array.from(values);
    if (group === 'competenza') {
      return arr.sort((a, b) => {
        const na = numberFromCompetenza(a);
        const nb = numberFromCompetenza(b);
        const naIsNum = !Number.isNaN(na);
        const nbIsNum = !Number.isNaN(nb);
        if (naIsNum && nbIsNum && na !== nb) return na - nb;
        if (naIsNum && nbIsNum && na === nb) return a.localeCompare(b, 'it');
        if (naIsNum && !nbIsNum) return -1;
        if (!naIsNum && nbIsNum) return 1;
        return a.localeCompare(b, 'it');
      });
    }
    return arr.sort((a, b) => a.localeCompare(b, 'it'));
  };

  const rowKeys = sortKeys(rowKeysSet, rowGroup);
  const colKeys = sortKeys(colKeysSet, colGroup);

  const headerLabel = (rowGroup === 'competenza' && colGroup === 'periodo')
    ? "Competenze d'Indirizzo SSAS"
    : rowGroup.toUpperCase() + ' \\ ' + colGroup.toUpperCase();

  let html = '<table class="pivot"><thead><tr><th>' + headerLabel + '</th>';
  colKeys.forEach(c => { html += `<th>${c}</th>`; });
  html += '</tr></thead><tbody>';

  rowKeys.forEach(r => {
    html += `<tr><th>${r}</th>`;
    colKeys.forEach(c => {
      const cellKey = r + '||' + c;
      const items = matrix[cellKey] || [];
      let cellContent = items.length;
      if (valueType === 'list' && items.length) {
        const lista = items.map(d => d.conoscenza || d.competenza_completa).join('<br>');
        cellContent = `<div class="mini-list">${lista}</div>`;
      }
      html += `<td class="pivot-cell" data-row="${encodeURIComponent(r)}" data-col="${encodeURIComponent(c)}">${cellContent}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  pivotEl.innerHTML = html;

  pivotEl.querySelectorAll('.pivot-cell').forEach(td => {
    td.addEventListener('click', () => {
      pivotEl.querySelectorAll('.pivot-cell.selected').forEach(c => c.classList.remove('selected'));
      td.classList.add('selected');
      const r = decodeURIComponent(td.getAttribute('data-row'));
      const c = decodeURIComponent(td.getAttribute('data-col'));
      showDetail(r, c);
    });
  });
}

// Sezione di dettaglio
function showDetail(rowValue, colValue) {
  const rowSel = document.getElementById('rowGroup');
  const colSel = document.getElementById('colGroup');
  const detailEl = document.getElementById('detailTable');
  if (!rowSel || !colSel || !detailEl) return;

  const rowGroup = rowSel.value;
  const colGroup = colSel.value;

  const match = (d, group, value) => {
    if (group === 'insegnamento') return d.insegnamenti.includes(value);
    if (group === 'competenza') return d.competenza_completa === value;
    return (d[group] || 'N/D') === value;
  };

  const dettagli = filteredData.filter(d => match(d, rowGroup, rowValue) && match(d, colGroup, colValue));

  let html = `<h3>Dettaglio (${dettagli.length})</h3>`;
  if (!dettagli.length) {
    html += '<p class="detail-empty">Nessun dato.</p>';
  } else {
    html += '<ul class="detail-list">';
    dettagli.forEach(d => {
      const conoscenza = d.conoscenza && d.conoscenza.trim() ? d.conoscenza : '(Conoscenza assente)';
      const insegnamenti = Array.isArray(d.insegnamenti) && d.insegnamenti.length ? d.insegnamenti.join(', ') : '(Nessun insegnamento)';
      html += `
        <li class="detail-item">
          <div class="detail-comp"><strong>${d.competenza_completa}</strong></div>
          <div class="detail-con"><span class="detail-label">📌 Conoscenza:</span>${conoscenza}</div>
          <div class="detail-ins"><span class="detail-label">🎓</span><span><em>${d.periodo}</em> · <em>${insegnamenti}</em></span></div>
        </li>`;
    });
    html += '</ul>';
  }
  detailEl.innerHTML = html;
}

// Reset rapido dei filtri
function resetFilters() {
  const selComp = document.getElementById('competenzaFilter');
  const selPer = document.getElementById('periodoFilter');
  const selIns = document.getElementById('insegnamentoFilter');
  if (!selComp || !selPer || !selIns) return;
  selComp.value = '';
  selPer.value = '';
  selIns.value = '';
  filteredData = rawData;
  updateStats();
  updatePivotTable();
  const detail = document.getElementById('detailTable');
  if (detail) detail.innerHTML = '';
}

// Esporta funzioni utili sullo scope globale
window.showDetail = showDetail;
window.resetFilters = resetFilters;
window.exportCSV = exportCSV;

// Event listeners
const compSel = document.getElementById('competenzaFilter');
const perSel = document.getElementById('periodoFilter');
const insSel = document.getElementById('insegnamentoFilter');
const rowSel = document.getElementById('rowGroup');
const colSel = document.getElementById('colGroup');
const valSel = document.getElementById('valueType');

if (compSel) compSel.addEventListener('change', filterData);
if (perSel) perSel.addEventListener('change', filterData);
if (insSel) insSel.addEventListener('change', filterData);
if (rowSel) rowSel.addEventListener('change', updatePivotTable);
if (colSel) colSel.addEventListener('change', updatePivotTable);
if (valSel) valSel.addEventListener('change', updatePivotTable);

// Gestione tema
(function initTheme(){
  const stored = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', stored);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    updateThemeIcon(stored, btn);
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeIcon(next, btn);
    });
  }
})();

function updateThemeIcon(theme, btn){
  btn.textContent = theme === 'light' ? '🌙' : '☀️';
  btn.title = theme === 'light' ? 'Passa a scuro' : 'Passa a chiaro';
}
