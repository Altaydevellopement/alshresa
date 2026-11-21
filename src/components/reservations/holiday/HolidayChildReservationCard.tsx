import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";
import { HolidayReservationWithChild } from "@/types/reservations";
interface ChildReservationCardProps {
  childName: string;
  schoolClass: string;
  reservations: HolidayReservationWithChild[];
  onUpdate: () => void;
}
export const HolidayChildReservationCard = ({
  childName,
  schoolClass,
  reservations,
  onUpdate
}: ChildReservationCardProps) => {
  return <Card className="overflow-hidden border-border shadow-sm h-full">
      <div className="border-b border-border bg-peach-soft p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full bg-card">
              <User className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{childName}</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">{schoolClass}</p>
            </div>
          </div>
          <Badge variant="secondary" className="h-5 text-[11px]">
            {reservations.length} réservation{reservations.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>
      <div className="divide-y divide-border bg-card">
        {reservations.map(reservation => <div key={reservation.id} className="flex flex-col p-3 transition-colors hover:bg-surface-muted">
            <span className="text-sm font-medium text-foreground text-left">
              {new Date(reservation.reservation_date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {reservation.without_meal && <span className="text-xs bg-warning-soft px-2 py-0.5 rounded text-warning">
                  Sans repas
                </span>}
              {reservation.early_dropoff && <span className="text-xs bg-info-soft text-info px-2 py-0.5 rounded">
                  Accueil avant 8h30
                </span>}
            </div>
          </div>)}
      </div>
    </Card>;
};