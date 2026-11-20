-- ============================================================================
-- Réservations atomiques, liste d'attente (mercredis + vacances) et notifications
--
-- Fonctionnement de la liste d'attente :
--   1. Un jour est complet pour le groupe de l'enfant → la famille peut
--      l'inscrire sur la liste d'attente (join_waitlist). Ordre = date d'inscription.
--   2. Dès qu'une place se libère (réservation supprimée / annulée, ou capacité
--      augmentée par l'admin), le premier enfant de la file est RÉSERVÉ
--      AUTOMATIQUEMENT, sans confirmation.
--   3. Une notification est créée pour la famille (visible sur le site) et un
--      email lui est envoyé (fonction Edge send-notifications), avec copie au
--      secrétariat. Pour annuler, la famille écrit au secrétariat.
--   4. Les réservations automatiques s'arrêtent avant le jour J
--      (global_settings.waitlist_cutoff_hours, par défaut la veille à midi).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('wednesday', 'holiday')),
  child_id uuid not null references public.children(id),
  wednesday_id uuid references public.available_wednesdays(id) on delete cascade,
  period_id uuid references public.available_holiday_periods(id) on delete cascade,
  date date not null,
  class_group public.school_class_group not null,
  without_meal boolean not null default false,
  early_dropoff boolean not null default false,
  status text not null default 'waiting'
    check (status in ('waiting', 'booked', 'cancelled', 'expired')),
  reservation_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  booked_at timestamptz,
  cancelled_at timestamptz,
  check ((kind = 'wednesday' and wednesday_id is not null and period_id is null)
      or (kind = 'holiday' and period_id is not null and wednesday_id is null))
);
create unique index waitlist_entries_one_active
  on public.waitlist_entries (child_id, kind, date) where status = 'waiting';
create index waitlist_entries_queue
  on public.waitlist_entries (kind, coalesce(wednesday_id, period_id), date, class_group, created_at)
  where status = 'waiting';
create index waitlist_entries_child on public.waitlist_entries (child_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  -- Envoi de l'email (traité par la fonction Edge send-notifications)
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed', 'skipped')),
  email_attempts integer not null default 0,
  email_sent_at timestamptz,
  email_error text
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_email_pending_idx on public.notifications (created_at) where email_status = 'pending';

alter table public.waitlist_entries enable row level security;
alter table public.notifications enable row level security;

create policy "waitlist_select_own_or_admin" on public.waitlist_entries for select to authenticated
  using (public.is_admin(auth.uid())
         or exists (select 1 from public.children c where c.id = child_id and c.profile_id = auth.uid()));
-- Écriture : uniquement via les fonctions join_waitlist / leave_waitlist (ou admin)
create policy "waitlist_admin_write" on public.waitlist_entries for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "notifications_select_own_or_admin" on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Outils internes
-- ---------------------------------------------------------------------------
create or replace function public.new_reservation_number(p_prefix text)
returns text
language sql volatile
as $$
  select p_prefix || '-' || to_char(now() at time zone 'Europe/Paris', 'YYMMDDHH24MISS')
         || '-' || upper(substr(md5(random()::text), 1, 4));
$$;

-- Verrou par créneau (jour + groupe) : sérialise réservations et liste d'attente
create or replace function public.lock_slot(p_kind text, p_target uuid, p_date date, p_group public.school_class_group)
returns void
language sql volatile
as $$
  select pg_advisory_xact_lock(hashtextextended(p_kind || ':' || p_target || ':' || p_date || ':' || p_group, 0));
$$;

create or replace function public.can_manage_child(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin(auth.uid())
      or exists (select 1 from public.children c where c.id = p_child_id and c.profile_id = auth.uid());
$$;

create or replace function public.is_date_closed(p_date date)
returns boolean
language sql stable set search_path = public
as $$
  select exists (select 1 from public.closed_periods cp where p_date between cp.start_date and cp.end_date);
$$;

-- La liste d'attente est-elle encore active pour ce jour ?
create or replace function public.waitlist_is_open(p_date date)
returns boolean
language sql stable set search_path = public
as $$
  select coalesce(gs.waitlist_enabled, true)
     and now() < ((p_date::timestamp - make_interval(hours => coalesce(gs.waitlist_cutoff_hours, 12)))
                  at time zone 'Europe/Paris')
  from (select 1) one
  left join lateral (select * from public.global_settings order by created_at limit 1) gs on true;
$$;

-- ---------------------------------------------------------------------------
-- Réservations atomiques
--   Retour : { status: 'booked' | 'full' | 'already_booked' | 'closed' | 'not_allowed',
--              reservation_id, reservation_number, spots_left }
-- ---------------------------------------------------------------------------
create or replace function public.book_wednesday(
  p_child_id uuid,
  p_wednesday_id uuid,
  p_without_meal boolean default false,
  p_early_dropoff boolean default false,
  p_reservation_number text default null
)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_class text;
  v_group public.school_class_group;
  v_date date;
  v_left integer;
  v_id uuid;
  v_number text := coalesce(p_reservation_number, public.new_reservation_number('MER'));
begin
  if not public.can_manage_child(p_child_id) then
    raise exception 'Enfant introuvable ou non autorisé' using errcode = '42501';
  end if;

  select school_class into v_class from public.children where id = p_child_id;
  select date into v_date from public.available_wednesdays where id = p_wednesday_id;
  if v_date is null then
    return jsonb_build_object('status', 'not_allowed', 'reason', 'Mercredi introuvable');
  end if;
  if public.is_date_closed(v_date) then
    return jsonb_build_object('status', 'closed');
  end if;

  v_group := public.get_wednesday_class_group(v_class);
  if v_group is null then
    return jsonb_build_object('status', 'not_allowed', 'reason', 'Classe non accueillie le mercredi');
  end if;

  perform public.lock_slot('wednesday', p_wednesday_id, v_date, v_group);

  if exists (select 1 from public.wednesday_reservations
             where child_id = p_child_id and wednesday_id = p_wednesday_id and status = 'confirmed') then
    return jsonb_build_object('status', 'already_booked');
  end if;

  v_left := coalesce(public.wednesday_capacity(p_wednesday_id, v_group), 0)
            - public.wednesday_reserved_count(p_wednesday_id, v_group);
  if v_left <= 0 then
    return jsonb_build_object('status', 'full', 'spots_left', 0);
  end if;

  insert into public.wednesday_reservations
    (child_id, wednesday_id, without_meal, early_dropoff, status, reservation_number)
  values (p_child_id, p_wednesday_id, coalesce(p_without_meal, false), coalesce(p_early_dropoff, false),
          'confirmed', v_number)
  returning id into v_id;

  -- Si l'enfant était sur liste d'attente ce jour-là, on l'en retire
  update public.waitlist_entries
     set status = 'booked', booked_at = now(), reservation_id = v_id
   where child_id = p_child_id and kind = 'wednesday' and date = v_date and status = 'waiting';

  return jsonb_build_object('status', 'booked', 'reservation_id', v_id,
                            'reservation_number', v_number, 'spots_left', v_left - 1);
end;
$$;

create or replace function public.book_holiday_day(
  p_child_id uuid,
  p_period_id uuid,
  p_date date,
  p_without_meal boolean default false,
  p_early_dropoff boolean default false,
  p_reservation_number text default null
)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_class text;
  v_group public.school_class_group;
  v_left integer;
  v_id uuid;
  v_number text := coalesce(p_reservation_number, public.new_reservation_number('VAC'));
begin
  if not public.can_manage_child(p_child_id) then
    raise exception 'Enfant introuvable ou non autorisé' using errcode = '42501';
  end if;

  if not exists (select 1 from public.available_holiday_periods
                 where id = p_period_id and p_date between start_date and end_date) then
    return jsonb_build_object('status', 'not_allowed', 'reason', 'Date hors période');
  end if;
  if public.is_date_closed(p_date) then
    return jsonb_build_object('status', 'closed');
  end if;

  select school_class into v_class from public.children where id = p_child_id;
  v_group := public.get_school_class_group_for_period(p_period_id, v_class);
  if v_group is null then
    return jsonb_build_object('status', 'not_allowed', 'reason', 'Classe non accueillie sur cette période');
  end if;

  perform public.lock_slot('holiday', p_period_id, p_date, v_group);

  if exists (select 1 from public.holiday_reservations
             where child_id = p_child_id and reservation_date = p_date and status = 'confirmed') then
    return jsonb_build_object('status', 'already_booked');
  end if;

  v_left := coalesce(public.holiday_capacity(p_period_id, v_group), 0)
            - public.holiday_reserved_count(p_period_id, p_date, v_group);
  if v_left <= 0 then
    return jsonb_build_object('status', 'full', 'spots_left', 0);
  end if;

  insert into public.holiday_reservations
    (child_id, period_id, reservation_date, without_meal, early_dropoff, status, reservation_number)
  values (p_child_id, p_period_id, p_date, coalesce(p_without_meal, false), coalesce(p_early_dropoff, false),
          'confirmed', v_number)
  returning id into v_id;

  update public.waitlist_entries
     set status = 'booked', booked_at = now(), reservation_id = v_id
   where child_id = p_child_id and kind = 'holiday' and date = p_date and status = 'waiting';

  return jsonb_build_object('status', 'booked', 'reservation_id', v_id,
                            'reservation_number', v_number, 'spots_left', v_left - 1);
end;
$$;

-- ---------------------------------------------------------------------------
-- Liste d'attente : traitement d'un créneau (réservation automatique)
-- ---------------------------------------------------------------------------
create or replace function public.process_waitlist_slot(
  p_kind text, p_target uuid, p_date date, p_group public.school_class_group
)
returns integer
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_entry public.waitlist_entries%rowtype;
  v_left integer;
  v_res_id uuid;
  v_number text;
  v_child record;
  v_label text;
  v_booked integer := 0;
begin
  if p_group is null or not public.waitlist_is_open(p_date) or public.is_date_closed(p_date) then
    return 0;
  end if;

  perform public.lock_slot(p_kind, p_target, p_date, p_group);

  loop
    if p_kind = 'wednesday' then
      v_left := coalesce(public.wednesday_capacity(p_target, p_group), 0)
                - public.wednesday_reserved_count(p_target, p_group);
    else
      v_left := coalesce(public.holiday_capacity(p_target, p_group), 0)
                - public.holiday_reserved_count(p_target, p_date, p_group);
    end if;
    exit when v_left <= 0;

    select * into v_entry
    from public.waitlist_entries e
    where e.kind = p_kind
      and coalesce(e.wednesday_id, e.period_id) = p_target
      and e.date = p_date
      and e.class_group = p_group
      and e.status = 'waiting'
    order by e.created_at, e.id
    limit 1
    for update skip locked;
    exit when not found;

    select c.id, c.first_name, c.last_name, c.profile_id into v_child
    from public.children c where c.id = v_entry.child_id;

    -- Déjà réservé entre-temps (par la famille ou l'admin) : on sort de la file
    if (p_kind = 'wednesday' and exists (select 1 from public.wednesday_reservations
          where child_id = v_entry.child_id and wednesday_id = p_target and status = 'confirmed'))
       or (p_kind = 'holiday' and exists (select 1 from public.holiday_reservations
          where child_id = v_entry.child_id and reservation_date = p_date and status = 'confirmed')) then
      update public.waitlist_entries set status = 'cancelled', cancelled_at = now() where id = v_entry.id;
      continue;
    end if;

    v_number := public.new_reservation_number('ATT');
    if p_kind = 'wednesday' then
      insert into public.wednesday_reservations
        (child_id, wednesday_id, without_meal, early_dropoff, status, reservation_number)
      values (v_entry.child_id, p_target, v_entry.without_meal, v_entry.early_dropoff, 'confirmed', v_number)
      returning id into v_res_id;
      v_label := 'le mercredi ' || to_char(p_date, 'DD/MM/YYYY');
    else
      insert into public.holiday_reservations
        (child_id, period_id, reservation_date, without_meal, early_dropoff, status, reservation_number)
      values (v_entry.child_id, p_target, p_date, v_entry.without_meal, v_entry.early_dropoff, 'confirmed', v_number)
      returning id into v_res_id;
      v_label := 'le ' || to_char(p_date, 'DD/MM/YYYY') || ' (vacances)';
    end if;

    update public.waitlist_entries
       set status = 'booked', booked_at = now(), reservation_id = v_res_id
     where id = v_entry.id;

    insert into public.notifications (user_id, type, title, body, link, data)
    values (
      v_child.profile_id,
      'waitlist_booked',
      'Place obtenue pour ' || v_child.first_name,
      'Bonne nouvelle ! Une place s''est libérée ' || v_label || '. '
        || v_child.first_name || ' ' || v_child.last_name
        || ' est désormais inscrit(e) automatiquement (réservation n° ' || v_number || '). '
        || 'Si vous ne souhaitez plus cette place, merci de prévenir le secrétariat par email.',
      case when p_kind = 'wednesday' then '/wednesday-reservations' else '/holiday-reservations' end,
      jsonb_build_object('kind', p_kind, 'date', p_date, 'child_id', v_entry.child_id,
                         'child_name', v_child.first_name || ' ' || v_child.last_name,
                         'reservation_id', v_res_id, 'reservation_number', v_number,
                         'without_meal', v_entry.without_meal, 'early_dropoff', v_entry.early_dropoff,
                         'waitlist_entry_id', v_entry.id)
    );

    v_booked := v_booked + 1;
  end loop;

  return v_booked;
end;
$$;

-- Déclencheur : une réservation confirmée disparaît → place libérée
create or replace function public.on_reservation_released()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_class text;
  v_date date;
begin
  if coalesce(current_setting('app.skip_waitlist', true), '') = 'on' then
    return null;
  end if;
  if old.status is distinct from 'confirmed' then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    -- Toujours confirmée pour le même enfant le même jour : aucune place libérée
    if tg_table_name = 'holiday_reservations' then
      if new.status = 'confirmed' and new.child_id = old.child_id
         and new.reservation_date = old.reservation_date then
        return null;
      end if;
    elsif new.status = 'confirmed' and new.child_id = old.child_id then
      return null;
    end if;
  end if;

  select school_class into v_class from public.children where id = old.child_id;

  if tg_table_name = 'wednesday_reservations' then
    select date into v_date from public.available_wednesdays where id = old.wednesday_id;
    if v_date is not null then
      perform public.process_waitlist_slot('wednesday', old.wednesday_id, v_date,
                                           public.get_wednesday_class_group(v_class));
    end if;
  else
    perform public.process_waitlist_slot('holiday', old.period_id, old.reservation_date,
                                         public.get_school_class_group_for_period(old.period_id, v_class));
  end if;
  return null;
end;
$$;

create trigger waitlist_on_wednesday_release
  after delete or update of status, child_id on public.wednesday_reservations
  for each row execute function public.on_reservation_released();

create trigger waitlist_on_holiday_release
  after delete or update of status, child_id, reservation_date on public.holiday_reservations
  for each row execute function public.on_reservation_released();

-- Déclencheur : capacité augmentée par l'admin → on remplit depuis la liste d'attente
create or replace function public.on_capacity_changed()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  r record;
begin
  if coalesce(current_setting('app.skip_waitlist', true), '') = 'on' then
    return null;
  end if;
  for r in
    select distinct e.date, e.class_group
    from public.waitlist_entries e
    where e.status = 'waiting'
      and ((tg_table_name = 'available_wednesdays' and e.wednesday_id = new.id)
        or (tg_table_name = 'available_holiday_periods' and e.period_id = new.id))
    order by e.date
  loop
    perform public.process_waitlist_slot(
      case when tg_table_name = 'available_wednesdays' then 'wednesday' else 'holiday' end,
      new.id, r.date, r.class_group);
  end loop;
  return null;
end;
$$;

create trigger waitlist_on_wednesday_capacity
  after update of max_participants_kindergarten, max_participants_primary on public.available_wednesdays
  for each row execute function public.on_capacity_changed();

create trigger waitlist_on_holiday_capacity
  after update of max_participants_kindergarten, max_participants_primary, max_participants_teen
  on public.available_holiday_periods
  for each row execute function public.on_capacity_changed();

-- ---------------------------------------------------------------------------
-- Liste d'attente : API pour le site
-- ---------------------------------------------------------------------------
create or replace function public.waitlist_position(p_entry_id uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select case when e.status <> 'waiting' then null else (
    select count(*)::int from public.waitlist_entries o
    where o.kind = e.kind
      and coalesce(o.wednesday_id, o.period_id) = coalesce(e.wednesday_id, e.period_id)
      and o.date = e.date and o.class_group = e.class_group and o.status = 'waiting'
      and (o.created_at, o.id) <= (e.created_at, e.id)
  ) end
  from public.waitlist_entries e where e.id = p_entry_id;
$$;

-- Inscription sur liste d'attente.
--   p_kind = 'wednesday' : p_target_id = id du mercredi (p_date ignorée)
--   p_kind = 'holiday'   : p_target_id = id de la période, p_date = jour
-- Retour : { status: 'joined' | 'available' | 'already_booked' | 'already_waiting'
--                    | 'too_late' | 'closed' | 'not_allowed', entry_id, position }
create or replace function public.join_waitlist(
  p_child_id uuid,
  p_kind text,
  p_target_id uuid,
  p_date date default null,
  p_without_meal boolean default false,
  p_early_dropoff boolean default false
)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_class text;
  v_group public.school_class_group;
  v_date date := p_date;
  v_left integer;
  v_id uuid;
begin
  if not public.can_manage_child(p_child_id) then
    raise exception 'Enfant introuvable ou non autorisé' using errcode = '42501';
  end if;
  select school_class into v_class from public.children where id = p_child_id;

  if p_kind = 'wednesday' then
    select date into v_date from public.available_wednesdays where id = p_target_id;
    if v_date is null then
      return jsonb_build_object('status', 'not_allowed', 'reason', 'Mercredi introuvable');
    end if;
    v_group := public.get_wednesday_class_group(v_class);
  elsif p_kind = 'holiday' then
    if v_date is null or not exists (select 1 from public.available_holiday_periods
               where id = p_target_id and v_date between start_date and end_date) then
      return jsonb_build_object('status', 'not_allowed', 'reason', 'Date hors période');
    end if;
    v_group := public.get_school_class_group_for_period(p_target_id, v_class);
  else
    raise exception 'Type de liste d''attente inconnu : %', p_kind;
  end if;

  if v_group is null then
    return jsonb_build_object('status', 'not_allowed', 'reason', 'Classe non accueillie');
  end if;
  if public.is_date_closed(v_date) then
    return jsonb_build_object('status', 'closed');
  end if;
  if not public.waitlist_is_open(v_date) then
    return jsonb_build_object('status', 'too_late');
  end if;

  perform public.lock_slot(p_kind, p_target_id, v_date, v_group);

  if (p_kind = 'wednesday' and exists (select 1 from public.wednesday_reservations
        where child_id = p_child_id and wednesday_id = p_target_id and status = 'confirmed'))
     or (p_kind = 'holiday' and exists (select 1 from public.holiday_reservations
        where child_id = p_child_id and reservation_date = v_date and status = 'confirmed')) then
    return jsonb_build_object('status', 'already_booked');
  end if;

  select id into v_id from public.waitlist_entries
   where child_id = p_child_id and kind = p_kind and date = v_date and status = 'waiting';
  if v_id is not null then
    return jsonb_build_object('status', 'already_waiting', 'entry_id', v_id,
                              'position', public.waitlist_position(v_id));
  end if;

  if p_kind = 'wednesday' then
    v_left := coalesce(public.wednesday_capacity(p_target_id, v_group), 0)
              - public.wednesday_reserved_count(p_target_id, v_group);
  else
    v_left := coalesce(public.holiday_capacity(p_target_id, v_group), 0)
              - public.holiday_reserved_count(p_target_id, v_date, v_group);
  end if;
  if v_left > 0 then
    -- Il reste de la place : la famille doit réserver directement
    return jsonb_build_object('status', 'available', 'spots_left', v_left);
  end if;

  insert into public.waitlist_entries
    (kind, child_id, wednesday_id, period_id, date, class_group, without_meal, early_dropoff, created_by)
  values (p_kind, p_child_id,
          case when p_kind = 'wednesday' then p_target_id end,
          case when p_kind = 'holiday' then p_target_id end,
          v_date, v_group, coalesce(p_without_meal, false), coalesce(p_early_dropoff, false), auth.uid())
  returning id into v_id;

  return jsonb_build_object('status', 'joined', 'entry_id', v_id, 'position', public.waitlist_position(v_id));
end;
$$;

create or replace function public.leave_waitlist(p_entry_id uuid)
returns boolean
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_child uuid;
begin
  select child_id into v_child from public.waitlist_entries where id = p_entry_id and status = 'waiting';
  if v_child is null then
    return false;
  end if;
  if not public.can_manage_child(v_child) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  update public.waitlist_entries set status = 'cancelled', cancelled_at = now() where id = p_entry_id;
  return true;
end;
$$;

-- Listes d'attente de la famille connectée (ou de tous pour l'admin), avec position
create or replace function public.get_waitlist(p_include_past boolean default false)
returns table (
  id uuid, kind text, child_id uuid, child_first_name text, child_last_name text, school_class text,
  parent_id uuid, parent_first_name text, parent_last_name text,
  wednesday_id uuid, period_id uuid, period_name text, date date, class_group public.school_class_group,
  without_meal boolean, early_dropoff boolean, status text, "position" integer,
  created_at timestamptz, booked_at timestamptz, reservation_id uuid
)
language sql stable security definer set search_path = public
as $$
  select e.id, e.kind, e.child_id, c.first_name, c.last_name, c.school_class,
         p.id, p.first_name::text, p.last_name::text,
         e.wednesday_id, e.period_id, hp.name, e.date, e.class_group,
         e.without_meal, e.early_dropoff, e.status, public.waitlist_position(e.id),
         e.created_at, e.booked_at, e.reservation_id
  from public.waitlist_entries e
  join public.children c on c.id = e.child_id
  left join public.profiles p on p.id = c.profile_id
  left join public.available_holiday_periods hp on hp.id = e.period_id
  where (public.is_admin(auth.uid()) or c.profile_id = auth.uid())
    and (p_include_past or e.date >= (now() at time zone 'Europe/Paris')::date)
  order by e.date, e.class_group, e.created_at;
$$;

-- Admin : relancer manuellement le traitement d'un jour (ex. après modification)
create or replace function public.admin_process_waitlist(p_kind text, p_target_id uuid, p_date date)
returns integer
language plpgsql volatile security definer set search_path = public
as $$
declare
  g public.school_class_group;
  v_total integer := 0;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Accès réservé aux administrateurs' using errcode = '42501';
  end if;
  foreach g in array enum_range(null::public.school_class_group) loop
    v_total := v_total + public.process_waitlist_slot(p_kind, p_target_id, p_date, g);
  end loop;
  return v_total;
end;
$$;

-- Notifications de l'utilisateur connecté
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_count integer;
begin
  update public.notifications
     set read_at = now()
   where user_id = auth.uid() and read_at is null
     and (p_ids is null or id = any(p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Les entrées expirées (jour passé) sont marquées 'expired' (appelée par la tâche planifiée)
create or replace function public.expire_waitlist_entries()
returns integer
language sql volatile security definer set search_path = public
as $$
  with u as (
    update public.waitlist_entries set status = 'expired'
     where status = 'waiting' and not public.waitlist_is_open(date)
    returning 1
  )
  select count(*)::int from u;
$$;

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_email_authorized(text) to anon, authenticated;
grant execute on function
  public.normalize_school_class(text),
  public.get_school_class_group(text),
  public.get_school_class_group_for_period(uuid, text),
  public.holiday_capacity(uuid, public.school_class_group),
  public.holiday_reserved_count(uuid, date, public.school_class_group)
to anon;
grant execute on function
  public.book_wednesday(uuid, uuid, boolean, boolean, text),
  public.book_holiday_day(uuid, uuid, date, boolean, boolean, text),
  public.join_waitlist(uuid, text, uuid, date, boolean, boolean),
  public.leave_waitlist(uuid),
  public.get_waitlist(boolean),
  public.waitlist_position(uuid),
  public.waitlist_is_open(date),
  public.admin_process_waitlist(text, uuid, date),
  public.mark_notifications_read(uuid[])
to authenticated;
-- Fonctions internes : jamais appelables directement depuis le site
revoke execute on function
  public.process_waitlist_slot(text, uuid, date, public.school_class_group),
  public.expire_waitlist_entries(),
  public.lock_slot(text, uuid, date, public.school_class_group),
  public.new_reservation_number(text),
  public.on_reservation_released(),
  public.on_capacity_changed(),
  public.handle_new_user()
from authenticated;
grant execute on function public.expire_waitlist_entries() to service_role;
