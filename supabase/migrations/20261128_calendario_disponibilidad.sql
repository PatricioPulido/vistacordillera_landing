-- Calendario de disponibilidad del Depto 505.
-- Las fechas ocupadas vienen de los calendarios iCal de Airbnb/Booking (sincronizados por la
-- Edge Function "calendario") y de bloqueos manuales hechos desde /admin.
-- Las tablas son solo para el admin: el público ve las fechas a través de la función,
-- que nunca expone los links iCal ni las notas.

create table if not exists public.calendario_fuentes (
  id bigint generated always as identity primary key,
  nombre text not null,                -- "Airbnb", "Booking"
  url text not null default '',        -- link .ics (privado)
  activo boolean not null default true,
  ultimo_sync timestamptz,
  ultimo_ok timestamptz,
  ultimo_error text,
  creado timestamptz not null default now()
);

create table if not exists public.calendario_bloqueos (
  id bigint generated always as identity primary key,
  inicio date not null,                -- primera noche ocupada
  fin date not null,                   -- día de salida (no se cuenta como noche)
  origen text not null default 'manual' check (origen in ('manual', 'ical')),
  fuente_id bigint references public.calendario_fuentes(id) on delete cascade,
  nota text not null default '',
  creado timestamptz not null default now(),
  check (fin > inicio)
);
create index if not exists calendario_bloqueos_fin_idx on public.calendario_bloqueos (fin);
create index if not exists calendario_bloqueos_fuente_idx on public.calendario_bloqueos (fuente_id);

alter table public.calendario_fuentes enable row level security;
alter table public.calendario_bloqueos enable row level security;

drop policy if exists "calendario fuentes admin" on public.calendario_fuentes;
create policy "calendario fuentes admin" on public.calendario_fuentes
  for all to authenticated
  using ((select private.es_admin_landing()))
  with check ((select private.es_admin_landing()));

drop policy if exists "calendario bloqueos admin" on public.calendario_bloqueos;
create policy "calendario bloqueos admin" on public.calendario_bloqueos
  for all to authenticated
  using ((select private.es_admin_landing()))
  with check ((select private.es_admin_landing()));

-- Fuentes iniciales (sin link: se pegan desde /admin)
insert into public.calendario_fuentes (nombre)
select n from (values ('Airbnb'), ('Booking')) v(n)
where not exists (select 1 from public.calendario_fuentes);
