-- =========================================================
-- Booking Schema (Commit 1)
-- =========================================================
-- Objetivo: criar base de dados para agendamentos com prevenção de colisão,
-- configurações de funcionamento e estrutura de admins.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- =========================================================
-- Tipos
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method_t') then
    create type public.payment_method_t as enum ('pix', 'card');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status_t') then
    create type public.payment_status_t as enum (
      'pending',
      'approved',
      'rejected',
      'cancelled',
      'refunded'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_status_t') then
    create type public.booking_status_t as enum (
      'pending_payment',
      'confirmed',
      'cancelled_by_client',
      'cancelled_by_admin',
      'no_show',
      'completed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'business_mode_t') then
    create type public.business_mode_t as enum ('auto', 'open', 'closed');
  end if;
end $$;

comment on type public.business_mode_t is
'auto = segue horário normal; open = força aberto; closed = força fechado';

-- =========================================================
-- Helper para updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Admin users
-- =========================================================
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Usuários administradores do sistema';

-- =========================================================
-- Business settings (singleton)
-- =========================================================
create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),

  -- auto = segue horário normal
  -- open = força aberto
  -- closed = força fechado
  mode public.business_mode_t not null default 'auto',

  opening_time time not null default '08:00',
  closing_time time not null default '20:00',
  lunch_start time not null default '12:00',
  lunch_end time not null default '13:00',
  slot_duration_minutes integer not null default 45,
  timezone text not null default 'America/Sao_Paulo',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint business_settings_time_order_chk
    check (
      opening_time < closing_time
      and lunch_start < lunch_end
      and lunch_start >= opening_time
      and lunch_end <= closing_time
    ),

  constraint business_settings_slot_duration_chk
    check (slot_duration_minutes between 15 and 180),

  constraint business_settings_timezone_chk
    check (timezone = 'America/Sao_Paulo')
);

comment on table public.business_settings is 'Configuração global de funcionamento da barbearia';
comment on column public.business_settings.mode is
'auto = segue horário normal; open = força aberto; closed = força fechado';

create unique index if not exists uq_business_settings_singleton
  on public.business_settings ((true));

insert into public.business_settings (mode)
select 'auto'::public.business_mode_t
where not exists (select 1 from public.business_settings);

create trigger trg_business_settings_updated_at
before update on public.business_settings
for each row execute function public.set_updated_at();

-- =========================================================
-- Appointments
-- =========================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),

  -- Vinculado ao usuário autenticado
  user_id uuid not null references auth.users(id) on delete restrict,

  client_name text not null,
  client_phone text null,

  -- Ex.: [{"name":"Corte","price":45}]
  selected_services jsonb not null default '[]'::jsonb,
  total_price numeric(10,2) not null check (total_price >= 0),

  appointment_start timestamptz not null,
  appointment_end timestamptz not null,

  payment_method public.payment_method_t not null,
  payment_status public.payment_status_t not null default 'pending',
  booking_status public.booking_status_t not null default 'pending_payment',

  mercado_pago_payment_id text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointments_time_order_chk
    check (appointment_end > appointment_start),

  constraint appointments_duration_45_chk
    check (
      (extract(epoch from (appointment_end - appointment_start)) / 60)::int % 45 = 0
    ),

  constraint appointments_services_array_chk
    check (jsonb_typeof(selected_services) = 'array')
);

comment on table public.appointments is 'Agendamentos dos clientes';

create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create index if not exists idx_appointments_start
  on public.appointments (appointment_start);

create index if not exists idx_appointments_status
  on public.appointments (booking_status, payment_status);

create index if not exists idx_appointments_user_id
  on public.appointments (user_id);

-- Impede sobreposição de agendamentos ativos
alter table public.appointments
  add constraint appointments_no_overlap_active_excl
  exclude using gist (
    tstzrange(appointment_start, appointment_end, '[)') with &&
  )
  where (booking_status in ('pending_payment', 'confirmed'));

create unique index if not exists uq_appointments_mp_payment_id
  on public.appointments (mercado_pago_payment_id)
  where mercado_pago_payment_id is not null;

-- =========================================================
-- Blocked slots
-- =========================================================
create table if not exists public.blocked_slots (
  id uuid primary key default gen_random_uuid(),

  slot_start timestamptz not null,
  slot_end timestamptz not null,

  reason text null,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint blocked_slots_time_order_chk
    check (slot_end > slot_start)
);

comment on table public.blocked_slots is 'Horários bloqueados manualmente pelo admin';

create index if not exists idx_blocked_slots_start
  on public.blocked_slots (slot_start);

-- Impede bloqueios sobrepostos/duplicados
alter table public.blocked_slots
  add constraint blocked_slots_no_overlap_excl
  exclude using gist (
    tstzrange(slot_start, slot_end, '[)') with &&
  );
