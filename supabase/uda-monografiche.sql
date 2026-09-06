-- Schema di attivazione, da applicare insieme all’Edge Function aggiornata.
-- Non applicato alla produzione durante la revisione locale.
begin;
create table if not exists public.curricolo_uda_idee (
 id uuid primary key,
 author_name text not null,
 titolo text not null check (char_length(titolo) between 1 and 300),
 profilo text not null default '' check (char_length(profilo) <= 3000),
 descrizione text not null check (char_length(descrizione) between 1 and 12000),
 attualita text not null default '' check (char_length(attualita) <= 5000),
 modalita text not null check (modalita in ('individuale','trasversale','da concordare')),
 collegamenti text not null default '' check (char_length(collegamenti) <= 5000),
 versione integer not null default 1 check (versione > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.curricolo_uda_idee_storia (
 id bigint generated always as identity primary key,
 idea_id uuid not null references public.curricolo_uda_idee(id),
 versione integer not null,
 autore text not null,
 contenuto jsonb not null,
 registrato_at timestamptz not null default now(),
 unique (idea_id, versione)
);
alter table public.curricolo_uda_idee enable row level security;
alter table public.curricolo_uda_idee_storia enable row level security;
revoke all on public.curricolo_uda_idee, public.curricolo_uda_idee_storia from anon, authenticated;
grant select, insert, update on public.curricolo_uda_idee to service_role;
grant select, insert on public.curricolo_uda_idee_storia to service_role;
grant usage, select on sequence public.curricolo_uda_idee_storia_id_seq to service_role;
create or replace function public.traccia_curricolo_uda_idea()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if TG_OP = 'UPDATE' and (NEW.author_name <> OLD.author_name or NEW.versione <> OLD.versione + 1) then
  raise exception 'Autore immutabile e versione progressiva richiesti';
 end if;
 insert into public.curricolo_uda_idee_storia(idea_id, versione, autore, contenuto)
 values (NEW.id, NEW.versione, NEW.author_name, to_jsonb(NEW));
 return NEW;
end;
$$;
revoke all on function public.traccia_curricolo_uda_idea() from public, anon, authenticated;
grant execute on function public.traccia_curricolo_uda_idea() to service_role;
drop trigger if exists curricolo_uda_idea_storia on public.curricolo_uda_idee;
create trigger curricolo_uda_idea_storia after insert or update on public.curricolo_uda_idee
for each row execute function public.traccia_curricolo_uda_idea();
commit;
