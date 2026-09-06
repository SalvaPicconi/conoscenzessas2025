#!/usr/bin/env python3
"""
Generatore storico delle 10 UDA trasversali originarie.

Il catalogo pubblico è stato successivamente revisionato e ampliato direttamente
in data-uda-trasversali.json. Per evitare di sovrascrivere le revisioni collegiali,
questo script richiede ora l'opzione esplicita --legacy-write.

ASSI CULTURALI: quelli della normativa per l'istruzione professionale.
D.M. 92/2018, Allegato 3I (indirizzo «Servizi per la sanità e l'assistenza
sociale») assegna gli insegnamenti a quattro assi; si noti che nell'IP le
materie di indirizzo NON stanno fuori dagli assi, ma costituiscono l'«asse
scientifico, tecnologico e professionale».

  Asse dei linguaggi ............ Italiano, Inglese, Seconda lingua straniera
  Asse matematico ............... Matematica
  Asse storico sociale .......... Storia, Geografia, Diritto ed economia
  Asse scientifico, tecnologico
  e professionale ............... TIC, Scienze integrate, Metodologie operative,
                                  Scienze umane e sociali; nel triennio anche
                                  Igiene e cultura medico sanitaria, Psicologia
                                  generale e applicata, Diritto economia e
                                  tecnica amministrativa del settore socio-sanitario

Riferimenti: D.Lgs. 61/2017 art. 5 c. 1 lett. b) e c); D.M. 92/2018 art. 6 c. 4
e Allegato 3I; Linee guida D.M. 766/2018, Box n. 7 e n. 8; Raccomandazione del
Consiglio UE 22 maggio 2018 sulle competenze chiave.

Ogni UDA attraversa almeno tre assi e mobilita sia le discipline dell'area
generale sia quelle di indirizzo. Titoli, compiti di realtà e monte ore sono una
prima stesura da validare in sede di dipartimento.
"""
import json
import sys
from collections import Counter

# --- Assi normativi e insegnamenti, da D.M. 92/2018 Allegato 3I -------------
ASSE_L = 'Asse dei linguaggi'
ASSE_M = 'Asse matematico'
ASSE_S = 'Asse storico sociale'
ASSE_P = 'Asse scientifico, tecnologico e professionale'

# Nomi degli insegnamenti nella forma già usata da data-uda.json
MATERIE_PER_ASSE = {
    ASSE_L: ['Italiano', 'Inglese', 'Spagnolo'],
    ASSE_M: ['Matematica'],
    ASSE_S: ['Storia', 'Diritto'],
    ASSE_P: ['TIC', 'Scienze Integrate', 'Metodologie Operative', 'Scienze Umane',
             'Igiene e Cultura M.S.', 'Psicologia', 'Diritto e T.A.'],
}
# Scienze motorie e IRC hanno monte ore proprio, fuori dai quattro assi
MATERIE_FUORI_ASSE = ['Scienze Motorie']

QNQ = {1: '2', 2: '2', 3: '3', 4: '3/4', 5: '4'}

# ---- Sezioni 5 e 6 del Format UDA IPSECOM: situazione, prodotto, beneficiari ----
# id -> (situazione/problema, beneficiari, ambito)
SEZIONI = {
    'T1.1': ("In una classe appena formata i conflitti nascono ogni giorno e vengono affrontati "
             "d'istinto: alzando la voce, escludendo, lasciando perdere. Nessuno ha mai messo per "
             "iscritto quali regole ci si dà e perché.",
             "Il gruppo classe, che adotta il regolamento e lo applica per tutto l'anno.", 'interna'),
    'T1.2': ("Gli studenti usano lo smartphone molte ore al giorno senza sapere quali dati "
             "cedono, e chiedono a un'intelligenza artificiale risposte che non sanno verificare.",
             "Gli studenti delle terze medie in visita di orientamento, destinatari della guida.",
             'esterna'),
    'T2.1': ("Nei servizi per l'infanzia si legge ai bambini, ma spesso senza sapere perché quel "
             "testo e non un altro, e senza osservare che effetto produce.",
             "I bambini della sezione della scuola dell'infanzia e le loro insegnanti.", 'esterna'),
    'T2.2': ("Del proprio comune si parla per impressioni: quanti anziani vivano soli, quali "
             "servizi manchino, dove ci siano barriere, nessuno lo sa con precisione.",
             "L'ufficio servizi sociali del comune, cui il dossier viene consegnato.", 'esterna'),
    'T3.1': ("La stessa informazione su un utente va detta in due modi diversi all'équipe e alla "
             "famiglia: usare il lessico tecnico con chi non lo possiede equivale a non comunicare.",
             "Caso simulato; le due versioni sono valutate da un operatore dei servizi.", 'mista'),
    'T3.2': ("In rete circolano informazioni sanitarie contraddittorie, e i comportamenti a "
             "rischio in adolescenza si consolidano proprio mentre le fonti attendibili restano "
             "inascoltate.",
             "Gli studenti dell'istituto, destinatari della campagna.", 'interna'),
    'T4.1': ("Migranti, anziani e persone con disabilità compaiono nei media dentro cornici "
             "ricorrenti che i dati reali spesso smentiscono, e che pesano su chi lavora nei servizi.",
             "La comunità scolastica, tramite la pubblicazione della contro-narrazione sul sito "
             "dell'istituto.", 'interna'),
    'T4.2': ("I servizi alla persona chiudono o riducono le prestazioni per ragioni economiche che "
             "gli operatori conoscono poco e non sanno leggere in un bilancio.",
             "Il responsabile del servizio analizzato, cui si presenta il piano economico.", 'esterna'),
    'T5.1': ("I principi costituzionali e gli obiettivi dell'Agenda 2030 restano dichiarazioni "
             "astratte finché non si mostra che cosa cambiano nel lavoro quotidiano di cura.",
             "La comunità scolastica e il territorio, con un ospite esterno all'evento pubblico.",
             'esterna'),
    'T5.2': ("A pochi mesi dal diploma molti studenti conoscono in modo frammentario le opportunità "
             "formative e lavorative e faticano a trasformare esperienze, motivazioni e competenze "
             "in una scelta documentata e realistica.",
             "Lo studente, che utilizza il portfolio per l'esame, le candidature e le successive "
             "scelte formative o professionali.",
             'mista'),
}



UDA = [
    # ==================== PRIMO ANNO ====================
    {
        'id': 'T1.1', 'anno': 1, 'periodo': '1° quadrimestre',
        'titolo': 'Educazione alla pace e alla non violenza: dalle regole quotidiane al regolamento di classe',
        'assi': [ASSE_S, ASSE_L, ASSE_P],
        'competenzeGenerali': [1, 2, 9],
        'competenzeSSAS': [4, 3],
        'competenzeEuropee': ['Competenza in materia di cittadinanza',
                              'Competenza personale, sociale e capacità di imparare a imparare'],
        'traguardo': 'Riconoscere il conflitto come fatto ordinario delle relazioni e individuare, in '
                     'riferimento ai principi costituzionali, modi non violenti di affrontarlo nella vita di classe.',
        'compito': 'Regolamento di convivenza della classe elaborato dagli studenti: analisi di casi di '
                   'conflitto realmente accaduti, individuazione delle regole necessarie, stesura del testo '
                   'normativo e discussione in assemblea con votazione finale.',
        'ore': '12–15',
        'abilita': [
            {'t': 'Ricondurre comportamenti quotidiani ai principi della Costituzione', 'ins': ['Diritto', 'Storia']},
            {'t': 'Produrre un testo regolativo chiaro, coeso e adeguato al destinatario', 'ins': ['Italiano']},
            {'t': 'Osservare le dinamiche del gruppo classe e annotarle con strumenti strutturati', 'ins': ['Scienze Umane', 'Metodologie Operative']},
            {'t': 'Riconoscere nella gestualità e nella prossemica segnali di aggressività e di apertura', 'ins': ['Scienze Motorie']},
            {'t': 'Redigere e condividere il documento in formato digitale', 'ins': ['TIC']},
        ],
        'saperi': [
            {'t': 'Principi fondamentali della Costituzione: artt. 2, 3, 11', 'ins': ['Diritto', 'Storia']},
            {'t': 'Il testo regolativo: struttura, lessico, funzione', 'ins': ['Italiano']},
            {'t': 'Conflitto, aggressività, mediazione: nozioni di base', 'ins': ['Scienze Umane']},
            {'t': 'Tecniche elementari di osservazione del gruppo', 'ins': ['Metodologie Operative']},
            {'t': 'Comunicazione non verbale e linguaggio del corpo', 'ins': ['Scienze Motorie']},
            {'t': 'Videoscrittura e condivisione di documenti', 'ins': ['TIC']},
        ],
    },
    {
        'id': 'T1.2', 'anno': 1, 'periodo': '2° quadrimestre',
        'titolo': "Io cittadino digitale: dallo smartphone all'intelligenza artificiale",
        'assi': [ASSE_P, ASSE_L, ASSE_M],
        'competenzeGenerali': [7, 8, 11],
        'competenzeSSAS': [10, 7],
        'competenzeEuropee': ['Competenza digitale', 'Competenza in materia di cittadinanza'],
        'traguardo': 'Usare gli strumenti digitali in modo consapevole, riconoscendo il trattamento dei '
                     'propri dati e distinguendo un contenuto attendibile da uno che non lo è.',
        'compito': "Guida all'uso consapevole dello smartphone per gli studenti delle terze medie in "
                   "visita di orientamento: dieci schede su privacy, impronta digitale, riconoscimento "
                   "delle fonti e uso degli assistenti basati su intelligenza artificiale.",
        'ore': '12–15',
        'abilita': [
            {'t': 'Configurare le impostazioni di privacy di un dispositivo e di un account', 'ins': ['TIC']},
            {'t': "Verificare l'attendibilità di una fonte digitale con criteri espliciti", 'ins': ['Italiano', 'TIC']},
            {'t': 'Raccogliere e rappresentare dati sull\'uso dei media fra i coetanei', 'ins': ['Matematica']},
            {'t': 'Riconoscere i limiti di affidabilità di un sistema di IA generativa', 'ins': ['Scienze Integrate', 'TIC']},
            {'t': 'Rilevare gli effetti dell\'uso dei dispositivi sulle relazioni fra pari', 'ins': ['Scienze Umane']},
            {'t': 'Comprendere termini tecnici digitali in lingua inglese', 'ins': ['Inglese']},
        ],
        'saperi': [
            {'t': 'Dati personali, consenso e impronta digitale', 'ins': ['TIC']},
            {'t': 'Criteri di attendibilità delle fonti e notizie false', 'ins': ['Italiano']},
            {'t': 'Raccolta e rappresentazione di dati: tabelle, grafici, percentuali', 'ins': ['Matematica']},
            {'t': 'Che cos\'è un sistema di intelligenza artificiale generativa', 'ins': ['Scienze Integrate', 'TIC']},
            {'t': 'Socializzazione e gruppo dei pari in ambiente digitale', 'ins': ['Scienze Umane']},
            {'t': 'Lessico informatico di base in lingua inglese', 'ins': ['Inglese']},
        ],
    },

    # ==================== SECONDO ANNO ====================
    {
        'id': 'T2.1', 'anno': 2, 'periodo': '1° quadrimestre',
        'titolo': 'Fiaba e racconto come strumento di crescita',
        'assi': [ASSE_L, ASSE_P, ASSE_S],
        'competenzeGenerali': [2, 4, 6],
        'competenzeSSAS': [6, 5],
        'competenzeEuropee': ['Competenza alfabetica funzionale',
                              'Competenza in materia di consapevolezza ed espressione culturali'],
        'traguardo': 'Riconoscere nella narrazione uno strumento educativo e usarla per accompagnare un '
                     'bambino nella comprensione di sé e degli altri.',
        'compito': "Laboratorio di lettura animata per una sezione della scuola dell'infanzia: scelta "
                   "motivata di tre testi, adattamento per la lettura ad alta voce, realizzazione "
                   "dell'attività e osservazione documentata delle reazioni dei bambini.",
        'ore': '15–18',
        'abilita': [
            {'t': 'Analizzare la struttura narrativa di una fiaba e le sue funzioni', 'ins': ['Italiano']},
            {'t': 'Adattare un testo alla fascia d\'età e leggerlo ad alta voce con efficacia', 'ins': ['Italiano']},
            {'t': 'Progettare e condurre un\'attività di animazione alla lettura', 'ins': ['Metodologie Operative']},
            {'t': 'Osservare e registrare le reazioni del gruppo con una griglia strutturata', 'ins': ['Scienze Umane', 'Metodologie Operative']},
            {'t': 'Confrontare varianti della stessa fiaba in tradizioni culturali diverse', 'ins': ['Storia', 'Inglese', 'Spagnolo']},
            {'t': 'Realizzare supporti illustrati o sonori per la narrazione', 'ins': ['TIC']},
        ],
        'saperi': [
            {'t': 'Struttura della fiaba e funzioni narrative', 'ins': ['Italiano']},
            {'t': 'Sviluppo del linguaggio e dell\'immaginazione nel bambino', 'ins': ['Scienze Umane']},
            {'t': 'Tecniche di animazione alla lettura', 'ins': ['Metodologie Operative']},
            {'t': 'Tradizioni narrative locali, nazionali e internazionali', 'ins': ['Storia', 'Inglese', 'Spagnolo']},
            {'t': 'Produzione di materiali multimediali semplici', 'ins': ['TIC']},
        ],
    },
    {
        'id': 'T2.2', 'anno': 2, 'periodo': '2° quadrimestre',
        'titolo': 'Leggere il territorio: dati, mappe e ambiente di vita',
        'assi': [ASSE_M, ASSE_P, ASSE_S],
        'competenzeGenerali': [3, 8, 12],
        'competenzeSSAS': [1, 6],
        'competenzeEuropee': ['Competenza matematica e competenza in scienze, tecnologie e ingegneria',
                              'Competenza digitale'],
        'traguardo': 'Descrivere con dati e mappe il territorio in cui si vive, mettendo in relazione '
                     'caratteristiche ambientali, servizi disponibili e condizioni di vita della popolazione.',
        'compito': 'Dossier statistico-cartografico del proprio comune: popolazione per fasce d\'età, '
                   'servizi presenti, barriere architettoniche rilevate sul campo, restituiti in grafici '
                   'e in una mappa digitale commentata, consegnata all\'ufficio servizi sociali.',
        'ore': '15–18',
        'abilita': [
            {'t': 'Ricavare da fonti statistiche ufficiali dati sulla popolazione e rappresentarli', 'ins': ['Matematica', 'TIC']},
            {'t': 'Calcolare e interpretare indici elementari: percentuali, medie, indice di vecchiaia', 'ins': ['Matematica']},
            {'t': 'Costruire una mappa digitale georeferenziata con punti di interesse', 'ins': ['TIC']},
            {'t': 'Rilevare sul campo la presenza di barriere e di servizi accessibili', 'ins': ['Metodologie Operative']},
            {'t': 'Mettere in relazione caratteristiche ambientali e bisogni della popolazione', 'ins': ['Scienze Integrate']},
            {'t': 'Ricostruire l\'evoluzione dell\'insediamento e dei servizi nel proprio comune', 'ins': ['Storia', 'Diritto']},
            {'t': 'Redigere il commento al dossier con lessico appropriato', 'ins': ['Italiano']},
        ],
        'saperi': [
            {'t': 'Fonti statistiche ufficiali e loro lettura', 'ins': ['Matematica']},
            {'t': 'Rappresentazione dei dati: tabelle, istogrammi, aerogrammi', 'ins': ['Matematica', 'TIC']},
            {'t': 'Strumenti di cartografia digitale', 'ins': ['TIC']},
            {'t': 'Tecniche di rilevazione sul territorio', 'ins': ['Metodologie Operative']},
            {'t': 'Ambiente naturale e antropico; accessibilità e barriere', 'ins': ['Scienze Integrate']},
            {'t': 'Ente locale e servizi alla persona: competenze di base', 'ins': ['Diritto', 'Storia']},
        ],
    },

    # ==================== TERZO ANNO ====================
    {
        'id': 'T3.1', 'anno': 3, 'periodo': '1° quadrimestre',
        'titolo': 'Linguaggi, numeri e storie per capire la realtà',
        'assi': [ASSE_L, ASSE_M, ASSE_P],
        'competenzeGenerali': [2, 5, 12],
        'competenzeSSAS': [7, 10],
        'competenzeEuropee': ['Competenza alfabetica funzionale', 'Competenza multilinguistica'],
        'traguardo': "Gestire l'interazione comunicativa in contesto professionale, padroneggiando i "
                     "lessici specialistici e sapendo tradurre dati in discorso comprensibile.",
        'compito': 'Relazione professionale su un caso di servizio, redatta in due versioni: una per gli '
                   'operatori, con lessico tecnico, e una per la famiglia dell\'utente, in linguaggio '
                   'piano; entrambe corredate dai dati essenziali del caso e da una scheda di sintesi.',
        'ore': '18–20',
        'abilita': [
            {'t': 'Selezionare registro e lessico in funzione del destinatario', 'ins': ['Italiano']},
            {'t': 'Riformulare un contenuto tecnico in linguaggio accessibile', 'ins': ['Italiano', 'Metodologie Operative']},
            {'t': 'Sintetizzare un insieme di dati in indicatori leggibili', 'ins': ['Matematica']},
            {'t': 'Riconoscere la terminologia socio-sanitaria in lingua inglese', 'ins': ['Inglese']},
            {'t': 'Applicare le regole di riservatezza nella redazione di documenti sull\'utente', 'ins': ['Diritto e T.A.']},
            {'t': 'Descrivere il comportamento osservato senza formulare giudizi', 'ins': ['Psicologia']},
            {'t': 'Impaginare e archiviare il documento in formato condivisibile', 'ins': ['TIC']},
        ],
        'saperi': [
            {'t': 'Lessici specialistici e registri comunicativi', 'ins': ['Italiano']},
            {'t': 'La relazione professionale: struttura e requisiti', 'ins': ['Italiano', 'Metodologie Operative']},
            {'t': 'Indicatori di sintesi e loro interpretazione', 'ins': ['Matematica']},
            {'t': 'Terminologia socio-sanitaria di base in lingua inglese', 'ins': ['Inglese']},
            {'t': 'Segreto professionale e trattamento dei dati sensibili', 'ins': ['Diritto e T.A.']},
            {'t': 'Osservazione descrittiva e inferenza: la differenza', 'ins': ['Psicologia']},
        ],
    },
    {
        'id': 'T3.2', 'anno': 3, 'periodo': '2° quadrimestre',
        'titolo': "Salute e prevenzione nell'era digitale",
        'assi': [ASSE_P, ASSE_M, ASSE_L],
        'competenzeGenerali': [3, 8, 11],
        'competenzeSSAS': [6, 10],
        'competenzeEuropee': ['Competenza matematica e competenza in scienze, tecnologie e ingegneria',
                              'Competenza digitale'],
        'traguardo': "Valutare l'attendibilità dell'informazione sanitaria che circola in rete e usare "
                     "strumenti digitali per attività di prevenzione rivolte a un destinatario reale.",
        'compito': 'Campagna di prevenzione rivolta ai coetanei su un tema scelto fra alimentazione, '
                   'movimento e dipendenze: analisi di contenuti sanitari trovati in rete, individuazione '
                   'di quelli non attendibili e produzione di materiale corretto in formato digitale, '
                   'diffuso nella scuola.',
        'ore': '18–20',
        'abilita': [
            {'t': 'Distinguere fonti sanitarie istituzionali da fonti non qualificate', 'ins': ['Igiene e Cultura M.S.', 'TIC']},
            {'t': 'Leggere e interpretare dati epidemiologici elementari', 'ins': ['Matematica', 'Igiene e Cultura M.S.']},
            {'t': 'Produrre contenuti multimediali corretti e accessibili', 'ins': ['TIC']},
            {'t': 'Progettare un intervento di educazione alla salute per un gruppo', 'ins': ['Metodologie Operative']},
            {'t': 'Riconoscere i meccanismi psicologici che sostengono i comportamenti a rischio', 'ins': ['Psicologia']},
            {'t': 'Collegare stili di vita e condizioni di salute', 'ins': ['Scienze Motorie']},
            {'t': 'Redigere messaggi persuasivi corretti sul piano scientifico', 'ins': ['Italiano']},
        ],
        'saperi': [
            {'t': 'Fonti istituzionali dell\'informazione sanitaria', 'ins': ['Igiene e Cultura M.S.']},
            {'t': 'Nozioni di epidemiologia descrittiva: frequenze e tassi', 'ins': ['Igiene e Cultura M.S.', 'Matematica']},
            {'t': 'Accessibilità dei contenuti digitali', 'ins': ['TIC']},
            {'t': 'Progettazione di un intervento di educazione alla salute', 'ins': ['Metodologie Operative']},
            {'t': 'Comportamenti a rischio in adolescenza', 'ins': ['Psicologia']},
            {'t': 'Stili di vita e fattori di rischio', 'ins': ['Scienze Motorie']},
        ],
    },

    # ==================== QUARTO ANNO ====================
    {
        'id': 'T4.1', 'anno': 4, 'periodo': '1° quadrimestre',
        'titolo': 'Informarsi criticamente: media, dati e intelligenza artificiale',
        'assi': [ASSE_L, ASSE_S, ASSE_P],
        'competenzeGenerali': [1, 7, 11],
        'competenzeSSAS': [9, 4],
        'competenzeEuropee': ['Competenza in materia di cittadinanza', 'Competenza digitale'],
        'traguardo': 'Analizzare criticamente il discorso pubblico su temi sociali, riconoscendo '
                     'stereotipi, distorsioni e responsabilità nell\'uso di sistemi automatici.',
        'compito': 'Dossier di analisi su come i media rappresentano una categoria fragile — migranti, '
                   'anziani, persone con disabilità: raccolta di un corpus di articoli, analisi del '
                   'lessico, confronto con i dati reali e proposta di una contro-narrazione pubblicabile '
                   'sul sito della scuola.',
        'ore': '20–25',
        'abilita': [
            {'t': 'Analizzare il lessico valutativo e gli impliciti di un testo giornalistico', 'ins': ['Italiano']},
            {'t': 'Ricostruire il contesto storico-sociale del fenomeno rappresentato', 'ins': ['Storia']},
            {'t': 'Confrontare la rappresentazione mediatica con i dati statistici disponibili', 'ins': ['Matematica', 'TIC']},
            {'t': 'Riconoscere i rischi di discriminazione algoritmica nei sistemi automatici', 'ins': ['TIC']},
            {'t': 'Individuare le tutele previste dall\'ordinamento contro la discriminazione', 'ins': ['Diritto e T.A.']},
            {'t': 'Spiegare i meccanismi di formazione dello stereotipo e del pregiudizio', 'ins': ['Psicologia']},
            {'t': 'Progettare un messaggio di contrasto allo stigma rivolto alla comunità', 'ins': ['Metodologie Operative']},
        ],
        'saperi': [
            {'t': 'Stereotipo, pregiudizio e discorso d\'odio', 'ins': ['Psicologia', 'Italiano']},
            {'t': 'Il linguaggio dell\'informazione: titolazione, framing, fonti', 'ins': ['Italiano']},
            {'t': 'Migrazioni, invecchiamento, disabilità: quadro storico e sociale', 'ins': ['Storia']},
            {'t': 'Bias dei sistemi di intelligenza artificiale', 'ins': ['TIC']},
            {'t': 'Principio di non discriminazione nell\'ordinamento italiano ed europeo', 'ins': ['Diritto e T.A.']},
            {'t': 'Comunicazione sociale e contrasto allo stigma', 'ins': ['Metodologie Operative']},
        ],
    },
    {
        'id': 'T4.2', 'anno': 4, 'periodo': '2° quadrimestre',
        'titolo': 'Economia dei servizi alla persona: risorse, costi e sostenibilità',
        'assi': [ASSE_M, ASSE_S, ASSE_P],
        'competenzeGenerali': [10, 12],
        'competenzeSSAS': [1, 9],
        'competenzeEuropee': ['Competenza imprenditoriale',
                              'Competenza matematica e competenza in scienze, tecnologie e ingegneria'],
        'traguardo': 'Comprendere come si finanzia e si organizza un servizio alla persona e valutare la '
                     'sostenibilità economica di un intervento.',
        'compito': 'Piano economico essenziale di un servizio realmente esistente sul territorio — centro '
                   'diurno, ludoteca, servizio domiciliare: voci di costo, fonti di finanziamento, costo '
                   'per utente e proposta motivata di una misura di sostenibilità, presentata al '
                   'responsabile del servizio.',
        'ore': '20–25',
        'abilita': [
            {'t': 'Costruire un budget essenziale distinguendo costi fissi e variabili', 'ins': ['Diritto e T.A.', 'Matematica']},
            {'t': 'Calcolare il costo unitario di un servizio per utente', 'ins': ['Matematica']},
            {'t': 'Individuare le fonti di finanziamento pubblico e privato di un servizio', 'ins': ['Diritto e T.A.']},
            {'t': 'Ricostruire l\'evoluzione storica del welfare locale', 'ins': ['Storia']},
            {'t': 'Descrivere l\'organizzazione del lavoro e i ruoli professionali del servizio', 'ins': ['Metodologie Operative']},
            {'t': 'Valutare l\'impatto della spesa sulla qualità della vita degli utenti', 'ins': ['Igiene e Cultura M.S.']},
            {'t': 'Consultare bandi e avvisi anche in lingua straniera', 'ins': ['Inglese']},
            {'t': 'Presentare i dati con fogli di calcolo e grafici', 'ins': ['TIC']},
        ],
        'saperi': [
            {'t': 'Costi, ricavi, budget: nozioni essenziali', 'ins': ['Diritto e T.A.', 'Matematica']},
            {'t': 'Il finanziamento dei servizi sociali: livelli e strumenti', 'ins': ['Diritto e T.A.']},
            {'t': 'Terzo settore e cooperazione sociale', 'ins': ['Diritto e T.A.', 'Storia']},
            {'t': 'Storia del welfare in Italia', 'ins': ['Storia']},
            {'t': 'Organizzazione dei servizi e figure professionali', 'ins': ['Metodologie Operative']},
            {'t': 'Indicatori di qualità dei servizi socio-sanitari', 'ins': ['Igiene e Cultura M.S.']},
            {'t': 'Fogli di calcolo: formule e grafici', 'ins': ['TIC']},
        ],
    },

    # ==================== QUINTO ANNO ====================
    {
        'id': 'T5.1', 'anno': 5, 'periodo': '1° quadrimestre',
        'titolo': "Diritti umani e cittadinanza globale: dalla Costituzione all'Agenda 2030",
        'assi': [ASSE_S, ASSE_L, ASSE_P],
        'competenzeGenerali': [1, 4, 6],
        'competenzeSSAS': [3, 4, 7],
        'competenzeEuropee': ['Competenza in materia di cittadinanza',
                              'Competenza in materia di consapevolezza ed espressione culturali'],
        'traguardo': 'Collegare i principi costituzionali agli obiettivi di sviluppo sostenibile e '
                     'riconoscerne le implicazioni deontologiche nel lavoro sociale.',
        'compito': "Evento pubblico d'istituto su un obiettivo dell'Agenda 2030 attinente ai servizi alla "
                   "persona: ricerca documentale, individuazione dei riferimenti costituzionali e "
                   "internazionali, produzione dei materiali e conduzione dell'incontro con un ospite esterno.",
        'ore': '22–25',
        'abilita': [
            {'t': 'Collegare norme costituzionali e fonti internazionali sui diritti umani', 'ins': ['Diritto e T.A.', 'Storia']},
            {'t': 'Documentare una ricerca citando correttamente le fonti', 'ins': ['Italiano']},
            {'t': 'Progettare e condurre un evento informativo rivolto a un pubblico', 'ins': ['Metodologie Operative', 'TIC']},
            {'t': 'Applicare i principi deontologici alle scelte dell\'operatore', 'ins': ['Psicologia', 'Metodologie Operative']},
            {'t': 'Leggere indicatori di salute e disuguaglianza a livello globale', 'ins': ['Igiene e Cultura M.S.', 'Matematica']},
            {'t': 'Consultare documentazione internazionale nelle lingue straniere studiate', 'ins': ['Inglese', 'Spagnolo']},
        ],
        'saperi': [
            {'t': 'Costituzione italiana e Dichiarazione universale dei diritti umani', 'ins': ['Diritto e T.A.', 'Storia']},
            {'t': 'Agenda 2030: obiettivi attinenti alla salute e all\'inclusione', 'ins': ['Storia', 'Igiene e Cultura M.S.']},
            {'t': 'Codici deontologici delle professioni socio-sanitarie', 'ins': ['Psicologia', 'Metodologie Operative']},
            {'t': 'Citazione delle fonti e struttura di una ricerca documentata', 'ins': ['Italiano']},
            {'t': 'Determinanti sociali della salute', 'ins': ['Igiene e Cultura M.S.']},
            {'t': 'Lessico dei diritti umani nelle lingue straniere studiate', 'ins': ['Inglese', 'Spagnolo']},
        ],
    },
    {
        'id': 'T5.2', 'anno': 5, 'periodo': '2° quadrimestre',
        'titolo': 'Orientarsi dopo il diploma: lavoro, formazione terziaria e progetto di vita',
        'assi': [ASSE_S, ASSE_L, ASSE_M, ASSE_P],
        'competenzeGenerali': [5, 10, 12],
        'competenzeSSAS': [10, 3],
        'competenzeEuropee': ['Competenza imprenditoriale',
                              'Competenza personale, sociale e capacità di imparare a imparare',
                              'Competenza multilinguistica'],
        'traguardo': 'Costruire un progetto personale post-diploma fondato su dati attendibili relativi '
                     'ai percorsi formativi e al mercato del lavoro, comunicando in modo professionale '
                     'le competenze maturate nel quinquennio.',
        'compito': 'Portfolio personale di orientamento: bilancio delle competenze maturate nel '
                   'quinquennio e nella formazione scuola-lavoro, analisi documentata di due sbocchi '
                   'concreti — uno formativo e uno lavorativo — curriculum in italiano e in inglese '
                   'e presentazione motivata del proprio progetto post-diploma.',
        'ore': '20–25',
        'abilita': [
            {'t': 'Redigere un curriculum in formato europeo, in italiano e in inglese', 'ins': ['Italiano', 'Inglese']},
            {'t': 'Sostenere un colloquio di selezione simulato', 'ins': ['Italiano', 'Psicologia']},
            {'t': 'Leggere dati su occupazione e fabbisogni professionali del settore', 'ins': ['Matematica', 'Diritto e T.A.']},
            {'t': 'Individuare requisiti d\'accesso ai percorsi terziari e alle professioni regolamentate', 'ins': ['Diritto e T.A.']},
            {'t': 'Rileggere le esperienze di formazione scuola-lavoro in termini di competenze acquisite', 'ins': ['Metodologie Operative']},
            {'t': 'Riconoscere i propri punti di forza e le proprie motivazioni', 'ins': ['Psicologia']},
            {'t': 'Ricostruire le trasformazioni del lavoro di cura nel tempo', 'ins': ['Storia']},
            {'t': 'Organizzare la documentazione del portfolio in formato digitale', 'ins': ['TIC']},
        ],
        'saperi': [
            {'t': 'Percorsi terziari: ITS Academy, lauree professionalizzanti, IFTS', 'ins': ['Diritto e T.A.']},
            {'t': 'Contratti di lavoro e professioni del settore socio-sanitario', 'ins': ['Diritto e T.A.']},
            {'t': 'Curriculum europeo e lettera di presentazione', 'ins': ['Italiano', 'Inglese']},
            {'t': 'Lettura di dati sul mercato del lavoro', 'ins': ['Matematica']},
            {'t': 'Bilancio di competenze: strumenti e metodo', 'ins': ['Metodologie Operative']},
            {'t': 'Motivazione, autoefficacia e scelta', 'ins': ['Psicologia']},
            {'t': 'Trasformazioni del lavoro di cura', 'ins': ['Storia']},
        ],
    },
]

TITOLI_SSAS = {
    1: 'Collaborare nella gestione di progetti e attività dei servizi',
    2: 'Partecipare e cooperare nei gruppi di lavoro e nelle équipe',
    3: 'Facilitare la comunicazione tra persone e gruppi',
    4: 'Prendersi cura dei bisogni di base di bambini, persone con disabilità, anziani',
    5: 'Presa in carico di soggetti non autosufficienti o in stato di terminalità',
    6: "Allestimento dell'ambiente di vita: sicurezza, capacità residue, autonomia",
    7: "Informazione e orientamento dell'utente per l'accesso ai servizi",
    8: 'Attività educative, di animazione sociale, ludiche e culturali',
    9: 'Sostegno e tutela della persona con fragilità/disabilità e della famiglia',
    10: 'Raccolta ed elaborazione di dati per il monitoraggio e la valutazione',
}


def main():
    generale = json.load(open('data-area-generale.json'))
    titoli_g = {c['numero']: c['titolo']
                for c in generale['area_generale_istruzione_professionale']['competenze']}

    for u in UDA:
        situazione, beneficiari, ambito = SEZIONI[u['id']]
        u['situazione'] = situazione        # sezione 5 del format IPSECOM
        u['prodotto'] = u['compito']        # sezione 6: il compito descriveva già il prodotto
        u['beneficiari'] = beneficiari
        u['ambito'] = ambito
        u['tipo'] = 'Trasversale'
        u['qnq'] = QNQ[u['anno']]
        u['competenza'] = u['competenzeSSAS'][0]   # compatibilità col selettore del PFI
        u['sviluppata'] = True

    documento = {
        'meta': {
            'titolo': 'UDA trasversali — quinquennio SSAS',
            'sottotitolo': "Dieci unità interdisciplinari costruite sugli assi culturali dell'istruzione professionale",
            'fonte': "Prima stesura per i dipartimenti. Assi culturali e attribuzione degli insegnamenti "
                     "da D.M. 92/2018, Allegato 3I (quadri orari dell'indirizzo SSAS); competenze "
                     "dell'area generale da data-area-generale.json e dall'Allegato B delle Linee guida D.M. 766/2019; "
                     "competenze di indirizzo dal D.M. 92/2018, Allegato 2-I, e risultati intermedi dall'Allegato C, sezione i), delle medesime Linee guida; "
                     "competenze chiave da Raccomandazione del Consiglio UE 22 maggio 2018.",
            'riferimenti': [
                "D.Lgs. 61/2017 art. 5 c. 1 lett. b) — aggregazione degli insegnamenti negli assi culturali",
                "D.Lgs. 61/2017 art. 5 c. 1 lett. c) — progettazione interdisciplinare dei percorsi",
                "D.M. 92/2018 art. 6 c. 4 — per tutta la durata del quinquennio, per unità di apprendimento",
                "D.M. 92/2018 Allegato 3I — quadri orari SSAS e attribuzione degli insegnamenti agli assi",
                "Linee guida D.M. 766/2018, Box n. 7 — carattere prioritariamente interdisciplinare delle UdA",
                "Linee guida D.M. 766/2018, Box n. 8 — format di riferimento dell'UdA",
            ],
            'nota': "Due UDA per ciascun anno di corso, ognuna a cavallo di almeno tre assi culturali. "
                    "Nell'istruzione professionale le materie di indirizzo costituiscono l'asse "
                    "scientifico, tecnologico e professionale: per questo compaiono anche nelle UDA "
                    "trasversali. Titoli, compiti di realtà e monte ore sono una proposta da validare "
                    "in sede di dipartimento.",
            'assi': [ASSE_L, ASSE_M, ASSE_S, ASSE_P],
            'materiePerAsse': MATERIE_PER_ASSE,
            'materieFuoriAsse': MATERIE_FUORI_ASSE,
            'competenzeGenerali': titoli_g,
            'competenzeSSAS': TITOLI_SSAS,
        },
        'uda': UDA,
    }

    with open('data-uda-trasversali.json', 'w') as f:
        json.dump(documento, f, ensure_ascii=False, indent=2)

    # ---------------- controlli di copertura ----------------
    print(f'Schede generate: {len(UDA)}')
    print('per anno:', sorted(Counter(u['anno'] for u in UDA).items()))

    print('\ncopertura assi culturali:')
    assi = Counter(a for u in UDA for a in u['assi'])
    for a in [ASSE_L, ASSE_M, ASSE_S, ASSE_P]:
        print(f'  {a}: {assi.get(a, 0)}')
    minimo = min(len(u['assi']) for u in UDA)
    print(f'  assi attraversati da ogni UDA: minimo {minimo}')

    gen = Counter(g for u in UDA for g in u['competenzeGenerali'])
    mancanti = sorted(set(range(1, 13)) - set(gen))
    print(f"\ncompetenze area generale: {len(gen)}/12 coperte"
          + (f' — mancano G{mancanti}' if mancanti else ' — tutte'))

    ssas = sorted({c for u in UDA for c in u['competenzeSSAS']})
    print(f"competenze d'indirizzo richiamate: C{ssas}")

    from collections import Counter as _C
    amb = _C(u['ambito'] for u in UDA)
    print('\nambito:', dict(amb))
    print('con beneficiari esterni:',
          sum(1 for u in UDA if u['ambito'] in ('esterna', 'mista')), '/', len(UDA))

    print('\ninsegnamenti coinvolti:')
    ins = Counter(i for u in UDA for x in u['abilita'] + u['saperi'] for i in x['ins'])
    attese = {m for lista in MATERIE_PER_ASSE.values() for m in lista} | set(MATERIE_FUORI_ASSE)
    for k, v in ins.most_common():
        print(f'  {k}: {v}')
    assenti = sorted(attese - set(ins))
    print('  materie mai coinvolte:', assenti if assenti else 'nessuna')


if __name__ == '__main__':
    if '--legacy-write' not in sys.argv:
        raise SystemExit(
            'Generatore storico non eseguito: data-uda-trasversali.json è il catalogo '
            'revisionato. Usare --legacy-write solo per rigenerare consapevolmente le '
            '10 schede originarie.'
        )
    main()
