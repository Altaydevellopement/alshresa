import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stepper, type StepDef } from "@/components/design";
import { cn } from "@/lib/utils";

interface BookingWizardProps {
  steps: StepDef[];
  current: number;
  onStepChange: (index: number) => void;
  children: ReactNode;
}

/**
 * Cadre de l'assistant de réservation. Les étapes restent toutes montées
 * (seule l'étape courante est visible) : les composants existants gardent
 * ainsi leur état et leurs effets, exactement comme sur l'ancienne page.
 */
export const BookingWizard = ({ steps, current, onStepChange, children }: BookingWizardProps) => {
  const headingRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Place le focus en haut de l'étape à chaque changement (clavier / lecteur d'écran)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: false });
    headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [current]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-sm">
      <div ref={headingRef} tabIndex={-1} className="border-b border-border px-5 py-4 md:px-6 focus:outline-none scroll-mt-20">
        <Stepper steps={steps} current={current} onStepClick={onStepChange} />
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
};

interface StepPanelProps {
  active: boolean;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** Contenu d'une étape. Reste monté quand il est masqué. */
export const StepPanel = ({ active, title, description, children }: StepPanelProps) => (
  <section hidden={!active} aria-hidden={!active} className={cn(active && "animate-fade-in")}>
    <h2 className="text-lg font-bold">{title}</h2>
    {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
    <div className="mt-5">{children}</div>
  </section>
);

interface WizardNavProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Raison affichée quand « Continuer » est désactivé */
  hint?: ReactNode;
  loading?: boolean;
  nextIcon?: boolean;
}

/** Barre d'actions en bas d'étape (collée en bas de l'écran sur mobile). */
export const WizardNav = ({ onBack, onNext, nextLabel = "Continuer", nextDisabled, hint, loading, nextIcon = true }: WizardNavProps) => (
  <div className="sticky bottom-20 z-10 -mx-5 mt-6 border-t border-border bg-card/95 px-5 pt-4 pb-1 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 lg:bottom-0">
    {hint && nextDisabled && <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">{hint}</p>}
    <div className="flex items-center justify-between gap-3">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
          <ArrowLeft aria-hidden="true" />
          Retour
        </Button>
      ) : (
        <span />
      )}
      {onNext && (
        <Button type="button" size="lg" onClick={onNext} disabled={nextDisabled} loading={loading} className="min-w-[10rem]">
          {nextLabel}
          {nextIcon && !loading && <ArrowRight aria-hidden="true" />}
        </Button>
      )}
    </div>
  </div>
);
