# Refonte Coral Soft — audit et plan

## 1. Diagnostic technique

**Stack** : React 18 + Vite 5 + TypeScript, Tailwind 3 + shadcn/ui (Radix), TanStack Query,
React Router 6, Supabase (RPC `book_wednesday`, `book_holiday_day`, `join_waitlist`…).

**Organisation actuelle**

| Zone | Constat |
| --- | --- |
| Layouts | Aucun layout partagé : chaque page famille rend `<Navbar />` et son propre fond `from-blue-50 to-indigo-50`. L'admin a une barre horizontale de 12 liens. |
| Thème | `index.css` : palette bleu/violet (primary 195°), dégradés, `glass`. Police Inter non chargée. Couleurs codées en dur dans les composants (`text-gray-600`, `bg-green-50`, `border-blue-100`…). |
| Réservations | 3 parcours : `WednesdayReservationContent` (hook `useReservations`), `HolidayReservationContent` et `TeenHolidayReservationContent` (hook `useHolidayReservation`). Réutilisés par l'admin (`AdminReservationForm`, `AdminNewHolidayReservation`, `AdminNewTeenHolidayReservation`). |
| Règles métier dans l'UI | `ChildSelector` filtre selon `location.pathname` (`/holiday-reservations`, `/teenholiday-reservations`) et applique la règle CM2 été (ETE-01→04). `HolidayReservationContent` exclut les CM2 en début d'été. `HolidayDateSelector` bascule vers `TeenClassDateSelector`. Minimum de jours : `validateMinimumDays` + `MinimumDaysDialog`. Fermetures : `useClosedPeriods`. Accès : `useAccessControl` (hide_rdv/wednesday_access), `profiles.is_waiting / is_closed`. |
| UX à corriger | Alertes clignotantes (`animate-blink`), pourcentage de progression aléatoire (`Math.random()` dans `WednesdayReservationContent`), dates complètes non cliquables donc liste d'attente difficilement accessible, textes « contactez l'accueil pour la liste d'attente » obsolètes. |
| Lint | 97 erreurs / 16 avertissements préexistants (`any` surtout). Objectif : ne pas en ajouter. |

**Risques identifiés**

1. Changer les URL des pages de réservation casserait `ChildSelector` → **les routes sont conservées à l'identique**.
2. Réécrire la logique de réservation dans un nouvel assistant dupliquerait les règles → l'assistant est construit **à l'intérieur** des composants existants (mêmes hooks, mêmes validations, même `handleSubmit`).
3. Les composants de réservation sont partagés avec l'admin → l'assistant doit fonctionner en mode admin (`AdminChildSelector`, `disableMinimumDaysRule`, `enforceCM2Summer`).

## 2. Structure cible

```
src/
  components/
    design/            Design system : PageHeader, StatCard, EmptyState, StatusBadge,
                       SectionCard, Stepper, SelectableCard, LoadingState
    layout/            FamilyLayout (sidebar + mobile), AdminLayout, nav config, UserMenu
    dashboard/         Widgets du tableau de bord familles
    admin/dashboard/   Widgets du tableau de bord admin
    reservations/      Composants existants + BookingStepper, BookingSummary
  pages/
    Dashboard.tsx      Accueil familles (nouveau, /dashboard)
    MyReservations.tsx Mes réservations (nouveau, /my-reservations)
```

## 3. Plan

- **Phase B** — Tokens Coral Soft (HSL), Plus Jakarta Sans, composants design, variantes boutons/cartes/badges, `prefers-reduced-motion`.
- **Phase C** — `FamilyLayout` (barre latérale desktop, barre + tiroir mobile), tableau de bord, assistant 4 étapes (enfant → période → dates/options → récapitulatif) dans les 3 parcours, enfants, mes réservations, liste d'attente, notifications, compte, rendez-vous.
- **Phase D** — `AdminLayout` (barre latérale groupée), tableau de bord avec indicateurs réels, harmonisation des écrans admin.
- **Phase E** — build, lint, captures responsive avec Supabase simulé, corrections.

Toutes les routes existantes sont conservées ; seules `/dashboard` et `/my-reservations` sont ajoutées.
Aucune migration, fonction SQL ou politique RLS n'est modifiée.

## 4. Réalisé

### Nouveaux composants

```
src/components/
  design/                 PageHeader, StatCard, EmptyState / ErrorState / LoadingState / FullPageLoader,
                          StatusBadge, Stepper, SelectableCard + InitialsAvatar (index.ts)
  layout/                 AppShell (barre latérale, tiroir et onglets mobiles, lien d'évitement),
                          FamilyLayout, AdminLayout, BrandMark, familyNav.ts, adminNav.ts, useFamilyProfile
  reservations/wizard/    BookingWizard (+ StepPanel, WizardNav), HolidayWizard, BookingSummary
  waitlist/               WaitlistStatus
  admin/settings/         WaitlistSettingsCard
src/hooks/family/         useFamilyReservations, useFamilyChildren, useUpcomingPeriods
src/pages/                Dashboard (/dashboard), MyReservations (/my-reservations), admin/AdminSettings (/admin/settings)
```

### Utiliser le design system

- Couleurs : uniquement les classes sémantiques (`bg-primary`, `text-muted-foreground`, `bg-peach-soft`,
  `bg-sage-soft`, `text-success`, `bg-warning-soft`, `border-border`…). Les valeurs sont dans `src/index.css`.
- Boutons : `<Button loading={isSubmitting}>` gère l'indicateur et la désactivation.
- Badges : `variant="success" | "warning" | "info" | "neutral" | "coral" | "destructive"` ou `<StatusBadge status="confirmed" />`.
- Pages : `<PageHeader icon title description actions />` puis des `Card`. États : `LoadingState`, `ErrorState`, `EmptyState`.
- Dates en français : classe `capitalize-first` (majuscule initiale uniquement).

### Fonctionnalités préservées

Routes et URL (toutes conservées), contrôles d'accès (`ProtectedRoute`, `useAdminAuth`, `useAccessControl`,
`is_waiting` / `is_closed`), règles de filtrage des enfants (`ChildSelector`, `useCategoryFiltering`, règle CM2 été),
minimum de jours (`validateMinimumDays` + `MinimumDaysDialog`), jours fermés (`useClosedPeriods`),
réservations atomiques (`book_wednesday`, `book_holiday_day`), liste d'attente (`join_waitlist`, `leave_waitlist`,
`get_waitlist`, `admin_process_waitlist`, réglages, export PDF), emails (`send-reservation-email`), exports admin,
dialogues de confirmation existants. Aucune migration, fonction SQL ni politique RLS modifiée.

### Écarts assumés par rapport au cahier des charges

- **Ordre des étapes vacances / Club Ado** : période → enfant (et non l'inverse), car l'éligibilité de l'enfant
  dépend de la période (catégories, CM2 été). Choisir l'enfant d'abord aurait conduit à le désélectionner ensuite.
- **Mercredis** : 3 étapes (pas de période à choisir).
- **Corail des boutons** : `#B4493E` au lieu de `#F47F73` / `#C35F54` pour respecter le contraste AA du texte blanc.
- **Admin, nouvelle réservation vacances** : l'assistant présente aussi la période en premier (avant : enfant puis période).

## 5. Tests

| Vérification | Type | Résultat |
| --- | --- | --- |
| `npm run build` | automatisé | ✅ |
| `tsc --noEmit` | automatisé | ✅ |
| `npm run lint` | automatisé | 95 erreurs / 17 avertissements, **tous préexistants** (97 / 16 avant la refonte) ; 0 sur les nouveaux fichiers |
| Captures mobile 390 px, tablette 820 px, desktop 1440 px (11 écrans) | Playwright + Supabase simulé | ✅ aucune erreur JS (seule la connexion temps réel WebSocket échoue, attendu sans serveur) |
| Assistant vacances : période → enfant → 3 dates → récapitulatif → confirmation | Playwright + Supabase simulé | ✅ `book_holiday_day` appelé pour les 3 dates seulement après confirmation, dialogue de succès |
| Retour arrière depuis le récapitulatif | Playwright | ✅ les dates restent sélectionnées |
| Minimum 3 jours / semaine | Playwright | ✅ dialogue affiché, passage bloqué |
| Journée complète → « Liste d'attente » → inscription | Playwright | ✅ `join_waitlist` appelé, position affichée |
| Assistant mercredis (mobile) jusqu'à la confirmation | Playwright | ✅ `book_wednesday` appelé, succès |
| Navigation clavier (Tab / Espace / Entrée) dans l'assistant | Playwright | ✅ focus déplacé en tête d'étape |
| Connexion / déconnexion réelles, RLS, emails, données réelles | — | ⚠️ **non testé** : nécessite le projet Supabase |

Les scripts Playwright ont servi à la vérification mais ne sont pas ajoutés au dépôt (pas d'infrastructure de test
existante ; à discuter avant d'ajouter une dépendance).
