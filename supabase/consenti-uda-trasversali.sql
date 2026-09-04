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

create table if not exists private.curricolo_uda_revision_permissions (
    author_name text primary key,
    can_manage_status boolean not null default false,
    updated_at timestamptz not null default now()
);
alter table private.curricolo_uda_revision_permissions enable row level security;
revoke all on table private.curricolo_uda_revision_permissions from public, anon, authenticated;

create or replace function public.verifica_curricolo_uda_gestione_stati(p_author_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(
        (
            select permissions.can_manage_status
            from private.curricolo_uda_revision_permissions as permissions
            where permissions.author_name = p_author_name
        ),
        false
    );
$$;
revoke all on function public.verifica_curricolo_uda_gestione_stati(text) from public, anon, authenticated;
grant execute on function public.verifica_curricolo_uda_gestione_stati(text) to service_role;
