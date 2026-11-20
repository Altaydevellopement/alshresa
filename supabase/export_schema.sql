-- ============================================================================
-- Export du schéma de l'ANCIEN projet Supabase
-- À exécuter dans : ancien projet Supabase > SQL Editor > New query > Run
-- Résultat : une ligne par objet (types, tables, contraintes, index, fonctions,
-- vues, triggers, RLS, policies, buckets). Ne contient AUCUNE donnée personnelle.
-- Puis : bouton "Export" > "Download CSV" et déposer le fichier dans le dépôt
-- (ou copier-coller le résultat).
-- ============================================================================
with
ext as (
  select 0 as ord, extname::text as name,
         'CREATE EXTENSION IF NOT EXISTS ' || quote_ident(extname) || ';' as ddl
  from pg_extension
  where extname not in ('plpgsql')
),
enums as (
  select 1, t.typname::text,
         'CREATE TYPE public.' || quote_ident(t.typname) || ' AS ENUM ('
         || string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder) || ');'
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  group by t.typname
),
tables as (
  select 2, c.relname::text,
         'CREATE TABLE public.' || quote_ident(c.relname) || E' (\n'
         || string_agg(
              '  ' || quote_ident(a.attname) || ' ' || format_type(a.atttypid, a.atttypmod)
              || case
                   when a.attgenerated = 's' then ' GENERATED ALWAYS AS (' || pg_get_expr(d.adbin, d.adrelid) || ') STORED'
                   when a.attidentity in ('a','d') then ' GENERATED ' || case a.attidentity when 'a' then 'ALWAYS' else 'BY DEFAULT' end || ' AS IDENTITY'
                   when d.adbin is not null then ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid)
                   else ''
                 end
              || case when a.attnotnull then ' NOT NULL' else '' end,
              E',\n' order by a.attnum)
         || E'\n);'
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname
),
cons as (
  select case when con.contype = 'f' then 4 else 3 end,
         c.relname || '.' || con.conname,
         'ALTER TABLE public.' || quote_ident(c.relname) || ' ADD CONSTRAINT ' || quote_ident(con.conname)
         || ' ' || pg_get_constraintdef(con.oid) || ';'
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and con.contype in ('p','u','c','x','f')
),
idx as (
  select 5, i.indexname::text, i.indexdef || ';'
  from pg_indexes i
  where i.schemaname = 'public'
    and i.indexname not in (select conname from pg_constraint where contype in ('p','u','x'))
),
funcs as (
  select 6, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         pg_get_functiondef(p.oid) || ';'
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f','p')
    and not exists (select 1 from pg_depend dep where dep.objid = p.oid and dep.deptype = 'e')
),
views as (
  select 7, c.relname::text,
         'CREATE OR REPLACE VIEW public.' || quote_ident(c.relname)
         || coalesce(' WITH (' || array_to_string(c.reloptions, ', ') || ')', '')
         || E' AS\n' || pg_get_viewdef(c.oid, true) || ';'
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v','m')
),
trg as (
  select 8, tn.nspname || '.' || c.relname || '.' || t.tgname,
         pg_get_triggerdef(t.oid) || ';'
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace tn on tn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace pn on pn.oid = p.pronamespace
  where not t.tgisinternal and pn.nspname = 'public'
),
rls as (
  select 9, c.relname::text,
         'ALTER TABLE public.' || quote_ident(c.relname) || ' ENABLE ROW LEVEL SECURITY;'
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
),
pol as (
  select 10, schemaname || '.' || tablename || '.' || policyname,
         'CREATE POLICY ' || quote_ident(policyname) || ' ON ' || schemaname || '.' || quote_ident(tablename)
         || ' AS ' || permissive || ' FOR ' || cmd || ' TO ' || array_to_string(roles, ', ')
         || coalesce(E'\n  USING (' || qual || ')', '')
         || coalesce(E'\n  WITH CHECK (' || with_check || ')', '') || ';'
  from pg_policies
  where schemaname in ('public','storage')
),
buckets as (
  select 11, b.id::text,
         'INSERT INTO storage.buckets (id, name, public) VALUES ('
         || quote_literal(b.id) || ', ' || quote_literal(b.name) || ', ' || b.public || ');'
  from storage.buckets b
)
select ord, name, ddl from (
  select * from ext   union all select * from enums union all select * from tables
  union all select * from cons  union all select * from idx   union all select * from funcs
  union all select * from views union all select * from trg   union all select * from rls
  union all select * from pol   union all select * from buckets
) s(ord, name, ddl)
order by ord, name;
