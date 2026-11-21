import { UtensilsCrossed, Clock } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReservationBadgesProps {
  withoutMeal: boolean;
  earlyDropoff: boolean;
}

export const ReservationBadges = ({ withoutMeal, earlyDropoff }: ReservationBadgesProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <TooltipProvider>
        {withoutMeal && (
          <Tooltip>
            <TooltipTrigger>
              <div className="inline-flex items-center rounded-full bg-destructive-soft p-2 text-destructive">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sans repas</p>
            </TooltipContent>
          </Tooltip>
        )}
        {earlyDropoff && (
          <Tooltip>
            <TooltipTrigger>
              <div className="inline-flex items-center rounded-full bg-info-soft p-2 text-primary">
                <Clock className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Accueil avant 8h30</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
};