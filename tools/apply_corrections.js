#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJson(p, obj) {
  const json = JSON.stringify(obj, null, 2);
  fs.writeFileSync(p, json + '\n', 'utf8');
}

(function main(){
  const root = process.cwd();
  const dataPath = path.join(root, 'data.json');
  const corrPath = path.join(root, 'correzioni_competenze.json');

  if (!fs.existsSync(dataPath)) {
    console.error('ERRORE: data.json non trovato');
    process.exit(1);
  }
  if (!fs.existsSync(corrPath)) {
    console.error('ERRORE: correzioni_competenze.json non trovato');
    process.exit(1);
  }

  const data = loadJson(dataPath);
  const corr = loadJson(corrPath);

  let map = {};
  if (Array.isArray(corr)) {
    corr.forEach(e => { if (e && e.competenzaNum != null && e.titoloCorretto) map[String(e.competenzaNum)] = e.titoloCorretto; });
  } else if (typeof corr === 'object' && corr) {
    map = corr;
  }

  const before = JSON.stringify(data);
  const updated = data.map(item => {
    const key = String(item.competenzaNum);
    if (map[key]) {
      return { ...item, competenzaTitolo: map[key] };
    }
    return item;
  });
  const after = JSON.stringify(updated);

  if (before === after) {
    console.log('Nessuna modifica necessaria (titoli già allineati).');
    process.exit(0);
  }

  saveJson(dataPath, updated);
  console.log('Aggiornamento completato: data.json salvato con i titoli corretti.');
})();
