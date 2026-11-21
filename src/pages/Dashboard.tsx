import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Baby, Bell, Calendar, CalendarCheck, ChevronRight, Clock, Palmtree, Plus, Users, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState, ErrorState, InitialsAvatar, LoadingState, StatusBadge } from "@/components/design";
import { useFamilyProfile } from "@/components/layout/useFamilyProfile";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import {
  parseDay, todayKey, useFamilyChildren, useFamilyReservations, useUpcomingPeriods,
} from "@/hooks/family/useFamilyReservations";
import { cn } from "@/lib/utils";

const fmtDay = (day: string) => format(parseDay(day), "EEEE d MMMM", { locale: fr });

const QuickAction = ({
  to, icon: Icon, title, description, tone,
}: { to: string; icon: typeof Calendar; title: string; description: string; tone: "coral" | "sage" | "peach" }) => (
  <Link
    to={to}
    className={cn(
      "group flex items-center gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-colors",
      "hover:border-primary/40 hover:bg-peach-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    )}
  >
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        tone === "coral" && "bg-peach text-primary",
        tone === "sage" && "bg-sage-soft text-sage-foreground",
        tone === "peach" && "bg-peach-soft text-secondary-foreground",
      )}
      aria-hidden="true"
    >
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-bold">{title}</span>
      <span className="block text-sm text-muted-foreground">{description}</span>
    </span>
    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
  </Link>
);

const Dashboard = () => {
  const profile = useFamilyProfile();
  const children = useFamilyChildren();
  const reservations = useFamilyReservations();
  const periods = useUpcomingPeriods();
  const { notifications, unreadCount, isLoading: notifLoading } = useNotifications(true);
  const waitlist = useQuery({
    queryKey: ["waitlist", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_waitlist", { p_include_past: false });
      if (error) throw error;
      return data;
    },
  });

  const today = todayKey();
  const upcoming = (reservations.data ?? []).filter((r) => r.date >= today && r.status === "confirmed").slice(0, 5);
  const upcomingTotal = (reservations.data ?? []).filter((r) => r.date >= today && r.status === "confirmed").length;
  const waiting = (waitlist.data ?? []).filter((w) => w.status === "waiting");
  const firstName = profile.data?.first_name;
  const canWednesday = !profile.data?.hide_wednesday_access;
  const bookingClosed = profile.data?.is_closed;
  const bookingNotOpen = profile.data?.is_waiting;

  return (
    <div className="space-y-8">
      {/* Bienvenue */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-warm border border-peach p-6 md:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold text-primary">{format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold">
            {profile.isLoading ? "Bonjour" : firstName ? `Bonjour ${firstName} 👋` : "Bonjour 👋"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Retrouvez ici les réservations de vos enfants, vos inscriptions en liste d'attente et les informations du centre.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/holiday-reservations">
                <Plus aria-hidden="true" />
                Réserver une journée
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/my-reservations">Mes réservations</Link>
            </Button>
          </div>
        </div>
        <svg className="pointer-events-none absolute -right-10 -bottom-10 h-56 w-56 text-coral/25" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="100" fill="currentColor" />
        </svg>
        <svg className="pointer-events-none absolute right-24 -top-12 h-32 w-32 text-sage/50" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="100" fill="currentColor" />
        </svg>
      </section>

      {(bookingClosed || bookingNotOpen) && (
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {bookingNotOpen
              ? "Les inscriptions aux vacances ne sont pas encore ouvertes pour votre compte. Vous serez informé(e) par email dès leur lancement."
              : "Les inscriptions aux vacances sont actuellement clôturées. Vous serez informé(e) par email de la prochaine ouverture."}
          </AlertDescription>
        </Alert>
      )}

      {/* Accès rapides */}
      <section aria-labelledby="quick-title" className="space-y-3">
        <h2 id="quick-title" className="text-lg font-bold">Réserver</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {canWednesday && (
            <QuickAction to="/wednesday-reservations" icon={Calendar} tone="coral" title="Mercredis" description="Maternelle et primaire" />
          )}
          <QuickAction to="/holiday-reservations" icon={Palmtree} tone="sage" title="Vacances scolaires" description="Maternelle et primaire" />
          <QuickAction to="/teenholiday-reservations" icon={Users} tone="peach" title="Club Ado" description="Collégiens (et CM2 l'été selon la période)" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Prochaines réservations */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              Prochaines réservations
            </CardTitle>
            {upcomingTotal > 0 && (
              <Button asChild variant="link" size="sm" className="px-0">
                <Link to="/my-reservations">Tout voir ({upcomingTotal})</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {reservations.isLoading ? (
              <LoadingState rows={3} />
            ) : reservations.isError ? (
              <ErrorState onRetry={() => reservations.refetch()} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                compact
                icon={CalendarCheck}
                title="Aucune réservation à venir"
                description="Choisissez un parcours ci-dessus pour réserver une journée."
              />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((r) => (
                  <li key={`${r.kind}-${r.id}`} className="flex items-center gap-3 py-3">
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-peach-soft text-secondary-foreground">
                      <span className="text-lg font-extrabold leading-none">{format(parseDay(r.date), "d")}</span>
                      <span className="text-[10px] font-bold uppercase">{format(parseDay(r.date), "MMM", { locale: fr })}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold capitalize-first truncate">{fmtDay(r.date)}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {r.childName} · {r.kind === "wednesday" ? "Mercredi" : `Vacances${r.periodName ? ` ${r.periodName}` : ""}`}
                      </p>
                    </div>
                    <StatusBadge status="confirmed" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Enfants */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-primary" aria-hidden="true" />
              Mes enfants
            </CardTitle>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link to="/children">Gérer</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {children.isLoading ? (
              <LoadingState rows={2} />
            ) : children.isError ? (
              <ErrorState onRetry={() => children.refetch()} />
            ) : (children.data ?? []).length === 0 ? (
              <EmptyState
                compact
                icon={Baby}
                title="Aucun enfant enregistré"
                description="Ajoutez vos enfants pour pouvoir réserver."
                action={
                  <Button asChild size="sm">
                    <Link to="/children">Ajouter un enfant</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {children.data!.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <InitialsAvatar name={`${c.first_name} ${c.last_name}`} />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.first_name} {c.last_name}</p>
                      <p className="text-sm text-muted-foreground">Classe : {c.school_class}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Liste d'attente */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              Liste d'attente
            </CardTitle>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link to="/waitlist">Voir</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {waitlist.isLoading ? (
              <LoadingState rows={2} />
            ) : waitlist.isError ? (
              <ErrorState onRetry={() => waitlist.refetch()} />
            ) : waiting.length === 0 ? (
              <EmptyState
                compact
                icon={Clock}
                title="Aucune inscription en attente"
                description="Si un jour est complet, vous pourrez y inscrire votre enfant au moment de réserver."
              />
            ) : (
              <ul className="space-y-3">
                {waiting.slice(0, 4).map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="block font-semibold truncate">{w.child_first_name}</span>
                      <span className="block text-muted-foreground capitalize-first">{fmtDay(w.date)}</span>
                    </span>
                    <StatusBadge status="waiting" label={`Position ${w.position}`} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
              Notifications
              {unreadCount > 0 && <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{unreadCount}</span>}
            </CardTitle>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link to="/notifications">Tout voir</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {notifLoading ? (
              <LoadingState rows={2} />
            ) : notifications.length === 0 ? (
              <EmptyState compact icon={Bell} title="Aucune notification" description="Les messages importants du centre apparaîtront ici." />
            ) : (
              <ul className="space-y-3">
                {notifications.slice(0, 3).map((n) => (
                  <li key={n.id} className={cn("rounded-lg p-3 text-sm", !n.read_at ? "bg-peach-soft" : "bg-surface-muted")}>
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Périodes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palmtree className="h-5 w-5 text-primary" aria-hidden="true" />
              Périodes de réservation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {periods.isLoading ? (
              <LoadingState rows={2} />
            ) : periods.isError ? (
              <ErrorState onRetry={() => periods.refetch()} />
            ) : (
              <ul className="space-y-3 text-sm">
                {canWednesday && (
                  <li className="flex items-center justify-between gap-2">
                    <span>
                      <span className="block font-semibold">Mercredis</span>
                      <span className="block text-muted-foreground">
                        {periods.data!.wednesdayCount > 0
                          ? `Prochain : ${fmtDay(periods.data!.nextWednesday!)}`
                          : "Aucun mercredi programmé"}
                      </span>
                    </span>
                    <StatusBadge
                      status={periods.data!.wednesdayCount > 0 ? "confirmed" : "closed"}
                      label={periods.data!.wednesdayCount > 0 ? `${periods.data!.wednesdayCount} ouverts` : "Aucun"}
                    />
                  </li>
                )}
                {periods.data!.periods.length === 0 ? (
                  <li className="text-muted-foreground">Aucune période de vacances programmée.</li>
                ) : (
                  periods.data!.periods.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block font-semibold truncate">{p.name}</span>
                        <span className="block text-muted-foreground">
                          du {format(parseDay(p.start_date), "d MMM", { locale: fr })} au {format(parseDay(p.end_date), "d MMM yyyy", { locale: fr })}
                        </span>
                      </span>
                      {bookingClosed || bookingNotOpen ? (
                        <StatusBadge status="closed" label={bookingNotOpen ? "Bientôt" : "Clôturé"} />
                      ) : (
                        <StatusBadge status="confirmed" label="Ouvert" />
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
