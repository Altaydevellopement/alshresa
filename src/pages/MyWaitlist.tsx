import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/design";
import { WaitlistStatus, type WaitlistRow } from "@/components/waitlist/WaitlistStatus";
import { parseDay } from "@/hooks/family/useFamilyReservations";

const MyWaitlist = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState<WaitlistRow | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["waitlist", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_waitlist", { p_include_past: false });
      if (error) throw error;
      return data;
    },
  });

  const confirmLeave = async () => {
    if (!leaving) return;
    setBusy(true);
    const { error } = await supabase.rpc("leave_waitlist", { p_entry_id: leaving.id });
    setBusy(false);
    setLeaving(null);
    if (error) {
      toast({ title: "Retrait impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Inscription retirée de la liste d'attente" });
    queryClient.invalidateQueries({ queryKey: ["waitlist"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Clock}
        title="Liste d'attente"
        description="Les journées complètes sur lesquelles vos enfants sont inscrits, par ordre d'arrivée."
      />

      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Dès qu'une place se libère, le premier enfant de la liste est <strong>réservé automatiquement</strong> : vous
          recevez un email et une notification. Pour annuler une place obtenue, prévenez le secrétariat par email.
          Les réservations automatiques s'arrêtent la veille du jour concerné.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-5 md:pt-6">
          {isLoading ? (
            <LoadingState rows={3} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Aucune inscription en liste d'attente"
              description="Lorsqu'une journée est complète, utilisez le bouton « Liste d'attente » au moment de choisir les dates."
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {row.child_first_name}
                      <span className="font-normal text-muted-foreground"> — </span>
                      <span className="inline-block capitalize-first">{format(parseDay(row.date), "EEEE d MMMM yyyy", { locale: fr })}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {row.kind === "wednesday" ? "Mercredi" : `Vacances${row.period_name ? ` · ${row.period_name}` : ""}`}
                      {row.without_meal ? " · sans repas" : ""}
                      {row.early_dropoff ? " · accueil du matin" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <WaitlistStatus row={row} />
                    {row.status === "waiting" && (
                      <Button variant="outline" size="sm" onClick={() => setLeaving(row)}>
                        Se retirer
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!leaving} onOpenChange={(open) => !open && setLeaving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se retirer de la liste d'attente ?</AlertDialogTitle>
            <AlertDialogDescription>
              {leaving && (
                <>
                  {leaving.child_first_name} ne sera plus en attente pour le{" "}
                  {format(parseDay(leaving.date), "EEEE d MMMM", { locale: fr })}. Sa position sera perdue.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave} disabled={busy}>
              Me retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyWaitlist;
