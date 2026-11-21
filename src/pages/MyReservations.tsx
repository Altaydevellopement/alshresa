import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarCheck, Coffee, Mail, Plus, UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge, reservationStatus } from "@/components/design";
import { parseDay, todayKey, useFamilyChildren, useFamilyReservations } from "@/hooks/family/useFamilyReservations";

type When = "upcoming" | "past" | "all";

const MyReservations = () => {
  const { data, isLoading, isError, refetch } = useFamilyReservations();
  const children = useFamilyChildren();
  const [when, setWhen] = useState<When>("upcoming");
  const [child, setChild] = useState("all");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("confirmed");

  const today = todayKey();
  const filtered = useMemo(() => {
    const rows = (data ?? []).filter(
      (r) =>
        (when === "all" || (when === "upcoming" ? r.date >= today : r.date < today)) &&
        (child === "all" || r.childId === child) &&
        (kind === "all" || r.kind === kind) &&
        (status === "all" || r.status === status),
    );
    return when === "past" ? [...rows].reverse() : rows;
  }, [data, when, child, kind, status, today]);

  const byMonth = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const r of filtered) {
      const key = r.date.slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    return [...groups.entries()];
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarCheck}
        title="Mes réservations"
        description="Toutes les journées réservées pour vos enfants, mercredis et vacances."
        actions={
          <Button asChild>
            <Link to="/holiday-reservations">
              <Plus aria-hidden="true" />
              Nouvelle réservation
            </Link>
          </Button>
        }
      />

      <Alert variant="coral">
        <Mail className="h-4 w-4" />
        <AlertDescription>
          Pour annuler une journée ou signaler une absence, merci de prévenir le secrétariat par email au plus tôt :
          la place pourra être attribuée à un enfant en liste d'attente.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-5 md:gap-4 md:pt-6 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="f-when">Période</Label>
            <Select value={when} onValueChange={(v) => setWhen(v as When)}>
              <SelectTrigger id="f-when"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">À venir</SelectItem>
                <SelectItem value="past">Passées</SelectItem>
                <SelectItem value="all">Toutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-child">Enfant</Label>
            <Select value={child} onValueChange={setChild}>
              <SelectTrigger id="f-child"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les enfants</SelectItem>
                {(children.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-kind">Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="f-kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mercredis et vacances</SelectItem>
                <SelectItem value="wednesday">Mercredis</SelectItem>
                <SelectItem value="holiday">Vacances / Club Ado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-status">Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="f-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmées</SelectItem>
                <SelectItem value="cancelled">Annulées</SelectItem>
                <SelectItem value="all">Tous les statuts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <Card><ErrorState onRetry={() => refetch()} /></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarCheck}
            title="Aucune réservation ne correspond"
            description={when === "upcoming" ? "Vous n'avez pas de journée réservée à venir avec ces filtres." : "Modifiez les filtres pour afficher d'autres réservations."}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filtered.length} journée{filtered.length > 1 ? "s" : ""}
          </p>
          {byMonth.map(([month, rows]) => (
            <section key={month} aria-labelledby={`m-${month}`} className="space-y-3">
              <h2 id={`m-${month}`} className="text-sm font-bold uppercase tracking-wider text-muted-foreground capitalize-first">
                {format(parseDay(`${month}-01`), "MMMM yyyy", { locale: fr })}
              </h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {rows.map((r) => (
                  <li key={`${r.kind}-${r.id}`} className="flex gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-xs">
                    <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-peach-soft text-secondary-foreground">
                      <span className="text-[10px] font-bold uppercase">{format(parseDay(r.date), "EEE", { locale: fr })}</span>
                      <span className="text-xl font-extrabold leading-none">{format(parseDay(r.date), "d")}</span>
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{r.childName}</p>
                        <StatusBadge status={reservationStatus(r.status)} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.kind === "wednesday" ? "Mercredi" : `Vacances${r.periodName ? ` · ${r.periodName}` : ""}`} · {r.childClass}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {r.withoutMeal && (
                          <span className="inline-flex items-center gap-1">
                            <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden="true" />
                            Sans repas
                          </span>
                        )}
                        {r.earlyDropoff && (
                          <span className="inline-flex items-center gap-1">
                            <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
                            Accueil du matin
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReservations;
