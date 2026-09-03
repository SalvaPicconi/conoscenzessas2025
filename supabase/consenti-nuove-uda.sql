-- Estende l'area di revisione con bozze di UDA create da zero.
-- Le chiavi UUID distinguono queste proposte dalle 48 UDA pubbliche numerate.

alter table public.curricolo_uda_revisioni
    drop constraint if exists curricolo_uda_revisioni_uda_key_check;

alter table public.curricolo_uda_revisioni
    add constraint curricolo_uda_revisioni_uda_key_check
    check (uda_key ~ '^([0-9]+\.[0-9]+|nuova-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');
