import {
  LayoutDashboard, CalendarPlus, Calendar, Palmtree, Users, Baby, ClipboardList,
  Clock, Bell, CalendarDays, UserCircle, FileText, Euro, BookOpen, type LucideIcon,
} from "lucide-react";

export interface NavLinkItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** clé de droit : l'entrée est masquée si le droit est absent */
  requires?: "wednesday" | "rdv";
  badge?: "notifications";
}

export interface NavGroup {
  label?: string;
  icon?: LucideIcon;
  items: NavLinkItem[];
}

export const FAMILY_NAV: NavGroup[] = [
  { items: [{ label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Réserver",
    icon: CalendarPlus,
    items: [
      { label: "Mercredis", href: "/wednesday-reservations", icon: Calendar, requires: "wednesday" },
      { label: "Vacances scolaires", href: "/holiday-reservations", icon: Palmtree },
      { label: "Club Ado", href: "/teenholiday-reservations", icon: Users },
    ],
  },
  {
    items: [
      { label: "Mes enfants", href: "/children", icon: Baby },
      { label: "Mes réservations", href: "/my-reservations", icon: ClipboardList },
      { label: "Liste d'attente", href: "/waitlist", icon: Clock },
      { label: "Notifications", href: "/notifications", icon: Bell, badge: "notifications" },
      { label: "Rendez-vous", href: "/rdv", icon: CalendarDays, requires: "rdv" },
      { label: "Mon compte", href: "/profile", icon: UserCircle },
    ],
  },
];

export const INFO_LINKS: NavLinkItem[] = [
  { label: "Programme des vacances", href: "/holiday-program", icon: BookOpen },
  { label: "Tarifs", href: "/prices", icon: Euro },
  { label: "Règlement", href: "/terms-of-operation", icon: FileText },
  { label: "CGU", href: "/terms-of-service", icon: FileText },
];

/** Raccourcis de la barre inférieure mobile */
export const MOBILE_TABS: NavLinkItem[] = [
  { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
  { label: "Réserver", href: "/holiday-reservations", icon: CalendarPlus },
  { label: "Réservations", href: "/my-reservations", icon: ClipboardList },
  { label: "Alertes", href: "/notifications", icon: Bell, badge: "notifications" },
];
