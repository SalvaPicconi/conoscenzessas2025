-- Votazione per la scelta delle UDA da attivare.
--
-- Ogni docente dispone di due voti per anno di corso fra le UDA d'asse e due
-- fra le trasversali, tanti quante sono le UDA da scegliere. Il voto vale uno:
-- non ci sono punteggi, vince chi ne raccoglie di più.
--
-- La classifica è consultiva. La scelta diventa ufficiale solo quando chi ha i
-- permessi di gestione la conferma, e resta registrata in una tabella a parte
-- con il nome di chi l'ha confermata e quando.
--
-- Come le altre tabelle del curricolo, l'accesso dai client è chiuso: si passa
-- soltanto dalla funzione Edge, che gira con la service role.

create table if not exists public.curricolo_uda_voti (
    uda_key text not null check (uda_key ~ '^([0-9]+\.[0-9]+|T[1-5]\.[0-9]+)$'),
    author_name text not null check (author_name in (
        'Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca',
        'Prof.ssa Cossu', 'Prof.ssa Preite', 'Prof.ssa Sanna',
        'Prof.ssa Onnis', 'Prof. Carlo Cossu', 'Prof.ssa Celina Murgia',
        'Prof.ssa Isabella Urru'
    )),
    anno smallint not null check (anno between 1 and 5),
    genere text not null check (genere in ('asse', 'trasversale')),
    created_at timestamptz not null default now(),
    primary key (uda_key, author_name)
);

comment on table public.curricolo_uda_voti is
    'Un voto per docente e per UDA. Il tetto di due voti per anno e genere è applicato dalla funzione Edge.';

-- Serve a contare i voti già spesi da un docente in un anno, il controllo più
-- frequente della funzione.
create index if not exists curricolo_uda_voti_budget_idx
    on public.curricolo_uda_voti (author_name, anno, genere);
create index if not exists curricolo_uda_voti_uda_idx
    on public.curricolo_uda_voti (uda_key);

alter table public.curricolo_uda_voti enable row level security;
revoke all on table public.curricolo_uda_voti from anon, authenticated;
grant select, insert, update, delete on table public.curricolo_uda_voti to service_role;

create policy "nessun accesso client ai voti curricolo"
    on public.curricolo_uda_voti for all to anon, authenticated
    using (false) with check (false);

create table if not exists public.curricolo_uda_scelte (
    anno smallint not null check (anno between 1 and 5),
    genere text not null check (genere in ('asse', 'trasversale')),
    uda_keys text[] not null default '{}'::text[] check (cardinality(uda_keys) <= 4),
    confermata_da text not null,
    updated_at timestamptz not null default now(),
    primary key (anno, genere)
);

comment on table public.curricolo_uda_scelte is
    'Scelta ufficiale delle UDA da attivare, confermata da chi ha i permessi di gestione.';

alter table public.curricolo_uda_scelte enable row level security;
revoke all on table public.curricolo_uda_scelte from anon, authenticated;
grant select, insert, update, delete on table public.curricolo_uda_scelte to service_role;

create policy "nessun accesso client alle scelte curricolo"
    on public.curricolo_uda_scelte for all to anon, authenticated
    using (false) with check (false);
