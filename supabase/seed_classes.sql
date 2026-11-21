-- ============================================================================
-- Classes scolaires par défaut (nouveau projet sans reprise des données)
-- À exécuter dans Supabase > SQL Editor. Peut être relancé sans créer de doublon.
--
-- ⚠️ Si vous reprenez ensuite les données de l'ancien site (scripts/migration-donnees.sh),
-- vos anciennes classes seront ajoutées à celles-ci : supprimez d'abord les doublons
-- éventuels (même classe écrite différemment) dans Table Editor > school_class.
-- ============================================================================

-- Liste proposée lors de l'ajout d'un enfant (ordre d'affichage = "order")
insert into public.school_class (name, level, category, "order") values
  ('PS', 1, 'maternelle', 1),
  ('MS', 2, 'maternelle', 2),
  ('GS', 3, 'maternelle', 3),
  ('CP', 4, 'primaire', 4),
  ('CE1', 5, 'primaire', 5),
  ('CE2', 6, 'primaire', 6),
  ('CM1', 7, 'primaire', 7),
  ('CM2', 8, 'primaire', 8),
  ('6ème', 9, 'college', 9),
  ('5ème', 10, 'college', 10),
  ('4ème', 11, 'college', 11),
  ('3ème', 12, 'college', 12),
  ('Seconde', 13, 'lycee', 13),
  ('Première', 14, 'lycee', 14),
  ('Terminale', 15, 'lycee', 15)
on conflict (name) do nothing;

-- Groupe de chaque classe (maternelle / primaire / adolescent) utilisé pour les places,
-- l'administration et la liste d'attente
insert into public.school_class_categories (name, category) values
  ('PS', 'maternelle'), ('MS', 'maternelle'), ('GS', 'maternelle'),
  ('CP', 'primaire'), ('CE1', 'primaire'), ('CE2', 'primaire'), ('CM1', 'primaire'), ('CM2', 'primaire'),
  ('6ème', 'adolescent'), ('5ème', 'adolescent'), ('4ème', 'adolescent'), ('3ème', 'adolescent'),
  ('Seconde', 'adolescent'), ('Première', 'adolescent'), ('Terminale', 'adolescent')
on conflict (name) do nothing;

select count(*) as classes from public.school_class;
