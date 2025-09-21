# Curricolo Verticale SSAS - Versione Avanzata 2.0

Sistema ottimizzato per la gestione del Curricolo Verticale dei Servizi per la Sanità e l'Assistenza Sociale (SSAS) con funzionalità avanzate, migliore accessibilità e prestazioni ottimizzate.

## 🚀 Nuove Funzionalità

### ✨ Versione Ottimizzata
- **Prestazioni migliorate**: Codice JavaScript ottimizzato e CSS ridondante eliminato
- **Caricamento lazy**: Caricamento intelligente dei componenti pesanti
- **Service Worker**: Funzionalità offline e cache intelligente
- **Progressive Web App**: Installabile come app nativa

### 🔍 Ricerca Avanzata
- **Ricerca in tempo reale** con suggerimenti automatici
- **Filtri intelligenti** con preset salvabili
- **Cronologia ricerche** per accesso rapido
- **Ricerca multi-termine** con operatori logici

### ♿ Accessibilità Migliorata
- **Supporto screen reader** completo
- **Navigazione da tastiera** avanzata
- **Alto contrasto** e zoom testo
- **Descrizioni ARIA** complete
- **Focus management** ottimizzato

### 📊 Esportazione Avanzata
- **Export Excel** con fogli multipli
- **Export PDF** con layout ottimizzato
- **Export CSV** con encoding UTF-8
- **Anteprima stampa** personalizzabile
- **Export JSON** per integrazione API

### 🔔 Sistema Notifiche
- **Toast notifications** animate
- **Progress indicators** per operazioni lunghe
- **Conferme interattive** per azioni critiche
- **Feedback contextuale** per ogni operazione

### 📱 Design Responsivo
- **Mobile-first** design ottimizzato
- **Touch-friendly** interfaccia
- **Breakpoint avanzati** per tutti i dispositivi
- **Orientamento adattivo**

## 📁 Struttura File

```
├── index_finale.html          # File principale ottimizzato
├── index_ottimizzato.html     # Versione intermedia
├── styles.css                 # CSS ottimizzato e modulare
├── app.js                     # Logica principale dell'applicazione
├── integrated-app.js          # Sistema integrato con tutte le funzionalità
├── advanced-search.js         # Modulo ricerca avanzata
├── export-module.js           # Modulo esportazione avanzata
├── utils.js                   # Utilità per accessibilità e prestazioni
├── sw.js                      # Service Worker per funzionalità offline
├── index.html                 # File originale (mantenuto per compatibilità)
└── competenze_pivot_final.html # Versione protetta originale
```

## 🛠️ Funzionalità Principali

### Gestione Dati
- ✅ Visualizzazione tabellare delle competenze SSAS
- ✅ Tabella pivot interattiva e personalizzabile
- ✅ Filtri multipli simultanei
- ✅ Statistiche in tempo reale
- ✅ Modalità visualizzazione/modifica

### Ricerca e Filtri
- ✅ Ricerca globale istantanea
- ✅ Suggerimenti automatici durante la digitazione
- ✅ Filtri per competenza, periodo, insegnamento
- ✅ Preset di filtri salvabili
- ✅ Cronologia ricerche

### Esportazione
- ✅ CSV con codifica UTF-8
- ✅ Excel con fogli multipli e formattazione
- ✅ PDF con layout professionale
- ✅ JSON per integrazione sistemi
- ✅ Stampa ottimizzata

### Accessibilità
- ✅ Conformità WCAG 2.1 AA
- ✅ Supporto screen reader (NVDA, JAWS, VoiceOver)
- ✅ Navigazione da tastiera completa
- ✅ Modalità alto contrasto
- ✅ Zoom testo dinamico

## ⌨️ Scorciatoie da Tastiera

| Combinazione | Funzione |
|--------------|----------|
| `Ctrl + F` | Attiva ricerca rapida |
| `Ctrl + R` | Reset tutti i filtri |
| `Ctrl + S` | Salva modifiche (modalità edit) |
| `Ctrl + E` | Esporta CSV |
| `Esc` | Chiudi pannelli/modal |
| `Tab` | Naviga tra gli elementi |
| `Frecce` | Naviga nelle tabelle |

## 🚀 Come Iniziare

1. **Apri il file principale**: `index_finale.html`
2. **Attendi il caricamento**: L'app si inizializza automaticamente
3. **Esplora le funzionalità**: Usa i filtri rapidi per iniziare
4. **Modalità modifica**: Attiva per aggiungere/modificare dati
5. **Esporta i risultati**: Usa i pulsanti di esportazione rapida

## 🔧 Configurazione Avanzata

### Service Worker
Il service worker è configurato automaticamente per:
- Cache delle risorse statiche
- Funzionalità offline limitata
- Aggiornamenti automatici

### PWA Installation
L'app può essere installata come Progressive Web App:
- Chrome/Edge: Pulsante "Installa" nella barra degli indirizzi
- Firefox: Menu → "Installa questa app"
- Safari: Condividi → "Aggiungi alla schermata Home"

## 📊 Prestazioni

### Metriche di Performance
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### Ottimizzazioni Implementate
- Preload delle risorse critiche
- CSS inline per above-the-fold
- JavaScript caricato in modo asincrono
- Immagini lazy-loaded
- Service Worker per cache

## 🔒 Sicurezza

### Protezione Dati
- Nessun dato sensibile memorizzato in localStorage
- Validazione input lato client
- Sanitizzazione HTML per XSS prevention
- Content Security Policy headers raccomandati

## 🌐 Compatibilità Browser

| Browser | Versione Minima | Supporto |
|---------|----------------|-----------|
| Chrome | 80+ | ✅ Completo |
| Firefox | 75+ | ✅ Completo |
| Safari | 13+ | ✅ Completo |
| Edge | 80+ | ✅ Completo |
| IE | 11 | ⚠️ Limitato |

## 📱 Supporto Mobile

- ✅ iOS Safari 13+
- ✅ Chrome Mobile 80+
- ✅ Firefox Mobile 75+
- ✅ Samsung Internet 12+

## 🐛 Risoluzione Problemi

### Problemi Comuni

**L'app non si carica:**
- Verifica che JavaScript sia abilitato
- Controlla la console per errori
- Ricarica con Ctrl+F5

**Filtri non funzionano:**
- Attendi il caricamento completo dei dati
- Verifica che non ci siano errori JavaScript
- Prova a resettare i filtri

**Esportazione fallisce:**
- Verifica che il browser supporti i download
- Controlla lo spazio disponibile
- Disabilita temporaneamente l'antivirus

## 📄 Licenza

Questo progetto è sviluppato per il Ministero dell'Istruzione secondo le specifiche del Regolamento del 24 maggio 2018, n. 92.

## 👥 Contributi

Per segnalazioni, miglioramenti o bug:
1. Apri un issue su GitHub
2. Fornisci dettagli del browser e sistema operativo
3. Allega screenshot se necessario

## 📞 Supporto

Per supporto tecnico o domande:
- Email: [supporto-ssas@istruzione.it]
- Documentazione: [link alla documentazione ufficiale]

---

**Versione**: 2.0  
**Ultimo aggiornamento**: 21 settembre 2025  
**Compatibilità**: Allegato C del Regolamento del 24 maggio 2018, n. 92
