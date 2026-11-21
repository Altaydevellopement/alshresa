
// src/components/reservations/TeenHolidayReservationContent.tsx
import { useHolidayReservation } from "@/hooks/useHolidayReservation";
import { ChildSelector } from "./ChildSelector";
import { PeriodSelector } from "./PeriodSelector";
import { HolidayDateSelector } from "./holiday/HolidayDateSelector";
import { SuccessReservationDialog } from "./SuccessReservationDialog";
import { NoSpotsDialog } from "./NoSpotsDialog";
import { MinimumDaysDialog } from "./dialogs/MinimumDaysDialog";
import { LoadingState } from "@/components/design";
import { HolidayWizard } from "./wizard/HolidayWizard";
import { useChildrenData } from "@/hooks/useChildrenData";
import { useCategoryFiltering } from "@/hooks/useCategoryFiltering";
import { useClosedPeriods } from "@/hooks/useClosedPeriods";
import { validateMinimumDays } from "@/utils/reservationValidationUtils";

// Import our hook dedicated to holiday reservations
import { useExistingHolidayReservations } from "@/hooks/useExistingHolidayReservations";

export const TeenHolidayReservationContent = () => {
  const {
    selectedDates,
    selectedChild,
    selectedPeriod,
    setSelectedChild,
    setSelectedPeriod,
    holidayPeriods,
    handleDateToggle,
    handleOptionChange,
    handleSubmit,
    // REMOVED: isDateAlreadyReserved - no longer provided by useHolidayReservation
    setSelectedDates,
    showSuccessDialog,
    setShowSuccessDialog,
    isSubmitting,
    noSpotsDialog,
    setNoSpotsDialog,
    minimumDaysDialog,
    setMinimumDaysDialog
  } = useHolidayReservation();

  // Use the dedicated hook to get reservation data including isDateAlreadyReserved
  const {
    isDateAlreadyReserved,
    isLoading: loadingHolidayRes
  } = useExistingHolidayReservations(selectedChild || "");

  const { children: allChildren } = useChildrenData();
  const { filteredChildren } = useCategoryFiltering(
    allChildren,
    selectedPeriod,
    'adolescent'
  );

  const { getClosedDatesInRange } = useClosedPeriods();



  // Get excluded dates for the selected period to adjust minimum validation
  const periodForValidation = holidayPeriods?.find(p => p.id === selectedPeriod);
  const excludedDatesForPeriod = periodForValidation
    ? getClosedDatesInRange(periodForValidation.start_date, periodForValidation.end_date)
    : [];

  // Règle existante : minimum de jours par semaine
  const validateDates = () => {
    if (!validateMinimumDays(selectedDates, false, false, excludedDatesForPeriod)) {
      setMinimumDaysDialog({ isOpen: true });
      return false;
    }
    return true;
  };

  const onConfirm = () => {
    if (!validateDates()) return;
    if (!isSubmitting) handleSubmit();
  };

  const selectedChildData = filteredChildren?.find(child => child.id === selectedChild);
  const childLabel = selectedChildData
    ? `${selectedChildData.first_name} ${selectedChildData.last_name} (${selectedChildData.school_class})`
    : undefined;

  return (
    <>
      <HolidayWizard
        activityLabel="Club Ado"
        showOptions={false}
        periodSelector={
          <PeriodSelector
            variant="cards"
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            holidayPeriods={holidayPeriods}
            filterTeenOnly={true}
          />
        }
        childSelector={
          <ChildSelector
            variant="cards"
            selectedChild={selectedChild}
            setSelectedChild={setSelectedChild}
            children={filteredChildren}
            setSelectedDates={setSelectedDates}
          />
        }
        dateSelector={
          loadingHolidayRes ? (
            // Les réservations existantes doivent être connues avant d'afficher les dates
            <LoadingState rows={4} label="Chargement des réservations existantes…" />
          ) : selectedPeriod && selectedChild ? (
            <HolidayDateSelector
              selectedDates={selectedDates}
              handleDateToggle={handleDateToggle}
              handleOptionChange={handleOptionChange}
              isDateAlreadyReserved={isDateAlreadyReserved}
              periodId={selectedPeriod}
              selectedChild={selectedChild}
              setSelectedDates={setSelectedDates}
              isTeenPage={true}
            />
          ) : null
        }
        selectedPeriod={selectedPeriod}
        selectedChild={selectedChild}
        selectedDates={selectedDates}
        period={periodForValidation}
        childLabel={childLabel}
        validateDates={validateDates}
        onConfirm={onConfirm}
        isSubmitting={isSubmitting}
        succeeded={showSuccessDialog}
        datesHint="Sélectionnez au moins 3 jours par semaine. Les journées complètes proposent une inscription en liste d'attente."
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
