-- Votazione collegiale unica delle UDA con valutazione da 1 a 5 stelle.
--
-- La rosa non viene composta nell'interfaccia: contiene soltanto le UDA già
-- individuate collegialmente. Finché la rosa non viene comunicata, non viene
-- creata alcuna riga e il sito mostra che la votazione non è disponibile.
--
-- Esempi di riferimenti ammessi:
--   asse:1.1
--   trasversale:T3.2
--
-- L'accesso diretto dai client resta chiuso. Legge e scrive soltanto la
-- funzione Edge curricolo-uda-revisioni tramite service_role.

create table if not exists public.curricolo_uda_votazione_stelle (
    id smallint primary key check (id = 1),
    rosa text[] not null check (
        cardinality(rosa) between 1 and 30
        and array_position(rosa, null) is null
    ),
    stato text not null default 'preparazione'
        check (stato in ('preparazione', 'aperta', 'chiusa')),
    aperta_il timestamptz,
    chiusa_il timestamptz,
    updated_at timestamptz not null default now()
);

comment on table public.curricolo_uda_votazione_stelle is
    'Unica sessione di valutazione delle UDA: rosa deliberata e stato di apertura.';

alter table public.curricolo_uda_votazione_stelle enable row level security;
revoke all on table public.curricolo_uda_votazione_stelle from anon, authenticated;
grant select, insert, update, delete on table public.curricolo_uda_votazione_stelle to service_role;

drop policy if exists "nessun accesso client alla votazione UDA a stelle"
    on public.curricolo_uda_votazione_stelle;
create policy "nessun accesso client alla votazione UDA a stelle"
    on public.curricolo_uda_votazione_stelle for all to anon, authenticated
    using (false) with check (false);

create table if not exists public.curricolo_uda_valutazioni (
    votazione_id smallint not null references public.curricolo_uda_votazione_stelle(id) on delete cascade,
    uda_ref text not null check (
        uda_ref ~ '^(asse:[1-5]\.[0-9]+|trasversale:T[1-5]\.[0-9]+)$'
    ),
    author_name text not null check (author_name in (
        'Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca',
        'Prof.ssa Cossu', 'Prof.ssa Preite', 'Prof.ssa Sanna',
        'Prof.ssa Onnis', 'Prof. Carlo Cossu', 'Prof.ssa Celina Murgia',
        'Prof.ssa Isabella Urru'
    )),
    valutazione smallint not null check (valutazione between 1 and 5),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (votazione_id, uda_ref, author_name)
);

comment on table public.curricolo_uda_valutazioni is
    'Valutazione da 1 a 5 assegnata da ciascun docente a ogni UDA della rosa.';

create index if not exists curricolo_uda_valutazioni_risultati_idx
    on public.curricolo_uda_valutazioni (votazione_id, uda_ref);

alter table public.curricolo_uda_valutazioni enable row level security;
revoke all on table public.curricolo_uda_valutazioni from anon, authenticated;
grant select, insert, update, delete on table public.curricolo_uda_valutazioni to service_role;

drop policy if exists "nessun accesso client alle valutazioni UDA"
    on public.curricolo_uda_valutazioni;
create policy "nessun accesso client alle valutazioni UDA"
    on public.curricolo_uda_valutazioni for all to anon, authenticated
    using (false) with check (false);

-- Non inserire qui una rosa provvisoria. Quando le UDA saranno state decise
-- collegialmente, creare o aggiornare l'unica riga id = 1 con i riferimenti
-- esatti e stato = 'aperta'.
