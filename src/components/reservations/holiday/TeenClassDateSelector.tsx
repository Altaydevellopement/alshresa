
import { DateItem } from "./DateItem";
import { useHolidayPeriodContext } from "./HolidayPeriodContext";
import { format, isWeekend } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { SpotsBadge } from "./SpotsBadge";
import { useClosedPeriods } from "@/hooks/useClosedPeriods";

interface DateOption {
  date: Date;
  withoutMeal: boolean;
  earlyDropoff: boolean;
}

interface TeenClassDateSelectorProps {
  selectedDates: DateOption[];
  handleDateToggle: (date: Date) => void;
  handleOptionChange: (date: Date, option: 'withoutMeal' | 'earlyDropoff', value: boolean) => void;
  isDateAlreadyReserved: (date: Date) => boolean;
  periodId: string;
}

export const TeenClassDateSelector = ({
  selectedDates,
  handleDateToggle,
  handleOptionChange,
  isDateAlreadyReserved,
  periodId
}: TeenClassDateSelectorProps) => {
  const { holidayPeriod, childInfo } = useHolidayPeriodContext();
  const { isDateClosed } = useClosedPeriods();

  // Générer toutes les dates de la période
  const generateDatesForPeriod = () => {
    if (!holidayPeriod) return [];

    try {
      let startDate: Date;
      let endDate: Date;

      try {
        startDate = new Date(holidayPeriod.start_date);
        if (isNaN(startDate.getTime())) {
          console.error("Start date invalide:", holidayPeriod.start_date);
          return [];
        }
      } catch (err) {
        console.error("Erreur lors du parsing de la start_date:", err);
        return [];
      }

      try {
        endDate = new Date(holidayPeriod.end_date);
        if (isNaN(endDate.getTime())) {
          console.error("End date invalide:", holidayPeriod.end_date);
          return [];
        }
      } catch (err) {
        console.error("Erreur lors du parsing de la end_date:", err);
        return [];
      }

      const dateArray = [];
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // Pour Club Ado, on inclut tous les jours sauf les jours exclus
        if (!isDateClosed(currentDate)) {
          dateArray.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dateArray;
    } catch (error) {
      console.error("Erreur lors de la génération des dates:", error);
      return [];
    }
  };

  const periodDates = generateDatesForPeriod();

  const selectedDatesMap = new Map(
    selectedDates.map(d => {
      if (!(d.date instanceof Date) || isNaN(d.date.getTime())) {
        console.error("Date invalide détectée dans selectedDates:", d.date);
        return ["invalid-date", d];
      }
      const dateStr = format(new Date(d.date), 'yyyy-MM-dd');
      return [dateStr, d];
    })
  );

  return (
    <div>
      <div className="space-y-2">
        {periodDates.map(date => {
          const dateStr = format(new Date(date), 'yyyy-MM-dd');
          const selectedDate = selectedDatesMap.get(dateStr) as DateOption | undefined;
          const isSelected = !!selectedDate;
          const isReserved = isDateAlreadyReserved(date);
          const isWeekendDay = isWeekend(date);
          
          return (
            <div
              key={dateStr}
              className={`flex items-start justify-between gap-3 rounded-xl border border-border/70 px-3 py-3 transition-colors hover:bg-peach-soft/40 ${
                isWeekendDay ? 'bg-surface-muted' : 'bg-card'
              }`}
            >
              <div className="flex-1 flex items-center">
                <DateItem
                  date={date}
                  isSelected={isSelected}
                  isReserved={isReserved}
                  withoutMeal={selectedDate?.withoutMeal || false}
                  earlyDropoff={selectedDate?.earlyDropoff || false}
                  onDateToggle={() => handleDateToggle(date)}
                  onOptionChange={(option, value) => 
                    handleOptionChange(date, option, value)
                  }
                  isTeenClass={true}
                  periodId={periodId}
                  childSchoolClass={childInfo?.school_class || ""}
                  isDisabled={false}
                />
                
                {isWeekendDay && (
                  <Badge variant="neutral" className="ml-2">
                    Week-end
                  </Badge>
                )}
              </div>
              
              <SpotsBadge
                availableSpots={null}
                isFull={false}
                schoolClass={childInfo?.school_class || ""}
                isLoading={false}
                periodId={periodId}
                date={date}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
