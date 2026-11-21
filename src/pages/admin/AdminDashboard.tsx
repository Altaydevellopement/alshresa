import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Baby, Calendar, CalendarPlus, ClipboardList, Clock, LayoutDashboard, Mail, Palmtree, Settings2, Users, Gauge, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from "@/components/design";
import { parseDay, todayKey } from "@/hooks/family/useFamilyReservations";
import { cn } from "@/lib/utils";

const count = async (query: PromiseLike<{ count: number | null; error: unknown }>) => {
  const { count: c, error } = await query;
  if (error) throw error;
  return c ?? 0;
};

/** Indicateurs du tableau de bord : uniquement des comptages réels. */
const useAdminStats = () =>
  useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const today = todayKey();
      const [wed, hol, children, families, waiting] = await Promise.all([
        count(
          supabase
            .from("wednesday_reservations")
            .select("id, available_wednesdays!wednesday_reservations_wednesday_id_fkey!inner(date)", { count: "exact", head: true })
            .eq("status", "confirmed")
            .gte("available_wednesdays.date", today),
        ),
        count(
          supabase
            .from("holiday_reservations")
            .select("id", { count: "exact", head: true })
            .eq("status", "confirmed")
            .gte("reservation_date", today),
        ),
        count(supabase.from("children").select("id", { count: "exact", head: true })),
        count(supabase.from("profiles").select("id", { count: "exact", head: true })),
        count(
          supabase
            .from("waitlist_entries")
            .select("id", { count: "exact", head: true })
            .eq("status", "waiting")
            .gte("date", today),
        ),
      ]);
      return { wed, hol, children, families, waiting };
    },
  });

/** Places du prochain mercredi, par groupe (fonctions SQL existantes). */
const useNextWednesday = () =>
  useQuery({
    queryKey: ["admin-next-wednesday"],
    queryFn: async () => {
      const { data: w, error } = await supabase
        .from("available_wednesdays")
        .select("id, date, max_participants_kindergarten, max_participants_primary")
        .gte("date", todayKey())
        .order("date")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!w) return null;
      const [k, p] = await Promise.all([
        supabase.rpc("check_wednesday_spots_remaining", { wednesday_id: w.id, child_school_class: "MS" }),
        supabase.rpc("check_wednesday_spots_remaining", { wednesday_id: w.id, child_school_class: "CP" }),
      ]);
      if (k.error) throw k.error;
      if (p.error) throw p.error;
      return {
        date: w.date,
        groups: [
          { label: "Maternelle", capacity: w.max_participants_kindergarten, left: k.data ?? 0 },
          { label: "Primaire", capacity: w.max_participants_primary, left: p.data ?? 0 },
        ],
      };
    },
  });

/** Prochaines inscriptions en liste d'attente. */
const useWaitingPreview = () =>
  useQuery({
    queryKey: ["waitlist", "admin-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_waitlist", { p_include_past: false });
      if (error) throw error;
      return (data ?? []).filter((r) => r.status === "waiting").slice(0, 5);
    },
  });

const QUICK = [
  { to: "/admin/wednesdayreservations", icon: Calendar, label: "Réservations mercredis" },
  { to: "/admin/holidayreservations", icon: Palmtree, label: "Réservations vacances" },
  { to: "/admin/reservations/new", icon: CalendarPlus, label: "Nouvelle réservation" },
  { to: "/admin/children", icon: Baby, label: "Enfants" },
  { to: "/admin/holidays", icon: Settings2, label: "Périodes et capacités" },
  { to: "/admin/authorized-emails", icon: Mail, label: "Emails autorisés" },
];

const AdminDashboard = () => {
  const stats = useAdminStats();
  const next = useNextWednesday();
  const waiting = useWaitingPreview();
  const s = stats.data;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Administration"
        title="Tableau de bord"
        description={`Situation au ${format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}.`}
      />

      <section aria-label="Indicateurs" className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Mercredis réservés" value={s?.wed} scope="Réservations confirmées, à partir d'aujourd'hui" icon={Calendar} loading={stats.isLoading} error={stats.isError} href="/admin/wednesdayreservations" />
        <StatCard label="Journées vacances réservées" value={s?.hol} scope="Vacances + Club Ado, à partir d'aujourd'hui" icon={Palmtree} tone="sage" loading={stats.isLoading} error={stats.isError} href="/admin/holidayreservations" />
        <StatCard label="En liste d'attente" value={s?.waiting} scope="Inscriptions actives, dates à venir" icon={Clock} tone="peach" loading={stats.isLoading} error={stats.isError} href="/admin/listeattente" />
        <StatCard label="Enfants inscrits" value={s?.children} scope="Fiches enfants enregistrées" icon={Baby} tone="neutral" loading={stats.isLoading} error={stats.isError} href="/admin/children" />
        <StatCard label="Familles" value={s?.families} scope="Comptes parents créés" icon={Users} tone="neutral" loading={stats.isLoading} error={stats.isError} href="/admin/profiles" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
              Prochain mercredi
            </CardTitle>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link to="/admin/spots/wednesday">Détail</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {next.isLoading ? (
              <LoadingState rows={2} />
            ) : next.isError ? (
              <ErrorState onRetry={() => next.refetch()} />
            ) : !next.data ? (
              <EmptyState compact icon={Calendar} title="Aucun mercredi programmé" />
            ) : (
              <div className="space-y-4">
                <p className="font-semibold capitalize-first">{format(parseDay(next.data.date), "EEEE d MMMM yyyy", { locale: fr })}</p>
                {next.data.groups.map((g) => {
                  const used = Math.max(g.capacity - g.left, 0);
                  const pct = g.capacity > 0 ? Math.round((used / g.capacity) * 100) : 0;
                  return (
                    <div key={g.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{g.label}</span>
                        <span className="text-muted-foreground">
                          {g.left} place{g.left > 1 ? "s" : ""} libre{g.left > 1 ? "s" : ""} / {g.capacity}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={g.capacity} aria-valuenow={used} aria-label={`${g.label} : ${used} réservées sur ${g.capacity}`}>
                        <div className={cn("h-full rounded-full", pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              Liste d'attente
            </CardTitle>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link to="/admin/listeattente">Gérer</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {waiting.isLoading ? (
              <LoadingState rows={3} />
            ) : waiting.isError ? (
              <ErrorState onRetry={() => waiting.refetch()} />
            ) : (waiting.data ?? []).length === 0 ? (
              <EmptyState compact icon={Clock} title="Aucune inscription en attente" />
            ) : (
              <ul className="space-y-3 text-sm">
                {waiting.data!.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{w.child_first_name} {w.child_last_name}</span>
                      <span className="block capitalize-first text-muted-foreground">
                        {format(parseDay(w.date), "EEE d MMM", { locale: fr })} · {w.kind === "wednesday" ? "Mercredi" : "Vacances"}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">n° {w.position}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
              Accès rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {QUICK.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold hover:bg-peach-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-peach text-primary" aria-hidden="true">
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
