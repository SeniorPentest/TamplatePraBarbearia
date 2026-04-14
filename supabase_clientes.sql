-- Tabela de clientes vinculada ao usuário autenticado
create table if not exists public.clientes (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  pontos integer not null default 0
);

-- Ativa RLS e permite que cada usuário veja apenas seu próprio registro
alter table public.clientes enable row level security;

create policy "Clientes select own row"
  on public.clientes
  for select
  using (id = auth.uid());
