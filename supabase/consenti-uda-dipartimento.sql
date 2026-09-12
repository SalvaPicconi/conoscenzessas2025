-- Consente revisioni autonome delle UDA scelte dal Dipartimento.
-- Le chiavi DIP... e SIM... non coincidono con quelle dei cataloghi originali,
-- comprese le scelte del biennio DIP1-CIVICA e DIP2-TRASVERSALE:
-- una revisione salvata qui non può sovrascrivere una UDA FSL, d'asse o Esame.

alter table public.curricolo_uda_revisioni
    drop constraint if exists curricolo_uda_revisioni_uda_key_check;

alter table public.curricolo_uda_revisioni
    add constraint curricolo_uda_revisioni_uda_key_check
    check (uda_key ~ '^([0-9]+\.[0-9]+|U[1-5]\.[0-9]+[a-z]?|T[1-5]\.[0-9]+|FSL[3-5]\.[0-9]+|E[3-5]\.[0-9]+|DIP(1-CIVICA|2-TRASVERSALE|[3-5]-(FSL|ASSE))|SIM5-[12]|nuova-(t-|f-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');
