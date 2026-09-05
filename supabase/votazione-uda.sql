-- Votazione per la scelta delle UDA da attivare.
--
-- Si vota in due tempi. Prima chi ha i permessi di gestione mette al voto una
-- rosa di UDA, dopo la consultazione collegiale: senza quel passaggio si
-- voterebbe su dieci schede che nessuno ha discusso. Poi ogni docente assegna
-- una preferenza da 1 a 5 alle UDA della rosa, quante ne vuole. Alla fine la
-- scelta viene confermata e resta registrata con il nome di chi l'ha decisa.
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

drop policy if exists "nessun accesso client alla votazione curricolo" on public.curricolo_uda_votazione;
create policy "nessun accesso client alla votazione curricolo"
    on public.curricolo_uda_votazione for all to anon, authenticated
    using (false) with check (false);

-- Il voto era un sì o un niente, con un tetto di due preferenze per anno.
-- Contare quante volte una UDA era stata scelta non diceva però quanto la si
-- volesse, e obbligava a spendere i due voti alla cieca. Ora ogni riga porta
-- una preferenza da 1 a 5 e non c'è più un tetto: si esprime un giudizio su
-- ogni UDA della rosa, e la classifica si legge sulla media.
--
-- La tabella si rifà invece di migrarla perché non ha mai raccolto un voto: la
-- colonna nuova sarebbe partita con un valore inventato per righe che non
-- esistono.
drop table if exists public.curricolo_uda_voti;

create table public.curricolo_uda_voti (
    uda_key text not null check (uda_key ~ '^([0-9]+\.[0-9]+|T[1-5]\.[0-9]+)$'),
    author_name text not null check (author_name in (
        'Prof. Picconi', 'Prof. Pinna', 'Prof.ssa Manca',
        'Prof.ssa Cossu', 'Prof.ssa Preite', 'Prof.ssa Sanna',
        'Prof.ssa Onnis', 'Prof. Carlo Cossu', 'Prof.ssa Celina Murgia',
        'Prof.ssa Isabella Urru'
    )),
    anno smallint not null check (anno between 1 and 5),
    genere text not null check (genere in ('asse', 'trasversale')),
    -- 1 non la attiverei · 2 poco convincente · 3 possibile · 4 buona proposta
    -- · 5 da attivare senz'altro
    punteggio smallint not null check (punteggio between 1 and 5),
    created_at timestamptz not null default now(),
    aggiornato_il timestamptz not null default now(),
    primary key (uda_key, author_name)
);

comment on table public.curricolo_uda_voti is
    'Una preferenza da 1 a 5 per docente e per UDA. L''appartenenza alla rosa e la chiusura della votazione sono applicate dalla funzione Edge.';
comment on column public.curricolo_uda_voti.punteggio is
    'Preferenza del docente, da 1 (non la attiverei) a 5 (da attivare senz''altro).';

-- Serve a calcolare la media di un anno, la lettura più frequente.
create index if not exists curricolo_uda_voti_scope_idx
    on public.curricolo_uda_voti (anno, genere);
create index if not exists curricolo_uda_voti_uda_idx
    on public.curricolo_uda_voti (uda_key);

alter table public.curricolo_uda_voti enable row level security;
revoke all on table public.curricolo_uda_voti from anon, authenticated;
grant select, insert, update, delete on table public.curricolo_uda_voti to service_role;

drop policy if exists "nessun accesso client ai voti curricolo" on public.curricolo_uda_voti;
create policy "nessun accesso client ai voti curricolo"
    on public.curricolo_uda_voti for all to anon, authenticated
    using (false) with check (false);
