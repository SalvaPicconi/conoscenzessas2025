#!/usr/bin/env python3
"""
Aggiunge alle 48 UDA d'asse le sezioni 5 e 6 del Format UDA IPSECOM:

  5. Situazione / problema / tema di riferimento dell'UdA
     «Individuare un problema/bisogno da affrontare attraverso dei compiti
     "autentici" (di realtà), significativi e sfidanti per gli studenti»

  6. Prodotto / prodotti da realizzare
     «Indicare il prodotto/servizio che gli studenti realizzeranno
     per beneficiari reali»

Il campo `compito` esistente descriveva già il prodotto: diventa `prodotto`,
e resta anche come `compito` per non rompere le pagine che lo leggono.
Nuovi campi: `situazione`, `prodotto`, `beneficiari`, `ambito`.

`ambito` (interna / esterna / mista) è la distinzione richiesta dalla sezione 1
del format: UdA con sole risorse interne, con soggetti esterni, o entrambe.
"""
import json

# id -> (situazione, beneficiari, ambito)
SEZIONI = {
    # ==================== PRIMO ANNO ====================
    '1.1': ("Molti studenti non sanno quali servizi sociali e sanitari esistano nel comune in cui "
            "vivono, né a chi ci si rivolge quando una famiglia ha bisogno di aiuto.",
            "La classe e le famiglie degli studenti, cui la mappa viene consegnata.", 'interna'),
    '1.2': ("Una classe prima appena formata deve darsi regole di convivenza e imparare a lavorare "
            "in gruppo: nessuno conosce ancora gli altri e i conflitti nascono per malintesi.",
            "Il gruppo classe, che adotta il patto e lo applica per tutto l'anno.", 'interna'),
    '1.3': ("Fra i ragazzi circolano stereotipi su nazionalità, genere, disabilità e aspetto fisico "
            "che condizionano le relazioni senza essere mai messi in discussione.",
            "Gli studenti dell'istituto, destinatari della campagna.", 'interna'),
    '1.4': ("Gli studenti conoscono i bisogni della propria età e danno per scontato che siano gli "
            "stessi per tutti: bambini e anziani restano un territorio inesplorato.",
            "Il gruppo classe e le persone intervistate, cui si restituisce l'esito.", 'mista'),
    '1.5': ("La salute viene comunemente intesa come semplice assenza di malattia, mentre nei "
            "servizi socio-sanitari si lavora su una definizione ben più ampia.",
            "Il gruppo classe, che costruisce il lessico di base dell'indirizzo.", 'interna'),
    '1.6': ("L'edificio scolastico presenta rischi concreti che gli studenti attraversano ogni "
            "giorno senza riconoscerli.",
            "La classe e il servizio di prevenzione e protezione dell'istituto, cui il decalogo "
            "viene consegnato.", 'interna'),
    '1.7': ("Chi avrebbe bisogno di un servizio spesso non sa che esiste, o non ne conosce "
            "destinatari e modalità di accesso.",
            "Le persone che potrebbero rivolgersi a quel servizio, tramite la diffusione del "
            "volantino a scuola e nel quartiere.", 'mista'),
    '1.8': ("Far giocare un gruppo sembra facile finché non lo si prova: senza obiettivo, regole "
            "e tempi definiti l'attività si disperde.",
            "Il gruppo classe, che partecipa al gioco condotto dai compagni.", 'interna'),
    '1.9': ("Sulla classe circolano opinioni — su abitudini, tempo libero, uso del telefono — che "
            "nessuno ha mai verificato con dati.",
            "Il gruppo classe e il consiglio di classe, cui si presentano i risultati.", 'interna'),

    # ==================== SECONDO ANNO ====================
    '2.1': ("La mappa costruita al primo anno è parziale e su carta: alle famiglie del territorio "
            "manca uno strumento aggiornato e consultabile per orientarsi fra i servizi.",
            "Le famiglie e i cittadini del comune, tramite la pubblicazione della mappa.", 'esterna'),
    '2.2': ("Ogni settembre le classi prime arrivano senza conoscere nessuno e l'istituto non ha "
            "un'accoglienza organizzata dagli studenti.",
            "Gli studenti delle classi prime e le loro famiglie.", 'interna'),
    '2.3': ("Nell'istituto convivono ragazzi di provenienze diverse, ma le occasioni per raccontare "
            "quelle differenze sono rare e la comunicazione resta fra gruppi separati.",
            "La comunità scolastica, tramite il canale ufficiale dell'istituto.", 'interna'),
    '2.4': ("Alimentazione, sonno e movimento cambiano molto con l'età, e le abitudini scorrette "
            "si consolidano proprio quando nessuno le mette in discussione.",
            "Le famiglie degli studenti, destinatarie della guida.", 'mista'),
    '2.5': ("Quando in famiglia si presenta una malattia, spesso non si sa chi fa che cosa fra "
            "medico di base, servizi sociali, ospedale e assistenza domiciliare.",
            "Il gruppo classe; l'elaborato resta come materiale di studio per le classi successive.",
            'interna'),
    '2.6': ("Gli incidenti domestici sono la prima causa di infortunio per bambini e anziani, e "
            "avvengono quasi sempre per rischi che si potevano rimuovere.",
            "Le famiglie del territorio, cui l'opuscolo viene distribuito.", 'esterna'),
    '2.7': ("Consultori, sportelli d'ascolto e spazi giovani esistono, ma gli adolescenti che ne "
            "avrebbero bisogno non sanno dove siano né che cosa offrano.",
            "Gli studenti dell'istituto, tramite la diffusione della guida.", 'interna'),
    '2.8': ("All'open day l'istituto accoglie famiglie con bambini piccoli che restano ad aspettare "
            "senza nulla da fare mentre i genitori visitano la scuola.",
            "I bambini e le famiglie in visita all'istituto.", 'esterna'),
    '2.9': ("Di una realtà sociale del territorio si parla per impressioni: mancano i numeri per "
            "capire quante persone riguarda e con quali caratteristiche.",
            "Il gruppo classe e il servizio o l'associazione che ha fornito i dati.", 'mista'),

    # ==================== TERZO ANNO ====================
    '3.1': ("Rilevare un bisogno non basta: nei servizi il bisogno va tradotto in un progetto "
            "scritto, con obiettivi, azioni, responsabili e tempi.",
            "Caso simulato; il progetto è valutato da un operatore dei servizi invitato in classe.",
            'mista'),
    '3.2': ("Nei servizi le decisioni non si prendono da soli: figure professionali diverse devono "
            "confrontarsi su uno stesso caso e arrivare a una scelta comune.",
            "Caso simulato; il verbale prodotto è il documento su cui si valuta il lavoro.", 'interna'),
    '3.3': ("Il primo colloquio decide se una persona tornerà: un errore di accoglienza allontana "
            "chi aveva già faticato a chiedere aiuto.",
            "Caso simulato con utenti-tipo diversi per età, cultura e condizione.", 'interna'),
    '3.4': ("Nella prima infanzia osservazione e accudimento richiedono strumenti precisi e il "
            "rispetto rigoroso di norme igieniche.",
            "I bambini e le educatrici del nido o della scuola dell'infanzia partner.", 'esterna'),
    '3.5': ("Sui temi della prevenzione circolano in rete informazioni contraddittorie, e i "
            "comportamenti a rischio si formano proprio in questa età.",
            "Gli studenti dell'istituto, destinatari della campagna.", 'interna'),
    '3.6': ("I laboratori dell'indirizzo espongono a rischi specifici che vanno rilevati e "
            "segnalati con le procedure previste, non a voce.",
            "L'istituto e il responsabile del servizio di prevenzione, cui va il report formale.",
            'interna'),
    '3.7': ("Sapere che un servizio esiste non serve se non si sa come accedervi: requisiti, "
            "documenti e tempi di attesa sono il vero ostacolo per l'utente.",
            "Gli utenti dei servizi e gli operatori che li orientano.", 'esterna'),
    '3.8': ("I bambini della scuola dell'infanzia e primaria hanno bisogno di attività pensate per "
            "la loro età, non di intrattenimento improvvisato.",
            "I bambini della scuola partner e le loro insegnanti.", 'esterna'),
    '3.9': ("Dipendenze, uso problematico del digitale e affettività riguardano da vicino gli "
            "studenti dell'istituto, ma se ne parla solo quando è già successo qualcosa.",
            "Gli studenti dell'istituto e il referente per la salute.", 'interna'),
    '3.10': ("I dati su una realtà sociale vanno raccolti e trattati rispettando regole precise: "
             "un'osservazione fatta male produce informazioni inutili o illecite.",
             "Il servizio o l'associazione osservata, cui si restituisce il dossier.", 'mista'),

    # ==================== QUARTO ANNO ====================
    '4.1': ("Un progetto sociale non si regge sulle buone intenzioni: senza gestione amministrativa "
            "corretta i finanziamenti non arrivano o vanno restituiti.",
            "Progetto simulato; la documentazione è verificata secondo la modulistica reale.",
            'interna'),
    '4.2': ("Portare un caso in équipe richiede di selezionare le informazioni rilevanti e di "
            "esporle in modo che gli altri professionisti possano decidere.",
            "Équipe simulata composta dai compagni nei diversi ruoli professionali.", 'interna'),
    '4.3': ("Nella relazione d'aiuto ciò che si dice conta meno di come lo si dice: le distorsioni "
            "comunicative passano inosservate a chi non ha strumenti per rilevarle.",
            "Caso simulato; le griglie prodotte restano come strumento di lavoro per il PCTO.",
            'interna'),
    '4.4': ("La disabilità non si affronta con un intervento uguale per tutti: serve una "
            "valutazione multidimensionale che parta dalla persona e non dalla diagnosi.",
            "Caso reale anonimizzato fornito da un servizio del territorio, o simulato.", 'mista'),
    '4.5': ("Una persona parzialmente non autosufficiente conserva capacità che un'assistenza mal "
            "impostata annulla, accelerando la perdita di autonomia.",
            "Caso simulato, in raccordo con il laboratorio OSS.", 'interna'),
    '4.6': ("La casa in cui una persona fragile ha sempre vissuto diventa, con il tempo, il luogo "
            "più pericoloso per lei.",
            "Caso simulato; il progetto è presentato a un operatore dell'assistenza domiciliare.",
            'mista'),
    '4.7': ("Chi si presenta a uno sportello non sa quasi mai di quale servizio ha bisogno: sa solo "
            "raccontare un problema, e va instradato correttamente.",
            "Casi-tipo simulati; lo sportello è aperto ai compagni delle altre classi.", 'interna'),
    '4.8': ("Adulti, anziani e persone con disabilità nei servizi hanno bisogni di animazione "
            "diversi fra loro, che vanno rilevati prima di progettare.",
            "Gli utenti della struttura ospitante il PCTO.", 'esterna'),
    '4.9': ("L'inclusione sociale si dichiara facilmente e si progetta con difficoltà: servono "
            "azioni concrete sui tre livelli di prevenzione.",
            "Caso reale anonimizzato o simulato; il progetto è discusso con un operatore.", 'mista'),
    '4.10': ("Chi decide come impiegare le risorse di un servizio ha bisogno di dati elaborati e "
             "presentati in linguaggio tecnico, non di impressioni.",
             "Il servizio o l'ente cui il report è indirizzato.", 'mista'),

    # ==================== QUINTO ANNO ====================
    '5.1': ("Un servizio alla persona sta in piedi solo se bisogni, risorse, rete e rendicontazione "
            "reggono insieme: basta che manchi un pezzo perché il progetto non parta.",
            "Servizio simulato; il progetto è presentato a un responsabile del settore.", 'mista'),
    '5.2': ("Nel case management il coordinamento fra professionisti diversi è la parte più "
            "difficile: ruoli poco chiari e leadership mal esercitata bloccano la presa in carico.",
            "Caso simulato in équipe multi-professionale.", 'interna'),
    '5.3': ("In un servizio frequentato da utenti stranieri o con difficoltà cognitive la "
            "comunicazione ordinaria esclude proprio chi avrebbe più bisogno di capire.",
            "Gli utenti del servizio, tramite i materiali in linguaggio accessibile.", 'esterna'),
    '5.4': ("Un piano assistenziale scritto bene resta inutile finché non si traduce nelle attività "
            "concrete di ogni giornata.",
            "Caso simulato, riferito a un servizio realmente esistente sul territorio.", 'mista'),
    '5.5': ("Nelle situazioni di emergenza e nelle fasi terminali l'operatore deve saper agire "
            "subito e conoscere i dispositivi che accompagnano la persona.",
            "Ambiente simulato; le prove pratiche sono valutate da personale sanitario.", 'mista'),
    '5.6': ("Restare nella propria casa è ciò che quasi tutti desiderano, ma senza adattamenti e "
            "ausili adeguati l'abitazione costringe all'istituzionalizzazione.",
            "Caso simulato; il progetto di adattamento è valutato da un tecnico o terapista.",
            'mista'),
    '5.7': ("Le carte dei servizi esistenti sono scritte per l'amministrazione, non per chi deve "
            "scegliere: diritti e criteri di qualità restano illeggibili.",
            "Gli utenti del servizio e le loro famiglie.", 'esterna'),
    '5.8': ("Le associazioni del territorio hanno idee e non risorse: un evento di animazione "
            "sociale richiede progettazione, fondi e valutazione degli esiti.",
            "La comunità locale e l'associazione o l'ente partner dell'evento.", 'esterna'),
    '5.9': ("Un caso complesso mette insieme bisogni sanitari, sociali, educativi e familiari che "
            "nessun singolo servizio può affrontare da solo.",
            "Caso simulato di livello esame di Stato; il progetto è valutato dal consiglio di "
            "classe.", 'interna'),
    '5.10': ("Un servizio che non misura i propri risultati non può migliorarli, né dimostrare di "
             "possedere i requisiti per l'accreditamento regionale.",
             "Il servizio o l'ente osservato, cui si consegna la relazione valutativa.", 'mista'),
}


def main():
    with open('data-uda.json') as f:
        dati = json.load(f)

    mancanti = []
    for u in dati['uda']:
        voce = SEZIONI.get(u['id'])
        if not voce:
            mancanti.append(u['id'])
            continue
        situazione, beneficiari, ambito = voce
        u['situazione'] = situazione
        u['prodotto'] = u['compito']      # il campo esistente descriveva già il prodotto
        u['beneficiari'] = beneficiari
        u['ambito'] = ambito

    dati['meta']['sezioniFormat'] = (
        'Le schede seguono il Format UDA IPSECOM per le sezioni 1, 3, 4, 5, 6, 7, 8, 9. '
        'Restano da completare: 2 contestualizzazione, 10 attività degli studenti con fasi e ore, '
        '11 attività di accompagnamento dei docenti, 12 prodotti in esito e documentazione, '
        '13 criteri per la valutazione e la certificazione, oltre a rubrica e scheda-consegne.'
    )

    with open('data-uda.json', 'w') as f:
        json.dump(dati, f, ensure_ascii=False, indent=2)

    # ---------------- riepilogo ----------------
    from collections import Counter
    print(f'Schede aggiornate: {len(dati["uda"]) - len(mancanti)} su {len(dati["uda"])}')
    if mancanti:
        print('SENZA SEZIONI 5 e 6:', mancanti)

    amb = Counter(u.get('ambito') for u in dati['uda'])
    print('\nambito delle UDA:')
    for k, v in amb.most_common():
        print(f'  {k}: {v}')

    esterne = [u for u in dati['uda'] if u.get('ambito') in ('esterna', 'mista')]
    print(f'\nUDA con beneficiari fuori dalla classe: {len(esterne)}/{len(dati["uda"])}')
    print('per anno:', sorted(Counter(u['anno'] for u in esterne).items()))

    lung = [len(u.get('situazione', '')) for u in dati['uda'] if u.get('situazione')]
    print(f'\nlunghezza della situazione: min {min(lung)}, media {round(sum(lung)/len(lung))}, max {max(lung)}')


if __name__ == '__main__':
    main()
