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
