create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  commission_percent numeric(5, 2) not null default 0 check (commission_percent >= 0 and commission_percent <= 100),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_professionals_updated_at on public.professionals;

create trigger set_professionals_updated_at
before update on public.professionals
for each row
execute function public.set_updated_at();

alter table public.professionals enable row level security;

drop policy if exists "Anyone can view active professionals" on public.professionals;
drop policy if exists "Admins can view all professionals" on public.professionals;
drop policy if exists "Admins can insert professionals" on public.professionals;
drop policy if exists "Admins can update professionals" on public.professionals;
drop policy if exists "Admins can delete professionals" on public.professionals;

create policy "Anyone can view active professionals"
on public.professionals
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can view all professionals"
on public.professionals
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

create policy "Admins can insert professionals"
on public.professionals
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

create policy "Admins can update professionals"
on public.professionals
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

create policy "Admins can delete professionals"
on public.professionals
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

insert into public.professionals (
  name,
  phone,
  email,
  commission_percent,
  is_active,
  sort_order,
  notes
)
select
  'Profissional padrão',
  null,
  null,
  0,
  true,
  1,
  'Profissional inicial para testes.'
where not exists (
  select 1 from public.professionals
);
