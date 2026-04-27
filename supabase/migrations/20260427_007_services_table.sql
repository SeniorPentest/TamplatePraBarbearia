create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  duration_minutes integer not null default 45 check (duration_minutes > 0),
  icon_url text,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_services_updated_at on public.services;

create trigger set_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

alter table public.services enable row level security;

drop policy if exists "Anyone can view active services" on public.services;
drop policy if exists "Admins can view all services" on public.services;
drop policy if exists "Admins can insert services" on public.services;
drop policy if exists "Admins can update services" on public.services;
drop policy if exists "Admins can delete services" on public.services;

create policy "Anyone can view active services"
on public.services
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can view all services"
on public.services
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

create policy "Admins can insert services"
on public.services
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

create policy "Admins can update services"
on public.services
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

create policy "Admins can delete services"
on public.services
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

insert into public.services (
  name,
  price,
  duration_minutes,
  icon_url,
  description,
  is_active,
  sort_order
)
values
  (
    'Corte + Barba',
    90.00,
    45,
    'assets/icons/corte-barba.svg',
    'Corte masculino com finalização de barba.',
    true,
    1
  ),
  (
    'Barba',
    55.00,
    45,
    'assets/icons/barba.svg',
    'Barba alinhada e finalizada.',
    true,
    2
  ),
  (
    'Corte Clássico',
    45.00,
    45,
    'assets/icons/corte.svg',
    'Corte masculino tradicional.',
    true,
    3
  ),
  (
    'Sobrancelha',
    15.00,
    45,
    'assets/icons/sobrancelha.svg',
    'Design e limpeza de sobrancelha.',
    true,
    4
  )
on conflict do nothing;
