-- Transforme les données de l'ancien projet (schéma "legacy") vers le nouveau schéma.
-- Exécuté par scripts/migration-donnees.sh, dans une seule transaction :
-- en cas d'erreur, rien n'est importé.

-- Pas de réservation automatique pendant l'import
set local app.skip_waitlist = 'on';

-- Profils : déjà créés par le déclencheur à l'import des comptes (auth.users) ;
-- on reprend les valeurs exactes de l'ancien projet.
insert into public.profiles (id, first_name, last_name, created_at, updated_at, automatic_payment, accepted_cgu,
                             is_waiting, is_closed, hide_rdv_access, hide_wednesday_access)
select p.id, nullif(trim(p.first_name), ''), nullif(trim(p.last_name), ''), coalesce(p.created_at, now()),
       coalesce(p.updated_at, now()), coalesce(p.automatic_payment, false), coalesce(p.accepted_cgu, false),
       coalesce(p.is_waiting, false), coalesce(p.is_closed, false), coalesce(p.hide_rdv_access, false),
       coalesce(p.hide_wednesday_access, false)
from legacy.profiles p
where exists (select 1 from auth.users u where u.id = p.id)
on conflict (id) do update set
  first_name = excluded.first_name, last_name = excluded.last_name, created_at = excluded.created_at,
  automatic_payment = excluded.automatic_payment, accepted_cgu = excluded.accepted_cgu,
  is_waiting = excluded.is_waiting, is_closed = excluded.is_closed,
  hide_rdv_access = excluded.hide_rdv_access, hide_wednesday_access = excluded.hide_wednesday_access;

insert into public.children (id, profile_id, first_name, last_name, school_class, created_at, updated_at)
select c.id, c.profile_id, trim(c.first_name), trim(c.last_name), trim(c.school_class),
       coalesce(c.created_at, now()), coalesce(c.updated_at, now())
from legacy.children c
where exists (select 1 from public.profiles p where p.id = c.profile_id);

insert into public.closed_periods (id, start_date, end_date, reason, created_at)
select id, start_date, greatest(end_date, start_date), reason, coalesce(created_at, now()) from legacy.closed_periods;

insert into public.available_wednesdays (id, date, created_at, updated_at, max_participants_kindergarten, max_participants_primary)
select id, date, coalesce(created_at, now()), coalesce(updated_at, now()),
       greatest(coalesce(max_participants_kindergarten, 0), 0), greatest(coalesce(max_participants_primary, 0), 0)
from legacy.available_wednesdays;

insert into public.wednesday_allowed_classes (id, wednesday_id, school_class, created_at)
select id, wednesday_id, school_class, coalesce(created_at, now()) from legacy.wednesday_allowed_classes w
where wednesday_id is null or exists (select 1 from public.available_wednesdays a where a.id = w.wednesday_id);

insert into public.available_holiday_periods (id, start_date, end_date, created_at, updated_at,
  max_participants_kindergarten, max_participants_primary, max_participants_teen, name)
select id, start_date, greatest(end_date, start_date), coalesce(created_at, now()), coalesce(updated_at, now()),
       greatest(coalesce(max_participants_kindergarten, 0), 0), greatest(coalesce(max_participants_primary, 0), 0),
       greatest(coalesce(max_participants_teen, 0), 0), name
from legacy.available_holiday_periods;

insert into public.holiday_allowed_classes (id, holiday_period_id, school_class, created_at)
select id, holiday_period_id, school_class, coalesce(created_at, now()) from legacy.holiday_allowed_classes h
where holiday_period_id is null or exists (select 1 from public.available_holiday_periods p where p.id = h.holiday_period_id);

-- Mappings : un seul par période et par classe (le plus récent)
insert into public.holiday_period_class_mappings (id, holiday_period_id, school_class, category, created_at, updated_at)
select distinct on (holiday_period_id, upper(trim(school_class)))
       id, holiday_period_id, trim(school_class), category, coalesce(created_at, now()), coalesce(updated_at, now())
from legacy.holiday_period_class_mappings m
where category in ('maternelle', 'primaire', 'adolescent', 'aucune')
  and exists (select 1 from public.available_holiday_periods p where p.id = m.holiday_period_id)
order by holiday_period_id, upper(trim(school_class)), updated_at desc nulls last;

-- Ancienne règle « CM2 = adolescent sur les périodes ETE-01 à ETE-04 » : devient un mapping explicite
insert into public.holiday_period_class_mappings (holiday_period_id, school_class, category)
select p.id, 'CM2', 'adolescent'
from public.available_holiday_periods p
where p.name in ('ETE-01', 'ETE-02', 'ETE-03', 'ETE-04')
on conflict do nothing;

insert into public.school_class_categories (id, name, category, created_at, updated_at)
select id, name, category, coalesce(created_at, now()), coalesce(updated_at, now())
from legacy.school_class_categories
where category in ('maternelle', 'primaire', 'adolescent')
on conflict (name) do nothing;

insert into public.school_class (id, name, level, category, created_at, updated_at, "order")
select id, name, level, category, coalesce(created_at, now()), coalesce(updated_at, now()), "order"
from legacy.school_class
on conflict (name) do nothing;

-- Emails autorisés : dédoublonnés sans tenir compte des majuscules / espaces
insert into public.authorized_emails (id, email, created_at, updated_at)
select distinct on (lower(trim(email))) id, trim(email), coalesce(created_at, now()), coalesce(updated_at, now())
from legacy.authorized_emails
where nullif(trim(email), '') is not null
order by lower(trim(email)), created_at;

insert into public.user_roles (id, user_id, role, created_at, updated_at, email)
select id, user_id, role::public.user_role, coalesce(created_at, now()), coalesce(updated_at, now()), email
from legacy.user_roles r
where exists (select 1 from auth.users u where u.id = r.user_id)
on conflict (user_id) do update set role = excluded.role;

-- Réservations : statut normalisé ; un doublon confirmé (même enfant, même jour) devient 'cancelled'
insert into public.wednesday_reservations (id, child_id, wednesday_id, without_meal, early_dropoff,
  reservation_number, status, created_at, updated_at)
select id, child_id, wednesday_id, coalesce(without_meal, false), coalesce(early_dropoff, false),
       coalesce(reservation_number, 'IMPORT-' || left(id::text, 8)),
       case when st = 'confirmed' and rn = 1 then 'confirmed' else 'cancelled' end,
       coalesce(created_at, now()), coalesce(updated_at, now())
from (
  select r.*, case when lower(coalesce(r.status, 'confirmed')) in ('cancelled', 'canceled', 'annulé', 'annule')
                   then 'cancelled' else 'confirmed' end as st,
         row_number() over (partition by r.child_id, r.wednesday_id,
                              lower(coalesce(r.status, 'confirmed')) in ('cancelled', 'canceled', 'annulé', 'annule')
                            order by r.created_at, r.id) as rn
  from legacy.wednesday_reservations r
  where exists (select 1 from public.children c where c.id = r.child_id)
    and exists (select 1 from public.available_wednesdays w where w.id = r.wednesday_id)
) x;

insert into public.holiday_reservations (id, child_id, period_id, reservation_date, without_meal, early_dropoff,
  reservation_number, status, created_at, updated_at)
select id, child_id, period_id, reservation_date, coalesce(without_meal, false), coalesce(early_dropoff, false),
       coalesce(reservation_number, 'IMPORT-' || left(id::text, 8)),
       case when st = 'confirmed' and rn = 1 then 'confirmed' else 'cancelled' end,
       coalesce(created_at, now()), coalesce(updated_at, now())
from (
  select r.*, case when lower(coalesce(r.status, 'confirmed')) in ('cancelled', 'canceled', 'annulé', 'annule')
                   then 'cancelled' else 'confirmed' end as st,
         row_number() over (partition by r.child_id, r.reservation_date,
                              lower(coalesce(r.status, 'confirmed')) in ('cancelled', 'canceled', 'annulé', 'annule')
                            order by r.created_at, r.id) as rn
  from legacy.holiday_reservations r
  where exists (select 1 from public.children c where c.id = r.child_id)
    and exists (select 1 from public.available_holiday_periods p where p.id = r.period_id)
) x;

insert into public.rdv (id, date, heure_debut, heure_fin, user_id, motifs, status, created_at, updated_at)
select r.id, r.date, r.heure_debut, r.heure_fin,
       case when exists (select 1 from auth.users u where u.id = r.user_id) then r.user_id end,
       coalesce(r.motifs, '{}'),
       case when r.status = 'réservé' and exists (select 1 from auth.users u where u.id = r.user_id)
            then 'réservé' else 'disponible' end,
       coalesce(r.created_at, now()), coalesce(r.updated_at, now())
from legacy.rdv r;

update public.global_settings g
   set hide_wednesday_reservations = coalesce(o.hide_wednesday_reservations, false),
       hide_rdv_page = coalesce(o.hide_rdv_page, false)
from (select * from legacy.global_settings order by created_at limit 1) o;

-- Ancienne liste d'attente (admin) : inscriptions encore actives et à venir
insert into public.waitlist_entries (kind, child_id, wednesday_id, period_id, date, class_group,
                                     without_meal, early_dropoff, status, created_at)
select case when w.id is not null then 'wednesday' else 'holiday' end,
       o.child_id, w.id, case when w.id is null then p.id end, o.date,
       case cat.category when 'maternelle' then 'kindergarten' when 'primaire' then 'primary' else 'teen' end::public.school_class_group,
       coalesce(o.without_meal, false), coalesce(o.early_dropoff, false), 'waiting', coalesce(o.created_at, now())
from legacy.waitlist o
join legacy.school_class_categories cat on cat.id = o.school_class_category_id
left join lateral (select id from public.available_wednesdays aw where aw.date = o.date limit 1) w on true
left join lateral (select id from public.available_holiday_periods hp
                   where o.date between hp.start_date and hp.end_date limit 1) p on true
where o.deleted_at is null and o.status = 'waiting' and o.date >= current_date
  and (w.id is not null or p.id is not null)
  and exists (select 1 from public.children c where c.id = o.child_id)
on conflict do nothing;

-- Bilan
select 'profils' as donnees, count(*) from public.profiles
union all select 'enfants', count(*) from public.children
union all select 'emails autorisés', count(*) from public.authorized_emails
union all select 'mercredis', count(*) from public.available_wednesdays
union all select 'périodes vacances', count(*) from public.available_holiday_periods
union all select 'réservations mercredi', count(*) from public.wednesday_reservations
union all select 'réservations vacances', count(*) from public.holiday_reservations
union all select 'rendez-vous', count(*) from public.rdv
union all select 'liste d''attente', count(*) from public.waitlist_entries
union all select 'admins', count(*) from public.user_roles where role = 'admin';

drop schema legacy cascade;
