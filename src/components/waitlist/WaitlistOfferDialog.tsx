import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { closeWaitlistOffer, useWaitlistOffer } from "./waitlistOffer";

type JoinStatus =
  | "joined"
  | "already_waiting"
  | "available"
  | "already_booked"
  | "too_late"
  | "closed"
  | "not_allowed"
  | "error";

interface JoinResult {
  status: JoinStatus;
  position?: number;
}

const resultLabel = (r: JoinResult) => {
  switch (r.status) {
    case "joined":
    case "already_waiting":
      return `Inscrit(e) sur liste d'attente — position ${r.position ?? "?"}`;
    case "available":
      return "Une place vient de se libérer : réservez directement cette date.";
    case "already_booked":
      return "Déjà réservé pour cette date.";
    case "too_late":
      return "Trop tard pour la liste d'attente sur cette date.";
    case "closed":
      return "Centre fermé ce jour-là.";
    case "not_allowed":
      return "Cette classe n'est pas accueillie ce jour-là.";
    default:
      return "Erreur, veuillez réessayer ou contacter le secrétariat.";
  }
};

export const WaitlistOfferDialog = () => {
  const offer = useWaitlistOffer();
  const queryClient = useQueryClient();
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<Record<number, JoinResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = () => {
    setUnchecked(new Set());
    setResults({});
    closeWaitlistOffer();
  };

  if (!offer) return null;
  const done = Object.keys(results).length > 0;

  const toggle = (index: number) =>
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const join = async () => {
    setIsSubmitting(true);
    const newResults: Record<number, JoinResult> = {};
    for (const [index, item] of offer.items.entries()) {
      if (unchecked.has(index)) continue;
      const { data, error } = await supabase.rpc("join_waitlist", {
        p_child_id: offer.childId,
        p_kind: item.kind,
        p_target_id: item.targetId,
        p_date: format(item.date, "yyyy-MM-dd"),
        p_without_meal: item.withoutMeal,
        p_early_dropoff: item.earlyDropoff,
      });
      newResults[index] = error ? { status: "error" } : (data as unknown as JoinResult);
    }
    setResults(newResults);
    setIsSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ["waitlist"] });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            {offer.partial ? "Certaines dates sont complètes" : "Plus de places disponibles"}
          </DialogTitle>
          <DialogDescription>
            {done
              ? "Voici le résultat de l'inscription sur liste d'attente."
              : `Vous pouvez inscrire ${offer.childName} sur la liste d'attente. Si une place se libère, ${offer.childName} sera inscrit(e) automatiquement (par ordre d'arrivée) et vous recevrez un email.`}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 my-2">
          {offer.items.map((item, index) => {
            const result = results[index];
            const ok = result && (result.status === "joined" || result.status === "already_waiting");
            return (
              <li key={index} className="flex items-start gap-3 rounded-md border p-3">
                {done ? (
                  result ? (
                    ok ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                    )
                  ) : (
                    <span className="h-5 w-5 shrink-0" />
                  )
                ) : (
                  <Checkbox
                    id={`waitlist-${index}`}
                    checked={!unchecked.has(index)}
                    onCheckedChange={() => toggle(index)}
                  />
                )}
                <label htmlFor={`waitlist-${index}`} className="text-sm leading-tight">
                  <span className="font-medium capitalize">
                    {format(item.date, "EEEE d MMMM yyyy", { locale: fr })}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}— {item.kind === "wednesday" ? "mercredi" : "vacances"}
                    {item.withoutMeal ? ", sans repas" : ""}
                    {item.earlyDropoff ? ", accueil du matin" : ""}
                  </span>
                  {result && <span className="block mt-1">{resultLabel(result)}</span>}
                  {done && !result && <span className="block mt-1 text-muted-foreground">Non inscrit(e)</span>}
                </label>
              </li>
            );
          })}
        </ul>

        {!done && (
          <p className="text-xs text-muted-foreground">
            Une fois la place attribuée, la réservation est confirmée. Pour l'annuler, il suffit de prévenir le
            secrétariat par email.
          </p>
        )}

        <DialogFooter className="gap-2">
          {done ? (
            <Button onClick={close}>Fermer</Button>
          ) : (
            <>
              <Button variant="outline" onClick={close} disabled={isSubmitting}>
                Non merci
              </Button>
              <Button onClick={join} disabled={isSubmitting || unchecked.size === offer.items.length}>
                {isSubmitting ? "Inscription…" : "Inscrire sur liste d'attente"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
