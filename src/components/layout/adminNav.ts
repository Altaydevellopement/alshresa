import {
  LayoutDashboard, ClipboardList, Calendar, Palmtree, CalendarPlus, Users, Baby, UserCheck,
  Settings2, CalendarDays, Calculator, ListOrdered, MessageCircle, Mail, SlidersHorizontal, Gauge,
} from "lucide-react";
import type { NavGroup } from "./familyNav";

/** Navigation de l'administration : toutes les routes existantes sont conservées. */
export const ADMIN_NAV: NavGroup[] = [
  { items: [{ label: "Tableau de bord", href: "/admin", icon: LayoutDashboard }] },
  {
    label: "Réservations",
    icon: ClipboardList,
    items: [
      { label: "Mercredis", href: "/admin/wednesdayreservations", icon: Calendar },
      { label: "Vacances", href: "/admin/holidayreservations", icon: Palmtree },
      { label: "Vue d'ensemble", href: "/admin/reservations", icon: ClipboardList },
      { label: "Nouvelle — mercredi", href: "/admin/reservations/new", icon: CalendarPlus },
      { label: "Nouvelle — vacances", href: "/admin/reservations/new-holiday", icon: CalendarPlus },
      { label: "Nouvelle — Club Ado", href: "/admin/reservations/new-teen-holiday", icon: CalendarPlus },
    ],
  },
  {
    label: "Familles et enfants",
    icon: Users,
    items: [
      { label: "Familles", href: "/admin/profiles", icon: UserCheck },
      { label: "Enfants", href: "/admin/children", icon: Baby },
    ],
  },
  {
    label: "Périodes et capacités",
    icon: Settings2,
    items: [
      { label: "Mercredis", href: "/admin/wednesdays", icon: CalendarDays },
      { label: "Vacances", href: "/admin/holidays", icon: Palmtree },
      { label: "Places mercredis", href: "/admin/spots/wednesday", icon: Calculator },
      { label: "Places vacances", href: "/admin/spots/holiday", icon: Calculator },
      { label: "Places restantes", href: "/admin/spots", icon: Gauge },
    ],
  },
  {
    items: [
      { label: "Liste d'attente", href: "/admin/listeattente", icon: ListOrdered },
      { label: "Rendez-vous", href: "/admin/rdv", icon: MessageCircle },
      { label: "Emails autorisés", href: "/admin/authorized-emails", icon: Mail },
      { label: "Paramètres", href: "/admin/settings", icon: SlidersHorizontal },
    ],
  },
];
