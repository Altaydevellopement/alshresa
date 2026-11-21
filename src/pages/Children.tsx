import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Baby } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Child } from "@/types/profile";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState, PageHeader } from "@/components/design";
import { ChildrenList } from "@/components/profile/ChildrenList";

const Children = () => {
  const navigate = useNavigate();

  const { data: children = [], isLoading, error } = useQuery({
    queryKey: ["children"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("profile_id", user.id);

      if (error) throw error;
      return data as Child[];
    },
  });

  const header = (
    <PageHeader
      icon={Baby}
      title="Mes enfants"
      description="Les fiches de vos enfants servent à vérifier leur groupe (maternelle, primaire, ado) lors des réservations."
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <ErrorState
            description="Une erreur est survenue lors du chargement des données. Veuillez réessayer ou vous reconnecter."
            onRetry={() => navigate("/login")}
            retryLabel="Se reconnecter"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      {isLoading ? <LoadingState rows={3} /> : <ChildrenList children={children} />}
    </div>
  );
};

export default Children;
