import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AppNotification = Tables<"notifications">;

/** Notifications de l'utilisateur connecté (rafraîchies toutes les minutes). */
export const useNotifications = (enabled: boolean) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as AppNotification[];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (ids?: string[]) => {
      const { error } = await supabase.rpc("mark_notifications_read", ids ? { p_ids: ids } : {});
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = query.data ?? [];
  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read_at).length,
    isLoading: query.isLoading,
    markRead: markRead.mutate,
  };
};
