
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { WednesdayReservationWithChild } from "@/types/reservations";
import { ReservationBadges } from "./ReservationBadges";

interface ReservationItemProps {
  reservation: WednesdayReservationWithChild;
  onUpdate: () => void;
}

export const ReservationItem = ({ 
  reservation,
  onUpdate
}: ReservationItemProps) => {
  if (!reservation.available_wednesdays?.date || !reservation.children) {
    console.error("Missing required data in reservation:", {
      hasAvailableWednesdays: !!reservation.available_wednesdays,
      hasChildren: !!reservation.children,
      reservation: reservation
    });
    return (
      <div className="p-3 bg-destructive-soft text-destructive rounded-md">
        <p className="text-sm">Les données de cette réservation sont incomplètes.</p>
        <p className="text-xs mt-1">Veuillez contacter le support si le problème persiste.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 transition-colors hover:bg-surface-muted">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {format(new Date(reservation.available_wednesdays.date), "EEEE d MMMM yyyy", { locale: fr })}
        </span>
        <div className="flex flex-wrap gap-2 mt-1">
          {reservation.without_meal && (
            <span className="text-xs bg-warning-soft text-warning px-2 py-0.5 rounded">
              Sans repas
            </span>
          )}
          {reservation.early_dropoff && (
            <span className="text-xs bg-info-soft text-info px-2 py-0.5 rounded">
              Accueil avant 8h30
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
