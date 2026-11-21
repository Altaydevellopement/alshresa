
import { Badge } from "@/components/ui/badge";
import { useHolidaySpots } from "@/hooks/useHolidaySpots";
import { useEffect, useState } from "react";

interface HolidaySpotsBadgeProps {
  periodId: string;
  date: string; // Format YYYY-MM-DD
  childSchoolClass: string;
}

const getSpotsBadgeColor = (spots: number | null, loading: boolean) => {
  if (loading) return "bg-info-soft text-info";
  if (spots === null || spots === undefined) return "bg-muted text-muted-foreground";
  if (spots <= 0) return "bg-destructive-soft text-destructive";
  if (spots <= 5) return "bg-warning-soft text-warning";
  return "bg-success-soft text-success";
};

const getSpotsBadgeText = (spots: number | null, loading: boolean = false) => {
  if (loading) {
    return "Calcul...";
  }
  
  if (spots === null || spots === undefined) {
    return "N/A";
  }
  
  if (spots <= 0) {
    return "Complet";
  }
  
  return `${spots} place${spots > 1 ? 's' : ''}`;
};

export const HolidaySpotsBadge = ({ periodId, date, childSchoolClass }: HolidaySpotsBadgeProps) => {
  const [displayText, setDisplayText] = useState<string>("");
  const [badgeColor, setBadgeColor] = useState<string>("");
  
  // Convertir la date string en objet Date
  const dateObj = new Date(date + 'T00:00:00.000Z');
  
  const { availableSpots, isLoading } = useHolidaySpots(periodId, dateObj, childSchoolClass);
  
  useEffect(() => {
    console.log("HolidaySpotsBadge rendering with:", { 
      periodId,
      date,
      childSchoolClass,
      availableSpots, 
      isLoading,
      valueType: availableSpots === null ? 'null' : typeof availableSpots 
    });
    
    setDisplayText(getSpotsBadgeText(availableSpots, isLoading));
    setBadgeColor(getSpotsBadgeColor(availableSpots, isLoading));
  }, [availableSpots, isLoading, periodId, date, childSchoolClass]);

  return (
    <Badge 
      variant="secondary" 
      className={`${badgeColor} border-none text-[10px] md:text-xs font-medium`}
    >
      {displayText}
    </Badge>
  );
};
