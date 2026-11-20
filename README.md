# Réservations – Espace des 2 Rives

Application de réservation (mercredis, vacances, club ado, rendez-vous) :
React + Vite + Tailwind/shadcn, base de données **Supabase**, hébergement **Vercel**.

## Nouveautés par rapport à la version Lovable

- **Liste d'attente** (mercredis et vacances) : quand un jour est complet, la famille
  peut inscrire son enfant. Dès qu'une place se libère, le premier inscrit est
  **réservé automatiquement**, reçoit une notification sur le site et un email
  (copie au secrétariat). Pour annuler, la famille écrit au secrétariat.
  Les réservations automatiques s'arrêtent la veille à midi (réglable dans
  *Admin → Liste d'attente*).
- **Plus de surréservation** : la vérification des places et la réservation se
  font côté serveur en une seule opération ; un enfant ne peut plus être réservé
  deux fois le même jour.
- **Sécurité** : la liste des emails autorisés n'est plus lisible publiquement,
  table `admin_users` (mots de passe en clair) supprimée, fonctions d'email
  réservées aux utilisateurs connectés, plus de données personnelles dans la
  console du navigateur.
- **Groupes de classes** gérés au même endroit (catégories + réglages par période,
  ex. CM2 → adolescent l'été) ; noms avec apostrophe acceptés.
- Notifications sur le site (cloche), page « Liste d'attente » pour les familles,
  site plus léger (pages admin chargées à la demande).

## Lancer en local

```bash
npm install
cp .env.example .env   # puis renseigner l'URL et la clé du projet Supabase
npm run dev            # http://localhost:8080
```

## Mise en place

### 1. Nouveau projet Supabase

1. Créer le projet sur supabase.com (région Europe).
2. *SQL Editor* : exécuter, **dans l'ordre**, le contenu de
   - `supabase/migrations/20261121000000_schema_initial.sql`
   - `supabase/migrations/20261121000100_reservations_liste_attente.sql`

   (ou, avec la CLI : `npx supabase link --project-ref <id>` puis `npx supabase db push`).
3. *Authentication → URL Configuration* :
   - Site URL : `https://VOTRE-DOMAINE`
   - Redirect URLs : `https://VOTRE-DOMAINE/**`, `https://*-VOTRE-EQUIPE.vercel.app/**`, `http://localhost:8080/**`
4. *Authentication → Emails* : configurer un SMTP (ex. Resend) pour les emails
   d'inscription et de mot de passe oublié (le SMTP par défaut de Supabase est très limité).

### 2. Reprise des données de l'ancien site

Comptes (avec leurs mots de passe), enfants, réservations, rendez-vous, emails
autorisés, réglages et liste d'attente :

```bash
export ANCIENNE_BASE="postgresql://…"   # ancien projet : Connect > Session pooler
export NOUVELLE_BASE="postgresql://…"   # nouveau projet : Connect > Session pooler
./scripts/migration-donnees.sh
```

Nécessite Docker (ou PostgreSQL 17). Tout est importé en une seule transaction :
en cas d'erreur, rien n'est modifié. Les familles se reconnectent avec leur mot de
passe habituel.

### 3. Fonctions Edge (emails)

```bash
npx supabase login
npx supabase link --project-ref VOTRE_NOUVEAU_PROJECT_ID
npx supabase secrets set RESEND_API_KEY=re_xxx \
  EMAIL_FROM="Espace des 2 Rives <reservation@e2rives.fr>" \
  EMAIL_TO=accueil@e2rives.fr \
  SITE_URL=https://VOTRE-DOMAINE
npx supabase functions deploy send-reservation-email
npx supabase functions deploy send-notifications
```

`EMAIL_FROM` doit utiliser un domaine vérifié dans Resend.

Puis *Integrations → Cron → Create job* :
- nom `send-notifications`, planification `* * * * *` (chaque minute)
- type **Supabase Edge Function**, fonction `send-notifications`, méthode POST

Cette tâche envoie les emails « place obtenue » et clôture les listes d'attente
des jours passés.

### 4. Vercel

1. *Add New → Project* → importer ce dépôt GitHub (framework **Vite** détecté).
2. *Environment Variables* : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`
   (Supabase → Project Settings → API).
3. *Deploy*, puis ajouter le domaine dans *Settings → Domains*.

`vercel.json` redirige toutes les routes vers `index.html` (sinon un rechargement
de `/profile` ou `/admin` renverrait une 404).

### 5. Images

Déposer `Logolong.png`, `Back.jpg`, `Newfront.jpg`, `flavicone2r.png` dans `public/images/`.

### 6. Premier administrateur (si les données ne sont pas reprises)

S'inscrire sur le site, puis dans le SQL Editor :

```sql
insert into public.user_roles (user_id, email, role)
select id, email, 'admin' from auth.users where email = 'votre@email.fr';
```

## Base de données : repères

| Élément | Rôle |
| --- | --- |
| `book_wednesday`, `book_holiday_day` | Réservation atomique (vérifie les places, les doublons, les fermetures) |
| `join_waitlist`, `leave_waitlist`, `get_waitlist` | Liste d'attente (position par ordre d'arrivée) |
| `process_waitlist_slot` | Réservation automatique du premier inscrit (déclenchée à chaque place libérée ou hausse de capacité) |
| `notifications` | Notifications du site ; `email_status` suivi par la fonction `send-notifications` |
| `global_settings.waitlist_enabled / waitlist_cutoff_hours` | Activation et délai de clôture de la liste d'attente |
| `supabase/legacy_migrations/` | Anciennes migrations Lovable (archive, ne pas exécuter) |
