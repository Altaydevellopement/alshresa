
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/design";
import { offerWaitlist } from "@/components/waitlist/waitlistOffer";
import { cn } from "@/lib/utils";
import { useAvailableWednesdays } from "@/hooks/useAvailableWednesdays";
import { Badge } from "@/components/ui/badge";
import { WednesdayOptions } from "./WednesdayOptions";

interface DateOption {
  date: Date;
  withoutMeal: boolean;
  earlyDropoff: boolean;
}

interface WednesdayDateSelectorProps {
  selectedDates: DateOption[];
  handleDateToggle: (date: Date) => void;
  handleOptionChange: (date: Date, option: 'withoutMeal' | 'earlyDropoff', value: boolean) => void;
  isDateAlreadyReserved: (date: Date) => boolean;
  selectedChild: string;
  isAdminMode?: boolean;
}

export const WednesdayDateSelector = ({
  selectedDates = [],
  handleDateToggle,
  handleOptionChange,
  isDateAlreadyReserved,
  selectedChild,
  isAdminMode = false,
}: WednesdayDateSelectorProps) => {
  const { data: childInfo } = useQuery({
    queryKey: ["selectedChild", selectedChild],
    queryFn: async () => {
      if (!selectedChild) return null;
      
      const { data, error } = await supabase
        .from("children")
        .select("school_class, first_name")
        .eq("id", selectedChild)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChild,
  });

  const isKindergarten = childInfo?.school_class && ["PS", "MS", "GS"].includes(childInfo.school_class);
  const isPrimary = childInfo?.school_class && ["CP", "CE1", "CE2", "CM1", "CM2"].includes(childInfo.school_class);

  const { data: availableWednesdays = [], isLoading, error } = useAvailableWednesdays(
    Boolean(isKindergarten),
    Boolean(isPrimary),
    isAdminMode
  );

  const getSpotsBadgeVariant = (spots: number) => {
    if (spots <= 0) return "destructive" as const;
    if (spots <= 5) return "warning" as const;
    return "success" as const;
  };

  const getGroupName = (isKinder: boolean) => isKinder ? 'maternelle' : 'primaire';

  if (isLoading) {
    return <LoadingState rows={4} label="Chargement des mercredis…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Impossible de charger les mercredis"
        description="Une erreur est survenue lors du chargement des dates. Réessayez dans quelques instants."
      />
    );
  }

  if (!availableWednesdays || availableWednesdays.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Aucun mercredi disponible"
        description="Il n'y a pas de mercredi ouvert à la réservation pour le moment."
      />
    );
  }

  const childName = childInfo?.first_name || "votre enfant";

  return (
    <div className="space-y-2">
      {availableWednesdays.map((wednesday) => {
        const date = new Date(wednesday.date);
        const selectedDateOption = selectedDates?.find((d) => d.date.getTime() === date.getTime());
        const isReserved = isDateAlreadyReserved(date);

        // Places restantes calculées uniquement si un enfant est sélectionné
        let spotsLeft = null;
        if (isKindergarten) {
          spotsLeft = wednesday.max_participants_kindergarten - wednesday.kindergartenReservations;
        } else if (isPrimary) {
          spotsLeft = wednesday.max_participants_primary - wednesday.primaryReservations;
        }

        const isFull = spotsLeft !== null && spotsLeft <= 0;
        const isDisabled = isReserved || isFull;
        const checkboxId = `wed-${wednesday.date}`;

        return (
          <div
            key={wednesday.date}
            className={cn(
              "rounded-xl border px-3 py-3 transition-colors",
              selectedDateOption ? "border-primary bg-peach-soft/60" : "border-border/70 bg-card hover:bg-peach-soft/40",
              isDisabled && "bg-surface-muted",
            )}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                id={checkboxId}
                checked={!!selectedDateOption}
                onCheckedChange={() => !isDisabled && handleDateToggle(date)}
                disabled={isDisabled}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label
                    htmlFor={checkboxId}
                    className={cn("inline-block cursor-pointer font-semibold capitalize-first", isDisabled ? "text-muted-foreground" : "text-foreground")}
                  >
                    {format(date, "EEEE d MMMM yyyy", { locale: fr })}
                  </Label>
                  {!selectedChild && <Badge variant="neutral">Sélectionnez un enfant</Badge>}
                  {selectedChild && isReserved ? (
                    <Badge variant="info">Déjà réservé</Badge>
                  ) : (
                    selectedChild &&
                    spotsLeft !== null && (
                      <Badge variant={getSpotsBadgeVariant(spotsLeft)}>
                        {spotsLeft <= 0
                          ? `Groupe ${getGroupName(Boolean(isKindergarten))} complet`
                          : `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} restante${spotsLeft > 1 ? "s" : ""}`}
                      </Badge>
                    )
                  )}
                </div>
                {isFull && !isReserved && selectedChild && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    className="mt-2 h-8"
                    onClick={() =>
                      offerWaitlist({
                        childId: selectedChild,
                        childName,
                        items: [{ kind: "wednesday", targetId: wednesday.id, date, withoutMeal: false, earlyDropoff: false }],
                        partial: false,
                      })
                    }
                  >
                    <Clock aria-hidden="true" />
                    Liste d'attente
                  </Button>
                )}
              </div>
            </div>
            {selectedDateOption && !isDisabled && (
              <div className="mt-2 pl-7">
                <WednesdayOptions
                  date={date}
                  withoutMeal={selectedDateOption.withoutMeal}
                  earlyDropoff={selectedDateOption.earlyDropoff}
                  onOptionChange={handleOptionChange}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
