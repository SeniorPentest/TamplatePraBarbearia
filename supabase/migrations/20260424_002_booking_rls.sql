-- =========================================================
-- Booking RLS (Commit 1)
-- =========================================================

-- Função central para checagem de admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Enable RLS
alter table public.admin_users enable row level security;
alter table public.business_settings enable row level security;
alter table public.appointments enable row level security;
alter table public.blocked_slots enable row level security;

-- =========================================================
-- admin_users
-- =========================================================
create policy "admin_users_select_admin_only"
on public.admin_users
for select
to authenticated
using (public.is_admin());

create policy "admin_users_insert_admin_only"
on public.admin_users
for insert
to authenticated
with check (public.is_admin());

create policy "admin_users_delete_admin_only"
on public.admin_users
for delete
to authenticated
using (public.is_admin());

-- =========================================================
-- business_settings
-- leitura pública e escrita só admin
-- =========================================================
create policy "business_settings_select_public"
on public.business_settings
for select
to anon, authenticated
using (true);

create policy "business_settings_update_admin_only"
on public.business_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "business_settings_insert_admin_only"
on public.business_settings
for insert
to authenticated
with check (public.is_admin());

create policy "business_settings_delete_admin_only"
on public.business_settings
for delete
to authenticated
using (public.is_admin());

-- =========================================================
-- appointments
-- Sem DELETE (cancelamento lógico via booking_status)
-- INSERT apenas authenticated/admin
-- =========================================================
create policy "appointments_insert_authenticated_own"
on public.appointments
for insert
to authenticated
with check (user_id = auth.uid());

create policy "appointments_insert_admin"
on public.appointments
for insert
to authenticated
with check (public.is_admin());

create policy "appointments_select_own"
on public.appointments
for select
to authenticated
using (user_id = auth.uid());

create policy "appointments_select_admin"
on public.appointments
for select
to authenticated
using (public.is_admin());

create policy "appointments_update_admin"
on public.appointments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =========================================================
-- blocked_slots
-- leitura pública (necessária para disponibilidade)
-- escrita só admin
-- =========================================================
create policy "blocked_slots_select_public"
on public.blocked_slots
for select
to anon, authenticated
using (true);

create policy "blocked_slots_insert_admin_only"
on public.blocked_slots
for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid());

create policy "blocked_slots_update_admin_only"
on public.blocked_slots
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "blocked_slots_delete_admin_only"
on public.blocked_slots
for delete
to authenticated
using (public.is_admin());
