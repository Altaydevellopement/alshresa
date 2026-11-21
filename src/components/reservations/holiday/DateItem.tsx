
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DateCheckbox } from "@/components/ui/date-checkbox";
import { DateOptions } from "./DateOptions";
import { useHolidaySpots } from "@/hooks/useHolidaySpots";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { offerWaitlist } from "@/components/waitlist/waitlistOffer";
import { useHolidayPeriodContext } from "./HolidayPeriodContext";

interface DateItemProps {
  date: Date;
  isSelected: boolean;
  isReserved: boolean;
  withoutMeal: boolean;
  earlyDropoff: boolean;
  onDateToggle: () => void;
  onOptionChange: (option: 'withoutMeal' | 'earlyDropoff', value: boolean) => void;
  isTeenClass: boolean;
  periodId: string;
  childSchoolClass: string;
  isDisabled?: boolean;
}

export const DateItem = ({
  date,
  isSelected,
  isReserved,
  withoutMeal,
  earlyDropoff,
  onDateToggle,
  onOptionChange,
  isTeenClass,
  periodId,
  childSchoolClass,
  isDisabled = false
}: DateItemProps) => {
  const { availableSpots, isFull } = useHolidaySpots(periodId, date, childSchoolClass);
  const { childId, childName } = useHolidayPeriodContext();
  
  // Disable the date if it's reserved, full, or explicitly disabled
  const shouldDisable = isDisabled || isReserved || (isFull && !isReserved);

  return (
    <div className="flex-1">
      <div className="flex items-center space-x-3">
        <DateCheckbox
          checked={isSelected}
          onCheckedChange={onDateToggle}
          disabled={shouldDisable}
        />
        <div className="flex flex-col">
          <span className={`text-sm font-semibold capitalize-first ${shouldDisable ? 'text-muted-foreground' : 'text-foreground'}`}>
            {format(date, "EEEE d MMMM yyyy", { locale: fr })}
          </span>
          {shouldDisable && !isReserved && (
            <span className="text-xs font-medium text-destructive">
              Journée complète
            </span>
          )}
          {isReserved && (
            <span className="text-xs font-medium text-info">
              Déjà réservé
            </span>
          )}
          {!shouldDisable && availableSpots !== null && availableSpots <= 5 && (
            <span className="text-xs font-medium text-warning">
              Plus que {availableSpots} place{availableSpots > 1 ? 's' : ''}
            </span>
          )}
          {isFull && !isReserved && !isDisabled && childId && (
            <Button
              type="button"
              variant="soft"
              size="sm"
              className="mt-2 h-8 w-fit"
              onClick={() =>
                offerWaitlist({
                  childId,
                  childName: childName || "votre enfant",
                  items: [{ kind: "holiday", targetId: periodId, date, withoutMeal: false, earlyDropoff: false }],
                  partial: false,
                })
              }
            >
              <Clock aria-hidden="true" />
              Liste d'attente
            </Button>
          )}
        </div>
      </div>
      
      {isSelected && !isTeenClass && (
        <div className="mt-2 ml-6">
          <DateOptions
            withoutMeal={withoutMeal}
            earlyDropoff={earlyDropoff}
            onOptionChange={onOptionChange}
          />
        </div>
      )}
    </div>
  );
};
