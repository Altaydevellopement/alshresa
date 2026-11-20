import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { FileText, Play, X } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminChildSelector } from "@/components/admin/reservations/AdminChildSelector";
import { useAdminChildrenData } from "@/hooks/useAdminChildrenData";
import { statusBadge, type WaitlistRow } from "@/pages/MyWaitlist";

const GROUP_LABELS: Record<string, string> = {
  kindergarten: "Maternelle",
  primary: "Primaire",
  teen: "Adolescent",
};

const JOIN_MESSAGES: Record<string, string> = {
  joined: "Enfant inscrit sur la liste d'attente",
  already_waiting: "Cet enfant est déjà sur la liste d'attente pour ce jour",
  available: "Il reste des places : réservez directement",
  already_booked: "Cet enfant est déjà réservé ce jour-là",
  too_late: "Trop tard : la liste d'attente est close pour ce jour",
  closed: "Centre fermé ce jour-là",
  not_allowed: "Classe non accueillie ce jour-là",
};

const fmtDate = (d: string) => format(new Date(d), "EEE d MMM yyyy", { locale: fr });

const AdminWaitlist = () => {
  const qc = useQueryClient();

  // ---------------------------------------------------------------- Réglages
  const { data: settings } = useQuery({
    queryKey: ["global_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("global_settings").select("*").order("created_at").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [enabled, setEnabled] = useState(true);
  const [cutoff, setCutoff] = useState(12);
  useEffect(() => {
    if (settings) {
      setEnabled(settings.waitlist_enabled);
      setCutoff(settings.waitlist_cutoff_hours);
    }
  }, [settings]);

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabase
      .from("global_settings")
      .update({ waitlist_enabled: enabled, waitlist_cutoff_hours: cutoff })
      .eq("id", settings.id);
    if (error) return toast.error(error.message);
    toast.success("Réglages enregistrés");
    qc.invalidateQueries({ queryKey: ["global_settings"] });
  };

  // ---------------------------------------------------------------- Liste
  const [includePast, setIncludePast] = useState(false);
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("waiting");
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["waitlist", "admin", includePast],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_waitlist", { p_include_past: includePast });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (kindFilter === "all" || r.kind === kindFilter) &&
        (statusFilter === "all" || r.status === statusFilter) &&
        (!q ||
          `${r.child_first_name} ${r.child_last_name} ${r.parent_first_name ?? ""} ${r.parent_last_name ?? ""}`
            .toLowerCase()
            .includes(q)),
    );
  }, [rows, kindFilter, statusFilter, search]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["waitlist"] });
    qc.invalidateQueries({ queryKey: ["wednesday_reservations"] });
    qc.invalidateQueries({ queryKey: ["holiday_reservations"] });
  };

  const remove = async (row: WaitlistRow) => {
    const { error } = await supabase.rpc("leave_waitlist", { p_entry_id: row.id });
    if (error) return toast.error(error.message);
    toast.success(`${row.child_first_name} retiré(e) de la liste d'attente`);
    refresh();
  };

  const processNow = async (row: WaitlistRow) => {
    const { data, error } = await supabase.rpc("admin_process_waitlist", {
      p_kind: row.kind,
      p_target_id: (row.kind === "wednesday" ? row.wednesday_id : row.period_id)!,
      p_date: row.date,
    });
    if (error) return toast.error(error.message);
    toast.success(data ? `${data} enfant(s) réservé(s) automatiquement` : "Aucune place libre pour ce jour");
    refresh();
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Liste d'attente", 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [["Date", "Type", "Enfant", "Classe", "Parent", "Groupe", "Position", "Statut", "Options"]],
      body: filtered.map((r) => [
        fmtDate(r.date),
        r.kind === "wednesday" ? "Mercredi" : `Vacances ${r.period_name ?? ""}`,
        `${r.child_last_name} ${r.child_first_name}`,
        r.school_class,
        `${r.parent_last_name ?? ""} ${r.parent_first_name ?? ""}`.trim(),
        GROUP_LABELS[r.class_group] ?? r.class_group,
        r.position ?? "-",
        r.status === "waiting" ? "En attente" : r.status === "booked" ? "Place obtenue" : r.status,
        [r.without_meal && "Sans repas", r.early_dropoff && "Accueil matin"].filter(Boolean).join(", "),
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`liste-attente-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  // ---------------------------------------------------------------- Ajout par le secrétariat
  const { allChildren } = useAdminChildrenData();
  const [childId, setChildId] = useState("");
  const [kind, setKind] = useState<"wednesday" | "holiday">("wednesday");
  const [wednesdayId, setWednesdayId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [withoutMeal, setWithoutMeal] = useState(false);
  const [earlyDropoff, setEarlyDropoff] = useState(false);
  const [adding, setAdding] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const { data: wednesdays = [] } = useQuery({
    queryKey: ["available_wednesdays", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase.from("available_wednesdays").select("id, date").gte("date", today).order("date");
      if (error) throw error;
      return data;
    },
  });
  const { data: periods = [] } = useQuery({
    queryKey: ["available_holiday_periods", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_holiday_periods")
        .select("id, name, start_date, end_date")
        .gte("end_date", today)
        .order("start_date");
      if (error) throw error;
      return data;
    },
  });
  const period = periods.find((p) => p.id === periodId);

  const addEntry = async () => {
    if (!childId) return toast.error("Choisissez un enfant");
    const target = kind === "wednesday" ? wednesdayId : periodId;
    if (!target || (kind === "holiday" && !holidayDate)) return toast.error("Choisissez une date");
    setAdding(true);
    const { data, error } = await supabase.rpc("join_waitlist", {
      p_child_id: childId,
      p_kind: kind,
      p_target_id: target,
      p_date: kind === "holiday" ? holidayDate : undefined,
      p_without_meal: withoutMeal,
      p_early_dropoff: earlyDropoff,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    const result = data as unknown as { status: string; position?: number };
    const message = JOIN_MESSAGES[result.status] ?? result.status;
    if (result.status === "joined") toast.success(`${message} (position ${result.position})`);
    else toast.warning(message);
    refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Liste d'attente</h1>

      <Card>
        <CardHeader>
          <CardTitle>Fonctionnement</CardTitle>
          <CardDescription>
            Quand une place se libère (réservation supprimée ou annulée, capacité augmentée), le premier enfant inscrit
            pour ce jour et ce groupe est réservé automatiquement. La famille reçoit une notification et un email (copie
            au secrétariat). Les réservations automatiques s'arrêtent avant le jour J selon le délai ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex items-center gap-2">
            <Switch id="waitlist-enabled" checked={enabled} onCheckedChange={setEnabled} />
            <Label htmlFor="waitlist-enabled">Réservation automatique activée</Label>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cutoff">Arrêt (heures avant le jour J, minuit)</Label>
            <Input
              id="cutoff"
              type="number"
              min={0}
              max={336}
              value={cutoff}
              onChange={(e) => setCutoff(Number(e.target.value))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">12 = la veille à midi</p>
          </div>
          <Button onClick={saveSettings} disabled={!settings}>Enregistrer</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inscrire un enfant</CardTitle>
          <CardDescription>Uniquement possible lorsque le jour est complet pour le groupe de l'enfant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminChildSelector selectedChild={childId} setSelectedChild={setChildId} children={allChildren} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "wednesday" | "holiday")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wednesday">Mercredi</SelectItem>
                  <SelectItem value="holiday">Vacances</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kind === "wednesday" ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>Mercredi</Label>
                <Select value={wednesdayId} onValueChange={setWednesdayId}>
                  <SelectTrigger><SelectValue placeholder="Choisir un mercredi" /></SelectTrigger>
                  <SelectContent>
                    {wednesdays.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{fmtDate(w.date)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label>Période</Label>
                  <Select value={periodId} onValueChange={(v) => { setPeriodId(v); setHolidayDate(""); }}>
                    <SelectTrigger><SelectValue placeholder="Choisir une période" /></SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Jour</Label>
                  <Input
                    type="date"
                    value={holidayDate}
                    min={period?.start_date}
                    max={period?.end_date}
                    disabled={!period}
                    onChange={(e) => setHolidayDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={withoutMeal} onCheckedChange={(v) => setWithoutMeal(v === true)} /> Sans repas
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={earlyDropoff} onCheckedChange={(v) => setEarlyDropoff(v === true)} /> Accueil du matin
            </label>
          </div>
          <Button onClick={addEntry} disabled={adding}>{adding ? "Inscription…" : "Inscrire sur liste d'attente"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle>Inscriptions</CardTitle>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={filtered.length === 0}>
            <FileText className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Rechercher un enfant ou un parent" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="wednesday">Mercredis</SelectItem>
                <SelectItem value="holiday">Vacances</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="waiting">En attente</SelectItem>
                <SelectItem value="booked">Place obtenue</SelectItem>
                <SelectItem value="cancelled">Retirées</SelectItem>
                <SelectItem value="expired">Expirées</SelectItem>
                <SelectItem value="all">Tous statuts</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <Checkbox checked={includePast} onCheckedChange={(v) => setIncludePast(v === true)} /> Dates passées
            </label>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">Aucune inscription.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Enfant</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Groupe</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap capitalize">{fmtDate(r.date)}</TableCell>
                      <TableCell>{r.kind === "wednesday" ? "Mercredi" : `Vacances ${r.period_name ?? ""}`}</TableCell>
                      <TableCell>
                        {r.child_last_name} {r.child_first_name}
                        <span className="text-muted-foreground"> ({r.school_class})</span>
                        <div className="text-xs text-muted-foreground">
                          {[r.without_meal && "Sans repas", r.early_dropoff && "Accueil matin"].filter(Boolean).join(" · ")}
                        </div>
                      </TableCell>
                      <TableCell>{`${r.parent_last_name ?? ""} ${r.parent_first_name ?? ""}`.trim() || "-"}</TableCell>
                      <TableCell>{GROUP_LABELS[r.class_group] ?? r.class_group}</TableCell>
                      <TableCell>{statusBadge(r)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.status === "waiting" && (
                          <>
                            <Button variant="ghost" size="icon" title="Attribuer les places libres maintenant" onClick={() => processNow(r)}>
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Retirer de la liste" onClick={() => remove(r)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWaitlist;
