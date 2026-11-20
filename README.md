# Réservations – Espace des 2 Rives

Application de réservation (mercredis, vacances, club ado, rendez-vous) :
React + Vite + Tailwind/shadcn, base de données **Supabase**, hébergement **Vercel**.

## Lancer en local

```bash
npm install
cp .env.example .env   # puis renseigner l'URL et la clé du projet Supabase
npm run dev            # http://localhost:8080
```

## Déploiement sur Vercel

1. Sur vercel.com : *Add New → Project* → importer ce dépôt GitHub.
2. Framework : **Vite** (détecté automatiquement, `vercel.json` fait le reste).
3. *Environment Variables* : ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. *Deploy*.

`vercel.json` redirige toutes les routes vers `index.html` (sinon un rechargement
de `/profile` ou `/admin` renverrait une 404).

## Nouveau projet Supabase

1. Créer le projet sur supabase.com.
2. Appliquer le schéma : SQL Editor → coller/exécuter le contenu de `supabase/migrations`
   (ou `supabase db push` avec la CLI).
3. *Authentication → URL Configuration* :
   - Site URL : `https://VOTRE-PROJET.vercel.app`
   - Redirect URLs : `https://VOTRE-PROJET.vercel.app/**` et `http://localhost:8080/**`
4. Fonctions Edge (emails via Resend) :
   ```bash
   npx supabase login
   npx supabase link --project-ref VOTRE_NOUVEAU_PROJECT_ID
   npx supabase secrets set RESEND_API_KEY=... EMAIL_TO=accueil@e2rives.fr EMAIL_FROM="Réservation <reservation@votre-domaine.fr>"
   npx supabase functions deploy send-reservation-email
   npx supabase functions deploy process-waitlist-notifications
   ```
   `EMAIL_FROM` doit utiliser un domaine vérifié dans Resend (sinon seul
   `onboarding@resend.dev` fonctionne, et uniquement vers l'adresse du compte Resend).
5. Images : déposer `Logolong.png`, `Back.jpg`, `Newfront.jpg`, `flavicone2r.png`
   dans `public/images/`.
6. Créer le premier administrateur : s'inscrire sur le site, puis dans le SQL Editor :
   ```sql
   insert into public.user_roles (user_id, email, role)
   select id, email, 'admin' from auth.users where email = 'votre@email.fr';
   ```
