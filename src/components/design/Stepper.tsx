import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepDef[];
  current: number;
  /** Autorise le retour à une étape déjà franchie */
  onStepClick?: (index: number) => void;
}

/** Indicateur d'étapes accessible (assistant de réservation). */
export const Stepper = ({ steps, current, onStepClick }: StepperProps) => (
  <nav aria-label="Étapes de la réservation">
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = done && !!onStepClick;
        const inner = (
          <>
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "bg-peach text-primary ring-2 ring-primary",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            <span className={cn("text-sm font-semibold", active ? "text-foreground" : "text-muted-foreground", !active && "hidden md:inline")}>
              {step.label}
            </span>
          </>
        );
        return (
          <li key={step.id} className="flex items-center gap-2 sm:gap-3 min-w-0" aria-current={active ? "step" : undefined}>
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className="flex items-center gap-2 rounded-full pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Revenir à l'étape ${index + 1} : ${step.label}`}
              >
                {inner}
              </button>
            ) : (
              <span className="flex items-center gap-2">{inner}</span>
            )}
            {index < steps.length - 1 && (
              <span className={cn("h-0.5 w-4 sm:w-8 rounded-full", done ? "bg-primary" : "bg-border")} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
    <p className="sr-only" aria-live="polite">
      Étape {current + 1} sur {steps.length} : {steps[current]?.label}
    </p>
  </nav>
);
