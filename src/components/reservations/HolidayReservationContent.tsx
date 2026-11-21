
// src/components/reservations/HolidayReservationContent.tsx
import React, { useEffect, useState } from "react";
import { useHolidayReservation } from "@/hooks/useHolidayReservation";
import { ChildSelector } from "./ChildSelector";
import { PeriodSelector } from "./PeriodSelector";
import { HolidayDateSelector } from "./holiday/HolidayDateSelector";
import { SuccessReservationDialog } from "./SuccessReservationDialog";
import { NoSpotsDialog } from "./NoSpotsDialog";
import { MinimumDaysDialog } from "./dialogs/MinimumDaysDialog";
import { useChildrenData } from "@/hooks/useChildrenData";
import { useLocation } from "react-router-dom";
import { useCategoryFiltering } from "@/hooks/useCategoryFiltering";
import { Tables } from "@/integrations/supabase/types";
import { useExistingHolidayReservations } from "@/hooks/useExistingHolidayReservations";
import { AdminChildSelector } from "@/components/admin/reservations/AdminChildSelector";
import { useClosedPeriods } from "@/hooks/useClosedPeriods";
import { validateMinimumDays } from "@/utils/reservationValidationUtils";
import { HolidayWizard } from "./wizard/HolidayWizard";

export interface HolidayReservationContentProps {
  filteredChildren?: Tables<"children">[] | null;
  filterTeenPeriods?: boolean;
  /** Conservé pour compatibilité : l'assistant présente toujours la période avant l'enfant */
  invertSelectors?: boolean;
  enforceCM2Summer?: boolean;
  disableMinimumDaysRule?: boolean;
}

export const HolidayReservationContent: React.FC<HolidayReservationContentProps> = ({
  filteredChildren,
  filterTeenPeriods = false,
  enforceCM2Summer = false,
  disableMinimumDaysRule = false,
}) => {
  const {
    selectedDates,
    selectedChild,
    selectedPeriod,
    setSelectedChild,
    setSelectedPeriod,
    holidayPeriods,
    handleDateToggle,
    handleOptionChange,
    handleSubmit: originalHandleSubmit,
    setSelectedDates,
    showSuccessDialog,
    setShowSuccessDialog,
    isSubmitting,
    noSpotsDialog,
    setNoSpotsDialog,
    minimumDaysDialog,
    setMinimumDaysDialog,
  } = useHolidayReservation();

  const { isDateAlreadyReserved } = useExistingHolidayReservations(selectedChild || '');
  const [storedChild, setStoredChild] = useState<string | null>(null);
  const { children: allChildren } = useChildrenData();
  const location = useLocation();
  const { getClosedDatesInRange } = useClosedPeriods();

  // Vérifier si on est en mode admin (enfants avec informations des parents)
  const isAdminMode = filteredChildren && filteredChildren.some(child => 'profile' in child);

  // N'utiliser le filtrage par catégorie que si aucun enfant filtré externe n'est fourni
  const { filteredChildren: categorizedChildren } = useCategoryFiltering(
    filteredChildren ? null : allChildren,
    selectedPeriod,
    filterTeenPeriods ? 'adolescent' : undefined
  );

  // Utiliser les enfants filtrés fournis en props ou le résultat du filtrage par catégorie
  const periodObj = holidayPeriods?.find(p => p.id === selectedPeriod);
  const periodCode = (periodObj as any)?.code || (periodObj as any)?.name || '';
  const earlySummerCodes = ['ETE-01', 'ETE-02', 'ETE-03', 'ETE-04'];
  const isEarlySummer = earlySummerCodes.includes(periodCode);
  
  const baseChildren = filteredChildren || categorizedChildren || [];
  
  // Ne pas filtrer les CM2 en été si enforceCM2Summer est activé
  const childrenToDisplay = baseChildren.filter(child => {
    if (enforceCM2Summer && child.school_class === 'CM2') {
      return true;
    }
    return !(isEarlySummer && !filterTeenPeriods && child.school_class === 'CM2');
  });

  // Effet pour stocker l'enfant sélectionné lorsqu'il change
  useEffect(() => {
    if (selectedChild) {
      setStoredChild(selectedChild);
    }
  }, [selectedChild]);

  // Effet pour restaurer l'enfant sélectionné si possible après un changement de période
  useEffect(() => {
    if (storedChild && !selectedChild) {
      // Vérifier si l'enfant stocké est toujours dans la liste actuelle
      const isChildStillAvailable = childrenToDisplay.some(child => child.id === storedChild);
      if (isChildStillAvailable) {
        setSelectedChild(storedChild);
      }
    }
  }, [childrenToDisplay, selectedChild, storedChild, setSelectedChild]);

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const periodId = searchParams.get("periodId");
      if (periodId && periodId !== selectedPeriod) {
        setSelectedPeriod(periodId);
      }
    } catch {}
  }, [location.search, selectedPeriod, setSelectedPeriod]);

  // Get excluded dates for the selected period to adjust minimum validation
  const periodForValidation = holidayPeriods?.find(p => p.id === selectedPeriod);
  const excludedDatesForPeriod = periodForValidation
    ? getClosedDatesInRange(periodForValidation.start_date, periodForValidation.end_date)
    : [];

  // Règle existante : minimum de jours par semaine (sauf si désactivée, ex. admin)
  const validateDates = () => {
    if (!disableMinimumDaysRule && !validateMinimumDays(selectedDates, false, false, excludedDatesForPeriod)) {
      setMinimumDaysDialog({ isOpen: true });
      return false;
    }
    return true;
  };

  const onConfirm = () => {
    if (!validateDates()) return;
    if (!isSubmitting) originalHandleSubmit();
  };

  const renderChildSelector = () => {
    if (isAdminMode) {
      return (
        <AdminChildSelector
          selectedChild={selectedChild}
          setSelectedChild={setSelectedChild}
          children={childrenToDisplay as any}
          setSelectedDates={setSelectedDates}
        />
      );
    }
    
    return (
      <ChildSelector
        variant="cards"
        selectedChild={selectedChild}
        setSelectedChild={setSelectedChild}
        children={childrenToDisplay}
        setSelectedDates={setSelectedDates}
        selectedPeriodId={selectedPeriod}
      />
    );
  };

  const selectedChildData = childrenToDisplay.find(child => child.id === selectedChild);
  const childLabel = selectedChildData
    ? `${selectedChildData.first_name} ${selectedChildData.last_name} (${selectedChildData.school_class})`
    : undefined;

  return (
    <>
      <HolidayWizard
        activityLabel={filterTeenPeriods ? "Club Ado" : "Vacances scolaires"}
        periodSelector={
          <PeriodSelector
            variant="cards"
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            holidayPeriods={holidayPeriods}
            filterTeenOnly={filterTeenPeriods}
          />
        }
        childSelector={renderChildSelector()}
        dateSelector={
          selectedPeriod && selectedChild ? (
            <HolidayDateSelector
              selectedDates={selectedDates}
              handleDateToggle={handleDateToggle}
              handleOptionChange={handleOptionChange}
              isDateAlreadyReserved={isDateAlreadyReserved}
              periodId={selectedPeriod}
              selectedChild={selectedChild}
              setSelectedDates={setSelectedDates}
              isTeenPage={filterTeenPeriods}
            />
          ) : null
        }
        selectedPeriod={selectedPeriod}
        selectedChild={selectedChild}
        selectedDates={selectedDates}
        period={periodObj}
        childLabel={childLabel}
        validateDates={validateDates}
        onConfirm={onConfirm}
        isSubmitting={isSubmitting}
        succeeded={showSuccessDialog}
        datesHint={disableMinimumDaysRule ? "Sélectionnez les journées et leurs options." : "Sélectionnez au moins 3 jours par semaine, puis les options de chaque journée. Les journées complètes proposent une inscription en liste d'attente."}
      />

      <SuccessReservationDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
      />
      <NoSpotsDialog
        open={noSpotsDialog.isOpen}
        onOpenChange={open => setNoSpotsDialog({ ...noSpotsDialog, isOpen: open })}
        schoolClass={noSpotsDialog.schoolClass}
        date={noSpotsDialog.date}
      />
      <MinimumDaysDialog
        open={minimumDaysDialog.isOpen}
        onOpenChange={open => setMinimumDaysDialog({ isOpen: open })}
      />
    </>
  );
};
