import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Profil de la famille connectée (prénom, droits d'accès, état des inscriptions).
 * Partagé par le layout, le tableau de bord et la navigation (cache React Query).
 */
export const useFamilyProfile = () =>
  useQuery({
    queryKey: ["family-profile"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, is_waiting, is_closed, hide_rdv_access, hide_wednesday_access")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...data, email: auth.user.email ?? "" } : null;
    },
  });
