-- Votazione per la scelta delle UDA da attivare.
--
-- Si vota in due tempi. Prima chi ha i permessi di gestione mette al voto una
-- rosa di UDA, dopo la consultazione collegiale: senza quel passaggio si
-- voterebbe su dieci schede che nessuno ha discusso. Poi i docenti votano
-- soltanto dentro la rosa, un voto a testa per UDA e due voti per anno di
-- corso, tanti quante sono le UDA da attivare. Alla fine la scelta viene
-- confermata e resta registrata con il nome di chi l'ha decisa.
--
-- Come le altre tabelle del curricolo l'accesso dai client è chiuso: si passa
-- soltanto dalla funzione Edge, che gira con la service role.

-- Struttura precedente, senza la fase della rosa. La votazione non è mai
-- entrata in uso, quindi si può sostituire invece di migrarla.
drop table if exists public.curricolo_uda_scelte;

create table if not exists public.curricolo_uda_votazione (
    anno smallint not null check (anno between 1 and 5),
    genere text not null check (genere in ('asse', 'trasversale')),
    -- Rosa vuota significa votazione non ancora aperta.
    rosa text[] not null default '{}'::text[] check (cardinality(rosa) <= 12),
    scelta text[] not null default '{}'::text[] check (cardinality(scelta) <= 4),
    aperta_da text,
    aperta_il timestamptz,
    confermata_da text,
    confermata_il timestamptz,
    primary key (anno, genere)
);

comment on table public.curricolo_uda_votazione is
    'Stato della votazione per anno e genere: rosa messa al voto, scelta finale e chi ha fatto cosa.';

alter table public.curricolo_uda_votazione enable row level security;
revoke all on table public.curricolo_uda_votazione from anon, authenticated;
grant select, insert, update, delete on table public.curricolo_uda_votazione to service_role;

create policy "nessun accesso client alla votazione curricolo"
    on public.curricolo_uda_votazione for all to anon, authenticated
    using (false) with check (false);

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
    'Un voto per docente e per UDA. Il tetto di due voti per anno e l''appartenenza alla rosa sono applicati dalla funzione Edge.';

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
