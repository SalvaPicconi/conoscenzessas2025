# Rilascio integrato — 7 settembre 2026

Autorizzazione: richiesta dell’utente «Puoi farlo tu?» dopo il piano di integrazione, attivazione delle monografiche, verifica e pubblicazione; confermata dalla richiesta di riprendere.

## Integrazione

Base remota `0605bde`, snapshot locale `480bc2d`. Backup completo prima delle modifiche in `/private/tmp/ssas-prima-rilascio-20260906.tgz`. Conservati i veri export DOCX/XLSX e il Piano del coordinatore. Integrati le 27 UDA unificate definitive, i nuovi campi/livelli PFI, il sistema comune di stampa e le monografiche. Progettazione annuale vuota; votazione oscurata e scritture bloccate (423), dati di voto conservati.

Il Piano del coordinatore carica 93 schede (66 originarie e 27 proposte unificate), conserva le scelte nel browser e impedisce il doppio conteggio delle origini anche fra annualità. Ore delle unificate come somme d’origine, da deliberare. Caricamento incompleto non cancella la bozza e impedisce l’export. Documento marcato come bozza; nessuna deliberazione attestata dal software.

Corretto il menu principale fisso che, crescendo a dieci sezioni, copriva i pulsanti dentro gli iframe. Resta la barra rapida di navigazione. Registri e archivi esclusi dal sito tramite `_config.yml`; copie precedenti ed evidenze restano locali.

## Supabase

Applicata migrazione `curricolo_uda_idee_con_storico`; funzione `curricolo-uda-revisioni` ACTIVE v7, JWT mantenuto. Archivio idee privato, autore dalla sessione, versioni progressive e storico. Il controllo dello stato in `upsert` impedisce l’approvazione senza permesso. Nessuna migrazione del voto sospeso. Funzione PFI v4 conservata.

Advisors sicurezza: soltanto avvisi informativi RLS senza policy per tabelle accessibili esclusivamente dal servizio; scelta intenzionale, nessun accesso diretto anon/authenticated. Riferimento: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Prove concluse prima della pubblicazione

- Controllo dati unificate: 48/48 origini, 27 schede, distribuzione 4/7/5/5/6, contenuti e generazione deterministica.
- Handler idee con DB simulato; UI monografiche con gestione conflitti, seconda sessione e mobile.
- PFI: competenze SSAS/AG, livelli distinti, ID univoci, importazioni vecchie e doppio conteggio; esportazione Word aggiornata a veri blocchi Office.
- Stampe PFI autonomo/integrato e tre rubriche: PASS; cataloghi 48/14/4, selezione fra filtri, piani, aree 39/12: PASS. Stato originale preservato.
- Servizio reale: idea creata, modificata alla versione 2, riletta in seconda sessione; modifica altrui respinta. Due versioni confermate nello storico PostgreSQL.
- Servizio reale PFI: utenza/classe/studente fittizi, salvataggio e riapertura con uguaglianza delle UDA e dei livelli, incluso AG9.
- Servizio reale revisione: creazione di una proposta fittizia, rilettura, archiviazione; tentativo di approvazione senza permesso respinto (400).
- DOCX PFI, piano, UDA, curricolo e XLSX curricolo: download e integrità ZIP/XML verificati. Il DOCX PFI contiene tutte le competenze e i livelli del campione.
- Navigazione con dieci sezioni, voto senza form o modulo eseguibile; nessun errore JavaScript nel flusso complessivo.

Le prove del backend hanno usato pagine locali servite nel browser di test sotto l’origine pubblica, con chiamate API reali. Sono quindi distinte dai controlli dei file effettivamente distribuiti, da registrare dopo il deploy. Le prove tecniche create sono state rimosse per ID esatto: idee/storico, proposta di revisione, PFI, classe, sessioni e utenza PFI di collaudo.

## Limiti conservati

Il PFI resta un ambiente dimostrativo: nessun dato di studente reale ammesso. L’autenticazione PFI preesistente consente autocreazione delle utenze e accesso condiviso ai documenti dimostrativi; non viene trasformata in un archivio scolastico di produzione con questo rilascio. La revisione UDA usa password condivisa e nominativo dichiarato. Progettazione annuale volutamente vuota; voto sospeso. Netlify non identificato, destinazione di rilascio GitHub Pages.
