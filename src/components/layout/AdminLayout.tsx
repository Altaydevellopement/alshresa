import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "./AppShell";
import { BrandMark } from "./BrandMark";
import { ADMIN_NAV } from "./adminNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Layout de l'administration (distinct de l'espace familles). */
export const AdminLayout = () => {
  // Comportement d'origine : retour vers la page de connexion admin
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion");
      return;
    }
    window.location.href = "/admin-login";
  };
  const { data: email } = useQuery({
    queryKey: ["admin-current-email"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.email ?? "",
  });

  return (
    <AppShell
      brand={<BrandMark to="/admin" subtitle="Administration" />}
      groups={ADMIN_NAV}
      userLabel={email || "Administrateur"}
      userSubLabel="Secrétariat — accès administrateur"
      onLogout={handleLogout}
    >
      <Outlet />
    </AppShell>
  );
};
