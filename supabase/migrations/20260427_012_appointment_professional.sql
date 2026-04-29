alter table public.appointments
add column if not exists professional_id uuid references public.professionals(id) on delete set null;

create index if not exists appointments_professional_id_idx
on public.appointments (professional_id);

update public.appointments
set professional_id = (
  select p.id
  from public.professionals p
  where p.is_active = true
  order by p.sort_order asc, p.name asc
  limit 1
)
where professional_id is null;
