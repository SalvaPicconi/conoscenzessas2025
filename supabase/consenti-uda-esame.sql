-- Estende l'area collegiale alle UDA di preparazione all'Esame di Stato E3.1…E5.2.
-- Le proposte restano separate dai file JSON pubblici.

alter table public.curricolo_uda_revisioni
    drop constraint if exists curricolo_uda_revisioni_uda_key_check;

alter table public.curricolo_uda_revisioni
    add constraint curricolo_uda_revisioni_uda_key_check
    check (uda_key ~ '^([0-9]+\.[0-9]+|U[1-5]\.[0-9]+[a-z]?|T[1-5]\.[0-9]+|FSL[3-5]\.[0-9]+|E[3-5]\.[0-9]+|nuova-(t-|f-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');
