import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Réglages de la liste d'attente (table global_settings). */
export const WaitlistSettingsCard = () => {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["global_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("global_settings").select("*").order("created_at").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [enabled, setEnabled] = useState(true);
  const [cutoff, setCutoff] = useState(12);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.waitlist_enabled);
      setCutoff(settings.waitlist_cutoff_hours);
    }
  }, [settings]);

  const dirty = !!settings && (settings.waitlist_enabled !== enabled || settings.waitlist_cutoff_hours !== cutoff);

  const save = async () => {
    if (!settings) return;
    if (!Number.isInteger(cutoff) || cutoff < 0 || cutoff > 336) {
      toast.error("Le délai doit être un nombre d'heures entre 0 et 336.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("global_settings")
      .update({ waitlist_enabled: enabled, waitlist_cutoff_hours: cutoff })
      .eq("id", settings.id);
    setSaving(false);
    if (error) return toast.error(`Enregistrement impossible : ${error.message}`);
    toast.success("Réglages de la liste d'attente enregistrés");
    qc.invalidateQueries({ queryKey: ["global_settings"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liste d'attente</CardTitle>
        <CardDescription>
          Quand une place se libère (réservation supprimée ou annulée, capacité augmentée), le premier enfant inscrit pour
          ce jour et ce groupe est réservé automatiquement. L'accueil reçoit un email pour prévenir la famille (une notification
          apparaît aussi dans son espace). Les réservations automatiques s'arrêtent avant le jour J selon le délai ci-dessous.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl bg-surface-muted p-4">
            <Switch id="waitlist-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={isLoading} />
            <div>
              <Label htmlFor="waitlist-enabled" className="font-semibold">Réservation automatique</Label>
              <p className="text-sm text-muted-foreground">
                {enabled ? "Activée : les places libérées sont attribuées automatiquement." : "Désactivée : les places libérées restent disponibles pour tous."}
              </p>
            </div>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="cutoff">Arrêt avant le jour J (en heures)</Label>
            <Input
              id="cutoff"
              type="number"
              inputMode="numeric"
              min={0}
              max={336}
              value={cutoff}
              disabled={isLoading}
              onChange={(e) => setCutoff(Number(e.target.value))}
              aria-describedby="cutoff-help"
            />
            <p id="cutoff-help" className="text-xs text-muted-foreground">Compté depuis minuit le jour J. 12 = la veille à midi.</p>
          </div>
        </div>
        <Button onClick={save} disabled={!dirty} loading={saving}>
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};
