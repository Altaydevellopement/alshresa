import { WednesdayReservationContent } from "@/components/reservations/WednesdayReservationContent";
import { WednesdayReservationsList } from "@/components/reservations/WednesdayReservationsList";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, FullPageLoader, PageHeader } from "@/components/design";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import { supabase } from "@/integrations/supabase/client";

const WednesdayReservations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const { wednesdayAccess, loading: accessLoading } = useAccessControl();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && !loading) {
          toast({
            title: "Accès non autorisé",
            description: "Veuillez vous connecter pour accéder à cette page",
            variant: "destructive",
          });
          navigate("../login", { relative: "path" });
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("Error checking session:", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la vérification de votre session",
          variant: "destructive",
        });
        navigate("../login", { relative: "path" });
      }
    };

    initializeAuth();
  }, [navigate, toast, loading]);

  if (loading || !isInitialized || accessLoading) {
    return <FullPageLoader />;
  }

  if (!wednesdayAccess) {
    return (
      <div className="space-y-6">
        <PageHeader icon={CalendarDays} eyebrow="Réserver" title="Mercredis" />
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Réservation des mercredis indisponible"
            description="La réservation en ligne des mercredis n'est pas disponible pour le moment. Nous vous informerons dès qu'elle sera accessible."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={CalendarDays}
        eyebrow="Réserver"
        title="Mercredis"
        description="Réservez un ou plusieurs mercredis pour votre enfant en quelques étapes."
      />

      <WednesdayReservationContent />

      <Card>
        <CardContent className="pt-5 md:pt-6">
          <WednesdayReservationsList />
        </CardContent>
      </Card>
    </div>
  );
};

export default WednesdayReservations;
