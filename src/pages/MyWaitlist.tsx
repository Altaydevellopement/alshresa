import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WaitlistRow = Database["public"]["Functions"]["get_waitlist"]["Returns"][number];

export const statusBadge = (row: WaitlistRow) => {
  switch (row.status) {
    case "waiting":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100"><Clock className="h-3 w-3 mr-1" />En attente — position {row.position}</Badge>;
    case "booked":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Place obtenue</Badge>;
    case "expired":
      return <Badge variant="secondary">Expirée</Badge>;
    default:
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Retirée</Badge>;
  }
};

const MyWaitlist = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["waitlist", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_waitlist", { p_include_past: false });
      if (error) throw error;
      return data;
    },
  });

  const leave = async (id: string) => {
    const { error } = await supabase.rpc("leave_waitlist", { p_entry_id: id });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Retiré de la liste d'attente" });
    queryClient.invalidateQueries({ queryKey: ["waitlist"] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Liste d'attente</CardTitle>
            <CardDescription>
              Lorsqu'un mercredi ou un jour de vacances est complet, vous pouvez y inscrire votre enfant au moment de
              la réservation. Dès qu'une place se libère, le premier enfant de la liste est <strong>réservé
              automatiquement</strong> et vous recevez un email ainsi qu'une notification. Pour annuler une place
              obtenue, il suffit de prévenir le secrétariat par email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Chargement…</p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground">Aucun enfant sur liste d'attente pour le moment.</p>
            ) : (
              <ul className="divide-y">
                {rows.map((row) => (
                  <li key={row.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {row.child_first_name} — <span className="capitalize">{format(new Date(row.date), "EEEE d MMMM yyyy", { locale: fr })}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {row.kind === "wednesday" ? "Mercredi" : `Vacances${row.period_name ? ` (${row.period_name})` : ""}`}
                        {row.without_meal ? " · sans repas" : ""}
                        {row.early_dropoff ? " · accueil du matin" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(row)}
                      {row.status === "waiting" && (
                        <Button variant="outline" size="sm" onClick={() => leave(row.id)}>
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
      </div>
    </div>
  );
};

export default MyWaitlist;
