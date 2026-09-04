-- Estende l'area collegiale alle UDA trasversali e FSL già pubblicate e alle nuove proposte.
-- Va applicata prima di distribuire la nuova linguetta e la nuova funzione Edge.

alter table public.curricolo_uda_revisioni
    drop constraint if exists curricolo_uda_revisioni_uda_key_check;

alter table public.curricolo_uda_revisioni
    add constraint curricolo_uda_revisioni_uda_key_check
    check (uda_key ~ '^([0-9]+\.[0-9]+|T[1-5]\.[0-9]+|FSL[3-5]\.[0-9]+|nuova-(t-|f-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');

alter table public.curricolo_uda_revisioni
    drop constraint if exists curricolo_uda_revisioni_author_name_check;

alter table public.curricolo_uda_revisioni
    add constraint curricolo_uda_revisioni_author_name_check
    check (author_name in (
        'Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca',
        'Prof.ssa Cossu', 'Prof.ssa Preite', 'Prof.ssa Sanna',
        'Prof.ssa Onnis', 'Prof. Carlo Cossu', 'Prof.ssa Celina Murgia',
        'Prof.ssa Isabella Urru'
    ));

alter table public.curricolo_uda_revision_sessions
    drop constraint if exists curricolo_uda_revision_sessions_author_name_check;

alter table public.curricolo_uda_revision_sessions
    add constraint curricolo_uda_revision_sessions_author_name_check
    check (author_name in (
        'Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca',
        'Prof.ssa Cossu', 'Prof.ssa Preite', 'Prof.ssa Sanna',
        'Prof.ssa Onnis', 'Prof. Carlo Cossu', 'Prof.ssa Celina Murgia',
        'Prof.ssa Isabella Urru'
    ));
