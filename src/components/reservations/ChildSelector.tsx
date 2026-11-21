
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Baby, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, InitialsAvatar, SelectableCard } from "@/components/design";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSchoolClassCategories } from "@/hooks/useSchoolClassCategories";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChildSelectorProps {
  selectedChild: string;
  setSelectedChild: (childId: string) => void;
  children: Tables<"children">[] | null | undefined;
  setSelectedDates?: (dates: any[]) => void;
  onCM2SummerPeriodCheck?: (isInSummerPeriod: boolean) => void;
  selectedPeriodId?: string;
  /** "cards" : cartes sélectionnables (assistant de réservation) */
  variant?: "select" | "cards";
}

export const ChildSelector = ({ 
  selectedChild, 
  setSelectedChild, 
  children,
  setSelectedDates,
  onCM2SummerPeriodCheck,
  selectedPeriodId,
  variant = "select",
}: ChildSelectorProps) => {
  const location = useLocation();
  const isHolidayReservation = location.pathname === "/holiday-reservations";
  const isTeenHolidayReservation = location.pathname === "/teenholiday-reservations";
  const { getClassCategorySync } = useSchoolClassCategories();

  // Récupérer l'ID de période à partir des props ou de l'URL en fallback
  const searchParams = new URLSearchParams(location.search);
  const periodId = selectedPeriodId || searchParams.get("periodId");

  // Vérifier si c'est une période d'été
  const { data: periodInfo } = useQuery({
    queryKey: ["period_summer_check", periodId],
    queryFn: async () => {
      if (!periodId) return null;
      
      const { data, error } = await supabase
        .from("available_holiday_periods")
        .select("name")
        .eq("id", periodId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!periodId
  });

  // Liste des périodes d'été
  const summerPeriods = ["ETE-01", "ETE-02", "ETE-03", "ETE-04", "ETE-05", "ETE-06", "ETE-07", "ETE-08"];
  const isSummerPeriod = periodInfo?.name && summerPeriods.includes(periodInfo.name);
  
  // Périodes d'été où les CM2 doivent s'inscrire en Club Ado
  const cm2TeenSummerPeriods = ["ETE-01", "ETE-02", "ETE-03", "ETE-04"];
  const isCM2TeenPeriod = useMemo(() => {
    return periodInfo?.name && cm2TeenSummerPeriods.includes(periodInfo.name);
  }, [periodInfo, cm2TeenSummerPeriods]);

  // Filtrer les enfants selon la catégorie configurée pour la période
  const filteredChildren = useMemo(() => {
    if (!children) return [];

    return isHolidayReservation ? children.filter(child => {
        
      // Normalisation de la classe pour une comparaison cohérente
      const normalizedClass = child.school_class.trim().toUpperCase();
        
      const category = getClassCategorySync(child.school_class, periodId);

      // Masquer uniquement les classes explicitement exclues pour la période
      if (category === 'aucune') {
        return false;
      }

      // Vérification explicite pour les CM2 pendant les périodes spécifiques
      if (isCM2TeenPeriod && normalizedClass === "CM2") {
        return false;
      }

      // Filtrer les adolescents dans tous les cas
      return category !== 'adolescent';
    }) : children;
  }, [children, isHolidayReservation, isCM2TeenPeriod, periodInfo?.name, getClassCategorySync, periodId]);

  // Trier les enfants par ordre alphabétique du nom de famille
  const sortedChildren = useMemo(() => {
    if (!filteredChildren) return [];
    
    return [...filteredChildren].sort((a, b) => {
      return a.last_name.localeCompare(b.last_name, 'fr', { sensitivity: 'base' });
    });
  }, [filteredChildren]);

  // Réinitialiser les dates lorsqu'un nouvel enfant est sélectionné
  useEffect(() => {
    if (selectedChild && setSelectedDates) {
      setSelectedDates([]);
    }
  }, [selectedChild, setSelectedDates]);

  // Vérifier les cas spéciaux pour CM2
  useEffect(() => {
    if (selectedChild && periodId && isSummerPeriod) {
      const selectedChildData = children?.find(child => child.id === selectedChild);
      
      if (selectedChildData?.school_class === "CM2") {
        // Notifier le parent si la fonction de callback est fournie
        if (onCM2SummerPeriodCheck) {
          if (isHolidayReservation) {
            onCM2SummerPeriodCheck(true);
          } else if (isTeenHolidayReservation) {
            onCM2SummerPeriodCheck(false);
          }
        }
      } else if (onCM2SummerPeriodCheck) {
        onCM2SummerPeriodCheck(false);
      }
    } else if (onCM2SummerPeriodCheck) {
      onCM2SummerPeriodCheck(false);
    }
  }, [selectedChild, periodId, isSummerPeriod, children, onCM2SummerPeriodCheck, isHolidayReservation, isTeenHolidayReservation]);

  // Si l'enfant sélectionné n'est plus dans la liste filtrée, le désélectionner
  useEffect(() => {
    if (selectedChild && sortedChildren) {
      const isChildInFilteredList = sortedChildren.some(child => child.id === selectedChild);
      if (!isChildInFilteredList) {
        setSelectedChild("");
      }
    }
  }, [sortedChildren, selectedChild, setSelectedChild]);

  if (!sortedChildren || sortedChildren.length === 0) {
    if (variant === "cards") {
      return (
        <EmptyState
          icon={Baby}
          title="Aucun enfant éligible"
          description={
            <>
              Aucun de vos enfants ne peut être inscrit sur ce parcours (classe non accueillie ou enfant non enregistré).{" "}
              <Link to="/children" className="font-semibold text-primary underline-offset-4 hover:underline">Gérer mes enfants</Link>
            </>
          }
        />
      );
    }
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Aucun enfant trouvé. Veuillez ajouter un enfant depuis votre profil.
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === "cards") {
    return (
      <div role="radiogroup" aria-label="Enfant" className="grid gap-3 sm:grid-cols-2">
        {sortedChildren.map((child) => (
          <SelectableCard
            key={child.id}
            selected={selectedChild === child.id}
            onSelect={() => setSelectedChild(child.id)}
            icon={<InitialsAvatar name={`${child.first_name} ${child.last_name}`} />}
            title={`${child.first_name} ${child.last_name}`}
            subtitle={`Classe : ${child.school_class}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="child">Sélectionner un enfant</Label>
        <Select
          value={selectedChild}
          onValueChange={(value) => {
            setSelectedChild(value);
          }}
        >
          <SelectTrigger id="child" className="w-full">
            <SelectValue placeholder="Sélectionner un enfant" />
          </SelectTrigger>
          <SelectContent>
            {sortedChildren.map((child) => (
              <SelectItem key={child.id} value={child.id}>
                {child.first_name} {child.last_name} - {child.school_class}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
