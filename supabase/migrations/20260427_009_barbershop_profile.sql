create table if not exists public.barbershop_profile (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Barbearia Premium',
  subtitle text default 'Studio Masculino',
  hero_title text default 'O Teu Estilo, A Nossa Maestria.',
  hero_description text default 'Reserve seu horário com exclusividade. Escolha o serviço, veja os horários disponíveis e finalize com Pix, Cartão ou pagamento presencial.',
  logo_url text default 'maquininha-logo.png',
  instagram_url text,
  whatsapp_number text default '5511915723418',
  pix_key text default '5511915723418',
  address text default 'Rua Exemplo, 123 — Centro',
  city text default 'Sao Paulo',
  payment_pix_enabled boolean not null default true,
  payment_card_enabled boolean not null default true,
  payment_onsite_enabled boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_barbershop_profile_updated_at on public.barbershop_profile;

create trigger set_barbershop_profile_updated_at
before update on public.barbershop_profile
for each row
execute function public.set_updated_at();

alter table public.barbershop_profile enable row level security;

drop policy if exists "Anyone can view active barbershop profile" on public.barbershop_profile;
drop policy if exists "Admins can view all barbershop profiles" on public.barbershop_profile;
drop policy if exists "Admins can insert barbershop profiles" on public.barbershop_profile;
drop policy if exists "Admins can update barbershop profiles" on public.barbershop_profile;
drop policy if exists "Admins can delete barbershop profiles" on public.barbershop_profile;

create policy "Anyone can view active barbershop profile"
on public.barbershop_profile
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can view all barbershop profiles"
on public.barbershop_profile
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

create policy "Admins can insert barbershop profiles"
on public.barbershop_profile
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

create policy "Admins can update barbershop profiles"
on public.barbershop_profile
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

create policy "Admins can delete barbershop profiles"
on public.barbershop_profile
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

insert into public.barbershop_profile (
  name,
  subtitle,
  hero_title,
  hero_description,
  logo_url,
  instagram_url,
  whatsapp_number,
  pix_key,
  address,
  city,
  payment_pix_enabled,
  payment_card_enabled,
  payment_onsite_enabled,
  is_active
)
select
  'Barbearia Premium',
  'Studio Masculino',
  'O Teu Estilo, A Nossa Maestria.',
  'Reserve seu horário com exclusividade. Escolha o serviço, veja os horários disponíveis e finalize com Pix, Cartão ou pagamento presencial.',
  'maquininha-logo.png',
  null,
  '5511915723418',
  '5511915723418',
  'Rua Exemplo, 123 — Centro',
  'Sao Paulo',
  true,
  true,
  true,
  true
where not exists (
  select 1 from public.barbershop_profile
);
