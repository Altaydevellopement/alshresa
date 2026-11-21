import { useAuth } from "@/hooks/useAuth";
import { HolidayReservationContent } from "@/components/reservations/HolidayReservationContent";
import { HolidayReservationsList } from "@/components/reservations/HolidayReservationsList";
import { CalendarClock, CalendarX, Info, Lock, Palmtree, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/design";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
const HolidayReservations = () => {
  const {
    user,
    loading,
    initialized,
    session
  } = useAuth();
  const navigate = useNavigate();
  const [isWaiting, setIsWaiting] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  useEffect(() => {

    const checkAccess = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {

        // Récupérer les états directement de la base de données avec gestion d'erreurs améliorée
        const {
          data,
          error
        } = await supabase.from('profiles').select('is_waiting, is_closed').eq('id', user.id).maybeSingle();
        if (error) {
          console.error('[HolidayReservations] Erreur lors de la récupération du profil:', error);
          setProfileError(`Erreur d'accès au profil: ${error.message}`);
          toast.error("Erreur lors de la vérification du profil utilisateur");
          return;
        }
        if (!data) {
          setProfileError("Profil utilisateur non trouvé");
          return;
        }
        setIsWaiting(data.is_waiting || false);
        setIsClosed(data.is_closed || false);
        setProfileError(null);
      } catch (error: any) {
        console.error("[HolidayReservations] Erreur inattendue lors de la récupération des données:", error);
        setProfileError(`Erreur inattendue: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    // Vérifier l'accès seulement si l'utilisateur est authentifié et l'initialisation terminée
    if (initialized && !loading) {
      checkAccess();
    }

  }, [user, loading, initialized, session]);

  const header = (
    <PageHeader
      icon={Palmtree}
      eyebrow="Réserver"
      title="Vacances scolaires"
      description="Réservez les journées de vacances de vos enfants de maternelle et primaire en quelques étapes."
    />
  );

  // Si l'utilisateur n'est pas authentifié après l'initialisation, afficher un message
  if (initialized && !loading && !user) {
    return (
      <Card>
        <EmptyState
          icon={Lock}
          title="Connexion requise"
          description="Vous devez être connecté pour accéder aux réservations."
          action={<Button onClick={() => navigate("/login")}>Se connecter</Button>}
        />
      </Card>
    );
  }

  // Chargement de la session ou du profil
  if (loading || isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState rows={4} />
      </div>
    );
  }

  // Erreur de lecture du profil
  if (profileError) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <ErrorState title="Erreur lors du chargement du profil" description={profileError} onRetry={() => window.location.reload()} />
        </Card>
      </div>
    );
  }

  // Inscriptions pas encore ouvertes pour ce compte
  if (isWaiting) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <EmptyState
            icon={CalendarClock}
            title="Réservations bientôt disponibles"
            description="Les inscriptions ne sont pas encore ouvertes. Vous serez informé(e) par email dès leur lancement."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Sélectionnez au moins 3 jours par semaine. Si une journée est complète, vous pouvez inscrire votre enfant sur la
          liste d'attente directement depuis le choix des dates : il sera réservé automatiquement si une place se libère.
        </AlertDescription>
      </Alert>

      {isClosed ? (
        <Card>
          <EmptyState
            icon={CalendarX}
            title="Réservations clôturées"
            description="Les inscriptions sont désormais fermées. Vous serez informé(e) par email dès l'ouverture des inscriptions pour les prochaines vacances."
          />
        </Card>
      ) : (
        <HolidayReservationContent invertSelectors={true} filterTeenPeriods={false} />
      )}

      <Card>
        <CardContent className="pt-5 md:pt-6">
          <HolidayReservationsList />
        </CardContent>
      </Card>
    </div>
  );
};
export default HolidayReservations;