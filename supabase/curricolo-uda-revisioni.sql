-- Area revisioni del Fascicolo UDA del Curricolo Verticale SSAS.
-- La password viene inserita separatamente nel database remoto e non è conservata in Git.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.curricolo_uda_revision_config (
    singleton boolean primary key default true check (singleton),
    password_hash text not null,
    updated_at timestamptz not null default now()
);
alter table private.curricolo_uda_revision_config enable row level security;
revoke all on table private.curricolo_uda_revision_config from public, anon, authenticated;

create policy "nessun accesso client alla configurazione curricolo"
    on private.curricolo_uda_revision_config for all to anon, authenticated
    using (false) with check (false);

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

create or replace function public.verifica_curricolo_uda_password(p_password text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(
        (
            select extensions.crypt(p_password, config.password_hash) = config.password_hash
            from private.curricolo_uda_revision_config as config
            where config.singleton
        ),
        false
    );
$$;

revoke all on function public.verifica_curricolo_uda_password(text) from public, anon, authenticated;
grant execute on function public.verifica_curricolo_uda_password(text) to service_role;

create table if not exists public.curricolo_uda_revisioni (
    id uuid primary key default gen_random_uuid(),
    uda_key text not null check (uda_key ~ '^([0-9]+\.[0-9]+|T[1-5]\.[0-9]+|FSL[3-5]\.[0-9]+|nuova-(t-|f-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'),
    author_name text not null check (author_name in (
        'Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca',
        'Prof.ssa Cossu', 'Prof.ssa Preite', 'Prof.ssa Sanna',
        'Prof.ssa Onnis', 'Prof. Carlo Cossu', 'Prof.ssa Celina Murgia',
        'Prof.ssa Isabella Urru'
    )),
    anno smallint not null check (anno between 1 and 5),
    titolo_uda text not null,
    originale jsonb not null default '{}'::jsonb check (jsonb_typeof(originale) = 'object'),
    modifiche jsonb not null default '{}'::jsonb check (jsonb_typeof(modifiche) = 'object'),
    nota_generale text not null default '',
    stato text not null default 'bozza' check (stato in ('bozza', 'approvata', 'applicata', 'archiviata')),
    source_version text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (nota_generale <> '' or modifiche <> '{}'::jsonb),
    unique (uda_key, author_name)
);

comment on table public.curricolo_uda_revisioni is
    'Proposte collegiali sulle UDA; non modificano direttamente il curricolo pubblico.';

create index if not exists curricolo_uda_revisioni_stato_idx
    on public.curricolo_uda_revisioni (stato, updated_at desc);
create index if not exists curricolo_uda_revisioni_autore_idx
    on public.curricolo_uda_revisioni (author_name, updated_at desc);

alter table public.curricolo_uda_revisioni enable row level security;
revoke all on table public.curricolo_uda_revisioni from anon, authenticated;
grant select, insert, update, delete on table public.curricolo_uda_revisioni to service_role;

create table if not exists public.curricolo_uda_revision_sessions (
    token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
    author_name text not null check (author_name in (
        'Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca',
        'Prof.ssa Cossu', 'Prof.ssa Preite', 'Prof.ssa Sanna',
        'Prof.ssa Onnis', 'Prof. Carlo Cossu', 'Prof.ssa Celina Murgia',
        'Prof.ssa Isabella Urru'
    )),
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

comment on table public.curricolo_uda_revision_sessions is
    'Sessioni temporanee: conserva soltanto hash SHA-256 dei token.';

alter table public.curricolo_uda_revision_sessions enable row level security;
revoke all on table public.curricolo_uda_revision_sessions from anon, authenticated;
grant select, insert, update, delete on table public.curricolo_uda_revision_sessions to service_role;

create policy "nessun accesso client alle revisioni curricolo"
    on public.curricolo_uda_revisioni for all to anon, authenticated
    using (false) with check (false);

create policy "nessun accesso client alle sessioni curricolo"
    on public.curricolo_uda_revision_sessions for all to anon, authenticated
    using (false) with check (false);
