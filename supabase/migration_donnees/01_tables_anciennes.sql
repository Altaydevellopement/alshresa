-- Tables temporaires (schéma "legacy") qui reçoivent les données de l'ANCIEN projet
-- telles quelles, avant transformation par 02_import.sql. Supprimées à la fin.
create schema legacy;

create table legacy.profiles (id uuid, first_name text, last_name text, created_at timestamptz, updated_at timestamptz,
  automatic_payment boolean, accepted_cgu boolean, is_waiting boolean, is_closed boolean,
  hide_rdv_access boolean, hide_wednesday_access boolean);
create table legacy.children (id uuid, profile_id uuid, first_name text, last_name text, school_class text,
  created_at timestamptz, updated_at timestamptz);
create table legacy.closed_periods (id uuid, start_date date, end_date date, reason text, created_at timestamptz);
create table legacy.available_wednesdays (id uuid, date date, created_at timestamptz, updated_at timestamptz,
  max_participants_kindergarten integer, max_participants_primary integer);
create table legacy.wednesday_allowed_classes (id uuid, wednesday_id uuid, school_class text, created_at timestamptz);
create table legacy.available_holiday_periods (id uuid, start_date date, end_date date, created_at timestamptz,
  updated_at timestamptz, max_participants_kindergarten integer, max_participants_primary integer,
  max_participants_teen integer, name text);
create table legacy.holiday_allowed_classes (id uuid, holiday_period_id uuid, school_class text, created_at timestamptz);
create table legacy.school_class_categories (id uuid, name text, category text, created_at timestamptz, updated_at timestamptz);
create table legacy.authorized_emails (id uuid, email text, created_at timestamptz, updated_at timestamptz, email_lower text);
create table legacy.school_class (id uuid, name text, level integer, category text, created_at timestamptz,
  updated_at timestamptz, "order" integer);
create table legacy.user_roles (id uuid, user_id uuid, role text, created_at timestamptz, updated_at timestamptz, email text);
create table legacy.wednesday_reservations (id uuid, child_id uuid, wednesday_id uuid, without_meal boolean,
  early_dropoff boolean, reservation_number text, status text, created_at timestamptz, updated_at timestamptz);
create table legacy.holiday_reservations (id uuid, child_id uuid, period_id uuid, reservation_date date,
  without_meal boolean, early_dropoff boolean, reservation_number text, status text, created_at timestamptz,
  updated_at timestamptz);
create table legacy.rdv (id uuid, date date, heure_debut time, heure_fin time, user_id uuid, motifs text[],
  status text, created_at timestamptz, updated_at timestamptz);
create table legacy.holiday_period_class_mappings (id uuid, holiday_period_id uuid, school_class text, category text,
  created_at timestamptz, updated_at timestamptz);
create table legacy.global_settings (id uuid, hide_wednesday_reservations boolean, hide_rdv_page boolean,
  updated_at timestamptz, created_at timestamptz);
create table legacy.waitlist (id uuid, child_id uuid, date date, school_class_category_id uuid, status text,
  notified_at timestamptz, deleted_at timestamptz, created_at timestamptz, without_meal boolean, early_dropoff boolean);
