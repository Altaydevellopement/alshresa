
import { EmptyReservations } from "./EmptyReservations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { HolidayChildReservationCard } from "./holiday/HolidayChildReservationCard";
import { useHolidayReservations } from "@/hooks/useHolidayReservations";
import { HolidayReservationWithChild } from "@/types/reservations";
import { useSchoolClassUtils } from "@/hooks/useSchoolClassUtils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

type GroupedReservations = Record<string, {
  childName: string;
  schoolClass: string;
  reservations: HolidayReservationWithChild[];
}>;

export const HolidayReservationsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeenPage = window.location.pathname === "/teenholiday-reservations";
  const { reservations, isError, error, refetch } = useHolidayReservations();
  const { isTeenClassSync } = useSchoolClassUtils();
  if (error) console.log("3. Erreur détectée:", error);

  if (isError) {
    const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
    if (errorMessage.includes("Not authenticated") || !user) {
      return (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <div>Vous devez être connecté pour voir vos réservations.</div>
            <Button 
              onClick={() => navigate("/login", { state: { from: location.pathname } })}
              className="w-full sm:w-auto"
              variant="outline"
            >
              Se connecter
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col gap-3">
          <div>Une erreur est survenue lors du chargement des réservations.</div>
          <Button onClick={() => refetch()} className="w-full sm:w-auto" variant="outline">
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!reservations || reservations.length === 0) {
    return <EmptyReservations />;
  }

  const filteredReservations = reservations
    .filter(reservation => {
      if (!reservation || !reservation.children || !reservation.children.school_class || !reservation.period_id) {
        console.warn("Données manquantes pour la réservation:", reservation?.id);
        return false;
      }

      const schoolClass = reservation.children.school_class;
      const isTeenClass = isTeenClassSync(schoolClass, reservation.period_id);
      const isCm2 = schoolClass.toUpperCase() === "CM2";

      const keepReservation = isTeenPage ? (isTeenClass || isCm2) : !isTeenClass;

      return keepReservation;
    });

  if (filteredReservations.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          Aucune réservation trouvée pour {isTeenPage ? "les adolescents" : "les enfants de maternelle et primaire"}.
        </p>
      </div>
    );
  }

  const reservationsByChild = filteredReservations.reduce((acc, reservation) => {
    const childId = reservation.child_id;
    if (!acc[childId]) {
      acc[childId] = {
        childName: `${reservation.children.first_name} ${reservation.children.last_name}`,
        schoolClass: reservation.children.school_class,
        reservations: [],
      };
    }
    acc[childId].reservations.push(reservation);
    return acc;
  }, {} as GroupedReservations);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">
          Vos {isTeenPage ? "activités Club Ado" : "vacances"} réservées (sous réserve de règlement)
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Pour toute modification de vos réservations (ajout ou suppression de journées), merci de contacter l'accueil.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(reservationsByChild).map(([childId, data]) => (
          <HolidayChildReservationCard
            key={childId}
            childName={data.childName}
            schoolClass={data.schoolClass}
            reservations={data.reservations}
            onUpdate={refetch}
          />
        ))}
      </div>
    </div>
  );
};
