import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Baby, CalendarDays, Coffee, Mail, UtensilsCrossed } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SummaryDate {
  date: Date;
  withoutMeal: boolean;
  earlyDropoff: boolean;
}

interface BookingSummaryProps {
  childLabel: string;
  contextLabel: string;
  contextDetail?: string;
  dates: SummaryDate[];
  /** Les options repas / accueil du matin s'appliquent-elles à ce parcours ? */
  showOptions?: boolean;
}

/** Récapitulatif affiché avant la confirmation explicite. */
export const BookingSummary = ({ childLabel, contextLabel, contextDetail, dates, showOptions = true }: BookingSummaryProps) => {
  const valid = dates
    .filter((d) => d.date instanceof Date && !isNaN(d.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl bg-peach-soft p-4">
          <Baby className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enfant</dt>
            <dd className="font-bold">{childLabel}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-sage-soft p-4">
          <CalendarDays className="mt-0.5 h-5 w-5 text-sage-foreground" aria-hidden="true" />
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{contextLabel}</dt>
            <dd className="font-bold">{contextDetail ?? "—"}</dd>
          </div>
        </div>
      </dl>

      <div>
        <h3 className="mb-2 text-sm font-bold">
          {valid.length} journée{valid.length > 1 ? "s" : ""} à réserver
        </h3>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {valid.map((d) => (
            <li key={d.date.toISOString()} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="font-semibold capitalize">{format(d.date, "EEEE d MMMM yyyy", { locale: fr })}</span>
              {showOptions && (
                <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden="true" />
                    {d.withoutMeal ? "Sans repas" : "Avec repas"}
                  </span>
                  {d.earlyDropoff && (
                    <span className="inline-flex items-center gap-1">
                      <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
                      Accueil du matin
                    </span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <Alert variant="coral">
        <Mail className="h-4 w-4" />
        <AlertDescription>
          Les places sont vérifiées au moment de la confirmation. Si une journée est devenue complète entre-temps, vous
          pourrez inscrire votre enfant sur la liste d'attente. Pour annuler ensuite, prévenez le secrétariat par email.
        </AlertDescription>
      </Alert>
    </div>
  );
};
