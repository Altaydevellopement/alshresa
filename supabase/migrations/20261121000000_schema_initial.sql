-- ============================================================================
-- Espace des 2 Rives – schéma initial du nouveau projet Supabase
--
-- Reprend la structure de l'ancien projet (mêmes tables / colonnes, pour que
-- les données puissent être réimportées) avec les corrections suivantes :
--   * réservations atomiques (plus de surréservation possible)
--   * unicité : un enfant ne peut pas être réservé deux fois le même jour
--   * statuts des réservations limités à 'confirmed' / 'cancelled'
--   * authorized_emails n'est plus lisible publiquement (fonction dédiée)
--   * suppression de la table admin_users (mots de passe en clair, inutilisée)
--   * une seule source pour les groupes de classes (school_class_categories
--     + mappings par période ; plus de règle basée sur le nom "ETE-xx")
--   * noms acceptant les apostrophes (D'Almeida, N'Diaye…)
--   * email_lower toujours synchronisé (colonne générée)
--   * suppression de la clé étrangère en double fk_wednesday_id
--   * vues en security_invoker (elles respectent les règles RLS)
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.school_class_group as enum ('kindergarten', 'primary', 'teen');
create type public.user_role as enum ('admin', 'user');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name varchar check (first_name is null or char_length(trim(first_name)) between 1 and 100),
  last_name  varchar check (last_name  is null or char_length(trim(last_name))  between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  automatic_payment boolean not null default false,
  accepted_cgu boolean not null default false,
  is_waiting boolean default false,
  is_closed boolean default false,
  hide_rdv_access boolean default false,
  hide_wednesday_access boolean default false
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  first_name text not null,
  last_name text not null,
  school_class text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index children_profile_id_idx on public.children(profile_id);

create table public.closed_periods (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.available_wednesdays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  max_participants_kindergarten integer not null default 0 check (max_participants_kindergarten >= 0),
  max_participants_primary integer not null default 0 check (max_participants_primary >= 0)
);
create index available_wednesdays_date_idx on public.available_wednesdays(date);

create table public.wednesday_allowed_classes (
  id uuid primary key default gen_random_uuid(),
  wednesday_id uuid references public.available_wednesdays(id) on delete cascade,
  school_class text not null,
  created_at timestamptz not null default now()
);

create table public.available_holiday_periods (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  max_participants_kindergarten integer not null default 0 check (max_participants_kindergarten >= 0),
  max_participants_primary integer not null default 0 check (max_participants_primary >= 0),
  max_participants_teen integer not null default 0 check (max_participants_teen >= 0),
  name text not null unique,
  check (end_date >= start_date)
);

create table public.holiday_allowed_classes (
  id uuid primary key default gen_random_uuid(),
  holiday_period_id uuid references public.available_holiday_periods(id) on delete cascade,
  school_class text not null,
  created_at timestamptz not null default now()
);

create table public.holiday_period_class_mappings (
  id uuid primary key default gen_random_uuid(),
  holiday_period_id uuid not null references public.available_holiday_periods(id) on delete cascade,
  school_class text not null,
  category text not null check (category in ('maternelle', 'primaire', 'adolescent', 'aucune')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index holiday_period_class_mappings_unique
  on public.holiday_period_class_mappings (holiday_period_id, upper(trim(school_class)));

create table public.school_class_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('maternelle', 'primaire', 'adolescent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_class (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level integer not null,
  category text not null check (category in ('maternelle', 'primaire', 'college', 'lycee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  "order" integer
);

create table public.authorized_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email_lower text generated always as (lower(trim(email))) stored
);
create unique index authorized_emails_email_lower_key on public.authorized_emails(email_lower);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null
);

create table public.wednesday_reservations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id),
  wednesday_id uuid not null references public.available_wednesdays(id),
  without_meal boolean default false,
  early_dropoff boolean default false,
  reservation_number text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index wednesday_reservations_unique_confirmed
  on public.wednesday_reservations (child_id, wednesday_id) where status = 'confirmed';
create index wednesday_reservations_wednesday_idx on public.wednesday_reservations (wednesday_id) where status = 'confirmed';

create table public.holiday_reservations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id),
  period_id uuid not null references public.available_holiday_periods(id),
  reservation_date date not null,
  without_meal boolean default false,
  early_dropoff boolean default false,
  reservation_number text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index holiday_reservations_unique_confirmed
  on public.holiday_reservations (child_id, reservation_date) where status = 'confirmed';
create index holiday_reservations_period_date_idx
  on public.holiday_reservations (period_id, reservation_date) where status = 'confirmed';

create table public.rdv (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  user_id uuid references auth.users(id) on delete set null,
  motifs text[] default '{}'::text[],
  status text not null default 'disponible' check (status in ('disponible', 'réservé')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.global_settings (
  id uuid primary key default gen_random_uuid(),
  hide_wednesday_reservations boolean not null default false,
  hide_rdv_page boolean not null default false,
  -- Liste d'attente
  waitlist_enabled boolean not null default true,
  -- Les réservations automatiques s'arrêtent N heures avant le jour J à minuit
  -- (12 = la veille à midi, heure de Paris).
  waitlist_cutoff_hours integer not null default 12 check (waitlist_cutoff_hours between 0 and 336),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
insert into public.global_settings default values;

-- updated_at automatique
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','children','available_wednesdays','available_holiday_periods',
    'holiday_period_class_mappings','school_class_categories','school_class','authorized_emails',
    'user_roles','wednesday_reservations','holiday_reservations','rdv','global_settings']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Rôles / authentification
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = $1 and r.role = 'admin'
  );
$$;

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, automatic_payment, accepted_cgu,
                               hide_rdv_access, hide_wednesday_access)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data->>'firstName'), ''),
    nullif(trim(new.raw_user_meta_data->>'lastName'), ''),
    coalesce((new.raw_user_meta_data->>'automaticPayment')::boolean, false),
    coalesce((new.raw_user_meta_data->>'acceptedCgu')::boolean, false),
    false,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vérifie si un email est autorisé à s'inscrire, sans exposer la liste.
create or replace function public.is_email_authorized(p_email text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.authorized_emails
    where email_lower = lower(trim(p_email))
  );
$$;

-- Emails des comptes (réservé aux administrateurs)
create or replace function public.get_user_emails(user_ids uuid[])
returns table (id uuid, email text)
language plpgsql stable security definer set search_path = public, auth
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Accès réservé aux administrateurs' using errcode = '42501';
  end if;
  return query select u.id, u.email::text from auth.users u where u.id = any(user_ids);
end;
$$;

-- Profils ayant (ou non) au moins une réservation confirmée
create or replace function public.get_profiles_with_reservations(has_reservations boolean)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  with booked as (
    select c.profile_id from public.children c
    where exists (select 1 from public.wednesday_reservations w where w.child_id = c.id and w.status = 'confirmed')
       or exists (select 1 from public.holiday_reservations h where h.child_id = c.id and h.status = 'confirmed')
  )
  select p.id from public.profiles p
  where public.is_admin(auth.uid())
    and (p.id in (select profile_id from booked)) = has_reservations;
$$;

-- ---------------------------------------------------------------------------
-- Groupes de classes (une seule logique, utilisée partout)
-- ---------------------------------------------------------------------------
create or replace function public.normalize_school_class(p_class text)
returns text
language sql immutable
as $$
  select case v
           when 'PETITE SECTION' then 'PS'
           when 'MOYENNE SECTION' then 'MS'
           when 'GRANDE SECTION' then 'GS'
           else replace(v, 'È', 'E')
         end
  from (select upper(trim(coalesce(p_class, ''))) as v) s;
$$;

-- Groupe par défaut d'une classe : table school_class_categories, sinon règle standard.
create or replace function public.get_school_class_group(school_class text)
returns public.school_class_group
language plpgsql stable set search_path = public
as $$
declare
  v_class text := public.normalize_school_class(school_class);
  v_category text;
begin
  if v_class = '' then
    return null;
  end if;

  select c.category into v_category
  from public.school_class_categories c
  where public.normalize_school_class(c.name) = v_class
  limit 1;

  if v_category is not null then
    return case v_category
             when 'maternelle' then 'kindergarten'
             when 'primaire'   then 'primary'
             else 'teen'
           end::public.school_class_group;
  end if;

  if v_class in ('PS', 'MS', 'GS', 'TPS') then
    return 'kindergarten';
  elsif v_class in ('CP', 'CE1', 'CE2', 'CM1', 'CM2') then
    return 'primary';
  end if;
  return 'teen';
end;
$$;

-- Groupe d'une classe pour une période de vacances : mapping spécifique à la période
-- (défini par l'admin, ex. CM2 → adolescent l'été), sinon groupe par défaut.
-- Retourne NULL si la classe est exclue ('aucune').
create or replace function public.get_school_class_group_for_period(p_period_id uuid, p_school_class text)
returns public.school_class_group
language plpgsql stable set search_path = public
as $$
declare
  v_category text;
begin
  select m.category into v_category
  from public.holiday_period_class_mappings m
  where m.holiday_period_id = p_period_id
    and public.normalize_school_class(m.school_class) = public.normalize_school_class(p_school_class)
  limit 1;

  if v_category is not null then
    return case v_category
             when 'maternelle' then 'kindergarten'::public.school_class_group
             when 'primaire'   then 'primary'::public.school_class_group
             when 'adolescent' then 'teen'::public.school_class_group
             else null
           end;
  end if;

  return public.get_school_class_group(p_school_class);
end;
$$;

-- Les mercredis n'accueillent que maternelle et primaire.
create or replace function public.get_wednesday_class_group(p_school_class text)
returns public.school_class_group
language sql stable set search_path = public
as $$
  select nullif(public.get_school_class_group(p_school_class), 'teen'::public.school_class_group);
$$;

-- ---------------------------------------------------------------------------
-- Calcul des places
-- ---------------------------------------------------------------------------
create or replace function public.wednesday_capacity(p_wednesday_id uuid, p_group public.school_class_group)
returns integer
language sql stable set search_path = public
as $$
  select case p_group
           when 'kindergarten' then w.max_participants_kindergarten
           when 'primary' then w.max_participants_primary
           else 0
         end
  from public.available_wednesdays w where w.id = p_wednesday_id;
$$;

create or replace function public.wednesday_reserved_count(p_wednesday_id uuid, p_group public.school_class_group)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int
  from public.wednesday_reservations r
  join public.children c on c.id = r.child_id
  where r.wednesday_id = p_wednesday_id
    and r.status = 'confirmed'
    and public.get_wednesday_class_group(c.school_class) = p_group;
$$;

create or replace function public.holiday_capacity(p_period_id uuid, p_group public.school_class_group)
returns integer
language sql stable set search_path = public
as $$
  select case p_group
           when 'kindergarten' then p.max_participants_kindergarten
           when 'primary' then p.max_participants_primary
           when 'teen' then p.max_participants_teen
         end
  from public.available_holiday_periods p where p.id = p_period_id;
$$;

create or replace function public.holiday_reserved_count(p_period_id uuid, p_date date, p_group public.school_class_group)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int
  from public.holiday_reservations r
  join public.children c on c.id = r.child_id
  where r.period_id = p_period_id
    and r.reservation_date = p_date
    and r.status = 'confirmed'
    and public.get_school_class_group_for_period(p_period_id, c.school_class) = p_group;
$$;

-- API utilisée par le site (signatures identiques à l'ancien projet)
create or replace function public.check_wednesday_spots_remaining(wednesday_id uuid, child_school_class text)
returns integer
language plpgsql stable security definer set search_path = public
as $$
declare
  v_group public.school_class_group := public.get_wednesday_class_group(child_school_class);
begin
  if v_group is null then
    return 0;
  end if;
  return greatest(coalesce(public.wednesday_capacity($1, v_group), 0)
                  - public.wednesday_reserved_count($1, v_group), 0);
end;
$$;

create or replace function public.check_wednesday_spots_available(wednesday_id uuid, child_school_class text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.check_wednesday_spots_remaining($1, $2) > 0;
$$;

create or replace function public.check_holiday_spots_available(p_period_id uuid, p_reservation_date date, p_child_school_class text)
returns integer
language plpgsql stable security definer set search_path = public
as $$
declare
  v_group public.school_class_group;
begin
  if p_child_school_class is null or trim(p_child_school_class) = '' then
    raise exception 'Classe de l''enfant non spécifiée';
  end if;
  v_group := public.get_school_class_group_for_period(p_period_id, p_child_school_class);
  if v_group is null then
    return 0;
  end if;
  return greatest(coalesce(public.holiday_capacity(p_period_id, v_group), 0)
                  - public.holiday_reserved_count(p_period_id, p_reservation_date, v_group), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Vues (security_invoker : elles appliquent les règles RLS de l'utilisateur)
-- ---------------------------------------------------------------------------
create view public.holiday_period_dates with (security_invoker = true) as
select p.id as period_id, d::date as reservation_date
from public.available_holiday_periods p,
     generate_series(p.start_date, p.end_date, interval '1 day') d;

create view public.wednesday_reservations_with_children with (security_invoker = true) as
select r.id, r.child_id, r.wednesday_id, r.without_meal, r.early_dropoff,
       r.reservation_number, r.status, r.created_at, r.updated_at,
       jsonb_build_object(
         'id', c.id, 'first_name', c.first_name, 'last_name', c.last_name,
         'school_class', c.school_class, 'profile_id', c.profile_id,
         'profile', jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'school_city', null)
       ) as children
from public.wednesday_reservations r
join public.children c on c.id = r.child_id
left join public.profiles p on p.id = c.profile_id;

create view public.holiday_reservations_with_children with (security_invoker = true) as
select r.id, r.child_id, r.period_id, r.reservation_date, r.without_meal, r.early_dropoff,
       r.reservation_number, r.status, r.created_at, r.updated_at,
       jsonb_build_object(
         'id', c.id, 'first_name', c.first_name, 'last_name', c.last_name,
         'school_class', c.school_class, 'profile_id', c.profile_id,
         'profile', jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'school_city', null)
       ) as children
from public.holiday_reservations r
join public.children c on c.id = r.child_id
left join public.profiles p on p.id = c.profile_id;

-- Comptages : calculés par des fonctions security definer (pas de données nominatives exposées)
create view public.holiday_reservations_count_by_group with (security_invoker = true) as
select d.period_id, d.reservation_date, g.class_group,
       public.holiday_reserved_count(d.period_id, d.reservation_date, g.class_group) as reservation_count
from public.holiday_period_dates d
cross join unnest(enum_range(null::public.school_class_group)) as g(class_group);

create view public.holiday_spots_available with (security_invoker = true) as
select c.period_id, c.reservation_date, c.class_group,
       public.holiday_capacity(c.period_id, c.class_group) as max_capacity,
       c.reservation_count as reserved_count,
       greatest(public.holiday_capacity(c.period_id, c.class_group) - c.reservation_count, 0) as available_spots
from public.holiday_reservations_count_by_group c;

-- Profils + email : admin uniquement (filtre explicite car auth.users n'est pas lisible autrement)
create view public.profiles_with_emails as
select p.id, p.first_name, p.last_name, p.created_at, p.updated_at, p.automatic_payment,
       p.accepted_cgu, p.is_waiting, p.is_closed, u.email::text as email
from public.profiles p
join auth.users u on u.id = p.id
where public.is_admin(auth.uid());
revoke all on public.profiles_with_emails from anon;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.closed_periods enable row level security;
alter table public.available_wednesdays enable row level security;
alter table public.wednesday_allowed_classes enable row level security;
alter table public.available_holiday_periods enable row level security;
alter table public.holiday_allowed_classes enable row level security;
alter table public.holiday_period_class_mappings enable row level security;
alter table public.school_class_categories enable row level security;
alter table public.school_class enable row level security;
alter table public.authorized_emails enable row level security;
alter table public.user_roles enable row level security;
alter table public.wednesday_reservations enable row level security;
alter table public.holiday_reservations enable row level security;
alter table public.rdv enable row level security;
alter table public.global_settings enable row level security;

-- Profils
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_delete_own_or_admin" on public.profiles for delete to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));

-- Enfants
create policy "children_all_own_or_admin" on public.children for all to authenticated
  using (profile_id = auth.uid() or public.is_admin(auth.uid()))
  with check (profile_id = auth.uid() or public.is_admin(auth.uid()));

-- Données de paramétrage : lecture publique, écriture admin
do $$
declare t text;
begin
  foreach t in array array['closed_periods','available_wednesdays','wednesday_allowed_classes',
    'available_holiday_periods','holiday_allowed_classes','holiday_period_class_mappings',
    'school_class_categories','school_class','global_settings']
  loop
    execute format('create policy "%s_read_all" on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('create policy "%s_admin_write" on public.%I for all to authenticated
                    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))', t, t);
  end loop;
end $$;

-- Emails autorisés : admin uniquement (les visiteurs passent par is_email_authorized)
create policy "authorized_emails_admin" on public.authorized_emails for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Rôles
create policy "user_roles_select_own_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "user_roles_admin_write" on public.user_roles for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Réservations : lecture par la famille ; création via les fonctions book_* ;
-- modification / suppression par l'admin.
create policy "wednesday_reservations_select" on public.wednesday_reservations for select to authenticated
  using (public.is_admin(auth.uid())
         or exists (select 1 from public.children c where c.id = child_id and c.profile_id = auth.uid()));
create policy "wednesday_reservations_admin_write" on public.wednesday_reservations for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "holiday_reservations_select" on public.holiday_reservations for select to authenticated
  using (public.is_admin(auth.uid())
         or exists (select 1 from public.children c where c.id = child_id and c.profile_id = auth.uid()));
create policy "holiday_reservations_admin_write" on public.holiday_reservations for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Rendez-vous
create policy "rdv_select" on public.rdv for select to authenticated
  using (status = 'disponible' or user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "rdv_book_or_cancel_own" on public.rdv for update to authenticated
  using (status = 'disponible' or user_id = auth.uid())
  with check ((status = 'réservé' and user_id = auth.uid())
              or (status = 'disponible' and user_id is null));
create policy "rdv_admin" on public.rdv for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Droits d'exécution des fonctions
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_email_authorized(text) to anon, authenticated;
grant execute on function
  public.is_admin(uuid),
  public.get_user_emails(uuid[]),
  public.get_profiles_with_reservations(boolean),
  public.normalize_school_class(text),
  public.get_school_class_group(text),
  public.get_school_class_group_for_period(uuid, text),
  public.get_wednesday_class_group(text),
  public.wednesday_capacity(uuid, public.school_class_group),
  public.wednesday_reserved_count(uuid, public.school_class_group),
  public.holiday_capacity(uuid, public.school_class_group),
  public.holiday_reserved_count(uuid, date, public.school_class_group),
  public.check_wednesday_spots_remaining(uuid, text),
  public.check_wednesday_spots_available(uuid, text),
  public.check_holiday_spots_available(uuid, date, text)
to authenticated;
-- Les pages publiques (programme des vacances) peuvent afficher les places restantes
grant execute on function
  public.normalize_school_class(text),
  public.get_school_class_group(text),
  public.get_school_class_group_for_period(uuid, text),
  public.holiday_capacity(uuid, public.school_class_group),
  public.holiday_reserved_count(uuid, date, public.school_class_group)
to anon;
