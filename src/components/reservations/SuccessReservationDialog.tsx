
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SuccessReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludedFullDates?: Date[];
}

export const SuccessReservationDialog = ({
  open,
  onOpenChange,
  excludedFullDates = [],
}: SuccessReservationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réservation confirmée</DialogTitle>
          <DialogDescription className="space-y-4">
            <p>
              Votre réservation a été enregistrée avec succès. Vous pouvez consulter ci-dessous l'ensemble des réservations pour vos enfants.
            </p>
            
            {excludedFullDates.length > 0 && (
              <div className="p-4 bg-warning-soft border border-warning/25 rounded-md">
                <p className="text-warning font-medium mb-2">
                  Dates non réservées (mercredis complets) :
                </p>
                <ul className="list-disc list-inside text-warning text-sm space-y-1">
                  {excludedFullDates.map((date, index) => (
                    <li key={index}>
                      {format(date, "EEEE d MMMM yyyy", { locale: fr })}
                    </li>
                  ))}
                </ul>
                <p className="text-warning text-sm mt-2">
                  Ces mercredis étaient complets. Si vous avez inscrit votre enfant sur liste d'attente, il sera réservé automatiquement dès qu'une place se libère et le secrétariat vous en informera.
                </p>
              </div>
            )}
            
            <p className="text-destructive font-medium">
              Merci de nous informer au plus tôt de toute absence de votre enfant afin d'attribuer la place à un enfant en liste d'attente.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
