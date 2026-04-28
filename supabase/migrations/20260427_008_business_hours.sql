create table if not exists public.business_hours (
  weekday integer primary key check (weekday >= 0 and weekday <= 6),
  weekday_name text not null,
  is_open boolean not null default true,
  opening_time time not null default '08:00',
  closing_time time not null default '20:00',
  has_lunch_break boolean not null default true,
  lunch_start time not null default '12:00',
  lunch_end time not null default '13:00',
  slot_duration_minutes integer not null default 45 check (slot_duration_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_business_hours_updated_at on public.business_hours;

create trigger set_business_hours_updated_at
before update on public.business_hours
for each row
execute function public.set_updated_at();

alter table public.business_hours enable row level security;

drop policy if exists "Admins can view business hours" on public.business_hours;
drop policy if exists "Admins can insert business hours" on public.business_hours;
drop policy if exists "Admins can update business hours" on public.business_hours;
drop policy if exists "Admins can delete business hours" on public.business_hours;

create policy "Admins can view business hours"
on public.business_hours
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

create policy "Admins can insert business hours"
on public.business_hours
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

create policy "Admins can update business hours"
on public.business_hours
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

create policy "Admins can delete business hours"
on public.business_hours
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

insert into public.business_hours (
  weekday,
  weekday_name,
  is_open,
  opening_time,
  closing_time,
  has_lunch_break,
  lunch_start,
  lunch_end,
  slot_duration_minutes
)
values
  (0, 'Domingo', false, '08:00', '20:00', true, '12:00', '13:00', 45),
  (1, 'Segunda-feira', true, '08:00', '20:00', true, '12:00', '13:00', 45),
  (2, 'Terça-feira', true, '08:00', '20:00', true, '12:00', '13:00', 45),
  (3, 'Quarta-feira', true, '08:00', '20:00', true, '12:00', '13:00', 45),
  (4, 'Quinta-feira', true, '08:00', '20:00', true, '12:00', '13:00', 45),
  (5, 'Sexta-feira', true, '08:00', '20:00', true, '12:00', '13:00', 45),
  (6, 'Sábado', true, '08:00', '20:00', true, '12:00', '13:00', 45)
on conflict (weekday) do nothing;

create or replace function public.get_disponibilidade(p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  weekday_number int;
  config record;
  slot_start timestamptz;
  slot_end timestamptz;
  current_time_slot time;
  slots jsonb := '[]'::jsonb;
  slot_duration interval;
  has_conflict boolean;
begin
  perform public.expire_pending_appointments();

  weekday_number := extract(dow from p_date);

  select *
  into config
  from public.business_hours
  where weekday = weekday_number;

  if config is null then
    return jsonb_build_object(
      'status', 'closed',
      'date', p_date,
      'slots', '[]'::jsonb
    );
  end if;

  if config.is_open = false then
    return jsonb_build_object(
      'status', 'closed',
      'date', p_date,
      'slots', '[]'::jsonb
    );
  end if;

  slot_duration := make_interval(mins => config.slot_duration_minutes);
  current_time_slot := config.opening_time;

  while current_time_slot + slot_duration <= config.closing_time loop
    if not (
      config.has_lunch_break = true
      and current_time_slot >= config.lunch_start
      and current_time_slot < config.lunch_end
    ) then
      slot_start := (p_date::text || ' ' || current_time_slot::text || '-03')::timestamptz;
      slot_end := slot_start + slot_duration;

      select exists (
        select 1
        from public.appointments a
        where a.appointment_start < slot_end
          and a.appointment_end > slot_start
          and (
            a.booking_status in ('confirmed', 'completed', 'no_show')
            or (
              a.booking_status = 'pending_payment'
              and a.expires_at is not null
              and a.expires_at > now()
            )
          )
      )
      into has_conflict;

      if not has_conflict then
        slots := slots || jsonb_build_array(
          jsonb_build_object(
            'time', to_char(slot_start at time zone 'America/Sao_Paulo', 'HH24:MI'),
            'start', to_char(slot_start, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
            'end', to_char(slot_end, 'YYYY-MM-DD"T"HH24:MI:SSOF')
          )
        );
      end if;
    end if;

    current_time_slot := current_time_slot + slot_duration;
  end loop;

  return jsonb_build_object(
    'status', 'open',
    'date', p_date,
    'slots', slots
  );
end;
$$;
