import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useReservations } from "@/hooks/useReservations";
import { useChildrenData } from "@/hooks/useChildrenData";
import { LoadingState } from "@/components/design";
import { ChildSelector } from "./ChildSelector";
import { WednesdayDateSelector } from "./WednesdayDateSelector";
import { SuccessReservationDialog } from "./SuccessReservationDialog";
import { BookingWizard, StepPanel, WizardNav } from "./wizard/BookingWizard";
import { BookingSummary } from "./wizard/BookingSummary";

const STEPS = [
  { id: "child", label: "Enfant" },
  { id: "dates", label: "Mercredis" },
  { id: "summary", label: "Récapitulatif" },
];

/**
 * Réservation des mercredis — assistant en 3 étapes.
 * Toute la logique (places, doublons, envoi via book_wednesday, liste d'attente)
 * reste dans useReservations / useWednesdayReservationSubmission.
 */
export const WednesdayReservationContent = () => {
  const {
    selectedDates,
    setSelectedDates,
    selectedChild,
    setSelectedChild,
    handleDateToggle,
    handleOptionChange,
    handleSubmit,
    isDateReservedForChild,
    showSuccessDialog,
    setShowSuccessDialog,
    isSubmitting,
    excludedFullDates,
  } = useReservations();
  const { wednesdayEligibleChildren, isLoading } = useChildrenData();
  const [step, setStep] = useState(0);

  // Après une réservation réussie, le formulaire est réinitialisé : retour à l'étape 1
  useEffect(() => {
    if (showSuccessDialog) setStep(0);
  }, [showSuccessDialog]);

  // Sans enfant sélectionné, on ne peut pas rester sur les étapes suivantes
  useEffect(() => {
    if (!selectedChild && step > 0) setStep(0);
  }, [selectedChild, step]);

  if (isLoading) return <LoadingState rows={4} label="Chargement de vos enfants…" />;

  const child = wednesdayEligibleChildren?.find((c) => c.id === selectedChild);
  const count = selectedDates.length;

  return (
    <>
      <BookingWizard steps={STEPS} current={step} onStepChange={setStep}>
        <StepPanel active={step === 0} title="Quel enfant inscrire ?" description="Seuls les enfants accueillis le mercredi (maternelle et primaire) sont proposés.">
          <ChildSelector
            variant="cards"
            selectedChild={selectedChild}
            setSelectedChild={setSelectedChild}
            children={wednesdayEligibleChildren}
            setSelectedDates={setSelectedDates}
          />
          <Alert variant="info" className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>Pour les enfants en petite section, merci de contacter l'accueil.</AlertDescription>
          </Alert>
          <WizardNav onNext={() => setStep(1)} nextDisabled={!selectedChild} hint="Choisissez un enfant pour continuer." />
        </StepPanel>

        <StepPanel
          active={step === 1}
          title="Choisissez les mercredis"
          description="Vous pouvez sélectionner plusieurs mercredis à la fois, puis préciser les options pour chacun."
        >
          <WednesdayDateSelector
            selectedDates={selectedDates}
            handleDateToggle={handleDateToggle}
            handleOptionChange={handleOptionChange}
            isDateAlreadyReserved={(date) => isDateReservedForChild(selectedChild, date)}
            selectedChild={selectedChild}
          />
          <WizardNav
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            nextDisabled={count === 0}
            nextLabel={count > 0 ? `Vérifier (${count})` : "Vérifier"}
            hint="Sélectionnez au moins un mercredi."
          />
        </StepPanel>

        <StepPanel active={step === 2} title="Vérifiez et confirmez" description="Rien n'est enregistré tant que vous n'avez pas confirmé.">
          <BookingSummary
            childLabel={child ? `${child.first_name} ${child.last_name} (${child.school_class})` : "—"}
            contextLabel="Activité"
            contextDetail="Accueil du mercredi"
            dates={selectedDates}
          />
          <WizardNav
            onBack={() => setStep(1)}
            onNext={handleSubmit}
            nextIcon={false}
            nextDisabled={!selectedChild || count === 0}
            loading={isSubmitting}
            nextLabel={isSubmitting ? "Réservation en cours…" : count > 1 ? `Confirmer les ${count} réservations` : "Confirmer la réservation"}
          />
          <p className="sr-only" aria-live="polite">{isSubmitting ? "Réservation en cours" : ""}</p>
        </StepPanel>
      </BookingWizard>

      <SuccessReservationDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog} excludedFullDates={excludedFullDates} />
    </>
  );
};
