
import { Badge } from "@/components/ui/badge";
import { useHolidaySpots } from "@/hooks/useHolidaySpots";
import { useEffect, useState } from "react";

interface SpotsBadgeProps {
  availableSpots: number | null;
  isFull: boolean;
  schoolClass?: string;
  isLoading?: boolean;
  periodId?: string;
  date?: Date;
}

type SpotsVariant = "info" | "neutral" | "destructive" | "warning" | "success";
const getSpotsBadgeColor = (spots: number | null, loading: boolean): SpotsVariant => {
  if (loading) return "info";
  if (spots === null || spots === undefined) return "neutral";
  if (spots <= 0) return "destructive";
  if (spots <= 5) return "warning";
  return "success";
};

const getSpotsBadgeText = (spots: number | null, schoolClass: string = "", loading: boolean = false) => {
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

export const SpotsBadge = ({ 
  availableSpots: propAvailableSpots, 
  isFull: propIsFull, 
  schoolClass = "", 
  isLoading: propIsLoading = false,
  periodId,
  date
}: SpotsBadgeProps) => {
  const [displayText, setDisplayText] = useState<string>("");
  const [badgeColor, setBadgeColor] = useState<SpotsVariant>("neutral");
  
  // Si periodId et date sont fournis, utiliser le hook pour obtenir les données actualisées
  const { availableSpots: hookAvailableSpots, isLoading: hookIsLoading } = useHolidaySpots(
    periodId || "", 
    date || new Date(), 
    schoolClass
  );
  
  // Utiliser les données du hook si disponibles, sinon utiliser les props
  const availableSpots = periodId && date ? hookAvailableSpots : propAvailableSpots;
  const isLoading = periodId && date ? hookIsLoading : propIsLoading;
  
  useEffect(() => {
    setDisplayText(getSpotsBadgeText(availableSpots, schoolClass, isLoading));
    setBadgeColor(getSpotsBadgeColor(availableSpots, isLoading));
  }, [availableSpots, propIsFull, schoolClass, isLoading, periodId, date]);

  return (
    <Badge variant={badgeColor} className="shrink-0 text-[11px] md:text-xs">
      {displayText}
    </Badge>
  );
};
