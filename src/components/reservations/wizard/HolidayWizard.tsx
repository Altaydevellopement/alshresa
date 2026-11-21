import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BookingWizard, StepPanel, WizardNav } from "./BookingWizard";
import { BookingSummary } from "./BookingSummary";

interface DateOption {
  date: Date;
  withoutMeal: boolean;
  earlyDropoff: boolean;
}

interface HolidayWizardProps {
  /** Libellé du parcours dans le récapitulatif (« Vacances scolaires », « Club Ado ») */
  activityLabel: string;
  periodSelector: ReactNode;
  childSelector: ReactNode;
  dateSelector: ReactNode;
  selectedPeriod: string;
  selectedChild: string;
  selectedDates: DateOption[];
  period?: { name: string; start_date: string; end_date: string } | null;
  childLabel?: string;
  /** Options repas / accueil du matin proposées sur ce parcours */
  showOptions?: boolean;
  /** Règle métier existante (minimum de jours) : renvoie false et ouvre le dialogue si non respectée */
  validateDates: () => boolean;
  onConfirm: () => void;
  isSubmitting: boolean;
  /** Passe à true après une réservation réussie */
  succeeded: boolean;
  datesHint?: ReactNode;
}

const STEPS = [
  { id: "period", label: "Période" },
  { id: "child", label: "Enfant" },
  { id: "dates", label: "Dates et options" },
  { id: "summary", label: "Récapitulatif" },
];

/**
 * Présentation en 4 étapes des réservations de vacances / Club Ado.
 * La période est choisie avant l'enfant car l'éligibilité (catégorie de classe,
 * règle CM2 de l'été) dépend de la période — comme dans le parcours d'origine.
 */
export const HolidayWizard = ({
  activityLabel, periodSelector, childSelector, dateSelector, selectedPeriod, selectedChild, selectedDates,
  period, childLabel, showOptions = true, validateDates, onConfirm, isSubmitting, succeeded, datesHint,
}: HolidayWizardProps) => {
  const [step, setStep] = useState(0);
  const count = selectedDates.filter((d) => d.date instanceof Date && !isNaN(d.date.getTime())).length;

  // Cohérence : on ne peut pas rester sur une étape dont le prérequis a disparu
  useEffect(() => {
    if (!selectedPeriod && step > 0) setStep(0);
    else if (!selectedChild && step > 1) setStep(1);
  }, [selectedPeriod, selectedChild, step]);

  // Après une réservation réussie (dates vidées), retour au choix des dates
  useEffect(() => {
    if (succeeded) setStep(selectedPeriod && selectedChild ? 2 : 0);
  }, [succeeded, selectedPeriod, selectedChild]);

  const periodLabel = period
    ? `${period.name} — du ${format(new Date(period.start_date), "d MMM", { locale: fr })} au ${format(new Date(period.end_date), "d MMM yyyy", { locale: fr })}`
    : undefined;

  return (
    <BookingWizard steps={STEPS} current={step} onStepChange={setStep}>
      <StepPanel active={step === 0} title="Choisissez la période" description="Seules les périodes ouvertes à la réservation sont proposées.">
        {periodSelector}
        <WizardNav onNext={() => setStep(1)} nextDisabled={!selectedPeriod} hint="Choisissez une période pour continuer." />
      </StepPanel>

      <StepPanel active={step === 1} title="Quel enfant inscrire ?" description="Les enfants proposés dépendent de la période choisie et de leur classe.">
        {childSelector}
        <WizardNav onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!selectedChild} hint="Choisissez un enfant pour continuer." />
      </StepPanel>

      <StepPanel active={step === 2} title="Choisissez les journées" description={datesHint}>
        {dateSelector}
        <WizardNav
          onBack={() => setStep(1)}
          onNext={() => {
            if (validateDates()) setStep(3);
          }}
          nextDisabled={count === 0}
          nextLabel={count > 0 ? `Vérifier (${count})` : "Vérifier"}
          hint="Sélectionnez au moins une journée."
        />
      </StepPanel>

      <StepPanel active={step === 3} title="Vérifiez et confirmez" description="Rien n'est enregistré tant que vous n'avez pas confirmé.">
        <BookingSummary
          childLabel={childLabel ?? "—"}
          contextLabel={activityLabel}
          contextDetail={periodLabel}
          dates={selectedDates}
          showOptions={showOptions}
        />
        <WizardNav
          onBack={() => setStep(2)}
          onNext={onConfirm}
          nextIcon={false}
          nextDisabled={count === 0 || !selectedChild || !selectedPeriod}
          loading={isSubmitting}
          nextLabel={isSubmitting ? "Réservation en cours…" : count > 1 ? `Confirmer les ${count} journées` : "Confirmer la journée"}
        />
        <p className="sr-only" aria-live="polite">{isSubmitting ? "Réservation en cours" : ""}</p>
      </StepPanel>
    </BookingWizard>
  );
};
