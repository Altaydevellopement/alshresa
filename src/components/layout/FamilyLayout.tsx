import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { BrandMark } from "./BrandMark";
import { FAMILY_NAV, INFO_LINKS, MOBILE_TABS, type NavGroup } from "./familyNav";
import { useFamilyProfile } from "./useFamilyProfile";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useAuth } from "@/hooks/useAuth";

/** Layout de l'espace familles (toutes les pages après connexion). */
export const FamilyLayout = () => {
  const { signOut } = useAuth();
  const { data: profile } = useFamilyProfile();
  const { unreadCount } = useNotifications(true);

  // La navigation suit les droits réels du compte (accès mercredis / rendez-vous)
  const groups: NavGroup[] = useMemo(
    () =>
      FAMILY_NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.requires === "wednesday") return !profile?.hide_wednesday_access;
          if (item.requires === "rdv") return !profile?.hide_rdv_access;
          return true;
        }),
      })),
    [profile],
  );

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  // signOut redirige vers l'accueil une fois la session fermée
  const handleLogout = () => signOut();

  return (
    <AppShell
      brand={<BrandMark to="/dashboard" subtitle="Espace familles" />}
      groups={groups}
      secondaryLinks={INFO_LINKS}
      userLabel={fullName || profile?.email || "Mon compte"}
      userSubLabel={fullName ? profile?.email : undefined}
      onLogout={handleLogout}
      topbarExtras={<NotificationBell />}
      mobileTabs={MOBILE_TABS}
      badges={{ notifications: unreadCount }}
    >
      <Outlet />
    </AppShell>
  );
};

export default FamilyLayout;
