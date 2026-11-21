
import { DateItem } from "./DateItem";
import { useHolidayPeriodContext } from "./HolidayPeriodContext";
import { format } from "date-fns";
import { SpotsBadge } from "./SpotsBadge";
import { useMemo } from "react";
import { useClosedPeriods } from "@/hooks/useClosedPeriods";

interface DateOption {
  date: Date;
  withoutMeal: boolean;
  earlyDropoff: boolean;
}

interface WorkdayDateSelectorProps {
  selectedDates: DateOption[];
  handleDateToggle: (date: Date) => void;
  handleOptionChange: (date: Date, option: 'withoutMeal' | 'earlyDropoff', value: boolean) => void;
  isDateAlreadyReserved: (date: Date) => boolean;
  periodId: string;
}

export const WorkdayDateSelector = ({
  selectedDates,
  handleDateToggle,
  handleOptionChange,
  isDateAlreadyReserved,
  periodId
}: WorkdayDateSelectorProps) => {
  const { holidayPeriod, childInfo } = useHolidayPeriodContext();
  const { isDateClosed } = useClosedPeriods();

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
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6 && !isDateClosed(currentDate)) {
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

  const periodDates = useMemo(() => generateDatesForPeriod(), [holidayPeriod, isDateClosed]);

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
          
          return (
            <div
              key={dateStr}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 transition-colors hover:bg-peach-soft/40"
            >
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
                isTeenClass={false}
                periodId={periodId}
                childSchoolClass={childInfo?.school_class || ""}
                isDisabled={false}
              />
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
