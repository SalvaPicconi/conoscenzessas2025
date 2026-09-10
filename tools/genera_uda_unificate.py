#!/usr/bin/env python3
"""Genera data-uda-unificate.json: la proposta di UDA d'asse unificate.

Il fascicolo d'asse conta 48 schede, una per ogni competenza intermedia del
curricolo. Il riordino ne accorpa 42 in 21 schede a due competenze e lascia
6 schede autonome, per un totale di 27. La struttura iniziale è storicizzata
in PROPOSTA; la revisione applica le separazioni U2.3 e U5.4.

Regole seguite:

  · si conservano le annualità di origine; U1.1 è collocata in seconda
    su indicazione esplicita del docente, mantenendo gli ID di provenienza;
  · due competenze per gli accorpamenti attuali è una scelta progettuale:
    il Box n. 8 suggerisce un numero limitato, senza fissare il limite a due;
  · più prodotti sono ammessi se rispondono allo stesso problema e agli stessi
    destinatari; il numero 25 non è un vincolo per la futura scelta collegiale;
  · la progressione va verificata per complessità, contesto e autonomia:
    uno stesso tema può essere ripreso in annualità diverse;
  · abilità e saperi sono ripresi dalle schede di origine senza modifiche, con
    gli insegnamenti referenti così come il curricolo li attribuisce;
  · il titolo è quello delle schede di origine, affiancato: nessun titolo nuovo.

Le UDA trasversali non entrano in questa proposta: coinvolgono insegnamenti che
non sono d'indirizzo e restano un catalogo autonomo.

    python3 tools/genera_uda_unificate.py
"""

import json
import hashlib
import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
SORGENTE = RADICE / "data-uda.json"
DESTINAZIONE = RADICE / "data-uda-unificate.json"
REVISIONE = RADICE / "tools/revisione_uda_unificate.json"


# id nuovo, anno, competenze, traguardo, compito, situazione, prodotto,
# beneficiari, ambito, schede fuse.
# Il titolo non compare qui: si compone dai titoli delle schede di origine.
PROPOSTA = [
    {
        "id": "U1.1",
        "anno": 1,
        "competenze": [1, 7],
        "traguardo": "Costruire una prima mappa dei servizi del territorio e tradurla in materiali informativi comprensibili a chi ne ha bisogno",
        "compito": "Mappa dei servizi del proprio comune — almeno tre servizi con ente erogatore, utenza e prestazioni — e volantino informativo su uno di essi, presentato alla classe e diffuso alle famiglie.",
        "situazione": "Molti studenti non sanno quali servizi sociali e sanitari esistano nel comune in cui vivono; e chi ne avrebbe bisogno spesso non sa che esistono, né a chi rivolgersi.",
        "prodotto": "Mappa (cartacea o digitale) dei servizi del comune e volantino informativo su un servizio, con destinatari, prestazioni e contatti.",
        "beneficiari": "Le famiglie degli studenti e le persone che potrebbero rivolgersi a quel servizio, tramite la diffusione dei materiali a scuola e nel quartiere.",
        "ambito": "mista",
        "fonde": ["1.1", "1.7"],
    },
    {
        "id": "U1.2",
        "anno": 1,
        "competenze": [2, 3],
        "traguardo": "Cooperare in gruppo per darsi regole di convivenza e usare la comunicazione per contrastare stereotipi e pregiudizi",
        "compito": "Patto di classe elaborato in gruppi con ruoli assegnati e presentato all'assemblea, accompagnato da una mini-campagna (poster, reel o podcast) contro uno degli stereotipi emersi nella discussione.",
        "situazione": "In una classe appena formata i conflitti nascono per malintesi e per stereotipi su nazionalità, genere, disabilità e aspetto fisico che nessuno mette in discussione.",
        "prodotto": "Patto di classe con diario di gruppo e materiali della campagna, nel rispetto di privacy e sicurezza dei dati.",
        "beneficiari": "Il gruppo classe, che adotta il patto per tutto l'anno, e gli studenti dell'istituto destinatari della campagna.",
        "ambito": "interna",
        "fonde": ["1.2", "1.3"],
    },
    {
        "id": "U1.3",
        "anno": 1,
        "competenze": [4, 5],
        "traguardo": "Rilevare in modo guidato bisogni e stili di vita legati all'età e leggerli con il concetto di salute bio-psico-sociale",
        "compito": "Interviste guidate a persone di età diverse con scheda di rilevazione di condizioni, stili di vita e bisogni; gli esiti sono riletti in una mappa multidimensionale della salute — biologica, psicologica, sociale — applicata a uno dei casi raccolti.",
        "situazione": "Gli studenti conoscono i bisogni della propria età e li danno per validi a ogni età; e intendono la salute come semplice assenza di malattia, mentre nei servizi si lavora su una definizione più ampia.",
        "prodotto": "Schede di rilevazione delle interviste e mappa multidimensionale salute/malattia applicata a un caso, con i soggetti della cura.",
        "beneficiari": "Il gruppo classe e le persone intervistate, cui si restituisce l'esito.",
        "ambito": "mista",
        "fonde": ["1.4", "1.5"],
    },
    {
        "id": "U1.4",
        "anno": 1,
        "competenze": [6, 10],
        "traguardo": "Riconoscere i rischi degli ambienti di vita e documentarli con dati raccolti e rappresentati correttamente",
        "compito": "Rilevazione dei rischi dell'edificio scolastico con documentazione fotografica e questionario digitale alla classe sui comportamenti a rischio; i dati sono elaborati in grafici e sintetizzati in un decalogo della sicurezza.",
        "situazione": "L'edificio scolastico presenta rischi che gli studenti attraversano ogni giorno senza riconoscerli, e sui comportamenti della classe circolano opinioni che nessuno ha mai verificato.",
        "prodotto": "Decalogo della sicurezza della classe con documentazione fotografica e grafici dell'indagine, con verifica di pertinenza e attendibilità dei dati.",
        "beneficiari": "La classe e il servizio di prevenzione e protezione dell'istituto, cui il decalogo viene consegnato.",
        "ambito": "interna",
        "fonde": ["1.6", "1.9"],
    },
    {
        "id": "U1.5",
        "anno": 1,
        "competenze": [8],
        "traguardo": "Realizzare semplici attività di animazione ludica e sociale in contesti noti",
        "compito": "Gioco di animazione progettato e condotto per il gruppo classe, con scheda attività — obiettivo, materiali, regole, tempi — e autovalutazione.",
        "situazione": "Far giocare un gruppo sembra facile finché non lo si prova: senza obiettivo, regole e tempi definiti l'attività si disperde.",
        "prodotto": "Gioco di animazione condotto dagli studenti, con scheda attività e autovalutazione.",
        "beneficiari": "Il gruppo classe, che partecipa al gioco condotto dai compagni.",
        "ambito": "interna",
        "fonde": ["1.8"],
    },
    {
        "id": "U2.1",
        "anno": 2,
        "competenze": [1, 7],
        "traguardo": "Costruire con padronanza la mappa dei servizi del territorio e produrre materiali divulgativi rivolti a un'utenza definita",
        "compito": "Mappa digitale interattiva con almeno cinque servizi — descrizione, destinatari, prestazioni, ente erogatore — e mini-guida divulgativa ai servizi per adolescenti (consultorio, sportelli d'ascolto, spazi giovani) ricavata dalla mappa e diffusa a scuola.",
        "situazione": "La mappa costruita al primo anno è parziale e su carta; consultori, sportelli e spazi giovani esistono, ma gli adolescenti che ne avrebbero bisogno non sanno dove siano né che cosa offrano.",
        "prodotto": "Mappa digitale interattiva presentata pubblicamente e mini-guida ai servizi per adolescenti.",
        "beneficiari": "Le famiglie e i cittadini del comune, tramite la pubblicazione della mappa; gli studenti dell'istituto, tramite la guida.",
        "ambito": "esterna",
        "fonde": ["2.1", "2.7"],
    },
    {
        "id": "U2.2",
        "anno": 2,
        "competenze": [2, 3],
        "traguardo": "Organizzare in gruppo un'iniziativa scolastica e comunicarla con linguaggi multimediali rispettosi delle differenze",
        "compito": "Iniziativa scolastica reale — accoglienza delle classi prime o giornata a tema — organizzata in gruppo con ruoli e riunioni verbalizzate, documentata da un contenuto multimediale su culture e diversità pubblicato sul canale della scuola.",
        "situazione": "Ogni settembre le classi prime arrivano senza conoscere nessuno; nell'istituto convivono ragazzi di provenienze diverse, ma le occasioni per raccontare quelle differenze sono rare.",
        "prodotto": "Iniziativa realizzata con verbali e valutazione finale, e video o podcast pubblicato con liberatorie e regole sulla privacy applicate.",
        "beneficiari": "Gli studenti delle classi prime e le loro famiglie; la comunità scolastica, tramite il canale ufficiale dell'istituto.",
        "ambito": "interna",
        "fonde": ["2.2", "2.3"],
    },
    {
        "id": "U2.3",
        "anno": 2,
        "competenze": [4, 5],
        "traguardo": "Rilevare stili di vita per fasce d'età e descrivere la rete che prende in carico la persona quando la salute viene meno",
        "compito": "Guida illustrata ai sani stili di vita per fascia d'età, costruita su un'indagine condotta dalla classe e completata dalla mappa della rete di presa in carico — famiglia, medico di base, servizi, ospedale — a cui rivolgersi quando la prevenzione non basta.",
        "situazione": "Alimentazione, sonno e movimento cambiano molto con l'età e le abitudini scorrette si consolidano quando nessuno le mette in discussione; e quando in famiglia arriva la malattia spesso non si sa chi fa che cosa fra medico, servizi sociali, ospedale e assistenza domiciliare.",
        "prodotto": "Guida illustrata agli stili di vita per età, con elaborato grafico commentato della rete della presa in carico.",
        "beneficiari": "Le famiglie degli studenti, destinatarie della guida.",
        "ambito": "mista",
        "fonde": ["2.4", "2.5"],
    },
    {
        "id": "U2.4",
        "anno": 2,
        "competenze": [6, 10],
        "traguardo": "Rilevare i rischi dell'ambiente domestico e rappresentare con dati la realtà sociale su cui si interviene",
        "compito": "Checklist dei rischi domestici applicata a casi raccolti dalla classe e opuscolo di prevenzione per le famiglie, corredato dai dati sugli incidenti domestici del territorio raccolti ed elaborati con foglio di calcolo e grafici.",
        "situazione": "Gli incidenti domestici sono la prima causa di infortunio per bambini e anziani e avvengono quasi sempre per rischi che si potevano rimuovere; ma di questa realtà si parla per impressioni, senza numeri.",
        "prodotto": "Opuscolo di prevenzione degli incidenti domestici con checklist e report dei dati raccolti, presentati con grafici.",
        "beneficiari": "Le famiglie del territorio, cui l'opuscolo viene distribuito.",
        "ambito": "esterna",
        "fonde": ["2.6", "2.9"],
    },
    {
        "id": "U2.5",
        "anno": 2,
        "competenze": [8],
        "traguardo": "Realizzare semplici attività di animazione ludica e sociale in contesti noti",
        "compito": "Attività di animazione ludica per l'open day o la festa d'istituto, con scheda di progettazione e report fotografico.",
        "situazione": "All'open day l'istituto accoglie famiglie con bambini piccoli che restano ad aspettare senza nulla da fare mentre i genitori visitano la scuola.",
        "prodotto": "Attività di animazione realizzata, con scheda di progettazione e report fotografico.",
        "beneficiari": "I bambini e le famiglie in visita all'istituto.",
        "ambito": "esterna",
        "fonde": ["2.8"],
    },
    {
        "id": "U3.1",
        "anno": 3,
        "competenze": [1, 10],
        "traguardo": "Tradurre un bisogno in progetto scritto e documentarlo con dati raccolti ed elaborati nel rispetto della protezione dei dati personali",
        "compito": "Progetto individualizzato (scheda tecnica) elaborato in gruppo con la documentazione allegata — PAI simulato, modulistica di accesso, diario — fondato su un dossier di dati raccolti su una realtà sociale del territorio e trattati secondo le regole del GDPR.",
        "situazione": "Rilevare un bisogno non basta: nei servizi va tradotto in un progetto scritto con obiettivi, azioni, responsabili e tempi; e i dati che lo giustificano vanno raccolti e trattati con regole precise.",
        "prodotto": "Progetto individualizzato con documentazione allegata e dossier dati sulla realtà sociale di riferimento.",
        "beneficiari": "Caso simulato; il progetto è valutato da un operatore dei servizi invitato in classe, il dossier è restituito al servizio o all'associazione osservata.",
        "ambito": "mista",
        "fonde": ["3.1", "3.10"],
    },
    {
        "id": "U3.2",
        "anno": 3,
        "competenze": [2, 3],
        "traguardo": "Condurre il primo colloquio con l'utente e portarne gli esiti nella riunione d'équipe con il linguaggio professionale",
        "compito": "Role-play di colloqui di accoglienza con tipologie diverse di utenti, seguito dalla riunione d'équipe simulata sullo stesso caso con ruoli professionali assegnati; si producono la scheda dei bisogni comunicativi rilevati e il verbale della riunione.",
        "situazione": "Il primo colloquio decide se una persona tornerà; e ciò che vi si è raccolto va poi portato in équipe, dove figure professionali diverse devono arrivare a una scelta comune.",
        "prodotto": "Scheda dei bisogni comunicativi e delle distorsioni osservate; verbale e resoconto professionale della riunione d'équipe.",
        "beneficiari": "Caso simulato con utenti-tipo diversi per età, cultura e condizione; il verbale è il documento su cui si valuta il lavoro.",
        "ambito": "interna",
        "fonde": ["3.2", "3.3"],
    },
    {
        "id": "U3.3",
        "anno": 3,
        "competenze": [4, 6],
        "traguardo": "Programmare azioni di osservazione e accudimento del bambino e garantire la sicurezza dell'ambiente in cui si svolgono",
        "compito": "Piano di attività di osservazione e accudimento per la prima infanzia con schede operative e norme igieniche applicate, preceduto dal sopralluogo dell'ambiente educativo con schede di rilevazione dei rischi e report di segnalazione formale.",
        "situazione": "Nella prima infanzia osservazione e accudimento richiedono strumenti precisi e norme igieniche rigorose; e l'ambiente in cui si opera va prima verificato con le procedure previste, non a voce.",
        "prodotto": "Piano di attività per la prima infanzia con schede operative, e report di rilevazione dei rischi dell'ambiente.",
        "beneficiari": "I bambini e le educatrici del nido o della scuola dell'infanzia partner; il responsabile del servizio di prevenzione, cui va il report.",
        "ambito": "esterna",
        "fonde": ["3.4", "3.6"],
    },
    {
        "id": "U3.4",
        "anno": 3,
        "competenze": [5, 9],
        "traguardo": "Progettare e realizzare azioni di prevenzione primaria su bisogni socio-sanitari rilevati nel proprio contesto di vita",
        "compito": "Azione di prevenzione primaria realizzata a scuola su un tema rilevato con scheda bisogni-risorse-vincoli — dipendenze, benessere digitale, affettività, igiene, vaccinazioni, uso corretto dei farmaci — con materiali informativi e protocollo d'intervento.",
        "situazione": "Dipendenze, uso problematico del digitale e affettività riguardano da vicino gli studenti dell'istituto, ma se ne parla solo quando è già successo qualcosa; e in rete le informazioni sulla prevenzione sono contraddittorie.",
        "prodotto": "Campagna di prevenzione con materiali informativi, protocollo d'intervento e scheda bisogni-risorse-vincoli.",
        "beneficiari": "Gli studenti dell'istituto e il referente per la salute.",
        "ambito": "interna",
        "fonde": ["3.5", "3.9"],
    },
    {
        "id": "U3.5",
        "anno": 3,
        "competenze": [7, 8],
        "traguardo": "Realizzare attività di animazione socio-educative per minori e informare le famiglie sulle modalità di accesso ai servizi",
        "compito": "Attività di animazione per bambini progettata, realizzata e valutata presso la scuola partner, accompagnata dal repertorio dei servizi per i minori del territorio — prestazioni, requisiti, documenti, tempi di attesa — consegnato alle famiglie e alle insegnanti.",
        "situazione": "I bambini hanno bisogno di attività pensate per la loro età, non di intrattenimento improvvisato; e alle famiglie che li accompagnano sapere che un servizio esiste non basta, perché il vero ostacolo sono requisiti, documenti e tempi di attesa.",
        "prodotto": "Attività di animazione con scheda esiti e repertorio dei servizi per i minori con le modalità di accesso.",
        "beneficiari": "I bambini della scuola partner e le loro insegnanti; le famiglie, destinatarie del repertorio.",
        "ambito": "esterna",
        "fonde": ["3.7", "3.8"],
    },
    {
        "id": "U4.1",
        "anno": 4,
        "competenze": [1, 10],
        "traguardo": "Organizzare la documentazione amministrativa e contabile di un progetto e restituirne gli esiti in un report tecnico-professionale",
        "compito": "Gestione amministrativa simulata di un progetto — atti, documenti contabili su modelli, cassa simulata — chiusa da un report tecnico-professionale con i dati raccolti ed elaborati sulle condizioni sociali o di salute del gruppo destinatario, in linguaggio tecnico e con statistica di base.",
        "situazione": "Un progetto sociale non si regge sulle buone intenzioni: senza gestione amministrativa corretta i finanziamenti non arrivano o vanno restituiti; e chi decide come impiegare le risorse ha bisogno di dati elaborati, non di impressioni.",
        "prodotto": "Fascicolo amministrativo del progetto simulato e report tecnico-professionale finale.",
        "beneficiari": "Progetto simulato; la documentazione è verificata secondo la modulistica reale e il report è indirizzato al servizio o all'ente di riferimento.",
        "ambito": "interna",
        "fonde": ["4.1", "4.10"],
    },
    {
        "id": "U4.2",
        "anno": 4,
        "competenze": [2, 3],
        "traguardo": "Osservare le dinamiche comunicative della relazione d'aiuto ed esporne gli esiti all'équipe professionale",
        "compito": "Osservazione di colloqui simulati con griglie di rilevazione delle dinamiche comunicative e proposta comunicativa personalizzata per la presa in carico, presentata all'équipe simulata con supporti documentali e multimediali.",
        "situazione": "Nella relazione d'aiuto conta come si dice più di che cosa si dice, e le distorsioni comunicative sfuggono a chi non ha strumenti per rilevarle; portare poi il caso in équipe richiede di selezionare le informazioni rilevanti ed esporle in modo che gli altri possano decidere.",
        "prodotto": "Griglie di osservazione compilate, proposta comunicativa personalizzata e presentazione professionale del caso.",
        "beneficiari": "Équipe simulata composta dai compagni nei diversi ruoli professionali; le griglie restano come strumento di lavoro per il PCTO.",
        "ambito": "interna",
        "fonde": ["4.2", "4.3"],
    },
    {
        "id": "U4.3",
        "anno": 4,
        "competenze": [4, 6],
        "traguardo": "Elaborare il piano assistenziale individualizzato per una persona con disabilità e adattare l'ambiente in cui si realizza",
        "compito": "PAI per una persona con disabilità elaborato a partire dalla valutazione multidimensionale, con gli interventi sui bisogni di base e la riprogettazione dell'ambiente domestico: checklist di igiene e sicurezza, piano di sanificazione, layout adattato e motivato.",
        "situazione": "La disabilità non si affronta con un intervento uguale per tutti: serve una valutazione multidimensionale che parta dalla persona e non dalla diagnosi; e la casa in cui quella persona ha sempre vissuto diventa, con il tempo, il luogo più pericoloso per lei.",
        "prodotto": "PAI completo, comprensivo del progetto di adattamento dell'ambiente domestico.",
        "beneficiari": "Caso reale anonimizzato fornito da un servizio del territorio, o simulato; il progetto è presentato a un operatore dell'assistenza domiciliare.",
        "ambito": "mista",
        "fonde": ["4.4", "4.6"],
    },
    {
        "id": "U4.4",
        "anno": 4,
        "competenze": [5, 9],
        "traguardo": "Predisporre interventi per i bisogni di base di una persona parzialmente non autosufficiente e collocarli in un progetto di integrazione sociale",
        "compito": "Piano operativo di assistenza per un caso di parziale non autosufficienza — bisogni di base, capacità residue, profilassi delle lesioni da decubito, in raccordo con il laboratorio OSS — inserito in un'ipotesi di progetto di integrazione sociale con azioni di prevenzione ai tre livelli.",
        "situazione": "Una persona parzialmente non autosufficiente conserva capacità che un'assistenza mal impostata annulla; e l'inclusione sociale si dichiara facilmente e si progetta con difficoltà, perché richiede azioni concrete sui tre livelli di prevenzione.",
        "prodotto": "Piano operativo di assistenza e progetto di integrazione sociale riferiti allo stesso caso.",
        "beneficiari": "Caso simulato, in raccordo con il laboratorio OSS; il progetto è discusso con un operatore.",
        "ambito": "mista",
        "fonde": ["4.5", "4.9"],
    },
    {
        "id": "U4.5",
        "anno": 4,
        "competenze": [7, 8],
        "traguardo": "Orientare l'utenza verso i servizi appropriati e realizzare attività di animazione rispondenti ai bisogni rilevati",
        "compito": "Attività di animazione per adulti, anziani o persone con disabilità progettata e realizzata in PCTO o in contesto simulato a partire dall'analisi dei bisogni, affiancata da uno sportello informativo simulato in cui casi-tipo sono instradati verso i servizi con la tecnica dell'intervista.",
        "situazione": "Adulti, anziani e persone con disabilità hanno bisogni di animazione diversi fra loro, che vanno rilevati prima di progettare; e chi si presenta a uno sportello non sa quasi mai di quale servizio ha bisogno: sa solo raccontare un problema.",
        "prodotto": "Progetto e report degli esiti dell'attività di animazione; registrazione dei colloqui di orientamento con l'instradamento dei casi-tipo.",
        "beneficiari": "Gli utenti della struttura ospitante il PCTO; i compagni delle altre classi, cui lo sportello è aperto.",
        "ambito": "esterna",
        "fonde": ["4.7", "4.8"],
    },
    {
        "id": "U5.1",
        "anno": 5,
        "competenze": [1, 10],
        "traguardo": "Gestire un progetto di servizio con la rete territoriale e valutarne gli esiti con indicatori e criteri di accreditamento",
        "compito": "Progetto di servizio gestito in simulazione — analisi dei bisogni, piano, budget, partenariato di rete, rendicontazione — con la dashboard di monitoraggio, gli indicatori, l'analisi statistica di base e la relazione valutativa con riferimento all'accreditamento regionale.",
        "situazione": "Un servizio alla persona sta in piedi solo se bisogni, risorse, rete e rendicontazione reggono insieme; e un servizio che non misura i propri risultati non può migliorarli, né dimostrare di possedere i requisiti per l'accreditamento.",
        "prodotto": "Progetto di servizio completo con dashboard di monitoraggio e relazione valutativa.",
        "beneficiari": "Servizio simulato; il progetto e la relazione sono presentati a un responsabile del settore.",
        "ambito": "mista",
        "fonde": ["5.1", "5.10"],
    },
    {
        "id": "U5.2",
        "anno": 5,
        "competenze": [2, 3],
        "traguardo": "Coordinare l'équipe multi-professionale su un caso e facilitare la comunicazione con utenti di lingue e culture diverse",
        "compito": "Case management simulato in équipe multi-professionale con analisi di ruoli e stili di leadership, comprensivo del piano di facilitazione comunicativa per l'utente: materiali easy-to-read o in L2 e azioni di mediazione interculturale.",
        "situazione": "Nel case management il coordinamento fra professionisti è la parte più difficile; e in un servizio frequentato da utenti stranieri o con difficoltà cognitive la comunicazione ordinaria esclude proprio chi avrebbe più bisogno di capire.",
        "prodotto": "Documentazione del case management e piano di facilitazione comunicativa con i materiali accessibili prodotti.",
        "beneficiari": "Gli utenti del servizio, tramite i materiali in linguaggio accessibile; caso simulato in équipe multi-professionale.",
        "ambito": "esterna",
        "fonde": ["5.2", "5.3"],
    },
    {
        "id": "U5.3",
        "anno": 5,
        "competenze": [4, 6],
        "traguardo": "Tradurre il PAI nelle attività quotidiane e adattare l'abitazione con ausili e soluzioni che sostengono l'autonomia",
        "compito": "Proposte operative complete per l'attuazione di un PAI — dal bisogno all'organizzazione delle attività quotidiane — con il progetto di adattamento dell'abitazione: ausili, layout di spazi e arredi, valutazione delle difficoltà d'uso.",
        "situazione": "Un piano assistenziale scritto bene resta inutile finché non si traduce nelle attività concrete di ogni giornata; e restare nella propria casa, ciò che quasi tutti desiderano, senza adattamenti e ausili adeguati diventa impossibile.",
        "prodotto": "Proposte operative per l'attuazione del PAI e progetto di adattamento dell'abitazione.",
        "beneficiari": "Caso simulato riferito a un servizio realmente esistente sul territorio; il progetto di adattamento è valutato da un tecnico o da un terapista.",
        "ambito": "mista",
        "fonde": ["5.4", "5.6"],
    },
    {
        "id": "U5.4",
        "anno": 5,
        "competenze": [5, 9],
        "traguardo": "Assistere la persona non autosufficiente o in fase terminale e sostenere la famiglia dentro la rete dei servizi",
        "compito": "Progetto integrato su un caso complesso — bisogni, rete, interventi, sostegno alla famiglia — comprensivo delle prove pratiche di primo soccorso in ambiente simulato e della scheda tecnica su dispositivi di supporto vitale, nutrizione artificiale e cure palliative. Orientato all'Esame di Stato.",
        "situazione": "Un caso complesso mette insieme bisogni sanitari, sociali, educativi e familiari che nessun singolo servizio affronta da solo; e nelle emergenze e nelle fasi terminali l'operatore deve saper agire subito e conoscere i dispositivi che accompagnano la persona.",
        "prodotto": "Progetto integrato sul caso complesso con scheda tecnica dei dispositivi e valutazione delle prove pratiche di primo soccorso.",
        "beneficiari": "Caso simulato di livello esame di Stato; il progetto è valutato dal consiglio di classe, le prove pratiche da personale sanitario.",
        "ambito": "mista",
        "fonde": ["5.5", "5.9"],
    },
    {
        "id": "U5.5",
        "anno": 5,
        "competenze": [7, 8],
        "traguardo": "Gestire l'informazione all'utenza su diritti e qualità dei servizi e realizzare in autonomia un evento di animazione sociale",
        "compito": "Evento di animazione sociale progettato e realizzato con mini-piano di fundraising e valutazione strutturata degli esiti, nel quale viene presentata alla comunità la carta dei servizi orientata all'utente: diritti e doveri, opportunità di fruizione, criteri di qualità per la scelta.",
        "situazione": "Le associazioni del territorio hanno idee e non risorse; e le carte dei servizi esistenti sono scritte per l'amministrazione, non per chi deve scegliere, così diritti e criteri di qualità restano illeggibili.",
        "prodotto": "Evento realizzato con piano di fundraising e valutazione degli esiti, e carta dei servizi in versione orientata all'utente.",
        "beneficiari": "La comunità locale e l'associazione o l'ente partner dell'evento; gli utenti dei servizi e le loro famiglie.",
        "ambito": "esterna",
        "fonde": ["5.7", "5.8"],
    },
]


def estremi_ore(testo):
    """Da «12–15», «48», «18–20 (+PCTO)» ricava (minimo, massimo)."""
    numeri = [int(n) for n in re.findall(r"\d+", str(testo).replace("–", "-"))]
    if not numeri:
        return 0, 0
    return numeri[0], numeri[-1]


def unisci_voci(schede, campo):
    """Abilità o saperi delle schede di origine, senza duplicati.

    Il testo resta quello del curricolo e gli insegnamenti referenti pure: se
    la stessa voce compare in due schede con attribuzioni diverse, si sommano
    gli insegnamenti nell'ordine in cui appaiono, senza toglierne nessuno.
    """
    unite = {}
    ordine = []
    for scheda in schede:
        for voce in scheda.get(campo, []):
            chiave = voce["t"].strip().lower()
            if chiave not in unite:
                unite[chiave] = {"t": voce["t"], "ins": list(voce["ins"])}
                if voce.get("notaAttribuzione"):
                    unite[chiave]["notaAttribuzione"] = voce["notaAttribuzione"]
                ordine.append(chiave)
            else:
                for ins in voce["ins"]:
                    if ins not in unite[chiave]["ins"]:
                        unite[chiave]["ins"].append(ins)
                if voce.get("notaAttribuzione"):
                    note = unite[chiave].setdefault("notaAttribuzione", "").split(" · ")
                    if voce["notaAttribuzione"] not in note:
                        note.append(voce["notaAttribuzione"])
                        unite[chiave]["notaAttribuzione"] = " · ".join(filter(None, note))
    return [unite[k] for k in ordine]


def fasi_progettazione(uid):
    """Attività proposte; nessuna durata o attribuzione disciplinare inventata."""
    specifiche = {
        'U5.4a': ['Preparazione guidata del caso e dei limiti del ruolo', 'Prove di primo soccorso in ambiente simulato', 'Lettura ragionata delle schede di presidi e cure palliative', 'Verifica individuale con supervisione competente'],
        'U5.4b': ['Analisi dei bisogni della persona e della famiglia', 'Individuazione della rete e dei ruoli', 'Progettazione degli interventi e dei raccordi', 'Restituzione del progetto e motivazione individuale'],
        'U3.3': ['Analisi del caso del bambino e dei bisogni', 'Rilevazione dei rischi dell’ambiente e segnalazione', 'Progettazione e simulazione delle attività di accudimento', 'Verifica individuale di accudimento e sicurezza'],
        'U4.3': ['Lettura del caso, della valutazione multidimensionale e dello schema di PAI con parti da elaborare', 'Analisi delle routine, delle capacità residue e degli ostacoli ambientali', 'Proposte per bisogni quotidiani, layout, igiene e sicurezza', 'Simulazione della routine e verifica individuale delle scelte'],
        'U5.4': ['Modulo 1: analisi del dossier, continuità assistenziale e rete di sostegno familiare', 'Modulo 2: laboratorio di primo soccorso simulato e lettura guidata delle schede dei dispositivi', 'Modulo 3: scenario di terminalità, cure palliative e sostegno familiare', 'Restituzione integrata e prove individuali distinte per i moduli'],
    }
    attivita = specifiche.get(uid, [
        'Analisi della consegna, dei destinatari e delle fonti del caso',
        'Progettazione delle azioni collegate nel compito di realtà',
        'Realizzazione e documentazione del compito nelle condizioni concordate',
        'Verifica individuale per competenza, restituzione e autovalutazione',
    ])
    return [{'attivita': a, 'ore': None, 'insegnamenti': [], 'periodo': None} for a in attivita]


def main():
    origine = json.loads(SORGENTE.read_text(encoding="utf-8"))
    revisione = json.loads(REVISIONE.read_text(encoding="utf-8"))
    per_id = {u["id"]: u for u in origine["uda"]}
    profilo = {}
    for competenza in json.loads((RADICE / 'data-area-indirizzo.json').read_text()):
        profilo.setdefault(competenza['competenzaNum'], competenza['competenzaTitolo'])
    proposta = [v for v in PROPOSTA if v['id'] not in ['U2.3','U5.4']]
    proposta += [v['struttura'] for v in revisione['schede'].values() if 'struttura' in v]
    proposta.sort(key=lambda v: list(revisione['schede']).index(v['id']))
    riferimenti = [i for v in proposta for i in v['fonde']]
    if len(riferimenti) != len(set(riferimenti)) or len(riferimenti) != 48:
        raise ValueError('Le 48 schede di origine devono comparire esattamente una volta')
    mancanti = set(riferimenti) - set(per_id)
    if mancanti:
        raise ValueError(f'Schede di origine non reperite: {sorted(mancanti)}')
    if set(revisione['schede']) != {v['id'] for v in proposta}:
        raise ValueError('Revisione incompleta o con schede non presenti')

    schede = []
    for voce in proposta:
        aggiornamento = revisione['schede'][voce['id']]
        voce = {**voce, **aggiornamento['modifiche']}
        fuse = [per_id[i] for i in voce["fonde"]]
        if any(u['anno'] != voce['anno'] for u in fuse) and not (voce['id'] == 'U1.1' and voce['anno'] == 2 and voce['fonde'] == ['1.1', '1.7']):
            raise ValueError('Accorpamento fra annualità diverse')
        if voce['competenze'] != [u['competenza'] for u in fuse]:
            raise ValueError('Competenze non coerenti con le origini')
        if [d['competenza'] for d in aggiornamento['rubrica']] != voce['competenze']:
            raise ValueError('Rubrica non coerente con le competenze')
        minimi = sum(estremi_ore(u["ore"])[0] for u in fuse)
        massimi = sum(estremi_ore(u["ore"])[1] for u in fuse)
        ore = str(minimi) if minimi == massimi else f"{minimi}–{massimi}"

        schede.append({
            "id": voce["id"],
            "anno": voce["anno"],
            "collegataA": voce.get("collegataA", ""),
            "derivaDa": voce.get("derivaDa", ""),
            "collocazione": voce.get('collocazione', ''),
            "raccordoProfilo": [{'competenza': n, 'testo': profilo[n]} for n in voce['competenze']],
            "condizioniRealizzazione": "Attività didattiche graduate rispetto all’annualità e svolte nei ruoli assegnati. Gli eventuali contesti reali, partner, pubblicazioni e contributi di professionisti citati nella consegna richiedono organizzazione e accordi della scuola; non sono attestati da questa proposta.",
            # I titoli restano quelli del fascicolo d'asse, affiancati.
            "titolo": " · ".join(u["titolo"] for u in fuse),
            "competenza": voce["competenze"][0],
            "competenze": voce["competenze"],
            "qnq": fuse[0]["qnq"],
            "traguardo": voce["traguardo"],
            "traguardiOrigine": [
                {"competenza": u["competenza"], "testo": u["traguardo"], "scheda": u["id"]}
                for u in fuse
            ],
            "compito": voce["compito"],
            "sintesi": voce["sintesi"],
            "ore": ore,
            "abilita": unisci_voci(fuse, "abilita"),
            "saperi": unisci_voci(fuse, "saperi"),
            "sviluppata": None,  # La proposta non è una UDA completa già adottata.
            "materialiOrigine": [
                {"scheda": u['id'], "riferimento": u['sviluppata'],
                 "stato": "Riferimento ereditato dal catalogo; adattamento alla proposta da verificare"}
                for u in fuse if u.get('sviluppata')
            ],
            "rubrica": aggiornamento['rubrica'],
            "criterioValutazione": revisione['criterioValutazione'],
            "pianificazione": {
                "stato": "Da deliberare dal consiglio di classe",
                "oreOrigine": [{"scheda": u['id'], "ore": u['ore']} for u in fuse],
                "oreProgettate": None,
                "nota": "Il totale esposto è la somma delle ore di origine, non un nuovo monte ore validato. Le fasi seguenti non hanno ancora ore assegnate. Contare una sola volta le attività comuni; non sommare questa proposta e le sue schede di origine nel piano annuale.",
                "fasi": fasi_progettazione(voce['id']),
                "decisioniNecessarie": [
                    "Confermare contesto, destinatari e disponibilità di eventuali partner o laboratori",
                    "Attribuire attività, ore e periodo a ciascun insegnamento effettivamente presente nell’annualità",
                    "Identificare attività condivise e raccordi con altre UDA senza doppio conteggio",
                    "Validare rubriche, prove individuali e supporti previsti per gli studenti",
                ],
            },
            "provenienzaContenuti": [
                {"scheda": u['id'], "competenza": u['competenza'],
                 "abilita": u['abilita'], "saperi": u['saperi']}
                for u in fuse
            ],
            "situazione": voce["situazione"],
            "prodotto": voce["prodotto"],
            "beneficiari": voce["beneficiari"],
            "ambito": voce["ambito"],
            "fonde": [{"id": u["id"], "titolo": u["titolo"], "competenza": u["competenza"]} for u in fuse],
        })

    dati = {
        "meta": {
            "revisione": revisione['versione'],
            "tracciamento": {
                "fonte": SORGENTE.name,
                "sha256Fonte": hashlib.sha256(SORGENTE.read_bytes()).hexdigest(),
                "revisione": "tools/revisione_uda_unificate.json",
                "sha256Revisione": hashlib.sha256(REVISIONE.read_bytes()).hexdigest(),
                "registro": "revisioni/2026-09-06-riordino-applicato/REGISTRO.md",
                "profilo": "data-area-indirizzo.json",
                "sha256Profilo": hashlib.sha256((RADICE / 'data-area-indirizzo.json').read_bytes()).hexdigest(),
            },
            "titolo": "Proposta di UDA unificate — Quinquennio SSAS",
            "sottotitolo": "48 UDA d’asse in 21 accorpamenti e 6 schede autonome · proposta da validare collegialmente",
            "stato": "proposta",
            "fonte": (
                "Elaborazione delle 48 schede del fascicolo UDA d'asse. Criteri: D.I. 24 maggio 2018, "
                "n. 92, art. 6, comma 4 (progettazione interdisciplinare per unità di apprendimento per "
                "tutta la durata del quinquennio); Linee guida D.M. 23 agosto 2019, n. 766, Box n. 7 "
                "(carattere prioritariamente interdisciplinare delle UdA, numero contenuto) e Box n. 8 "
                "(«si suggerisce di inserire un numero limitato di competenze»; monte ore «non troppo "
                "esiguo… né troppo ampio»)."
            ),
            "fasiStandard": origine["meta"]["fasiStandard"],
            "valutazioneStandard": (
                "Rubrica del compito di realtà a 4 livelli con una dimensione distinta per ciascuna "
                "competenza in uscita coinvolta, più osservazione di processo e autovalutazione. "
                "Le rubriche sono proposte redazionali: le competenze restano distinte. "
                "Le unificate sono disponibili nel PFI come proposte; non sono inserite automaticamente nella votazione."
            ),
            "notaPiano": (
                "Documento di lavoro. La proposta riduce le schede d'asse da 48 a 27 accorpando le UDA "
                "che un unico compito di realtà mobilita insieme. U1.1 è collocata in seconda su indicazione del docente, mantenendo le origini del biennio. Il consiglio di classe "
                "può accogliere l'accorpamento scheda per scheda: dove non lo accoglie, restano in vigore "
                "le schede di origine, che qui sono sempre indicate."
            ),
            "competenze": origine["meta"]["competenze"],
        },
        "uda": schede,
    }

    DESTINAZIONE.write_text(
        json.dumps(dati, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    fuse_totali = sum(len(v["fonde"]) for v in proposta)
    print(f"Scritte {len(schede)} schede unificate da {fuse_totali} schede d'asse → {DESTINAZIONE.name}")
    for anno in range(1, 6):
        del_anno = [s for s in schede if s["anno"] == anno]
        origine_anno = [u for u in origine["uda"] if u["id"] in riferimenti and u["anno"] == anno]
        print(f"  {anno}° anno: {len(origine_anno)} → {len(del_anno)} schede")


if __name__ == "__main__":
    main()
